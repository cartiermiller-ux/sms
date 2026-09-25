/**
 * 独立校验线上 /trtc/getSign 返回的 UserSig 是否真的用配置里的 secret 签出来的。
 *
 * 为什么值得单独验：appId 变成数字只能说明「配置被读到了」，
 * 但如果 secret 填错，SDK 进房时才会报 70001/70003 之类的鉴权错误，
 * 那时候排查成本高得多。这里按腾讯文档的算法自己重算一遍签名做对照。
 *
 * 腾讯 UserSig 算法（https://cloud.tencent.com/document/product/647/17275）：
 *   content = "TLS.identifier:<userId>\nTLS.sdkappid:<sdkAppId>\nTLS.time:<time>\nTLS.expire:<expire>\n"
 *   sig     = base64变体( HMAC-SHA256(secret, content) )
 *   UserSig = base64变体( {TLS.ver, TLS.identifier, TLS.sdkappid, TLS.expire, TLS.time, TLS.sig} )
 * 变体规则：'+' -> '*'，'/' -> '-'，'=' -> '_'
 */
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const BASE = 'https://imessage.uno/api';
const PHONE = '13900000001';
const PASSWORD = 'abc12345';
const SECRET = process.argv[2] || '';

const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const H = { device: 'h5', version: '1.4.1', 'Content-Type': 'application/json' };

function fromTencentB64(s) {
	return s.replace(/\*/g, '+').replace(/-/g, '/').replace(/_/g, '=');
}

const lr = await fetch(BASE + '/auth/login', { method: 'POST', headers: H, body: JSON.stringify({ phone: PHONE, password: md5(PASSWORD), cid: '' }) });
const token = (await lr.json())?.data?.token;
const sr = await fetch(BASE + '/trtc/getSign', { headers: { ...H, Authorization: token } });
const d = (await sr.json())?.data;
if (!d) { console.log('取签名失败'); process.exit(1); }

console.log('后端返回：');
console.log('  appId  =', d.appId);
console.log('  userId =', d.userId);
console.log('  expire =', d.expire);
console.log('  sign   =', String(d.sign).slice(0, 40) + '…');

// Tencent 的 UserSig 载荷是「JSON → zlib 压缩 → base64 变体」，
// 所以解出 base64 之后还要 inflate；直接按 JSON 解析会得到 x\x9c 开头的二进制。
const raw = Buffer.from(fromTencentB64(String(d.sign)), 'base64');
let payload;
if (raw[0] === 0x78) {
	console.log('\n（载荷是 zlib 压缩的，已自动解压）');
	payload = JSON.parse(zlib.inflateSync(raw).toString('utf8'));
} else {
	payload = JSON.parse(raw.toString('utf8'));
}
console.log('\nsign 解出来的明文载荷：');
console.log(JSON.stringify(payload, null, 1));

const now = Math.floor(Date.now() / 1000);
const content = `TLS.identifier:${payload['TLS.identifier']}\nTLS.sdkappid:${payload['TLS.sdkappid']}\nTLS.time:${payload['TLS.time']}\nTLS.expire:${payload['TLS.expire']}\n`;

const checks = [];
const chk = (name, ok, detail) => { checks.push({ name, ok }); console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${name}${detail !== undefined ? '  → ' + detail : ''}`); };

console.log('\n=== 一致性检查 ===');
chk('appId 是纯数字', /^\d+$/.test(String(d.appId)), d.appId);
chk('载荷里的 sdkappid 与返回一致', String(payload['TLS.sdkappid']) === String(d.appId), payload['TLS.sdkappid']);
chk('载荷里的 identifier 与返回一致', String(payload['TLS.identifier']) === String(d.userId), payload['TLS.identifier']);
chk('签名未过期', Number(payload['TLS.time']) + Number(payload['TLS.expire']) > now,
	'剩余 ' + Math.round((Number(payload['TLS.time']) + Number(payload['TLS.expire']) - now) / 3600) + ' 小时');
chk('签名时间不在未来', Number(payload['TLS.time']) <= now + 60, new Date(Number(payload['TLS.time']) * 1000).toISOString());

let sigOk = null, computed = '';
if (SECRET) {
	// 注意：载荷里的 TLS.sig 用的是「标准 base64」（+ / =），
	// 而外层 UserSig 用的是腾讯变体（* / - / _）。比对前必须先归一化，
	// 否则会看到 4A08...P1+XWVi... 与 4A08...P1*XWVi... 这种「看起来不一样、其实同一个」的假失败。
	const norm = s => fromTencentB64(String(s));
	computed = crypto.createHmac('sha256', SECRET).update(content, 'utf8').digest('base64');
	sigOk = norm(computed) === norm(payload['TLS.sig']);
	chk('用给定 secret 重算的签名与载荷一致', sigOk,
		sigOk ? '完全一致（字节级）' : `\n        期望 ${computed}\n        实际 ${payload['TLS.sig']}`);
	if (!sigOk) {
		const other = crypto.createHmac('sha256', SECRET.trim()).update(content, 'utf8').digest('base64');
		console.log('        （去掉首尾空白后重算仍' + (norm(other) === norm(payload['TLS.sig']) ? '一致 —— secret 有多余空白' : '不一致）'));
	}
} else {
	console.log('   （未传 secret 参数，跳过重算对照：node verify-trtc-sign.mjs <SDKSecretKey>）');
}

const pass = checks.filter(c => c.ok).length;
console.log(`\n===== 通过 ${pass}/${checks.length} =====`);
process.exit(pass === checks.length ? 0 : 1);
