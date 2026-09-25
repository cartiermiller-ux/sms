// 运行时验证：消息面板 / 群聊面板（气泡改造）
//
// 覆盖 brief 的 5 条：
//   1. 左右分栏  flex + justify-content: flex-start / flex-end
//   2. 压缩留白  气泡行 margin-top = 4px
//   3. 极简气泡  对方纯白、自己品牌淡蓝、无背景图无阴影
//   4. 小字标识  群聊昵称 + 「群主 / 管理员」12px 同一行
//   5. 时间内嵌  时刻在气泡内部右下角（灰 10px）；跨天才有中间日期分隔线
//
// 用法: node verify-bubbles.mjs
const CDP = 'http://127.0.0.1:9222';
const BASE = process.env.MSM_BASE || 'http://127.0.0.1:5173';
const PHONE = process.argv[2] || '13900000001';
const PASSWORD = process.argv[3] || 'abc12345';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const GROUP_ID = '9000';
const ME = ''; // 登录后回填

let send, evaluate;
async function connect() {
  let page = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(CDP + '/json/list')).json();
      page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) break;
    } catch { /* 等 Chrome */ }
    await sleep(500);
  }
  if (!page) throw new Error('连不上 CDP');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')); });
  let seq = 0; const pending = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  };
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result?.value;
  };
  return ws;
}

const results = [];
function chk(label, ok, detail) {
  results.push({ label, ok });
  console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}${detail !== undefined ? '  → ' + detail : ''}`);
}
async function goto(hash, wait = 4000) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await sleep(wait);
}
async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  const fs = await import('node:fs'); const path = await import('node:path');
  const dir = 'C:\\im-local\\verify-bubbles';
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(s.data, 'base64'));
  return path.join(dir, name + '.png');
}

// 造一段可控的群聊记录：跨 3 天、左右都有、含角色与图片
const SEED = `
  (() => {
    const me = window.__MSM_ME__;
    const pad = n => (n < 10 ? '0' + n : '' + n);
    const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
    const dayAgo = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return fmt(d); };
    const AVA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const msg = (o) => Object.assign({
      userId: ${JSON.stringify(GROUP_ID)}, nickName: '', portrait: AVA, msgId: String(Math.random()).slice(2),
      windowType: 'GROUP', msgType: 'TEXT', content: '', time: dayAgo(0, 9, 0), type: 1, personId: '9001'
    }, o);
    const list = [
      // 3 天前：居中系统提示（不该有时刻）
      msg({ msgType: 'ALERT', type: 3, personId: '9001', nickName: '服务器测试',
            content: '服务器测试 创建了群聊', time: dayAgo(3, 20, 15) }),
      // 昨天：对方消息，带「管理员」角色
      msg({ personId: '9001', nickName: '已销号用户', memberRole: 'admin',
            content: '老板公群规则发出来@我置顶', time: dayAgo(1, 1, 41) }),
      // 昨天：对方短消息，无角色
      msg({ personId: '9003', nickName: '路人甲', content: '收到', time: dayAgo(1, 1, 42) }),
      // 今天：对方消息，personId == 群主 id → 应显示「群主」
      msg({ personId: '9002', nickName: '小白一手消息在主页频道',
            content: '宝，网传你们公司的钱包地址被冻结是真的吗', time: dayAgo(0, 12, 27) }),
      // 今天：自己发的（右侧）
      msg({ personId: me, nickName: '服务器测试', type: 2, content: '假的，别信', time: dayAgo(0, 12, 28) }),
      // 今天：图片消息（时刻浮在右下角）
      msg({ personId: '9001', nickName: '已销号用户', msgType: 'IMAGE', memberRole: 'admin',
            content: JSON.stringify({ url: AVA, name: 'a.png' }), time: dayAgo(0, 12, 30) }),
      // 今天：自己发的长文本（测试 float 时刻贴最后一行）
      msg({ personId: me, type: 2, content: '这是一条比较长的消息，用来验证时间戳会不会正确贴在气泡内部的右下角，而不是被挤到单独一行去。', time: dayAgo(0, 12, 31) })
    ];
    const chatData = {};
    chatData[${JSON.stringify(GROUP_ID)}] = {
      fromInfo: {},
      groupInfo: { nickName: '产品交流群', portrait: '[]', userId: ${JSON.stringify(GROUP_ID)}, masterId: '9002' },
      list
    };
    const chatList = {};
    chatList[${JSON.stringify(GROUP_ID)}] = {
      userId: ${JSON.stringify(GROUP_ID)}, personId: me, nickName: '产品交流群', portrait: '[]',
      content: '这是一条比较长的消息…', time: dayAgo(0, 12, 31), num: 0, windowType: 'GROUP',
      disturb: 'N', top: 'N', userType: 'GROUP'
    };
    localStorage.setItem(me + '_chatData', JSON.stringify(chatData));
    localStorage.setItem(me + '_chatListData', JSON.stringify(chatList));
    localStorage.setItem('device', 'h5');
    localStorage.setItem('version', '1.4.1');
    return list.length;
  })()
