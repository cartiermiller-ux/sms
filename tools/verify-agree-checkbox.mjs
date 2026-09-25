// 检查登录页「已阅读并同意」勾选框的视觉状态与点击行为
// 用法: node verify-agree-checkbox.mjs <cdpPort>

const CDP_PORT = Number(process.argv[2] || 9222)
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
  // 先清掉登录态，否则会被重定向到聊天页
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/#/wx/login/index' })
  await sleep(4000)
  await send('Runtime.evaluate', { expression: 'localStorage.clear(); sessionStorage.clear();' })
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/#/wx/login/index' })
  await sleep(10000)

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }

  const report = await evaluate(`
    (async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const out = { steps: [] };

      const snap = (label) => {
        const cb = document.querySelector('uni-checkbox');
        const inner = document.querySelector('uni-checkbox .uni-checkbox-input');
        out.steps.push({
          step: label,
          视觉class: inner ? inner.className : '(无)',
          组件html: cb ? cb.outerHTML.replace(/\\s+/g, ' ').slice(0, 240) : '(无)',
          label的for: (() => { const l = document.querySelector('.login-agree-checkd label'); return l ? l.getAttribute('for') : null; })(),
          id为agree的元素: (() => { const e = document.getElementById('agree'); return e ? e.tagName + '.' + e.className : null; })()
        });
      };

      snap('初始');
      const box = document.querySelector('.login-agree-checkd');
      box.click();
      await sleep(500);
      snap('点击 1 次后');
      box.click();
      await sleep(500);
      snap('点击 2 次后');
      box.click();
      await sleep(500);
      snap('点击 3 次后');
      return JSON.stringify(out, null, 2);
    })()
  `)
  console.log(report)
  ws.close()
}

main().catch((e) => { console.error('失败:', e.message); process.exit(2) })
