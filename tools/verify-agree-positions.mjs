// 在手机视口下，测试协议行内不同点击位置的行为是否一致
// 用法: node verify-agree-positions.mjs <cdpPort> <baseUrl>

const CDP_PORT = Number(process.argv[2] || 9222)
const BASE_URL = process.argv[3] || 'http://127.0.0.1:5173'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
if (!page) { console.error('未找到页面'); process.exit(2) }

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
  const id = ++seq; pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
  return r.result?.value
}

await send('Runtime.enable')
await send('Page.enable')
// 模拟真机竖屏
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })

const reload = async () => {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
  await send('Page.navigate', { url: BASE_URL + '/#/wx/login/index' }); await sleep(13000)
  await evaluate('localStorage.clear(); sessionStorage.clear();')
  await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
  await send('Page.navigate', { url: BASE_URL + '/#/wx/login/index' }); await sleep(13000)
}

const clickAt = async (dxRatio) => {
  const info = JSON.parse(await evaluate(`
    (() => {
      const el = document.querySelector('.login-agree-checkd');
      if (!el) return 'null';
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width * ${dxRatio};
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return JSON.stringify({ x, y, w: Math.round(r.width), h: Math.round(r.height), hit: hit ? hit.tagName + '.' + (hit.className||'').slice(0,30) : null });
    })()
  `))
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: info.x, y: info.y, button: 'none', clickCount: 0 })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: info.x, y: info.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: info.x, y: info.y, button: 'left', clickCount: 1 })
  await sleep(500)
  const checked = await evaluate(`(() => { const el = document.querySelector('uni-checkbox .uni-checkbox-input'); return el ? !!el.querySelector('svg') : null; })()`)
  return { info, checked }
}

console.log('目标:', BASE_URL)
await reload()
const size = await evaluate(`(() => { const el = document.querySelector('.login-agree-checkd'); if(!el) return '未找到'; const r = el.getBoundingClientRect(); return '行尺寸 ' + Math.round(r.width) + 'x' + Math.round(r.height) + '  @ y=' + Math.round(r.top) + '  视口高 ' + innerHeight; })()`)
console.log('协议行:', size)
console.log('')

for (const [label, ratio] of [['最左(勾选框上)', 0.04], ['中部', 0.5], ['最右(文字上)', 0.96]]) {
  await reload()
  const r = await clickAt(ratio)
  console.log(`  点击${label}  x比例=${ratio}`)
  console.log(`    落点命中: ${r.info.hit}   行列宽 ${r.info.w}px`)
  console.log(`    点击后视觉: ${r.checked ? '已勾选' : '未勾选'}`)
}
ws.close()
