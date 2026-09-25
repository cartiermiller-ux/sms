// 在已打开的 Chrome 页面里执行任意表达式，用于跨域/接口联调验证
// 用法: node cdp-eval.mjs "<js表达式>" [cdpPort]

const EXPR = process.argv[2]
const CDP_PORT = Number(process.argv[3] || 9222)

if (!EXPR) {
  console.error('缺少表达式参数')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let page
  for (let i = 0; i < 20; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) break
    } catch (e) {}
    await sleep(500)
  }
  if (!page) throw new Error('未找到可用的页面目标')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let seq = 0
  const pending = new Map()
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error('WebSocket 连接失败'))
  })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    }
  }
  const send = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Runtime.enable')
  const r = await send('Runtime.evaluate', {
    expression: EXPR,
    returnByValue: true,
    awaitPromise: true
  })
  console.log('页面地址:', page.url)
  console.log('执行结果:')
  console.log(typeof r.result?.value === 'string' ? r.result.value : JSON.stringify(r.result?.value, null, 2))
  if (r.exceptionDetails) {
    console.error('页面内异常:', r.exceptionDetails.text, r.exceptionDetails.exception?.description || '')
    process.exitCode = 1
  }
  ws.close()
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(2)
})
