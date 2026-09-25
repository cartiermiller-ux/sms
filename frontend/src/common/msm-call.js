/**
 * Msm 音视频通话 —— 信令、房间与状态
 *
 * 为什么不用 TUICalling 插件：
 *   TUICalling 自带一整套通话 UI，但它依赖 IM SDK，云打包时打不进 APK。
 *   改用官方 TRTCCloud 原生插件（nativeplugins/TRTCCloudUniPlugin-TRTCCloudImpl）
 *   + 自己写的通话页（wx/call/index.nvue，视频画面必须由 nvue 原生组件承载）。
 *
 * 信令怎么走（不改后端）：
 *   后端 PushMsgEnum 是封闭枚举，只认 4 种通话消息类型，多一种都会反序列化失败：
 *     TRTC_VOICE_START / TRTC_VIDEO_START / TRTC_VOICE_END / TRTC_VIDEO_END
 *   所以把真正的状态塞进消息 content（JSON），类型只表达「开始类 / 结束类」：
 *     START 类：invite（发起呼叫） / accept（接听）
 *     END   类：reject（拒接） / cancel（主叫取消） / hangup（挂断） / busy（占线）
 *
 * 进房参数：
 *   roomId 用 9 位纯数字（TRTC 的 roomId 必须是 32 位有符号整数，不用 strRoomId 以免混用出问题）。
 *   两人各自 enterRoom 同一个 roomId，彼此的 userId 需要在同一个 TRTC 应用下唯一，
 *   后端 /trtc/getSign 返回的 userId 已经带了 "u" 前缀（AppConstants.REDIS_TRTC_USER）。
 */

import http from '@/common/request';

/** 信令协议版本，将来改结构时用来兼容旧消息 */
export const SIGNAL_VERSION = 1;
/** 信令标识，避免把普通聊天内容误判成通话信令 */
const SIGNAL_KEY = 'msm-call';
/** 当前通话状态在本地存储里的 key */
const ACTIVE_KEY = 'msm-call-active';

/** 这四种是后端认得的通话消息类型 */
export function isCallMsgType(t) {
	return t === 'TRTC_VOICE_START' || t === 'TRTC_VIDEO_START' ||
		t === 'TRTC_VOICE_END' || t === 'TRTC_VIDEO_END';
}

/** 从消息类型推断媒体类型：'voice' | 'video' */
export function mediaOf(msgType) {
	return String(msgType).indexOf('VOICE') >= 0 ? 'voice' : 'video';
}

/** 媒体类型 + 是否结束 → 后端认得的消息类型 */
export function msgTypeOf(media, terminal) {
	return 'TRTC_' + (media === 'voice' ? 'VOICE' : 'VIDEO') + (terminal ? '_END' : '_START');
}

/** 生成 9 位数字房间号（TRTC roomId 必须是 32 位有符号整数） */
export function newRoomId() {
	return Math.floor(100000000 + Math.random() * 899999999);
}

/** 组装信令消息体 */
export function buildSignal(signal) {
	return JSON.stringify(Object.assign({ v: SIGNAL_VERSION, k: SIGNAL_KEY }, signal));
}

/** 解析信令；不是本协议的消息返回 null（普通聊天内容一律返回 null） */
export function parseSignal(content) {
	if (!content || typeof content !== 'string') return null;
	try {
		const o = JSON.parse(content);
		if (!o || o.k !== SIGNAL_KEY || !o.s) return null;
		return o;
	} catch (e) {
		return null;
	}
}

/* ------------------------------------------------------------------
   当前通话状态（本地存储，H5 与 App 行为一致）
   ------------------------------------------------------------------ */

