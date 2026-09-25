// 播种会话数据后截「消息」页，并取列表行的计算样式作为 V2EX 改造证据
// 用法: node v2ex-rows.mjs <outDir> [phone] [password]
import fs from 'node:fs'
import path from 'node:path'

const CDP = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'http://127.0.0.1:5173'
const OUT = process.argv[2] || 'C:\\im-local\\msm-v2ex-rows'
const PHONE = process.argv[3] || '13900000001'
const PASSWORD = process.argv[4] || 'abc12345'
const USERID = process.argv[5] || '2103012881370374145'
const sleep = ms => new Promise(r => setTimeout(r, ms))

let send, evaluate

async function connect() {
  let page = null
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(CDP + '/json/list')).json()
      page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) break
    } catch { /* 等 Chrome */ }
    await sleep(500)
  }
  if (!page) throw new Error('连不上 CDP')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')) })
  let seq = 0
  const pending = new Map()
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
    }
  }
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
  return ws
}

const A1 = 'https://imessage.uno/preview/default-portrait.jpg'
const A2 = 'https://imessage.uno/preview/default-portrait.jpg'
const A3 = 'https://imessage.uno/preview/default-portrait.jpg'

const seed = {
  '10003': { userId: '10003', windowType: 'SINGLE', nickName: '翻译机器人',
             portrait: A2, content: '你好，这是一条用于验证列表样式的测试消息',
             time: '2026-09-25 11:40:00', num: 2, top: 'N' },
  '10002': { userId: '10002', windowType: 'SINGLE', nickName: '天气机器人',
             portrait: A3, content: '临沧今天多云，23℃',
             time: '2026-09-25 11:32:00', num: 0, top: 'Y' },
  '9001':  { userId: '9001', windowType: 'GROUP', nickName: 'Msm 内测群',
             portrait: JSON.stringify([A1, A2, A3]),
             content: '老王：晚上一起吃饭，老地方见',
             time: '2026-09-24 20:10:00', num: 128, top: 'N' }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const ws = await connect()
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  console.log('=== 1. 清态 → 登录 ===')
  await send('Page.navigate', { url: BASE + '/' }); await sleep(8000)
  await evaluate(`try{localStorage.clear()}catch(e){}; 'ok'`)
  await send('Page.navigate', { url: BASE + '/#/wx/login/index' }); await sleep(8000)

  const loginOut = await evaluate(`
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const setVal = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const ins = Array.from(document.querySelectorAll('input'));
      if (ins[0]) setVal(ins[0], ${JSON.stringify(PHONE)});
      if (ins[1]) setVal(ins[1], ${JSON.stringify(PASSWORD)});
      await sleep(500);
      const a = document.querySelector('.auth__agree-tap'); if (a) a.click();
      await sleep(400);
      const b = document.querySelector('.auth__submit'); if (b) b.click();
      await sleep(7000);
      return localStorage.getItem('Authorization') || '';
    })()
  `)
  console.log('   token: ' + (loginOut ? loginOut.slice(0, 10) + '…(' + loginOut.length + ')' : '(空)'))
  if (!loginOut) throw new Error('登录失败')

  console.log('\n=== 2. 播种会话列表数据（localStorage 字符串原样存）===')
  const seeded = await evaluate(`(() => {
    try {
      localStorage.setItem(${JSON.stringify(USERID + '_chatlistData')}, ${JSON.stringify(JSON.stringify(seed))});
      return 'SEEDED len=' + localStorage.getItem(${JSON.stringify(USERID + '_chatlistData')}).length;
    } catch (e) { return 'ERR:' + e.message }
  })()`)
  console.log('   ' + seeded)

  console.log('\n=== 3. 重新加载让 store 读到种子数据 ===')
  await send('Page.navigate', { url: BASE + '/#/wx/tabbar1/index' })
  await sleep(9000)

  const s = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(OUT, '1-消息-有会话.png'), Buffer.from(s.data, 'base64'))
  const txt = await evaluate(`(document.body.innerText||'').slice(0,220).replace(/\\n+/g,' | ')`)
  console.log('   文本: ' + txt)

  console.log('\n=== 4. 列表行计算样式（证据）===')
  const ev = await evaluate(`
    (() => {
      const pick = (sel, props) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, found: false };
        const cs = getComputedStyle(el);
        const o = { sel, found: true };
        props.forEach(p => o[p] = cs[p]);
        return o;
      };
      return JSON.stringify({
        row:       pick('.msm-row', ['display','alignItems','paddingTop','paddingBottom','backgroundColor','borderBottomWidth','borderBottomColor','height']),
        rowTitle:  pick('.msm-row__title', ['color','fontWeight','fontSize']),
        rowDesc:   pick('.msm-row__desc', ['color','fontSize']),
        rowMeta:   pick('.msm-row__meta', ['color','fontSize']),
        avatar:    pick('.msm-row__avatar', ['width','height','borderRadius']),
        groupAvt:  pick('.msm-row__avatar--group', ['display','flexWrap','borderRadius']),
        miniAvt:   pick('.msm-row__avatar-mini', ['width','height']),
        badge:     pick('.msm-badge', ['backgroundColor','color','borderRadius','fontSize']),
        tabsItem:  pick('.msm-tabs__item', ['color','fontSize','paddingTop','paddingBottom']),
        tabsOn:    pick('.msm-tabs__item--active', ['color','fontWeight']),
        search:    pick('.msm-search', ['height','backgroundColor','borderRadius']),
        rowCount:  document.querySelectorAll('.msm-row').length,
        badgeText: (document.querySelector('.msm-badge')||{}).innerText || null,
        rowTexts:  Array.from(document.querySelectorAll('.msm-row')).map(r => (r.innerText||'').replace(/\\n+/g,' / ').slice(0,70))
      }, null, 1);
    })()
  `)
  console.log(ev)
  fs.writeFileSync(path.join(OUT, '_rows-evidence.json'), ev, 'utf8')
  ws.close()
  console.log('\n完成 -> ' + OUT)
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
