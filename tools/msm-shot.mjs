// 用 CDP 驱动无头 Chrome，注入登录态后逐页截图
// 用法: node msm-shot.mjs <token> <outDir>
import fs from 'node:fs'
import path from 'node:path'

const CDP   = 'http://127.0.0.1:9222'
const BASE  = process.env.MSM_BASE || 'http://localhost:5173'
const TOKEN = process.argv[2]
const OUT   = process.argv[3] || 'C:\\im-local\\msm-shots'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  if (!TOKEN) { console.error('缺少 token'); process.exit(2) }
  fs.mkdirSync(OUT, { recursive: true })

  // 等 Chrome 的调试端口起来
  let targets = null
  for (let i = 0; i < 30; i++) {
    try { targets = await (await fetch(CDP + '/json')).json(); break } catch { await sleep(500) }
  }
  if (!targets) { console.error('连不上 CDP'); process.exit(3) }
  const page = targets.find(t => t.type === 'page')
  if (!page) { console.error('没有 page target'); process.exit(4) }

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let seq = 0
  const pending = new Map()
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id)
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
    }
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  })

  console.log('→ 打开首页')
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(9000)

  console.log('→ 注入登录态')
  // uni-app H5 的 storage：字符串原样存，非字符串才包 {type,data}
  // 生产构建里 uni 不是全局对象，所以直接写 localStorage（开发/线上都适用）
  const inj = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        localStorage.setItem('Authorization', ${JSON.stringify(TOKEN)});
        localStorage.setItem('device', 'H5');
        localStorage.setItem('version', '1.2.0');
        return 'OK:' + (localStorage.getItem('Authorization') || '');
      } catch (e) { return 'ERR:' + e.message }
    })()`,
    returnByValue: true
  })
  console.log('   ' + JSON.stringify(inj.result && inj.result.value))

  const pages = [
    ['1-messages',  '#/wx/tabbar1/index'],
    ['2-contacts',  '#/wx/tabbar2/index'],
    ['3-discover',  '#/wx/tabbar3/index'],
    ['4-me',        '#/wx/tabbar4/index']
  ]

  for (const [name, hash] of pages) {
    console.log('→ ' + name)
    await send('Runtime.evaluate', { expression: `location.hash = ${JSON.stringify(hash)}` })
    await sleep(5000)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    const file = path.join(OUT, name + '.png')
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
    console.log('   已存 ' + file)

    // 顺便把当前路由与关键文案抓回来，确认真的渲染了
    const info = await send('Runtime.evaluate', {
      expression: `(document.body.innerText || '').slice(0, 160).replace(/\\n+/g,' | ')`,
      returnByValue: true
    })
    console.log('   文本: ' + (info.result && info.result.value))
  }

  ws.close()
  console.log('\n完成')
}

main().catch(e => { console.error('失败:', e.message); process.exit(1) })
