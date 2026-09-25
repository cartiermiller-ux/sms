// WebSocket 连通性验证：模拟前端 socketTask 的握手与心跳
// 用法: node verify-ws.mjs <token> [wsBase]
const token = process.argv[2]
const wsBase = process.argv[3] || 'ws://127.0.0.1:8080'

if (!token) {
  console.error('缺少 token 参数')
  process.exit(2)
}

const url = `${wsBase}/ws?Authorization=${token}`
console.log('连接:', url)

const ws = new WebSocket(url)
let settled = false

const done = (code, msg) => {
  if (settled) return
  settled = true
  console.log(msg)
  try { ws.close() } catch (e) {}
  process.exit(code)
}

const timer = setTimeout(() => done(1, '超时: 15 秒内未收到任何事件'), 15000)

ws.onopen = () => {
  console.log('握手成功: WebSocket 已打开')
  ws.send('isConnact')
}

ws.onmessage = (ev) => {
  console.log('收到消息:', JSON.stringify(ev.data))
  if (ev.data === 'ok') {
    clearTimeout(timer)
    done(0, '心跳返回 ok，WebSocket 链路正常')
  }
}

ws.onerror = (e) => {
  clearTimeout(timer)
  done(1, 'WebSocket 错误: ' + (e.message || JSON.stringify(e)))
}

ws.onclose = (e) => {
  clearTimeout(timer)
  if (!settled) done(1, `WebSocket 被关闭 code=${e.code} reason=${e.reason || '(空)'}`)
}
