// 运行时验证：三栏顶栏 + 3 栏 tabBar + 设置页工具风列表
// 用法: node verify-triptych.mjs
const CDP = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'http://127.0.0.1:5173'
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
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
  return ws
}

const results = []
function chk(label, ok, detail) {
  results.push(ok)
  console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? '  → ' + detail : ''}`)
}
async function goto(hash, wait = 4500) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await sleep(wait)
}
async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs'); const path = await import('node:path')
  const dir = 'C:\\im-local\\verify-triptych'
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(s.data, 'base64'))
}

/** 顶栏三栏几何信息 */
const TOPBAR_PROBE = `
  (() => {
    const bar = document.querySelector('.msm-topbar');
    if (!bar) return JSON.stringify({ found: false });
    const logo = document.querySelector('.msm-topbar__logo');
    const av = document.querySelector('.msm-topbar__avatar');
    const pill = document.querySelector('.msm-topbar__search');
    const spacer = document.querySelector('.msm-topbar__spacer');
    const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height), cy: Math.round(b.top + b.height/2) }; };
    const img = logo && logo.tagName === 'IMG' ? logo : (logo ? logo.querySelector('img') : null);
    return JSON.stringify({
      found: true,
      viewportW: window.innerWidth,
      logo: r(logo), logoNatural: img ? (img.naturalWidth || 0) : 0,
      avatar: r(av), avatarRadius: av ? getComputedStyle(av).borderRadius : null,
      searchPill: r(pill), spacer: r(spacer),
      pillRadius: pill ? getComputedStyle(pill).borderRadius : null,
      pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
      barBg: getComputedStyle(bar).backgroundColor,
      barBorder: getComputedStyle(bar).borderBottomWidth + ' ' + getComputedStyle(bar).borderBottomColor
    });
  })()
