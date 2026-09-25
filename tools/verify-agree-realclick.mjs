// 用真实鼠标事件（而非 JS .click()）复现「已阅读并同意」勾选框的状态错乱
// 用法: node verify-agree-realclick.mjs <cdpPort>

const CDP_PORT = Number(process.argv[2] || 9222)
const BASE_URL = process.argv[3] || 'http://127.0.0.1:5173'
const PAGE = process.argv[4] || '/#/wx/login/index'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let lastClickInfo = null

async function findPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (p) return p
    } catch (e) {}
    await sleep(500)
  }
  throw new Error('未找到页面目标')
}

const main = async () => {
  const page = await findPage()
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let seq = 0
  const pending = new Map()
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 连接失败')) })
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
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
    // 关键：先把元素滚进视口，否则在无头浏览器的小视口下点击坐标会落在视口外
    const box = await evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        return JSON.stringify({
          x: cx, y: cy, w: r.width, h: r.height,
          viewport: { w: innerWidth, h: innerHeight },
          hitTag: hit ? hit.tagName + '.' + (hit.className || '') : null
        });
      })()
    `)
    if (!box) throw new Error('找不到元素: ' + selector)
    const info = JSON.parse(box)
    lastClickInfo = info
    const { x, y } = info
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    await sleep(400)
  }

  // uni-app 用 .uni-checkbox-input 内是否注入 <svg> 表示勾选
  const isChecked = () => evaluate(`
    (() => {
      const el = document.querySelector('uni-checkbox .uni-checkbox-input');
      return el ? !!el.querySelector('svg') : null;
    })()
  `)

  const reset = async () => {
    // 必须先离开再回来，否则 SPA 的同 URL 导航不会重新加载，组件状态会残留
    await send('Page.navigate', { url: 'about:blank' })
    await sleep(1500)
    await send('Page.navigate', { url: BASE_URL + PAGE })
    await sleep(9000)
    await evaluate('localStorage.clear(); sessionStorage.clear();')
    await send('Page.navigate', { url: 'about:blank' })
    await sleep(1500)
    await send('Page.navigate', { url: BASE_URL + PAGE })
    await sleep(10000)
  }

  const fillForm = () => evaluate(`
    (() => {
      const setVal = (el, val) => {
        const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        s.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const ins = Array.from(document.querySelectorAll('input'));
      setVal(ins[0], '13800000002');
      setVal(ins[1], 'abc12345');
      return ins.length;
    })()
  `)

  const tryLogin = async () => {
    const before = await evaluate(`
      (() => {
        const ins = Array.from(document.querySelectorAll('input'));
        const cb = document.querySelector('uni-checkbox .uni-checkbox-input');
        return JSON.stringify({
          phone: ins[0] ? ins[0].value : null,
          pwdLen: ins[1] ? ins[1].value.length : null,
          勾选视觉: cb ? !!cb.querySelector('svg') : null
        });
      })()
    `)
    console.log('  点登录前的表单状态:', before)
    await realClick('.xw-login-form-btn')
    await sleep(1200)
    const r = await evaluate(`
      (() => {
        const toast = Array.from(document.querySelectorAll('uni-toast')).map(e => e.innerText.trim()).filter(Boolean).join(' | ');
        return JSON.stringify({ url: location.href, toast, loggedIn: location.href.includes('tabbar') });
      })()
    `)
    return JSON.parse(r)
  }

  console.log('===== 场景 A：真实鼠标点击 1 次 =====')
  await reset()
  await fillForm()
  console.log('  点击前是否勾选:', await isChecked())
  await realClick('.login-agree-checkd')
  console.log('  点击落点:', JSON.stringify(lastClickInfo))
  const afterOne = await isChecked()
  console.log('  点击 1 次后是否勾选:', afterOne)
  const loginA = await tryLogin()
  console.log('  点登录结果:', JSON.stringify(loginA))

  console.log('')
  console.log('===== 场景 B：真实鼠标点击 2 次（用户"确认一下"再点一次）=====')
  await reset()
  await fillForm()
  await realClick('.login-agree-checkd')
  console.log('  点击 1 次后是否勾选:', await isChecked())
  await realClick('.login-agree-checkd')
  const afterTwo = await isChecked()
  console.log('  点击 2 次后是否勾选:', afterTwo)
  const loginB = await tryLogin()
  console.log('  点登录结果:', JSON.stringify(loginB))

  ws.close()
}

main().catch((e) => { console.error('失败:', e.message); process.exit(2) })
