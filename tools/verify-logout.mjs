// 运行时验证：设置页退出登录全流程（二次确认 -> 回启动页 -> 清 token）
// 用法: node verify-logout.mjs
const CDP = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'http://127.0.0.1:5173'
const PHONE = process.argv[2] || '13900000001'
const PASSWORD = process.argv[3] || 'abc12345'
const sleep = ms => new Promise(r => setTimeout(r, ms))

let send, evaluate
async function connect() {
  let page = null
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(CDP + '/json/list')).json()
      page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) break
    } catch { /* 等 Chrome */ }
    await sleep(500)
  }
  if (!page) throw new Error('连不上 CDP')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')) })
  let seq = 0
  const pending = new Map()
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    }
  }
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
  return ws
}

const results = []
function chk(label, ok, detail) {
  results.push(ok)
  console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? '  → ' + detail : ''}`)
}

async function main() {
  const ws = await connect()
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  await send('Page.navigate', { url: BASE + '/' }); await sleep(9000)
  await evaluate(`try{localStorage.clear()}catch(e){}; 'ok'`)
  await send('Page.navigate', { url: BASE + '/' }); await sleep(8000)

  console.log('=== 1. 登录 ===')
  await evaluate(`location.hash = '#/wx/login/index'`); await sleep(5500)
  const token = await evaluate(`
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      const ins = Array.from(document.querySelectorAll('input'));
      if (ins[0]) setVal(ins[0], ${JSON.stringify(PHONE)});
      if (ins[1]) setVal(ins[1], ${JSON.stringify(PASSWORD)});
      await sleep(500);
      const a = document.querySelector('.auth__agree-tap'); if (a) a.click();
      await sleep(400);
      const b = document.querySelector('.auth__submit'); if (b) b.click();
      await sleep(7000);
      return localStorage.getItem('Authorization') || '';
    })()
  `)
  chk('登录成功，token 已写入', !!token, token ? token.slice(0, 8) + '…' : '(空)')
  if (!token) { ws.close(); return }

  console.log('\n=== 2. 进设置页，点「退出登录」 ===')
  await evaluate(`location.hash = '#/wx/tabbar4/index'`); await sleep(5000)
  const hasRow = await evaluate(`!!Array.from(document.querySelectorAll('.row')).find(e => e.innerText.indexOf('退出登录') > -1)`)
  chk('设置页有「退出登录」行', hasRow === true)

  await evaluate(`
    (() => {
      const r = Array.from(document.querySelectorAll('.row')).find(e => e.innerText.indexOf('退出登录') > -1);
      if (r) r.click();
      return !!r;
    })()
  `)
  await sleep(1200)
  const modal = await evaluate(`
    (() => {
      const m = document.querySelector('.uni-modal');
      if (!m) return JSON.stringify({ open: false });
      const btns = Array.from(document.querySelectorAll('.uni-modal__btn')).map(b => b.innerText.trim());
      return JSON.stringify({ open: true, text: m.innerText.replace(/\\n+/g,' | ').slice(0,80), btns });
    })()
  `)
  const mo = JSON.parse(modal)
  console.log('   ' + modal)
  chk('弹出二次确认框', mo.open === true)
  chk('确认框有取消/退出两个按钮', mo.open && mo.btns.length === 2, mo.open ? JSON.stringify(mo.btns) : '')

  console.log('\n=== 3. 先点「取消」，应留在原页且 token 保留 ===')
  await evaluate(`(() => { const b = Array.from(document.querySelectorAll('.uni-modal__btn')).find(x => x.innerText.trim() === '取消'); if (b) b.click(); return !!b; })()`)
  await sleep(1500)
  const afterCancel = await evaluate(`JSON.stringify({ hash: location.hash, token: localStorage.getItem('Authorization') || '' })`)
  const ac = JSON.parse(afterCancel)
  chk('取消后仍在设置页', ac.hash.indexOf('tabbar4') > -1, ac.hash)
  chk('取消后 token 未清', !!ac.token)

  console.log('\n=== 4. 再点「退出登录」并确认 ===')
  await evaluate(`
    (() => {
      const r = Array.from(document.querySelectorAll('.row')).find(e => e.innerText.indexOf('退出登录') > -1);
      if (r) r.click();
      return !!r;
    })()
  `)
  await sleep(1200)
  await evaluate(`(() => { const b = document.querySelector('.uni-modal__btn_primary') || Array.from(document.querySelectorAll('.uni-modal__btn')).pop(); if (b) b.click(); return !!b; })()`)
  await sleep(6000)

  const after = await evaluate(`JSON.stringify({ hash: location.hash, token: localStorage.getItem('Authorization') || '', url: location.href })`)
  const af = JSON.parse(after)
  console.log('   ' + after)
  // 注意：uni-app H5 会把 pages[0]（就是启动页 pages/wxindex/index）的 hash 归一化成 '#/'，
  // 所以 '#/' 与含 'wxindex' 的 hash 都算回到了启动页。
  const onSplashHash = af.hash === '#/' || af.hash === '' || af.hash.indexOf('wxindex') > -1
  chk('确认后回到启动页', onSplashHash, af.hash + "（'#/' = pages[0] = 启动页）")
  chk('token 已被清除', af.token === '', 'token="' + af.token + '"')
  const onSplash = await evaluate(`(document.body.innerText || '').indexOf('开始使用') > -1`)
  chk('确实渲染出启动页（含「开始使用」）', onSplash === true)

  const s = await send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs'); const path = await import('node:path')
  fs.mkdirSync('C:\\im-local\\verify-triptych', { recursive: true })
  fs.writeFileSync(path.join('C:\\im-local\\verify-triptych', '4-after-logout.png'), Buffer.from(s.data, 'base64'))

  ws.close()
  const passed = results.filter(Boolean).length
  console.log(`\n>>> 通过 ${passed} / ${results.length}`)
  if (passed !== results.length) process.exitCode = 1
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
