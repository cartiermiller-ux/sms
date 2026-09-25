// 注入会话列表种子数据后截图，验证「有数据」时的列表布局
// 用法: node msm-shot-seeded.mjs <token> <userId> <outDir>
import fs from 'node:fs'
import path from 'node:path'

const CDP    = 'http://127.0.0.1:9222'
const BASE   = 'http://localhost:5173'
const TOKEN  = process.argv[2]
const USERID = process.argv[3]
const OUT    = process.argv[4] || 'C:\\im-local\\msm-shots3'
const sleep  = ms => new Promise(r => setTimeout(r, ms))

const A1 = 'https://imessage.uno/preview/default-portrait.jpg'
const A2 = 'http://q3z3-im.oss-cn-beijing.aliyuncs.com/18ac0b6aa3d147e6b1a65c2eb838707e.png'
const A3 = 'http://q3z3-im.oss-cn-beijing.aliyuncs.com/0295f6edc9de43748c0d2f25b5057893.png'

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

  console.log('→ 打开首页')
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(9000)

  const seed = {
    '10003': { userId: '10003', windowType: 'SINGLE', nickName: '翻译机器人',
               portrait: A2, content: '你好，这是一条用于验证列表样式的测试消息',
               time: '2026-09-25 11:40:00', num: 2, top: 'N' },
    '10002': { userId: '10002', windowType: 'SINGLE', nickName: '天气机器人',
               portrait: A3, content: '临沧今天多云，23℃',
               time: '2026-09-25 11:32:00', num: 0, top: 'Y' },
    '9001':  { userId: '9001', windowType: 'GROUP', nickName: 'Msm 内测群',
               portrait: JSON.stringify([A1, A2, A3]),
               content: '老王：晚上一起吃饭',
               time: '2026-09-24 20:10:00', num: 128, top: 'N' }
  }

  console.log('→ 注入登录态 + 会话列表种子数据')
  const inj = await send('Runtime.evaluate', {
    expression: `(() => {
      if (typeof uni === 'undefined') return 'NO_UNI';
      uni.setStorageSync('Authorization', ${JSON.stringify(TOKEN)});
      uni.setStorageSync('device', 'H5');
      uni.setStorageSync('version', '1.2.0');
      uni.setStorageSync(${JSON.stringify(USERID + '_chatlistData')}, ${JSON.stringify(JSON.stringify(seed))});
      return 'SEEDED';
    })()`,
    returnByValue: true
  })
  console.log('   ' + JSON.stringify(inj.result && inj.result.value))

  for (const [name, hash] of [['1-messages-list', '#/wx/tabbar1/index']]) {
    console.log('→ ' + name)
    await send('Runtime.evaluate', { expression: `location.hash = ${JSON.stringify(hash)}` })
    await sleep(6000)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(shot.data, 'base64'))
    const info = await send('Runtime.evaluate', {
      expression: `(document.body.innerText || '').slice(0, 200).replace(/\\n+/g,' | ')`,
      returnByValue: true
    })
    console.log('   文本: ' + (info.result && info.result.value))
  }

  ws.close()
  console.log('\n完成')
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
