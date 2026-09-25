// 实测启动页/登录页关键尺寸与配色，验证本轮改版
// 用法: node v2ex-measure2.mjs
const CDP = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'https://imessage.uno'
const PHONE = process.argv[2] || '13900000001'
const PASSWORD = process.argv[3] || 'abc12345'
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
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result?.value
  }
  return ws
}

async function goto(hash, wait = 5000) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await sleep(wait)
}

async function main() {
  const ws = await connect()
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  console.log('=== 1. 清态并登录（登录页需要登录后才好量 tab 页，这里只用未登录页）===')
  await send('Page.navigate', { url: BASE + '/' }); await sleep(9000)
  await evaluate(`try{localStorage.clear()}catch(e){}; 'ok'`)
  await send('Page.navigate', { url: BASE + '/' }); await sleep(8000)

  console.log('\n=== 2. 启动页实测 ===')
  await goto('#/pages/wxindex/index', 5500)
  console.log(await evaluate(`
    (() => {
      const box = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
      const cs = sel => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { fontSize: s.fontSize, color: s.color, background: s.backgroundColor, border: s.borderTopWidth + ' ' + s.borderTopColor, radius: s.borderRadius }; };
      const logo = box('.splash__logo'), btn = box('.splash__btn'), brand = box('.splash__brand'), actions = box('.splash__actions');
      const vh = window.innerHeight;
      return JSON.stringify({
        viewportH: vh,
        logo: logo, btn: btn,
        logoStyle: cs('.splash__logo'),
        btnStyle: cs('.splash__btn'),
        featureCount: document.querySelectorAll('.splash__feature').length,
        featureStyle: cs('.splash__feature-text'),
        dotStyle: cs('.splash__feature-dot'),
        btnText: (document.querySelector('.splash__btn')||{}).innerText,
        /* 布局平衡：Logo 顶部留白 vs 按钮底部留白 */
        gapAboveLogo: logo ? logo.top : null,
        gapBelowBtn: btn ? (vh - btn.bottom) : null,
        brandBlockH: brand ? brand.h : null,
        actionsBlockH: actions ? actions.h : null,
        /* 是否还存在旧的「还没有账号？创建新账号」 */
        hasOldRegisterLink: !!document.querySelector('.splash__link')
      }, null, 1);
    })()
  `))

  console.log('\n=== 3. 登录页实测 ===')
  await goto('#/wx/login/index', 5500)
  console.log(await evaluate(`
    (() => {
      const one = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { h: Math.round(r.height), w: Math.round(r.width), fontSize: s.fontSize, color: s.color, bg: s.backgroundColor, borderBottom: s.borderBottomWidth + ' ' + s.borderBottomColor, borderTop: s.borderTopWidth, radius: s.borderRadius, padding: s.padding }; };
      const items = Array.from(document.querySelectorAll('.form-item')).map(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { label: (e.querySelector('.form-item__label')||{}).innerText, h: Math.round(r.height), borderBottom: s.borderBottomWidth + ' ' + s.borderBottomColor }; });
      const links = Array.from(document.querySelectorAll('.auth__link')).map(e => e.innerText.trim());
      const lb = document.querySelector('.auth__links');
      const agree = document.querySelector('.auth__agree-text');
      return JSON.stringify({
        formItems: items,
        formItemCount: items.length,
        linkRow: lb ? { h: Math.round(lb.getBoundingClientRect().height), justify: getComputedStyle(lb).justifyContent, texts: links } : null,
        submit: one('.auth__submit'),
        agreeText: agree ? { fontSize: getComputedStyle(agree).fontSize, color: getComputedStyle(agree).color } : null,
        agreeLink: (() => { const e = document.querySelector('.auth__agree-link'); return e ? { fontSize: getComputedStyle(e).fontSize, color: getComputedStyle(e).color } : null; })(),
        hasOrDivider: !!document.querySelector('.auth__or'),
        hasOldForgotBlock: !!document.querySelector('.auth__forgot'),
        logoH: (() => { const e = document.querySelector('.auth__logo'); return e ? Math.round(e.getBoundingClientRect().height) : null; })(),
        checkboxColor: (() => { const e = document.querySelector('uni-checkbox .uni-checkbox-input'); return e ? getComputedStyle(e).borderColor : null; })()
      }, null, 1);
    })()
  `))

  console.log('\n=== 4. 注册页 / 找回密码页关键尺寸 ===')
  for (const [name, hash] of [['注册', '#/wx/register/index'], ['找回密码', '#/wx/forgetPass/index']]) {
    await goto(hash, 5000)
    const r = await evaluate(`
      (() => {
        const items = Array.from(document.querySelectorAll('.form-item'));
        const sub = document.querySelector('.auth__submit');
        return JSON.stringify({
          表单行数: items.length,
          表单行高: items.map(e => Math.round(e.getBoundingClientRect().height)),
          下划线色: items[0] ? getComputedStyle(items[0]).borderBottomColor : null,
          提交按钮高: sub ? Math.round(sub.getBoundingClientRect().height) : null,
          提交按钮底色: sub ? getComputedStyle(sub).backgroundColor : null,
          协议字号: (() => { const e = document.querySelector('.auth__agree-text'); return e ? getComputedStyle(e).fontSize : null; })(),
          协议颜色: (() => { const e = document.querySelector('.auth__agree-text'); return e ? getComputedStyle(e).color : null; })()
        }, null, 1);
      })()
    `)
    console.log('   [' + name + '] ' + r)
  }

  ws.close()
  console.log('\n完成')
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
