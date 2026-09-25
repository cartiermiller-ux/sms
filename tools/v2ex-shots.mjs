// V2EX 改造后的截图 + 取色验证
// 用法: node v2ex-shots.mjs <outDir> [phone] [password]
//
// 覆盖：启动页 / 登录页 / 注册页（无需登录）+ 4 个 tab 页（走 UI 真实登录拿 token，
//      因为后端有版本校验，直接调 /auth/login 会被 code:601 拒绝）
import fs from 'node:fs'
import path from 'node:path'

const CDP = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'http://127.0.0.1:5173'
const OUT = process.argv[2] || 'C:\\im-local\\msm-v2ex'
const PHONE = process.argv[3] || '13900000001'
const PASSWORD = process.argv[4] || 'abc12345'
const sleep = ms => new Promise(r => setTimeout(r, ms))

let send, evaluate

async function connect() {
  let page = null
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(CDP + '/json/list')).json()
      page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) break
    } catch { /* 等 Chrome 起来 */ }
    await sleep(500)
  }
  if (!page) throw new Error('连不上 CDP 或没有 page target')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 连接失败')) })

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
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''))
    return r.result?.value
  }
  return ws
}

async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  const file = path.join(OUT, name + '.png')
  fs.writeFileSync(file, Buffer.from(s.data, 'base64'))
  const txt = await evaluate(`(document.body.innerText||'').slice(0,180).replace(/\\n+/g,' | ')`)
  const size = fs.statSync(file).size
  console.log(`   ${name.padEnd(22)} ${String(Math.round(size / 1024)).padStart(4)} KB   ${txt}`)
}

