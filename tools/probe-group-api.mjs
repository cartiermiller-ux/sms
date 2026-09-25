/**
 * 探测线上后端 /group/* 的真实返回结构（含「角色/群主」字段的有无）
 *
 * 为什么要探：前端要按参考图在群聊里显示「昵称 + 群主/管理员 小徽标」，
 * 但仓库里的后端源码 groupDict 只 filter("name","notice","portrait")，
 * 需要确认线上跑的 jar 是否已带 master/role 字段。
 *
 * 用法：node probe-group-api.mjs
 */
import crypto from 'node:crypto';

const BASE = 'https://imessage.uno/api';
const PHONE = '13900000001';
const PASSWORD = 'abc12345';

const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');

// 后端有 DeviceInterceptor + VersionInterceptor：
//   device  必须是 DeviceEnum.code（h5/android/ios/...）
//   version 必须是 x.y.z 且 >= 配置里的最低版本（server 端 1.2.0），否则一律 601
const BASE_HEADERS = { device: 'h5', version: '1.4.1' };

async function req(method, path, body, token) {
	const headers = { ...BASE_HEADERS };
	if (token) headers['Authorization'] = token;
	const init = { method, headers };
	if (body !== undefined) {
		headers['Content-Type'] = 'application/json';
		init.body = JSON.stringify(body);
	}
	const res = await fetch(BASE + path, init);
	const text = await res.text();
	let json;
	try { json = JSON.parse(text); } catch { json = { __raw: text.slice(0, 400) }; }
	return { status: res.status, json };
}
const get = (p, t) => req('GET', p, undefined, t);
const post = (p, b, t) => req('POST', p, b, t);

const login = await post('/auth/login', { phone: PHONE, password: md5(PASSWORD), cid: '' });
const token = login.json?.data?.token;
console.log('POST /auth/login ->', login.status, JSON.stringify(login.json).slice(0, 200));
if (!token) process.exit(0);

const info = await get('/my/getInfo', token);
const me = info.json?.data?.userId;
console.log('我的 userId =', me, ' nickName =', info.json?.data?.nickName);

const friends = await get('/friend/friendList', token);
const list = friends.json?.data || [];
console.log('\n好友数 =', Array.isArray(list) ? list.length : '(不是数组)');
console.log('好友[0] 字段:', Array.isArray(list) && list[0] ? Object.keys(list[0]).join(', ') : '-');

// 没有群就建一个
let groups = (await get('/group/groupList', token)).json?.data || [];
if (!groups.length) {
	const ids = (Array.isArray(list) ? list : []).slice(0, 2).map(u => u.userId).filter(Boolean);
	if (!ids.length) { console.log('\n没有好友，无法建群'); process.exit(0); }
	const created = await post('/group/createGroup', ids, token);
	console.log('\nPOST /group/createGroup ->', created.status, JSON.stringify(created.json).slice(0, 300));
	groups = (await get('/group/groupList', token)).json?.data || [];
}
console.log('群数 =', groups.length, JSON.stringify(groups).slice(0, 400));
if (!groups.length) process.exit(0);

for (const g of groups.slice(0, 3)) {
	const id = g.groupId || g.id;
	const r = await get('/group/getInfo/' + id, token);
	const d = r.json?.data || {};
	console.log('\n=== GET /group/getInfo/' + id + ' ===');
	console.log(JSON.stringify(r.json, null, 1).slice(0, 2500));
	console.log('顶层字段 :', Object.keys(d).join(', '));
	console.log('group 字段:', Object.keys(d.group || {}).join(', '));
	if (Array.isArray(d.user) && d.user.length) console.log('user[0] 字段:', Object.keys(d.user[0]).join(', '));
	console.log('是否存在 master 相关字段:',
		Object.keys(d).filter(k => /master|role|owner|admin/i.test(k)).join(', ') || '（无）',
		'|',
		Object.keys(d.group || {}).filter(k => /master|role|owner|admin/i.test(k)).join(', ') || '（group 内无）',
		'|',
		(d.user || []).some(u => Object.keys(u).some(k => /master|role|owner|admin/i.test(k))) ? '成员里有' : '成员里无');
}
