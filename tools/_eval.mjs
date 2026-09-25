// 在已连接的 Chrome 页面上执行一段表达式
// 用法: node _eval.mjs "<expression>"
const CDP = 'http://127.0.0.1:9222'
const expr = process.argv[2]
if (!expr) { console.error('缺少表达式'); process.exit(2) }

const list = await (await fetch(CDP + '/json/list')).json()
const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
if (!page) { console.error('没有 page target'); process.exit(3) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')) })

let seq = 0
const pend = new Map()
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
}
const send = (method, params = {}) => new Promise(res => {
  const id = ++seq; pend.set(id, res)
  ws.send(JSON.stringify({ id, method, params }))
})

await send('Runtime.enable')
const m = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
if (m.result?.exceptionDetails) console.log('异常: ' + JSON.stringify(m.result.exceptionDetails, null, 1))
else console.log(typeof m.result?.result?.value === 'string' ? m.result.result.value : JSON.stringify(m.result?.result?.value, null, 1))
ws.close()
