// 端到端：HTTPS 站点上 登录 → 定位 → 附近的人
// 用法: node verify-e2e-https.mjs <cdpPort> <baseUrl> <phone> <password>

const CDP_PORT = Number(process.argv[2] || 9222)
const BASE = process.argv[3] || 'https://imessage.uno'
const PHONE = process.argv[4] || '13900000015'   // 老街阿珍
const PASSWORD = process.argv[5] || 'abc12345'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const errors = []
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')) })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  } else if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception?.description || ''))
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errors.push('[log] ' + m.params.entry.text)
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
const realClick = async (selector) => {
  const box = await evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.left + r.width/2, y: r.top + r.height/2 });
    })()
  `)
  if (!box) throw new Error('找不到元素: ' + selector)
  const { x, y } = JSON.parse(box)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  await sleep(500)
}

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
// 定位到果敢老街
await send('Emulation.setGeolocationOverride', { latitude: 23.6919, longitude: 98.7603, accuracy: 30 })
try { await send('Browser.grantPermissions', { origin: BASE, permissions: ['geolocation'] }) } catch (e) {}

console.log('站点:', BASE)
await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
await send('Page.navigate', { url: BASE + '/#/wx/login/index' }); await sleep(14000)
await evaluate('localStorage.clear(); sessionStorage.clear();')
await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
await send('Page.navigate', { url: BASE + '/#/wx/login/index' }); await sleep(14000)

console.log('环境:', await evaluate(`JSON.stringify({ secure: isSecureContext, proto: location.protocol, host: location.host })`))

// 登录
await evaluate(`
  (() => {
    const setVal = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const ins = Array.from(document.querySelectorAll('input'));
    setVal(ins[0], ${JSON.stringify(PHONE)});
    setVal(ins[1], ${JSON.stringify(PASSWORD)});
  })()
`)
await sleep(400)
await realClick('.login-agree-checkd')
await realClick('.xw-login-form-btn')
await sleep(4000)
console.log('登录后地址:', await evaluate('location.href'))

// 直接跳到「附近的人」页面
await send('Page.navigate', { url: BASE + '/#/wx/nearby/index' })
await sleep(12000)
console.log('附近的人 地址:', await evaluate('location.href'))
console.log('弹窗内容:', await evaluate('document.body.innerText.replace(/\\n+/g, " | ").slice(0, 300)'))

// 找「确定」按钮并点击（确认框：返回 | 确定）
const clicked = await evaluate(`
  (() => {
    const all = Array.from(document.querySelectorAll('uni-modal, .uni-modal, uni-view, button, div, span'));
    const btn = all.find(e => e.children.length === 0 && e.innerText && e.innerText.trim() === '确定');
    if (btn) { btn.click(); return '已点击: ' + btn.tagName + '.' + (btn.className || ''); }
    // 退而求其次：按文本找任意可点元素
    const any = all.find(e => e.innerText && e.innerText.trim() === '确定');
    if (any) { any.click(); return '已点击(容器): ' + any.tagName + '.' + (any.className || ''); }
    return '未找到「确定」按钮';
  })()
`)
console.log('确认框处理:', clicked)

await sleep(8000)
console.log('\n===== 点位结果 =====')
console.log('  地址:', await evaluate('location.href'))
const text = await evaluate('document.body.innerText.replace(/\\n+/g, " | ").slice(0, 800)')
console.log('  页面内容:')
console.log('    ' + text)

// 检查是否出现了测试账号的昵称
const names = ['临沧老王', '南伞阿强', '孟定小玉', '清水河老李', '老街阿珍']
const found = []
for (const n of names) {
  const yes = await evaluate(`document.body.innerText.includes(${JSON.stringify(n)})`)
  if (yes) found.push(n)
}
console.log('\n  页面里出现的测试账号:', found.length ? found.join(', ') : '(无)')

console.log('\n控制台错误:', errors.length === 0 ? '(无)' : '')
errors.slice(0, 8).forEach((e) => console.log('  ' + e))
ws.close()
