// 诊断：真机触摸点击协议框时，容器上的 click 到底触发了几次
// 用法: node diag-agree-events.mjs <cdpPort> <baseUrl>

const CDP_PORT = Number(process.argv[2] || 9222)
const BASE_URL = process.argv[3] || 'http://120.24.175.80'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')) })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
}
const send = (method, params) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
  return r.result?.value
}

await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

const load = async () => {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
  await send('Page.navigate', { url: BASE_URL + '/#/wx/login/index' }); await sleep(13000)
  await evaluate('localStorage.clear(); sessionStorage.clear();')
  await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
  await send('Page.navigate', { url: BASE_URL + '/#/wx/login/index' }); await sleep(13000)
}

// 在容器上挂计数器（捕获阶段），区分 click / touchend
const installCounter = () => evaluate(`
  (() => {
    const el = document.querySelector('.login-agree-checkd');
    if (!el) return 'no el';
    window.__ev = { click: 0, touchstart: 0, touchend: 0, checkboxClick: 0 };
    el.addEventListener('click', () => window.__ev.click++, true);
    el.addEventListener('touchstart', () => window.__ev.touchstart++, true);
    el.addEventListener('touchend', () => window.__ev.touchend++, true);
    const cb = document.querySelector('uni-checkbox');
    if (cb) { cb.addEventListener('click', () => window.__ev.checkboxClick++, true); }
    return 'installed';
  })()
`)

const tapAt = async (dxRatio) => {
  const info = JSON.parse(await evaluate(`
    (() => {
      const el = document.querySelector('.login-agree-checkd');
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width * ${dxRatio}, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return JSON.stringify({ x, y, hit: hit ? hit.tagName + '.' + (hit.className||'').slice(0,30) : null });
    })()
  `))
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: info.x, y: info.y }] })
  await sleep(60)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(700)
  const ev = await evaluate('JSON.stringify(window.__ev)')
  const checked = await evaluate(`(() => { const el=document.querySelector('uni-checkbox .uni-checkbox-input'); return el?!!el.querySelector('svg'):null; })()`)
  return { info, ev, checked }
}

console.log('目标:', BASE_URL)
for (const [label, ratio] of [['文字区(中部)', 0.5], ['勾选框圆圈(最左)', 0.04], ['最左侧边界', 0.01]]) {
  await load()
  await installCounter()
  const r = await tapAt(ratio)
  console.log(`\n【${label}  x比例=${ratio}】`)
  console.log('  落点元素:', r.info.hit)
  console.log('  事件计数:', r.ev)
  console.log('  视觉状态:', r.checked ? '已勾选' : '未勾选')
}

// 附加实验：给 checkbox 加 pointer-events:none 后再点最左
console.log('\n\n===== 实验：给 uni-checkbox 加 pointer-events:none 后 =====')
await load()
await evaluate(`
  (() => {
    const s = document.createElement('style');
    s.textContent = '.login-agree-checkd uni-checkbox, .login-agree-checkd uni-text { pointer-events: none !important; }';
    document.head.appendChild(s);
    return 'style injected';
  })()
`)
await installCounter()
let r = await tapAt(0.04)
console.log('  落点元素:', r.info.hit)
console.log('  事件计数:', r.ev)
console.log('  视觉状态:', r.checked ? '已勾选' : '未勾选')
await evaluate(`
  (() => {
    const setVal=(el,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
    const ins=Array.from(document.querySelectorAll('input'));setVal(ins[0],'13900000001');setVal(ins[1],'abc12345');
  })()
`)
await sleep(300)
const btn = JSON.parse(await evaluate(`(() => { const b=document.querySelector('.xw-login-form-btn'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`))
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: btn.x, y: btn.y }] })
await sleep(60)
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
await sleep(1500)
console.log('  点登录提示:', JSON.stringify(await evaluate(`Array.from(document.querySelectorAll('uni-toast')).map(e=>e.innerText.trim()).filter(Boolean).join(' | ')`)))
console.log('  当前地址:', await evaluate('location.href'))

ws.close()