export function getActive() {
	try {
		const raw = uni.getStorageSync(ACTIVE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (e) {
		return null;
	}
}

export function setActive(state) {
	try {
		uni.setStorageSync(ACTIVE_KEY, JSON.stringify(state));
	} catch (e) {}
}

export function patchActive(patch) {
	const cur = getActive() || {};
	const next = Object.assign({}, cur, patch);
	setActive(next);
	return next;
}

export function clearActive() {
	try {
		uni.removeStorageSync(ACTIVE_KEY);
	} catch (e) {}
}

/* ------------------------------------------------------------------
   通话中的实时事件：通话页用 uni.$on 监听
   ------------------------------------------------------------------ */

/** 收到对端信令（接听 / 拒接 / 挂断 / 占线 / 取消） */
export const EVT_SIGNAL = 'msm-call-signal';
/** 远端用户进出房（由通话页自己从 SDK 回调拿，这里只留常量备用） */
export const EVT_STATE = 'msm-call-state';

export function emitSignal(signal, extra) {
	uni.$emit(EVT_SIGNAL, Object.assign({ signal }, extra || {}));
}

export function emitState(state) {
	uni.$emit(EVT_STATE, state);
}

/* ------------------------------------------------------------------
   对外动作
   ------------------------------------------------------------------ */

/**
 * 发一条通话信令给对方。
 * @param {Object} o
 * @param {String|Number} o.toUserId 对方 userId（必须是好友，否则后端会拒）
 * @param {String} o.media   'voice' | 'video'
 * @param {Boolean} o.terminal 是否属于「结束类」消息
 * @param {Object} o.signal   信令体 { s, roomId, media, ... }
 * @returns {Promise}
 */
export function sendSignal({ toUserId, media, terminal, signal }) {
	return new Promise((resolve, reject) => {
		http.request({
			url: '/chat/sendMsg',
			method: 'POST',
			data: JSON.stringify({
				userId: toUserId,
				msgType: msgTypeOf(media, terminal),
				content: buildSignal(Object.assign({ media: media }, signal))
			}),
			success: (res) => {
				if (res.data.code == 200) {
					if (res.data.data && res.data.data.status !== '0') {
						reject(new Error(res.data.data.statusLabel || '发送失败'));
						return;
					}
					resolve(res.data.data || {});
				} else {
					reject(new Error(res.data.msg || '发送失败'));
				}
			},
			fail: (err) => reject(err)
		});
	});
}

/** 取 TRTC 进房签名（后端 /trtc/getSign，返回 appId / userId / sign） */
export function fetchSign() {
	return new Promise((resolve, reject) => {
		http.request({
			url: '/trtc/getSign',
			success: (res) => {
				if (res.data.code == 200 && res.data.data) {
					const d = res.data.data;
					// appId 必须是数字，后端没配好时会返回占位符 "xxxxxxxxxx"
					if (!/^\d+$/.test(String(d.appId))) {
						reject(new Error('TRTC 未配置：后端 /trtc/getSign 返回的 appId 不是数字'));
						return;
					}
					resolve({
						sdkAppId: Number(d.appId),
						userId: String(d.userId),
						userSig: d.sign,
						expire: d.expire
					});
				} else {
					reject(new Error(res.data.msg || '获取通话签名失败'));
				}
			},
			fail: (err) => reject(err)
		});
	});
}

/**
 * 主叫：发 invite 并跳到通话页。
 * @param {Object} o { userId, nickName, portrait, media }
 */
export function startCall({ userId, nickName, portrait, media }) {
	const roomId = newRoomId();
	const state = {
		role: 'caller',
		media: media,
		roomId: roomId,
		peerId: userId,
		peerName: nickName || '',
		peerPortrait: portrait || '',
		startAt: Date.now()
	};
	setActive(state);
	sendSignal({
		toUserId: userId,
		media: media,
		terminal: false,
		signal: { s: 'invite', roomId: roomId }
	}).catch((err) => {
		uni.showToast({ title: err.message || '发起通话失败', icon: 'none' });
	});
	uni.navigateTo({
		url: '/pages/call/index?role=caller&media=' + media + '&roomId=' + roomId +
			'&peerId=' + encodeURIComponent(userId) +
			'&peerName=' + encodeURIComponent(nickName || '') +
			'&peerPortrait=' + encodeURIComponent(portrait || '')
	});
}

/**
 * 收到对端信令时的统一入口（由 publicFc 的推送处理调用）。
 * @param {Object} o { msgType, content, fromInfo }
 */
export function onIncomingSignal({ msgType, content, fromInfo }) {
	if (!isCallMsgType(msgType)) return false;
	const sig = parseSignal(content);
	if (!sig) return false;

	const media = sig.media || mediaOf(msgType);
	const from = fromInfo || {};
	const peer = {
		peerId: from.userId,
		peerName: from.nickName || '',
		peerPortrait: from.portrait || ''
	};

	if (sig.s === 'invite') {
		const cur = getActive();
		if (cur) {
			// 已经在通话里，直接回占线（用「结束类」消息，避免对方一直响铃）
			sendSignal({
				toUserId: peer.peerId,
				media: media,
				terminal: true,
				signal: { s: 'busy', roomId: cur.roomId }
			}).catch(() => {});
			return true;
		}
		setActive(Object.assign({
			role: 'callee',
			media: media,
			roomId: sig.roomId,
			phase: 'ringing',
			startAt: Date.now()
		}, peer));
		uni.navigateTo({
			url: '/pages/call/index?role=callee&media=' + media + '&roomId=' + sig.roomId +
				'&peerId=' + encodeURIComponent(peer.peerId) +
				'&peerName=' + encodeURIComponent(peer.peerName) +
				'&peerPortrait=' + encodeURIComponent(peer.peerPortrait)
		});
		return true;
	}

	// 其余状态（accept / reject / cancel / hangup / busy）交给正在通话的页面处理
	emitSignal(sig, peer);
	return true;
}

export default {
	isCallMsgType,
	mediaOf,
	msgTypeOf,
	newRoomId,
	buildSignal,
	parseSignal,
	getActive,
	setActive,
	patchActive,
	clearActive,
	sendSignal,
	fetchSign,
	startCall,
	onIncomingSignal,
	emitSignal,
	emitState,
	EVT_SIGNAL,
	EVT_STATE
};
