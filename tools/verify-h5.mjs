// 通过 Chrome DevTools Protocol 真实渲染 H5 页面，并收集控制台错误
// 用法: node verify-h5.mjs [url] [cdpPort]

const TARGET_URL = process.argv[2] || 'http://127.0.0.1:5173/'
const CDP_PORT = Number(process.argv[3] || 9222)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch (e) {
      // Chrome 还没起来
    }
    await sleep(500)
  }
  throw new Error('未能连接到 Chrome 调试端口 ' + CDP_PORT)
}

async function main() {
  const target = await findPageTarget()
  console.log('已连接调试目标:', target.url || '(about:blank)')

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let seq = 0
  const pending = new Map()
  const consoleMsgs = []
  const errors = []

  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = (e) => reject(new Error('WebSocket 连接失败'))
  })

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
      return
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args
        .map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type))
        .join(' ')
      consoleMsgs.push(`[${msg.params.type}] ${text}`)
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      errors.push(`[未捕获异常] ${d.text} ${d.exception?.description || ''}`.trim())
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry
      if (e.level === 'error') errors.push(`[${e.source}] ${e.text}`)
    }
  }

  const send = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Runtime.enable')
  await send('Log.enable')
  await send('Page.enable')

  console.log('正在加载:', TARGET_URL)
  await send('Page.navigate', { url: TARGET_URL })
  await sleep(15000)

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    return r.result?.value
  }

  const href = await evaluate('location.href')
  const appChildCount = await evaluate('document.getElementById("app") ? document.getElementById("app").children.length : -1')
  const uniPageCount = await evaluate('document.querySelectorAll("uni-page").length')
  const bodyText = await evaluate('document.body.innerText.slice(0, 500)')
  const canvasCount = await evaluate('document.querySelectorAll("uni-app, uni-page, .uni-app--showtabbar").length')

  // 触发一次真实接口调用，验证跨域与后端连通
  const apiProbe = await evaluate(`
    (async () => {
      try {
        const r = await fetch('${TARGET_URL.replace(/\/$/, '')}', { method: 'GET' })
        return 'page ok ' + r.status
      } catch (e) { return 'ERR ' + e.message }
    })()
  `)

  console.log('\n================ 渲染结果 ================')
  console.log('location.href       :', href)
  console.log('#app 子节点数        :', appChildCount)
  console.log('uni-page 元素数      :', uniPageCount)
  console.log('uni-app 容器数       :', canvasCount)
  console.log('页面可见文本(前500)  :', JSON.stringify(bodyText))
  console.log('探针                 :', apiProbe)

  console.log('\n================ 控制台输出 ================')
  if (consoleMsgs.length === 0) console.log('(无)')
  else consoleMsgs.slice(0, 40).forEach((m) => console.log(m))

  console.log('\n================ 错误 ================')
  if (errors.length === 0) console.log('(无)')
  else errors.slice(0, 40).forEach((m) => console.log(m))

  const ok = appChildCount > 0 && errors.length === 0
  console.log('\n判定:', ok ? '通过 - 页面渲染成功且无错误' : '需关注 - 见上方输出')
  ws.close()
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error('失败:', e.message)
  process.exit(2)
})