async function gotoHash(hash, wait = 4500) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await sleep(wait)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const ws = await connect()
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  console.log('=== 1. 打开应用并清掉登录态 ===')
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(9000)
  await evaluate(`try{localStorage.clear()}catch(e){}; 'cleared'`)
  await send('Page.navigate', { url: BASE + '/' })
  await sleep(8000)

  console.log('\n=== 2. 未登录页面截图 ===')
  await gotoHash('#/pages/wxindex/index', 5000)
  await shot('0-启动页')
  await gotoHash('#/wx/login/index', 5000)
  await shot('0-登录页')
  await gotoHash('#/wx/register/index', 5000)
  await shot('0-注册页')

  console.log('\n=== 3. 走 UI 真实登录 ===')
  await gotoHash('#/wx/login/index', 5000)
  const loginOut = await evaluate(`
    (async () => {
      const out = {};
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const inputs = Array.from(document.querySelectorAll('input'));
      // 诊断：把每个 input 的属性抓回来（uni-app H5 不会把 placeholder 透传到原生 input）
      out.inputs = inputs.map(i => ({ name: i.name, type: i.type, ph: i.placeholder, cls: i.className }));
      // 按 name 找；找不到再退回顺序（登录页只有 手机号 / 密码 两个输入框）
      const norm = s => String(s || '').toLowerCase();
      const phoneEl = inputs.find(i => norm(i.name).includes('phone')) || inputs[0];
      const pwdEl   = inputs.find(i => norm(i.name).includes('password')) || inputs[1];
      out.pickedPhone = phoneEl ? { name: phoneEl.name, cls: phoneEl.className } : null;
      out.pickedPwd   = pwdEl ? { name: pwdEl.name, cls: pwdEl.className } : null;
      out.foundPhone = !!phoneEl; out.foundPwd = !!pwdEl;
      if (phoneEl) setVal(phoneEl, ${JSON.stringify(PHONE)});
      if (pwdEl)   setVal(pwdEl, ${JSON.stringify(PASSWORD)});
      await sleep(500);
      const agree = document.querySelector('.auth__agree-tap');
      out.foundAgree = !!agree;
      if (agree) agree.click();
      await sleep(500);
      const cb = document.querySelector('uni-checkbox .uni-checkbox-input');
      out.checkboxClass = cb ? cb.className : '(无)';
      const cbInput = document.querySelector('uni-checkbox input[type=checkbox]');
      out.checkboxChecked = cbInput ? cbInput.checked : null;
      const btn = document.querySelector('.auth__submit');
      out.foundBtn = !!btn;
      if (btn) btn.click();
      await sleep(7000);
      out.href = location.href;
      out.token = localStorage.getItem('Authorization') || '';
      out.toast = Array.from(document.querySelectorAll('uni-toast,.uni-toast'))
        .map(e => e.innerText.trim()).filter(Boolean).join(' | ');
      return JSON.stringify(out, null, 1);
    })()
  `)
  console.log(loginOut)
  const token = (() => { try { return JSON.parse(loginOut).token } catch { return '' } })()
  if (!token) {
    console.log('\n⚠ 登录未拿到 token，tab 页可能停在登录页。继续截图以便观察。')
  } else {
    console.log('   ✅ 已拿到 token（长度 ' + token.length + '）')
  }

  console.log('\n=== 4. 四个 tab 页截图 ===')
  for (const [name, hash] of [
    ['1-消息', '#/wx/tabbar1/index'],
    ['2-通讯录', '#/wx/tabbar2/index'],
    ['3-发现', '#/wx/tabbar3/index'],
    ['4-我', '#/wx/tabbar4/index']
  ]) {
    await gotoHash(hash, 5500)
    await shot(name)
  }

  console.log('\n=== 5. 取色验证（计算样式，证明 V2EX 令牌真的生效）===')
  await gotoHash('#/wx/tabbar1/index', 4000)
  const colors = await evaluate(`
    (() => {
      const pick = (sel, props) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, found: false };
        const cs = getComputedStyle(el);
        const o = { sel, found: true };
        props.forEach(p => { o[p] = cs[p]; });
        return o;
      };
      const tabbarLabel = document.querySelector('.uni-tabbar__label');
      const tabbarActive = document.querySelector('.uni-tabbar__item.uni-tabbar__item--active .uni-tabbar__label') ||
                           document.querySelector('.uni-tabbar__label[style*="rgb(51"]');
      return JSON.stringify({
        pageBg:      getComputedStyle(document.body).backgroundColor,
        rowTitle:    pick('.msm-row__title', ['color','fontWeight','fontSize']),
        rowDesc:     pick('.msm-row__desc', ['color','fontSize']),
        rowMeta:     pick('.msm-row__meta', ['color','fontSize']),
        rowBorder:   pick('.msm-row', ['borderBottomColor','borderBottomWidth','backgroundColor']),
        rowAvatar:   pick('.msm-row__avatar', ['width','height','borderRadius']),
        badge:       pick('.msm-badge', ['backgroundColor','color','borderRadius']),
        activeTab:   pick('.msm-tabs__item--active', ['color','fontWeight']),
        searchBox:   pick('.msm-search', ['backgroundColor','borderRadius','height']),
        headerBrand: pick('.msm-header__brand', ['color','fontSize']),
        tabbarLabel: tabbarLabel ? { color: getComputedStyle(tabbarLabel).color } : null,
        tabbarActive: tabbarActive ? { color: getComputedStyle(tabbarActive).color } : null,
        cssPrimary:  getComputedStyle(document.documentElement).getPropertyValue('--msm-primary').trim(),
        cssOnline:   getComputedStyle(document.documentElement).getPropertyValue('--msm-online').trim(),
        cssSuccess:  getComputedStyle(document.documentElement).getPropertyValue('--msm-success').trim(),
        cssDanger:   getComputedStyle(document.documentElement).getPropertyValue('--msm-danger').trim(),
        cssDivider:  getComputedStyle(document.documentElement).getPropertyValue('--msm-divider').trim(),
        tabIcons:    Array.from(document.querySelectorAll('.uni-tabbar__icon img, .uni-tabbar img')).map(i => i.src.split('/').pop())
      }, null, 1);
    })()
  `)
  console.log(colors)

  fs.writeFileSync(path.join(OUT, '_evidence.json'), colors, 'utf8')
  ws.close()
  console.log('\n完成 -> ' + OUT)
}

main().catch(e => { console.error('失败:', e.message); process.exit(1) })
