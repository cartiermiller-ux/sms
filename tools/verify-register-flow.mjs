// 完整注册流程测试：填手机号 → 获取验证码(自动回填) → 填密码/昵称 → 勾选协议 → 点注册
// 用法: node verify-register-flow.mjs <cdpPort> <baseUrl> <phone> <password> <nickName>

const CDP_PORT = Number(process.argv[2] || 9222)
const BASE_URL = process.argv[3] || 'http://127.0.0.1:5173'
const PHONE = process.argv[4] || '13800000009'
const PASSWORD = process.argv[5] || 'abc12345'
const NICK = process.argv[6] || '端到端测试'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
if (!page) { console.error('未找到页面目标'); process.exit(2) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
const consoleMsgs = []
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 连接失败')) })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  } else if (m.method === 'Runtime.consoleAPICalled') {
    consoleMsgs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '))
  }
}
const send = (method, params) =>
  new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
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
      return JSON.stringify({ x: r.left + r.width/2, y: r.top + r.height/2, w: r.width });
    })()
  `)
  if (!box) throw new Error('找不到元素: ' + selector)
  const { x, y } = JSON.parse(box)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  await sleep(400)
}

const toast = () => evaluate(`
  Array.from(document.querySelectorAll('uni-toast')).map(e => e.innerText.trim()).filter(Boolean).join(' | ')
`)

await send('Runtime.enable')
await send('Page.enable')

console.log('打开注册页:', BASE_URL + '/#/wx/register/index')
await send('Page.navigate', { url: 'about:blank' })
await sleep(1000)
await send('Page.navigate', { url: BASE_URL + '/#/wx/register/index' })
await sleep(12000)
await evaluate('localStorage.clear(); sessionStorage.clear();')
await send('Page.navigate', { url: 'about:blank' })
await sleep(1000)
await send('Page.navigate', { url: BASE_URL + '/#/wx/register/index' })
await sleep(12000)

// 1) 填手机号
await evaluate(`
  (() => {
    const setVal = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const ins = Array.from(document.querySelectorAll('input'));
    setVal(ins[0], ${JSON.stringify(PHONE)});   // 手机号
    setVal(ins[2], ${JSON.stringify(PASSWORD)}); // 密码
    setVal(ins[3], ${JSON.stringify(NICK)});     // 昵称
    return ins.length;
  })()
`)
await sleep(500)
console.log('已填手机号/密码/昵称，输入框共', await evaluate('document.querySelectorAll("input").length'), '个')

// 2) 点「获取验证码」
await realClick('.xw-login-form-item:nth-child(2) .wx-btn')
await sleep(3000)
const codeVal = await evaluate('document.querySelectorAll("input")[1] ? document.querySelectorAll("input")[1].value : "(无)"')
console.log('点击「获取验证码」后，验证码输入框自动填为:', codeVal, '  提示:', await toast())

// 3) 勾选协议
await realClick('.login-agree-checkd')
const checked = await evaluate(`
  (() => { const el = document.querySelector('uni-checkbox .uni-checkbox-input'); return el ? !!el.querySelector('svg') : null; })()
`)
console.log('点一次协议勾选框后，视觉状态:', checked ? '已勾选' : '未勾选')

// 4) 点注册
await realClick('.xw-login-form-btn')
await sleep(1500)
const t1 = await toast()
await sleep(3000)
const url = await evaluate('location.href')
console.log('点「注册」后 → 提示:', JSON.stringify(t1), ' 当前地址:', url)

console.log('\n控制台输出:')
consoleMsgs.slice(-8).forEach((m) => console.log('  ' + m))
ws.close()