`;

// 探针：几何 + 计算样式
const PROBE = `
  (() => {
    const px = v => Math.round(parseFloat(v) || 0);
    const rect = e => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; };
    const rows = Array.from(document.querySelectorAll('.zfb-tk-item'));
    const out = {
      rowCount: rows.length,
      viewportW: window.innerWidth,
      rows: [],
      dateseps: Array.from(document.querySelectorAll('.zfb-tk-datesep')).map(e => ({
        text: e.textContent.trim(),
        fs: getComputedStyle(e.querySelector('.zfb-tk-datesep-text') || e).fontSize,
        bg: getComputedStyle(e.querySelector('.zfb-tk-datesep-text') || e).backgroundColor,
        centered: (() => { const a = rect(e), c = rect(e.parentElement); return Math.abs((a.l + a.r) / 2 - (c.l + c.r) / 2) <= 2; })()
      })),
      oldTimeRows: document.querySelectorAll('.zfb-tk-time').length,
      tsCount: document.querySelectorAll('.zfb-tk-ts').length,
      tsOverlay: document.querySelectorAll('.zfb-tk-ts--over').length,
      roles: Array.from(document.querySelectorAll('.zfb-tk-role')).map(e => e.textContent.trim()),
      roleFontSize: (() => { const e = document.querySelector('.zfb-tk-role'); return e ? getComputedStyle(e).fontSize : null; })(),
      names: Array.from(document.querySelectorAll('.zfb-tk-name-text')).map(e => e.textContent.trim())
    };
    for (const row of rows) {
      const cs = getComputedStyle(row);
      const bubble = row.querySelector('.zfb-tk-item-c, .zfb-tk-item-c-img, .zfb-tk-item-c-LOCATION, .zfb-tk-item-c-CARD');
      const av = row.querySelector('.zfb-tk-avatar');
      const nameRow = row.querySelector('.zfb-tk-name');
      const ts = row.querySelector('.zfb-tk-ts');
      const kind = row.classList.contains('zfb-tk-msgleft') ? 'left'
                 : row.classList.contains('zfb-tk-msgright') ? 'right'
                 : row.classList.contains('zfb-tk-msgcenter') ? 'center' : '?';
      const br = bubble ? rect(bubble) : null;
      const tr = ts ? rect(ts) : null;
      out.rows.push({
        kind,
        kindClass: row.className,
        justify: cs.justifyContent,
        flexDir: cs.flexDirection,
        marginTop: cs.marginTop,
        rowRect: rect(row),
        bubbleRect: br,
        bubbleBg: bubble ? getComputedStyle(bubble).backgroundColor : null,
        bubbleShadow: bubble ? getComputedStyle(bubble).boxShadow : null,
        bubbleColor: bubble ? getComputedStyle(bubble).color : null,
        avatarRect: av ? rect(av) : null,
        nameRect: nameRow ? rect(nameRow) : null,
        nameFontSize: nameRow ? getComputedStyle(nameRow.querySelector('.zfb-tk-name-text') || nameRow).fontSize : null,
        tsText: ts ? ts.textContent.trim() : null,
        tsRect: tr,
        tsFontSize: ts ? getComputedStyle(ts).fontSize : null,
        tsColor: ts ? getComputedStyle(ts).color : null,
        tsIsOverlay: ts ? getComputedStyle(ts).position === 'absolute' : false,
        tsInsideBubble: !!(tr && br && tr.l >= br.l - 1 && tr.r <= br.r + 1 && tr.t >= br.t - 1 && tr.b <= br.b + 1)
      });
    }
    return JSON.stringify(out, null, 1);
  })()
