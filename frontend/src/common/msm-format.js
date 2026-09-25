/**
 * Msm 格式化工具（V2EX 风格：内容优先，时间用相对表达，信息密度高）
 *
 * 全部为纯函数，无副作用，H5 与 App 端行为一致。
 * 注意：本文件**不含任何金额/货币相关函数** —— Msm 是即时通讯应用，
 * 没有余额与收支；brief 里的 formatCurrency 已确认不做。
 */

/** 一天的毫秒数 */
const DAY = 86400000;
const HOUR = 3600000;
const MINUTE = 60000;

function pad2(n) {
	return n < 10 ? '0' + n : '' + n;
}

/** 取某天 00:00:00 的时间戳 */
function dayStart(d) {
	const x = new Date(d.getTime());
	x.setHours(0, 0, 0, 0);
	return x.getTime();
}

/**
 * 把后端返回的各种时间格式稳妥地解析成 Date；无法解析时返回 null。
 *
 * 关键坑：iOS 的 WebView（含 uni-app App 端）**无法解析** "2024-01-01 12:00:00"
 * 这种带空格、带横杠的格式，会得到 Invalid Date。必须先把 "-" 换成 "/"。
 */
export function toDate(value) {
	if (value === null || value === undefined || value === '') return null;
	if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

	if (typeof value === 'number') {
		// 10 位以内当秒处理，13 位当毫秒
		const ms = value < 1e12 ? value * 1000 : value;
		const d = new Date(ms);
		return isNaN(d.getTime()) ? null : d;
	}

	const raw = String(value).trim();
	if (!raw) return null;

	// 纯数字字符串
	if (/^\d+$/.test(raw)) {
		const n = Number(raw);
		const ms = raw.length <= 10 ? n * 1000 : n;
		const d = new Date(ms);
		return isNaN(d.getTime()) ? null : d;
	}

	// 统一成 iOS 能认的格式：横杠换斜杠、T 换空格、去掉毫秒与 Z 后缀
	const normalized = raw
		.replace(/-/g, '/')
		.replace('T', ' ')
		.replace(/\.\d+/, '')
		.replace(/Z$/, '')
		.trim();

	let d = new Date(normalized);
	if (isNaN(d.getTime())) d = new Date(raw); // 最后兜底
	return isNaN(d.getTime()) ? null : d;
}

/**
 * 相对时间（用于卡片摘要下方、详情页的时间行）
 *   刚刚 / 7分钟前 / 3小时前 / 昨天 14:20 / 3月5日 / 2024/3/5
 *
 * @param {*} value 时间戳 / 日期字符串 / Date
 * @param {number} [now] 可选的“当前时间”时间戳，便于测试
 */
export function formatTime(value, now) {
	const d = toDate(value);
	if (!d) return '';
	const nowMs = typeof now === 'number' ? now : Date.now();
	const diff = nowMs - d.getTime();

	// 未来时间（时钟误差）直接按“刚刚”显示
	if (diff < 0) return '刚刚';
	if (diff < MINUTE) return '刚刚';
	if (diff < HOUR) return Math.floor(diff / MINUTE) + '分钟前';
	if (diff < DAY && dayStart(new Date(nowMs)) === dayStart(d)) {
		return Math.floor(diff / HOUR) + '小时前';
	}

	const today = dayStart(new Date(nowMs));
	const that = dayStart(d);
	const dayGap = Math.round((today - that) / DAY);

	if (dayGap === 1) return '昨天 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
	if (dayGap === 2) return '前天 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
	if (d.getFullYear() === new Date(nowMs).getFullYear()) {
		return (d.getMonth() + 1) + '月' + d.getDate() + '日';
	}
	return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}

/**
 * 列表右侧的紧凑时间（会话列表、通知列表）
 *   14:20 / 昨天 / 3月5日 / 2024/3/5
 * 放在窄列里，所以不放“分钟前”这种长文案。
 */
export function formatListTime(value, now) {
	const d = toDate(value);
	if (!d) return '';
	const nowMs = typeof now === 'number' ? now : Date.now();

	const today = dayStart(new Date(nowMs));
	const that = dayStart(d);
	const dayGap = Math.round((today - that) / DAY);

	if (dayGap <= 0) return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
	if (dayGap === 1) return '昨天';
	if (dayGap === 2) return '前天';
	if (d.getFullYear() === new Date(nowMs).getFullYear()) {
		return (d.getMonth() + 1) + '月' + d.getDate() + '日';
	}
	return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}

/** 完整日期时间：2024-03-05 14:20 */
export function formatDateTime(value) {
	const d = toDate(value);
	if (!d) return '';
	return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
		' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/** 只有日期：2024-03-05 */
export function formatDate(value) {
	const d = toDate(value);
	if (!d) return '';
	return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/**
 * 未读数量：0 / 空 → ''，1–99 → 原样，>99 → '99+'
 * 配合 <MsmBadge> 或 .msm-badge 使用。
 */
export function formatCount(n) {
	const v = Number(n);
	if (!v || v <= 0 || isNaN(v)) return '';
	return v > 99 ? '99+' : String(v);
}

/**
 * 会话列表的摘要文案：把消息类型转成人类可读的前缀
 * （群聊里需要显示“谁：说了什么”）
 * @param {object} msg 形如 { msgType, msgContent, nickName }
 */
export function formatMessageBrief(msg) {
	if (!msg) return '';
	const type = msg.msgType || msg.type || '';
	const content = msg.msgContent || msg.content || '';
	switch (type) {
		case 'IMAGE':
			return '[图片]';
		case 'VOICE':
		case 'AUDIO':
			return '[语音]';
		case 'VIDEO':
			return '[视频]';
		case 'FILE':
			return '[文件]';
		case 'LOCATION':
			return '[位置]';
		case 'TRTC_VOICE_END':
			return '[语音通话]' + (content ? ' ' + content : '');
		case 'TRTC_VIDEO_END':
			return '[视频通话]' + (content ? ' ' + content : '');
		default:
			return String(content).replace(/\s+/g, ' ').trim();
	}
}

export default {
	toDate,
	formatTime,
	formatListTime,
	formatDateTime,
	formatDate,
	formatCount,
	formatMessageBrief
};
