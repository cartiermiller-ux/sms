// 端到端跑一遍登录：填手机号/密码 → 勾选协议 → 点登录 → 看结果
// 用法: node verify-login-flow.mjs <cdpPort> <phone> <password>

const CDP_PORT = Number(process.argv[2] || 9222)
const PHONE = process.argv[3] || '13800000002'
const PASSWORD = process.argv[4] || 'abc12345'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/#/wx/login/index' })
  await sleep(12000)

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }

  // 1) 填表单 + 勾选协议 + 点登录，整个过程放在页面里同步完成
  const result = await evaluate(`
    (async () => {
      const out = {};
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const inputs = Array.from(document.querySelectorAll('input'));
      out.inputCount = inputs.length;
      out.placeholders = inputs.map(i => i.placeholder);
      // 手机号 = 第一个 input，密码 = 第二个
      if (inputs[0]) setVal(inputs[0], ${JSON.stringify(PHONE)});
      if (inputs[1]) setVal(inputs[1], ${JSON.stringify(PASSWORD)});
      await sleep(300);
      out.filledPhone = inputs[0] ? inputs[0].value : null;
      out.filledPwdLen = inputs[1] ? inputs[1].value.length : null;

      // 勾选协议
      const box = document.querySelector('.login-agree-checkd');
      out.agreeBoxFound = !!box;
      if (box) box.click();
      await sleep(400);

      out.checkedClass = (() => {
        const cb = document.querySelector('uni-checkbox .uni-checkbox-input');
        return cb ? cb.className : '(未找到 checkbox 元素)';
      })();
      out.checkedAttr = (() => {
        const cb = document.querySelector('uni-checkbox input[type=checkbox]');
        return cb ? cb.checked : null;
      })();

      // 点登录
      const btn = document.querySelector('.xw-login-form-btn');
      out.loginBtnFound = !!btn;
      if (btn) btn.click();
      await sleep(4000);

      out.url = location.href;
      out.token = (() => { try { return uni.getStorageSync('Authorization') || ''; } catch (e) { return 'ERR ' + e.message; } })();
      out.toastText = Array.from(document.querySelectorAll('uni-toast, .uni-toast'))
        .map(e => e.innerText.trim()).filter(Boolean).join(' | ');
      return JSON.stringify(out, null, 2);
    })()
  `)

  console.log('=========== 登录流程测试 ===========')
  console.log(result)
  ws.close()
}

main().catch((e) => { console.error('失败:', e.message); process.exit(2) })
