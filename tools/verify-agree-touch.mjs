// 用真实【触摸事件】测试协议勾选框（模拟真机手指点击，而不是鼠标点击）
// 用法: node verify-agree-touch.mjs <cdpPort> <baseUrl> <phone> <password>

const CDP_PORT = Number(process.argv[2] || 9222)
const BASE_URL = process.argv[3] || 'http://120.24.175.80'
const PHONE = process.argv[4] || '13900000001'
const PASSWORD = process.argv[5] || 'abc12345'

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
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
  return r.result?.value
}

await send('Runtime.enable')
await send('Page.enable')
// 真机竖屏 + 开启触摸模拟
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

const reload = async () => {
  await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
  await send('Page.navigate', { url: BASE_URL + '/#/wx/login/index' }); await sleep(13000)
  await evaluate('localStorage.clear(); sessionStorage.clear();')
  await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
  await send('Page.navigate', { url: BASE_URL + '/#/wx/login/index' }); await sleep(13000)
}

// 真机手指点击：touchStart -> touchEnd
const touchTap = async (selector, dxRatio = 0.5) => {
  const info = JSON.parse(await evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return 'null';
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width * ${dxRatio};
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return JSON.stringify({ x, y, w: Math.round(r.width), h: Math.round(r.height),
        hit: hit ? hit.tagName + '.' + (hit.className||'').slice(0,28) : null });
    })()
  `))
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: info.x, y: info.y }] })
  await sleep(60)
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await sleep(500)
  const checked = await evaluate(`(() => { const el = document.querySelector('uni-checkbox .uni-checkbox-input'); return el ? !!el.querySelector('svg') : null; })()`)
  return { info, checked }
}

const fillForm = () => evaluate(`
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
    return ins.length;
  })()
`)

const toast = () => evaluate(`Array.from(document.querySelectorAll('uni-toast')).map(e=>e.innerText.trim()).filter(Boolean).join(' | ')`)

console.log('目标:', BASE_URL, ' 触摸模拟已开启')

console.log('\n===== 场景 A：真机触摸点 1 次 =====')
await reload()
await fillForm()
await sleep(400)
let r = await touchTap('.login-agree-checkd')
console.log('  落点:', r.info.hit, ' 行尺寸', r.info.w + 'x' + r.info.h)
console.log('  点击后视觉:', r.checked ? '已勾选' : '未勾选')
await touchTap('.xw-login-form-btn')
await sleep(1200)
console.log('  点登录提示:', JSON.stringify(await toast()))
await sleep(2500)
console.log('  当前地址:', await evaluate('location.href'))

console.log('\n===== 场景 B：真机触摸点 2 次 =====')
await reload()
await fillForm()
await sleep(400)
await touchTap('.login-agree-checkd')
let c1 = await evaluate(`(() => { const el=document.querySelector('uni-checkbox .uni-checkbox-input'); return el?!!el.querySelector('svg'):null; })()`)
await touchTap('.login-agree-checkd')
let c2 = await evaluate(`(() => { const el=document.querySelector('uni-checkbox .uni-checkbox-input'); return el?!!el.querySelector('svg'):null; })()`)
console.log('  第1次后:', c1 ? '已勾选' : '未勾选', '  第2次后:', c2 ? '已勾选' : '未勾选')
await touchTap('.xw-login-form-btn')
await sleep(1200)
console.log('  点登录提示:', JSON.stringify(await toast()))

console.log('\n===== 场景 C：真机触摸点勾选框圆圈本身（最左）=====')
await reload()
await fillForm()
await sleep(400)
r = await touchTap('.login-agree-checkd', 0.04)
console.log('  落点:', r.info.hit)
console.log('  点击后视觉:', r.checked ? '已勾选' : '未勾选')
await touchTap('.xw-login-form-btn')
await sleep(1500)
console.log('  点登录提示:', JSON.stringify(await toast()))
await sleep(2500)
console.log('  当前地址:', await evaluate('location.href'))
console.log('  是否已登录:', await evaluate(`(typeof uni !== 'undefined' && uni.getStorageSync('Authorization')) ? '是，已拿到 token' : '否'`))

ws.close()
