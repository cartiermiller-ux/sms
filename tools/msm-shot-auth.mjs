// 截取启动页 / 登录页 / 注册页（不注入登录态）
// 用法: node msm-shot-auth.mjs <outDir>
import fs from 'node:fs'
import path from 'node:path'

const CDP  = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'http://localhost:5173'
const OUT  = process.argv[2] || 'C:\\im-local\\msm-auth'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  let targets = null
  for (let i = 0; i < 30; i++) {
    try { targets = await (await fetch(CDP + '/json')).json(); break } catch { await sleep(500) }
  }
  const page = targets.find(t => t.type === 'page')
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
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  console.log('→ 打开首页（清掉登录态）')
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(9000)
  // 清掉可能残留的登录态，确保停在启动页
  await send('Runtime.evaluate', {
    expression: `try{localStorage.removeItem('Authorization')}catch(e){}; 'cleared'`,
    returnByValue: true
  })
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(8000)

  const pages = [
    ['1-splash',   '#/pages/wxindex/index'],
    ['2-login',    '#/wx/login/index'],
    ['3-register', '#/wx/register/index']
  ]

  for (const [name, hash] of pages) {
    console.log('→ ' + name)
    await send('Runtime.evaluate', { expression: `location.hash = ${JSON.stringify(hash)}` })
    await sleep(5000)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(shot.data, 'base64'))
    const info = await send('Runtime.evaluate', {
      expression: `(document.body.innerText || '').slice(0, 200).replace(/\\n+/g,' | ')`,
      returnByValue: true
    })
    console.log('   文本: ' + (info.result && info.result.value))
  }

  ws.close()
  console.log('\n完成 -> ' + OUT)
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