`;

async function main() {
  const ws = await connect();
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  await send('Page.navigate', { url: BASE + '/' }); await sleep(9000);
  await evaluate(`try{localStorage.clear()}catch(e){}; 'ok'`);
  await send('Page.navigate', { url: BASE + '/' }); await sleep(8000);

  console.log('\n=== 登录 ===');
  await goto('#/wx/login/index', 5500);
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
  `);
  chk('登录拿到 token', !!token, token ? token.slice(0, 8) + '…' : '(空)');
  if (!token) { console.log('   登录失败，终止'); ws.close(); return; }

  const me = await evaluate(`
    (async () => {
      const r = await fetch('/api/my/getInfo', { headers: { Authorization: ${JSON.stringify(token)}, device: 'h5', version: '1.4.1' } });
      const j = await r.json();
      return (j && j.data && j.data.userId) ? String(j.data.userId) : '';
    })()
  `);
  chk('拿到自己的 userId', !!me, me);
  if (!me) { console.log('   取不到 userId，终止'); ws.close(); return; }

  console.log('\n=== 播种聊天记录（群聊 + 单聊）===');
  await evaluate(`window.__MSM_ME__ = ${JSON.stringify(me)}; 'ok'`);
  const seededGroup = await evaluate(SEED);
  chk('群聊写入 7 条消息', seededGroup === 7, seededGroup + ' 条');

  // ---------- 先验单聊：整页重载后 app 会回到「消息」首页，
  //            此时第一次用 hash 进聊天页一定会触发 onLoad ----------
  console.log('\n=== 6. 单聊面板（1v1）===');
  const FID = '9100';
  await evaluate(`
    (() => {
      const me = window.__MSM_ME__;
      const pad = n => (n < 10 ? '0' + n : '' + n);
      const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
      const dayAgo = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return fmt(d); };
      const AVA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const msg = o => Object.assign({
        userId: ${JSON.stringify(FID)}, nickName: '张三', portrait: AVA, windowType: 'SINGLE',
        msgType: 'TEXT', content: '', time: dayAgo(0, 9, 0), type: 1, personId: ${JSON.stringify(FID)}
      }, o);
      const list = [
        msg({ content: '在吗', time: dayAgo(1, 22, 30) }),
        msg({ type: 2, personId: me, content: '在的，怎么了', time: dayAgo(1, 22, 31) }),
        msg({ content: '晚上一起吃个饭？', time: dayAgo(0, 11, 5) }),
        msg({ type: 2, personId: me, content: '好，六点老地方见', time: dayAgo(0, 11, 6) })
      ];
      const cd = JSON.parse(localStorage.getItem(me + '_chatData') || '{}');
      cd[${JSON.stringify(FID)}] = { fromInfo: { nickName: '张三', portrait: AVA, userId: ${JSON.stringify(FID)}, userType: 'normal' }, groupInfo: {}, list };
      localStorage.setItem(me + '_chatData', JSON.stringify(cd));
      const cl = JSON.parse(localStorage.getItem(me + '_chatListData') || '{}');
      cl[${JSON.stringify(FID)}] = { userId: ${JSON.stringify(FID)}, personId: me, nickName: '张三', portrait: AVA, content: '好，六点老地方见', time: dayAgo(0, 11, 6), num: 0, windowType: 'SINGLE', disturb: 'N', top: 'N', userType: 'normal' };
      localStorage.setItem(me + '_chatListData', JSON.stringify(cl));
      return true;
    })()
  `);
  // 整页重载：同 document 只改 query 的 hash 变化不会让 uni-app 重新触发 onLoad
  await send('Page.navigate', { url: BASE + '/?_=' + Date.now() }); await sleep(9000);
  await goto(`#/wx/chatWindow/index?userId=${FID}&windowType=SINGLE`, 6500);
  const q = JSON.parse(await evaluate(PROBE));
  const qfile = await shot('single-chat');
  if (!q.rowCount) {
    console.log('   单聊页没渲染出消息，当前可见文本：' + JSON.stringify(await evaluate(`document.body.innerText.slice(0, 200)`)));
  }
  chk('单聊消息条数 = 4', q.rowCount === 4, `left=${q.rows.filter(r => r.kind === 'left').length} right=${q.rows.filter(r => r.kind === 'right').length}`);
  chk('单聊不显示昵称', q.names.length === 0, JSON.stringify(q.names));
  chk('单聊不显示角色标识', q.roles.length === 0, JSON.stringify(q.roles));
  chk('单聊仍满足左右分栏', q.rowCount === 4 && q.rows.filter(r => r.kind === 'left').every(r => r.justify === 'flex-start') && q.rows.filter(r => r.kind === 'right').every(r => r.justify === 'flex-end'),
      q.rows.map(r => r.kind + ':' + r.justify).join(' '));
  chk('单聊每条 margin-top = 4px', q.rowCount === 4 && q.rows.every(r => r.marginTop === '4px'), [...new Set(q.rows.map(r => r.marginTop))].join(','));
  chk('单聊气泡底色同规则（白 / 淡蓝）', q.rowCount === 4 && q.rows.filter(r => r.kind === 'left').every(r => r.bubbleBg === 'rgb(255, 255, 255)') && q.rows.filter(r => r.kind === 'right').every(r => r.bubbleBg === 'rgb(227, 240, 252)'),
      [...new Set(q.rows.filter(r => r.bubbleRect).map(r => r.bubbleBg))].join(' | '));
  chk('单聊时刻在气泡内部右下角', q.rowCount === 4 && q.rows.filter(r => r.tsText).every(r => r.tsInsideBubble && (r.bubbleRect.r - r.tsRect.r) <= 12 && (r.bubbleRect.b - r.tsRect.b) <= 18),
      q.rows.filter(r => r.tsText).map(r => `${r.tsText}:dR=${r.bubbleRect.r - r.tsRect.r},dB=${r.bubbleRect.b - r.tsRect.b}`).join(' '));
  chk('单聊日期分隔线 2 条（昨天 / 今天）', q.dateseps.length === 2, JSON.stringify(q.dateseps.map(d => d.text)));
  chk('单聊旧的「气泡下方时间行」也没有', q.oldTimeRows === 0, q.oldTimeRows);
  console.log('截图: ' + qfile);

  // ---------- 再验群聊 ----------
  console.log('\n=== 打开群聊窗口 ===');
  await send('Page.navigate', { url: BASE + '/?_=' + Date.now() }); await sleep(9000);
  await goto(`#/wx/chatWindow/index?userId=${GROUP_ID}&windowType=GROUP`, 6500);
  const has = await evaluate(`document.querySelectorAll('.zfb-tk-item').length`);
  if (!has) {
    const txt = await evaluate(`document.body.innerText.slice(0, 300)`);
    console.log('   页面没渲染出消息，当前可见文本：' + JSON.stringify(txt));
  }
  const p = JSON.parse(await evaluate(PROBE));
  const file = await shot('group-chat');

  console.log('\n=== 1. 左右分栏（flex + justify-content）===');
  const left = p.rows.filter(r => r.kind === 'left');
  const right = p.rows.filter(r => r.kind === 'right');
  const center = p.rows.filter(r => r.kind === 'center');
  chk('消息条数 = 7', p.rowCount === 7, `left=${left.length} right=${right.length} center=${center.length}`);
  chk('对方消息 justify-content = flex-start', left.length > 0 && left.every(r => r.justify === 'flex-start'), left.map(r => r.justify).join(','));
  chk('自己消息 justify-content = flex-end', right.length > 0 && right.every(r => r.justify === 'flex-end'), right.map(r => r.justify).join(','));
  chk('全部 flex-direction = row（不再用 row-reverse 分栏）', p.rows.every(r => r.flexDir === 'row'), [...new Set(p.rows.map(r => r.flexDir))].join(','));
  chk('对方气泡紧贴左侧（bubble.l 只比 row.l 多出头像位）', left.every(r => r.bubbleRect && r.avatarRect && r.bubbleRect.l > r.avatarRect.r - 1),
      left.map(r => `b.l=${r.bubbleRect?.l} av.r=${r.avatarRect?.r}`).join(' | '));
  chk('自己消息整体贴右（row.r - 头像.r <= 1）', right.every(r => r.rowRect.r - r.avatarRect.r <= 1),
      right.map(r => `row.r=${r.rowRect.r} av.r=${r.avatarRect.r}`).join(' | '));
  chk('自己消息里头像在气泡右边', right.every(r => r.avatarRect.l >= r.bubbleRect.r - 1),
      right.map(r => `b.r=${r.bubbleRect.r} av.l=${r.avatarRect.l}`).join(' | '));

  console.log('\n=== 2. 压缩留白 ===');
  chk('每条消息 margin-top = 4px', p.rows.every(r => r.marginTop === '4px'), [...new Set(p.rows.map(r => r.marginTop))].join(','));

  console.log('\n=== 3. 极简气泡 ===');
  // 只对「文字气泡」断言底色：图片/视频/名片走的是内容块，本来就没有气泡底色
  const textLeft = left.filter(r => r.bubbleBg !== 'rgba(0, 0, 0, 0)');
  const textRight = right.filter(r => r.bubbleBg !== 'rgba(0, 0, 0, 0)');
  chk('对方文字气泡纯白 rgb(255,255,255)', textLeft.length > 0 && textLeft.every(r => r.bubbleBg === 'rgb(255, 255, 255)'), [...new Set(textLeft.map(r => r.bubbleBg))].join(','));
  chk('自己气泡品牌淡蓝 rgb(227,240,252)', textRight.length > 0 && textRight.every(r => r.bubbleBg === 'rgb(227, 240, 252)'), [...new Set(textRight.map(r => r.bubbleBg))].join(','));
  chk('图片消息不套气泡底色（内容块本身透明）', left.some(r => r.bubbleBg === 'rgba(0, 0, 0, 0)'), '透明行数=' + left.filter(r => r.bubbleBg === 'rgba(0, 0, 0, 0)').length);
  chk('气泡无阴影', p.rows.every(r => !r.bubbleShadow || r.bubbleShadow === 'none'), [...new Set(p.rows.map(r => r.bubbleShadow))].join(' | '));
  chk('自己气泡文字是墨黑而不是白字', right.every(r => r.bubbleColor === 'rgb(17, 27, 33)'), [...new Set(right.map(r => r.bubbleColor))].join(','));

  console.log('\n=== 4. 昵称 + 角色小字（12px，同一行）===');
  chk('群聊「对方」消息才显示昵称，共 4 条', p.names.length === 4, JSON.stringify(p.names));
  chk('自己的消息不显示昵称', right.every(r => r.nameRect === null), right.map(r => r.nameRect ? '有' : '无').join(','));
  chk('角色标识渲染出「管理员」与「群主」', p.roles.includes('管理员') && p.roles.includes('群主'), JSON.stringify(p.roles));
  chk('角色标识字号 = 12px', p.roleFontSize === '12px', p.roleFontSize);
  chk('昵称与角色在同一行（name 行高度 = 单行 16px）', p.rows.filter(r => r.nameRect).every(r => r.nameRect.h === 16),
      p.rows.filter(r => r.nameRect).map(r => r.nameRect.h).join(','));
  chk('昵称字号 12px / 墨黑 / 半粗', p.rows.filter(r => r.nameRect).every(r => r.nameFontSize === '12px'), [...new Set(p.rows.filter(r => r.nameRect).map(r => r.nameFontSize))].join(','));

  console.log('\n=== 5. 时间内嵌 + 日期分隔线 ===');
  const inlineTs = p.rows.filter(r => r.tsText && !r.tsIsOverlay);
  chk('旧的「气泡下方时间行」已消失', p.oldTimeRows === 0, '找到 ' + p.oldTimeRows + ' 个 .zfb-tk-time');
  chk('时刻数量 = 6（居中系统提示不算）', p.tsCount === 6, p.tsCount);
  chk('气泡内时刻字号 = 10px', inlineTs.length === 5 && p.rows.filter(r => r.tsText).every(r => r.tsFontSize === '10px'), '内嵌 ' + inlineTs.length + ' / 全部 ' + p.rows.filter(r => r.tsText).length + '，字号 ' + [...new Set(p.rows.filter(r => r.tsText).map(r => r.tsFontSize))].join(','));
  chk('气泡内时刻为灰色 rgb(134,150,160)', inlineTs.every(r => r.tsColor === 'rgb(134, 150, 160)'), [...new Set(inlineTs.map(r => r.tsColor))].join(','));
  chk('文字消息的时刻在气泡内部', p.rows.filter(r => r.tsText && r.bubbleRect && r.kind !== 'center').every(r => r.tsInsideBubble),
      p.rows.filter(r => r.tsText).map(r => `${r.tsText}:${r.tsInsideBubble}`).join(' '));
  // 气泡左右内边距 12px、上下 8px，时刻应贴在这个内边距框里
  chk('文字消息时刻贴气泡右下角（右侧 ≤ 12px、下方 ≤ 18px）', inlineTs.filter(r => r.bubbleRect).every(r => (r.bubbleRect.r - r.tsRect.r) <= 12 && (r.bubbleRect.b - r.tsRect.b) <= 18),
      inlineTs.filter(r => r.bubbleRect).map(r => `dR=${r.bubbleRect.r - r.tsRect.r} dB=${r.bubbleRect.b - r.tsRect.b}`).join(' '));
  chk('图片消息时刻用浮层（1 个，白字衬深底）', p.tsOverlay === 1 && p.rows.filter(r => r.tsIsOverlay).every(r => r.tsColor === 'rgb(255, 255, 255)'), p.tsOverlay);
  chk('日期分隔线 3 条（3天前 / 昨天 / 今天）', p.dateseps.length === 3, JSON.stringify(p.dateseps.map(d => d.text)));
  chk('日期分隔线居中', p.dateseps.every(d => d.centered), p.dateseps.map(d => d.centered).join(','));
  chk('日期分隔线字号 11px 且浅灰底', p.dateseps.every(d => d.fs === '11px' && d.bg === 'rgb(234, 234, 234)'),
      p.dateseps.map(d => d.fs + '/' + d.bg).join(' | '));

  console.log('\n详细信息：');
  console.log(JSON.stringify(p.rows.map(r => ({ kind: r.kind, justify: r.justify, mt: r.marginTop, bg: r.bubbleBg, name: r.nameRect ? 1 : 0, ts: r.tsText, inBubble: r.tsInsideBubble })), null, 1));
  console.log('\n截图: ' + file);

  const pass = results.filter(r => r.ok).length;
  console.log(`\n===== 通过 ${pass}/${results.length} =====`);
  const failed = results.filter(r => !r.ok);
  if (failed.length) { console.log('失败项：'); failed.forEach(f => console.log('  - ' + f.label)); }
  ws.close();
}
main().catch(e => { console.error('脚本异常:', e.message); process.exit(1); });
