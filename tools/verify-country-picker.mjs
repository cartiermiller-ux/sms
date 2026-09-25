// 运行时验证：国家/地区选择器 + 引导语去重 + 启动页卖点移除
// 用法: node verify-country-picker.mjs
const CDP = 'http://127.0.0.1:9222'
const BASE = process.env.MSM_BASE || 'http://127.0.0.1:5173'
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
  const fs = await import('node:fs')
  const path = await import('node:path')
  const dir = 'C:\\im-local\\verify-picker'
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(s.data, 'base64'))
}

async function main() {
  const ws = await connect()
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

  await send('Page.navigate', { url: BASE + '/' }); await sleep(9000)
  await evaluate(`try{localStorage.clear()}catch(e){}; 'ok'`)
  await send('Page.navigate', { url: BASE + '/' }); await sleep(8000)

  // ---------------- 注册页 ----------------
  console.log('\n=== 注册页 ===')
  await goto('#/wx/register/index', 5500)

  const head = await evaluate(`
    (() => {
      const t = document.querySelector('.auth__title');
      const s = document.querySelector('.auth__sub');
      return JSON.stringify({ title: t ? t.innerText.trim() : null, hasSub: !!s, sub: s ? s.innerText.trim() : null });
    })()
  `)
  const h = JSON.parse(head)
  chk('标题 = 开始使用 Msm（去掉重复的「创建账号」）', h.title === '开始使用 Msm', h.title)
  chk('副标题行已移除', h.hasSub === false, h.sub || '(无)')

  const before = await evaluate(`(document.querySelector('.cc__code')||{}).innerText`)
  chk('区号初始显示 +86', before === '+86', before)

  const ph = await evaluate(`
    (() => {
      /* 注意：uni-app H5 会把 class 加在 <uni-input> 包装元素上，
         真正的 <input> 在其内部；且 placeholder 不是 input 的属性，
         而是单独渲染成 .uni-input-placeholder 元素（placeholder-class 加在它上面）*/
      const wrap = document.querySelector('.form-item__input');
      const i = wrap ? wrap.querySelector('input') : null;
      const phEl = wrap ? wrap.querySelector('.uni-input-placeholder') : null;
      const lbl = document.querySelector('.form-item__label');
      return JSON.stringify({
        label: lbl ? lbl.innerText.trim() : null,
        placeholderText: phEl ? phEl.innerText.trim() : null,
        placeholderClass: phEl ? phEl.className : null,
        maxlength: i ? i.getAttribute('maxlength') : null
      });
    })()
  `)
  console.log('   手机号输入行: ' + ph)
  const p = JSON.parse(ph)
  chk('右侧输入框占位符 = 填写手机号码', p.placeholderText === '填写手机号码', p.placeholderText)
  chk('占位符使用浅灰样式类 form-item__ph', (p.placeholderClass || '').indexOf('form-item__ph') > -1, p.placeholderClass)
  chk('+86 时 maxlength = 11', p.maxlength === '11', p.maxlength)

  // 打开选择器
  await evaluate(`document.querySelector('.cc__trigger').click()`)
  await sleep(900)
  const sheet = await evaluate(`
    (() => {
      const s = document.querySelector('.cc__sheet');
      if (!s) return JSON.stringify({ open: false });
      const items = Array.from(document.querySelectorAll('.cc__item')).map(e => e.innerText.replace(/\\s+/g,' ').trim());
      const list = document.querySelector('.cc__list');
      return JSON.stringify({ open: true, count: items.length, first3: items.slice(0,3), searching: !!document.querySelector('.cc__search-input'), scrollH: list ? Math.round(list.getBoundingClientRect().height) : null });
    })()
  `)
  const sh = JSON.parse(sheet)
  chk('点击区号后弹出国家列表', sh.open === true)
  chk('列表有多个国家且带搜索框', sh.open && sh.count > 20 && sh.searching, sh.open ? sh.count + ' 个国家, 列表高 ' + sh.scrollH + 'px' : '')
  chk('列表首项为中国大陆 +86', sh.open && sh.first3 && sh.first3[0].indexOf('中国大陆') > -1 && sh.first3[0].indexOf('+86') > -1, sh.open ? sh.first3[0] : '')
  await shot('1-register-picker-open')

  // 搜索「缅甸」并选择
  await evaluate(`
    (() => {
      const i = document.querySelector('.cc__search-input').querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(i, '缅甸');
      i.dispatchEvent(new Event('input', { bubbles: true }));
      return 'ok';
    })()
  `)
  await sleep(800)
  const searched = await evaluate(`Array.from(document.querySelectorAll('.cc__item')).map(e => e.innerText.replace(/\\s+/g,' ').trim()).join(' | ')`)
  chk('搜索「缅甸」可过滤', searched.indexOf('缅甸') > -1 && searched.indexOf('中国大陆') === -1, searched)

  await evaluate(`
    (() => {
      const it = Array.from(document.querySelectorAll('.cc__item')).find(e => e.innerText.indexOf('缅甸') > -1);
      if (it) it.click();
      return !!it;
    })()
  `)
  await sleep(900)
  const after = await evaluate(`(document.querySelector('.cc__code')||{}).innerText`)
  chk('选择缅甸后区号变为 +95', after === '+95', after)
  const sheetGone = await evaluate(`!document.querySelector('.cc__sheet')`)
  chk('选择后弹层自动关闭', sheetGone === true)
  const phMax = await evaluate(`document.querySelector('.form-item__input').querySelector('input').getAttribute('maxlength')`)
  chk('非 +86 时 maxlength 放宽到 15', phMax === '15', phMax)

  // 输入一个缅甸号码，验证前端不再用大陆规则拦截
  const typed = await evaluate(`
    (() => {
      const i = document.querySelector('.form-item__input').querySelector('input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(i, '912345678');
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
      return i.value;
    })()
  `)
  console.log('   输入缅甸号码后 DOM value = ' + JSON.stringify(typed))
  await sleep(700)
  // 先确认 v-model 是否同步（手机号行的清除按钮 v-if="phone.length > 0"）
  const modelSynced = await evaluate(`!!document.querySelector('.form-item__suffix')`)
  chk('v-model 已同步（清除按钮出现）', modelSynced === true)
  await evaluate(`document.querySelector('.form-item__code').click()`)
  await sleep(1800)
  const codeText = await evaluate(`(document.querySelector('.form-item__code')||{}).innerText`)
  const toast = await evaluate(`Array.from(document.querySelectorAll('uni-toast,.uni-toast')).map(e=>e.innerText.trim()).filter(Boolean).join(' | ')`)
  console.log('   获取验证码按钮文案 = ' + JSON.stringify(codeText) + '   toast = ' + JSON.stringify(toast))
  // 「60s 后重发」说明本地校验已放行、已发出请求（之后 toast 是服务端返回的）
  const localPassed = String(codeText || '').indexOf('后重发') > -1
  chk('缅甸号码通过前端本地校验（按钮进入倒计时）', localPassed === true, codeText)
  chk('未出现前端「请输入正确的手机号」误拦', !(toast.indexOf('请输入正确的手机号') > -1 && !localPassed), localPassed ? '校验已放行，toast 来自服务端' : toast)

  // 切回中国大陆，验证号码被清空
  await evaluate(`document.querySelector('.cc__trigger').click()`)
  await sleep(800)
  await evaluate(`(() => { const it = Array.from(document.querySelectorAll('.cc__item')).find(e => e.innerText.indexOf('中国大陆') > -1); if (it) it.click(); return !!it; })()`)
  await sleep(900)
  const back = await evaluate(`JSON.stringify({ code: (document.querySelector('.cc__code')||{}).innerText, phone: document.querySelector('.form-item__input').querySelector('input').value })`)
  const b = JSON.parse(back)
  chk('切回中国大陆区号回到 +86', b.code === '+86', b.code)
  chk('切换地区后已填号码被清空', b.phone === '', 'value="' + b.phone + '"')
  await shot('2-register-after-pick')

  // ---------------- 登录页 ----------------
  console.log('\n=== 登录页 ===')
  await goto('#/wx/login/index', 5000)
  const lh = await evaluate(`
    (() => {
      const t = document.querySelector('.auth__title');
      const s = document.querySelector('.auth__sub');
      return JSON.stringify({ title: t ? t.innerText.trim() : null, hasSub: !!s, code: (document.querySelector('.cc__code')||{}).innerText });
    })()
  `)
  const l = JSON.parse(lh)
  chk('标题 = 欢迎回来', l.title === '欢迎回来', l.title)
  chk('副标题「登录继续使用 Msm」已移除', l.hasSub === false)
  chk('登录页同样使用可点击区号（+86）', l.code === '+86', l.code)
  await evaluate(`document.querySelector('.cc__trigger').click()`)
  await sleep(900)
  chk('登录页也能弹出国家列表', (await evaluate(`!!document.querySelector('.cc__sheet')`)) === true)
  await shot('3-login-picker-open')
  await evaluate(`document.querySelector('.cc__close').click()`)
  await sleep(500)

  // ---------------- 启动页 ----------------
  console.log('\n=== 启动页 ===')
  await goto('#/pages/wxindex/index', 5000)
  const sp = await evaluate(`
    (() => {
      const txt = (document.body.innerText || '');
      return JSON.stringify({
        hasFeatures: !!document.querySelector('.splash__features'),
        hasOldFeatureText: txt.indexOf('消息与群聊') > -1 || txt.indexOf('扫一扫，加好友') > -1,
        btn: (document.querySelector('.splash__btn')||{}).innerText,
        logo: !!document.querySelector('.splash__logo'),
        slogan: txt.indexOf('Connect freely.') > -1 && txt.indexOf('和重要的人保持联系') > -1,
        text: txt.replace(/\\n+/g, ' | ').slice(0, 120)
      });
    })()
  `)
  const s2 = JSON.parse(sp)
  chk('4 条产品卖点已移除', s2.hasFeatures === false && s2.hasOldFeatureText === false, s2.text)
  chk('保留 Logo 与两条标语', s2.logo === true && s2.slogan === true)
  chk('入口按钮仍为「开始使用」', s2.btn === '开始使用', s2.btn)
  await shot('4-splash')

  ws.close()
  const passed = results.filter(Boolean).length
  console.log(`\n>>> 通过 ${passed} / ${results.length}`)
  if (passed !== results.length) process.exitCode = 1
}
main().catch(e => { console.error('失败:', e.message); process.exit(1) })