`

async function main() {
  const ws = await connect()
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  await send('Page.navigate', { url: BASE + '/' }); await sleep(9000)
  await evaluate(`try{localStorage.clear()}catch(e){}; 'ok'`)
  await send('Page.navigate', { url: BASE + '/' }); await sleep(8000)

  // 登录才进得去 tab 页
  console.log('\n=== 登录 ===')
  await goto('#/wx/login/index', 5500)
  const token = await evaluate(`
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const setVal = (el, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
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
  chk('登录拿到 token', !!token, token ? token.slice(0, 8) + '…' : '(空)')
  if (!token) { console.log('   登录失败，后续跳过'); ws.close(); return }

  // ---------------- tabBar ----------------
  console.log('\n=== 底部 tabBar（应为 3 栏）===')
  const tb = await evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.uni-tabbar__item'));
      const labels = Array.from(document.querySelectorAll('.uni-tabbar__label')).map(e => e.innerText.trim());
      const icons = Array.from(document.querySelectorAll('.uni-tabbar__icon img')).map(i => (i.src||'').split('/').pop());
      return JSON.stringify({ count: items.length, labels, icons });
    })()
  `)
  const t = JSON.parse(tb)
  console.log('   ' + tb)
  chk('tabBar 恰好 3 栏', t.count === 3, t.count + ' 栏')
  chk('标签为 消息/通讯录/设置', JSON.stringify(t.labels) === JSON.stringify(['消息', '通讯录', '设置']), JSON.stringify(t.labels))

  // ---------------- 消息页 ----------------
  console.log('\n=== 消息页顶栏 ===')
  await goto('#/wx/tabbar1/index', 5500)
  const m = JSON.parse(await evaluate(TOPBAR_PROBE))
  console.log('   ' + JSON.stringify(m))
  chk('顶栏存在', m.found === true)
  chk('Logo 高 ≈ 28px', m.logo && Math.abs(m.logo.h - 28) <= 2, m.logo ? m.logo.h + 'px' : '')
  chk('Logo 图片真的加载了', m.logoNatural > 0, 'naturalWidth=' + m.logoNatural)
  chk('Logo 左边距 ≈ 16px', m.logo && Math.abs(m.logo.l - 16) <= 2, m.logo ? m.logo.l + 'px' : '')
  chk('头像 36×36 正圆', m.avatar && Math.abs(m.avatar.w - 36) <= 2 && m.avatarRadius === '50%', m.avatar ? m.avatar.w + 'px / ' + m.avatarRadius : '')
  chk('头像右边距 ≈ 16px', m.avatar && Math.abs((m.viewportW - m.avatar.r) - 16) <= 2, m.avatar ? (m.viewportW - m.avatar.r) + 'px' : '')
  chk('头像不比 Logo 显眼（高度接近）', m.avatar && m.logo && m.avatar.h - m.logo.h <= 10, (m.avatar.h - m.logo.h) + 'px 差')
  chk('中间是搜索胶囊（全圆角浅灰底）', !!m.searchPill && m.pillRadius.indexOf('999') > -1, m.pillRadius + ' / ' + m.pillBg)
  chk('Logo 与头像垂直居中对齐', m.logo && m.avatar && Math.abs(m.logo.cy - m.avatar.cy) <= 2, 'Δcy=' + Math.abs(m.logo.cy - m.avatar.cy))

  const tabs = await evaluate(`JSON.stringify(Array.from(document.querySelectorAll('.msm-tabs__item')).map(e => e.innerText.trim()))`)
  chk('消息页标签 = 全部/未读/群聊/置顶', tabs === JSON.stringify(['全部', '未读', '群聊', '置顶']), tabs)
  await shot('1-messages')

  // ---------------- 通讯录页 ----------------
  console.log('\n=== 通讯录页顶栏 ===')
  await goto('#/wx/tabbar2/index', 5000)
  const c = JSON.parse(await evaluate(TOPBAR_PROBE))
  chk('顶栏存在且中间是搜索胶囊', c.found === true && !!c.searchPill)
  chk('Logo 左 16px / 头像右 16px', Math.abs(c.logo.l - 16) <= 2 && Math.abs((c.viewportW - c.avatar.r) - 16) <= 2, c.logo.l + ' / ' + (c.viewportW - c.avatar.r))
  await shot('2-contacts')

  // ---------------- 设置页 ----------------
  console.log('\n=== 设置页 ===')
  await goto('#/wx/tabbar4/index', 5000)
  const s = JSON.parse(await evaluate(`
    (() => {
      const bar = document.querySelector('.msm-topbar');
      const pill = document.querySelector('.msm-topbar__search');
      const spacer = document.querySelector('.msm-topbar__spacer');
      const av = document.querySelector('.msm-topbar__avatar');
      const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; };
      const rows = Array.from(document.querySelectorAll('.row')).map(e => {
        const l = e.querySelector('.row__label');
        const v = e.querySelector('.row__value');
        return (l ? l.innerText.trim() : '') + (v ? ' [' + v.innerText.trim() + ']' : '');
      });
      const acct = document.querySelector('.acct');
      return JSON.stringify({
        hasPill: !!pill, hasSpacer: !!spacer,
        avatar: r(av), viewportW: window.innerWidth,
        acct: acct ? { nick: (acct.querySelector('.acct__nick')||{}).innerText, id: (acct.querySelector('.acct__id')||{}).innerText, hasAvatar: !!acct.querySelector('.acct__avatar-img') || !!acct.querySelector('.acct__avatar') } : null,
        rows,
        seps: document.querySelectorAll('.sep').length,
        iconsInRows: document.querySelectorAll('.row uni-icons, .row .uni-icons').length,
        dangerColor: (() => { const e = document.querySelector('.row__label--danger'); return e ? getComputedStyle(e).color : null; })()
      });
    })()
  `))
  console.log('   ' + JSON.stringify(s, null, 1))
  chk('设置页顶栏不含搜索胶囊', s.hasPill === false && s.hasSpacer === true)
  chk('头像仍在最右（右边距 16px）', Math.abs((s.viewportW - s.avatar.r) - 16) <= 2, (s.viewportW - s.avatar.r) + 'px')
  chk('账号行有昵称与 Msm ID', !!s.acct && !!s.acct.nick && String(s.acct.id).indexOf('Msm ID') > -1, s.acct ? s.acct.nick + ' / ' + s.acct.id : '')
  chk('分组细线 ≥ 4 条', s.seps >= 4, s.seps + ' 条')
  chk('所有行都没有图标（纯文字工具风）', s.iconsInRows === 0, s.iconsInRows + ' 个图标')
  chk('退出登录为红色', s.dangerColor === 'rgb(211, 47, 47)', s.dangerColor)
  const want = ['朋友圈', '收藏', '扫一扫', '附近的人', '账号与安全', '隐私与安全', '新消息通知', '关于 Msm [v1.4.1]', '退出登录']
  chk('行内容与线框图一致', JSON.stringify(s.rows) === JSON.stringify(want), JSON.stringify(s.rows))
  await shot('3-settings')

  // ---------------- 头像点击 ----------------
  console.log('\n=== 头像点击行为 ===')
  await goto('#/wx/tabbar1/index', 4500)
  await evaluate(`document.querySelector('.msm-topbar__avatar').click()`)
  await sleep(2500)
  const h = await evaluate(`location.hash`)
  chk('点消息页头像 -> 切到设置页', String(h).indexOf('tabbar4') > -1, h)

  ws.close()
  const passed = results.filter(Boolean).length
  console.log(`\n>>> 通过 ${passed} / ${results.length}`)
  if (passed !== results.length) process.exitCode = 1
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
