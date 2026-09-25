// 量取线上页面真实渲染尺寸（CSS px）
// 用法: node msm-measure.mjs
const CDP  = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'https://imessage.uno'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
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
  // 按 6.7 英寸手机：CSS 视口约 412 x 915
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true })

  await send('Page.navigate', { url: BASE + '/' })
  await sleep(9000)
  // 注入登录态（字符串原样存）便于量取「有数据」时的行高；同时给会话列表塞种子
  const TOKEN = process.env.MSM_TOKEN || ''
  const USERID = process.env.MSM_USERID || '2103012881370374145'
  const A2 = 'http://q3z3-im.oss-cn-beijing.aliyuncs.com/18ac0b6aa3d147e6b1a65c2eb838707e.png'
  const A3 = 'http://q3z3-im.oss-cn-beijing.aliyuncs.com/0295f6edc9de43748c0d2f25b5057893.png'
  const seed = {
    '10003': { userId: '10003', windowType: 'SINGLE', nickName: '翻译机器人', portrait: A2,
               content: 'Translation completed', time: '2026-09-25 11:42:00', num: 2, top: 'N' },
    '10002': { userId: '10002', windowType: 'SINGLE', nickName: '天气机器人', portrait: A3,
               content: '明天 24°C', time: '2026-09-24 20:10:00', num: 0, top: 'N' }
  }
  await send('Runtime.evaluate', {
    expression: `try{
      ${TOKEN ? `localStorage.setItem('Authorization', ${JSON.stringify(TOKEN)});` : ''}
      localStorage.setItem(${JSON.stringify(USERID + '_chatlistData')}, ${JSON.stringify(JSON.stringify(seed))});
      localStorage.setItem('device','H5'); localStorage.setItem('version','1.3.0');
    }catch(e){}; 'x'`, returnByValue: true
  })

  const measure = `(() => {
    const out = [];
    const H = el => el ? Math.round(el.getBoundingClientRect().height) : null;
    const pick = sel => document.querySelector(sel);
    const all = sel => Array.from(document.querySelectorAll(sel));
    return {
      viewport: window.innerWidth + ' x ' + window.innerHeight,
      dpr: window.devicePixelRatio,
      bodyScrollH: Math.round(document.body.scrollHeight)
    };
  })()`

  console.log('=== 启动页 ===')
  await send('Runtime.evaluate', { expression: `location.hash = '#/pages/wxindex/index'` })
  await sleep(4000)
  let r = await send('Runtime.evaluate', { expression: `
    (() => {
      const g = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null };
      const fs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : null };
      const c = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).color : null };
      return JSON.stringify({
        视口: window.innerWidth + ' x ' + window.innerHeight,
        启动页_Logo字号: fs('.splash__logo'),
        启动页_标语字号: fs('.splash__tagline-en'),
        启动页_按钮高: g('.splash__btn'),
        启动页_副标题字号: fs('.splash__tagline-cn'),
        启动页_底部安全距离: g('.splash__footer')
      }, null, 1);
    })()`, returnByValue: true })
  console.log(r.result.value)

  console.log('\n=== 登录页 ===')
  await send('Runtime.evaluate', { expression: `location.hash = '#/wx/login/index'` })
  await sleep(4500)
  r = await send('Runtime.evaluate', { expression: `
    (() => {
      const g = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null };
      const w = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().width) : null };
      const fs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : null };
      const pad = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).padding : null };
      const gap = (a,b) => {
        const A = document.querySelector(a), B = document.querySelector(b);
        if (!A || !B) return null;
        return Math.round(B.getBoundingClientRect().top - A.getBoundingClientRect().bottom);
      };
      const auth = document.querySelector('.auth');
      return JSON.stringify({
        视口: window.innerWidth + ' x ' + window.innerHeight,
        页面scrollHeight: document.body.scrollHeight,
        auth高度: auth ? Math.round(auth.getBoundingClientRect().height) : null,
        auth内边距: pad('.auth'),
        返回栏高: g('.auth__nav'),
        品牌头高: g('.auth__head'),
        Logo字号: fs('.auth__logo'),
        标题字号: fs('.auth__title'),
        标题: document.querySelector('.auth__title') ? document.querySelector('.auth__title').textContent : null,
        副标题字号: fs('.auth__sub'),
        字段标签字号: fs('.field__label'),
        输入框高: g('.field__box'),
        输入框圆角: document.querySelector('.field__box') ? getComputedStyle(document.querySelector('.field__box')).borderRadius : null,
        字段间距: gap('.field', '.field'),
        主按钮高: g('.auth__submit'),
        主按钮圆角: document.querySelector('.auth__submit') ? getComputedStyle(document.querySelector('.auth__submit')).borderRadius : null,
        协议行高: g('.auth__agree'),
        form的flexGrow: document.querySelector('.auth__form') ? getComputedStyle(document.querySelector('.auth__form')).flexGrow : null,
        底部注册行高: g('.auth__foot')
      }, null, 1);
    })()`, returnByValue: true })
  console.log(r.result.value)

  console.log('\n=== 消息页 ===')
  await send('Runtime.evaluate', { expression: `location.hash = '#/wx/tabbar1/index'` })
  await sleep(4500)
  r = await send('Runtime.evaluate', { expression: `
    (() => {
      const g = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null };
      const fs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : null };
      return JSON.stringify({
        头部高: g('.msm-header'),
        品牌字号: fs('.msm-header__brand'),
        副标题字号: fs('.msm-header__sub'),
        搜索框高: g('.msm-search'),
        分段行高: g('.msm-segment'),
        空状态logo: g('.empty-logo'),
        空状态总高: g('.msm-empty')
      }, null, 1);
    })()`, returnByValue: true })
  console.log(r.result.value)

  console.log('\n=== 通讯录页 ===')
  await send('Runtime.evaluate', { expression: `location.hash = '#/wx/tabbar2/index'` })
  await sleep(4500)
  r = await send('Runtime.evaluate', { expression: `
    (() => {
      const g = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null };
      return JSON.stringify({
        快速入口高: g('.quick'),
        单个联系人行高: g('.contact'),
        联系人卡片: g('.contact-card'),
        字母分组标题高: g('.msm-group-title'),
        联系人总数: document.querySelectorAll('.contact').length
      }, null, 1);
    })()`, returnByValue: true })
  console.log(r.result.value)

  ws.close()
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
