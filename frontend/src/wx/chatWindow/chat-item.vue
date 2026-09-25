<template>
	<!-- #ifdef APP-NVUE -->
	<cell>
		<!-- #endif -->
		<view class="zfb-tk-item" :class="[{ 'zfb-tk-msgleft': item.type == 1 }, { 'zfb-tk-msgright': item.type == 2 }, { 'zfb-tk-msgcenter': item.type == 3 }]">
			<!-- 日期分隔线：只在「跨天」的那一条消息前出现，整行居中 -->
			<view class="zfb-tk-datesep" v-if="dateLabel"><text class="zfb-tk-datesep-text">{{ dateLabel }}</text></view>
			<openTool :class="[{ 'openTool-msgleft': item.type == 1 }, { 'openTool-msgright': item.type == 2 }]" :talkTo="talkTo" :ref="'toolx'+itemKey" :data="item" :itemKey="itemKey"></openTool>
			<image class="zfb-tk-avatar" @click="gochatOne(item)" v-if="item.type !== 3" :src="item.portrait" mode="aspectFill"></image>
			<view class="zfb-tk-item-contentx" @longpress="longpressItem($event,itemKey,item)">
				<view class="zfb-tk-item-contentx-c">
					<view class="zfb-tk-time-notsend wxfont fssb" @click="tryagin(item, itemKey)" v-if="item.sendtype && item.sendtype == 'error'"></view>
					<view class="zfb-tk-item-contentx-c-tool">
						<!-- 群聊里对方的消息：昵称与「群主 / 管理员」标识同一行，标识用小字 -->
						<view class="zfb-tk-name" v-if="senderName">
							<text class="zfb-tk-name-text">{{ senderName }}</text>
							<text class="zfb-tk-role" v-if="roleLabel">{{ roleLabel }}</text>
						</view>
						<view class="zfb-tk-item-c" v-if="item.msgType == 'TEXT'">
							<text>{{ item.content }}</text>
							<view class="zfb-tk-ts" v-if="clockInline">{{ clockText }}</view>
						</view>
						<view class="zfb-tk-item-c" v-if="item.msgType == 'ALERT'">
							<text>{{ item.content }}</text>
						</view>
						<view class="zfb-tk-item-c-LOCATION" v-if="item.msgType == 'LOCATION'" @click="goMap(returnParse(item.content))">	
							<view class="zfb-tk-item-c-LOCATION-name">{{ returnParse(item.content).name }}</view>
							<view class="zfb-tk-item-c-LOCATION-address">{{ returnParse(item.content).address }}</view>	
							<image class="zfb-tk-item-c-LOCATION-map" src="../../static/wx/map.png" mode="aspectFit"></image>
						</view>
						<image class="zfb-tk-item-c-img" v-if="item.msgType == 'IMAGE'" :src="returnParse(item.content).url" mode="aspectFill" @click="$fc.previewImagesolo(returnParse(item.content).url)"></image>
						<view v-if="item.msgType == 'VOICE'" class="zfb-tk-item-c-VOICE">
							<view class="zfb-tk-item-c-VOICE-msg">
								<view class="zfb-tk-item-c-VOICE-tras" @click="showTrs=!showTrs">
									<text>转文字</text>
									<!-- <view class="zfb-tk-item-c-VOICE-tras-icon"></view> -->
								</view>
								<view class="zfb-tk-item-c" @click="playVOICE(returnParse(item.content).url)">
									<text>{{returnParse(item.content).time}}</text>
									<text class="wxfont yuyin" :class="{vmove:paused}"></text>
								</view>
							</view>
						</view>
						<view v-if="item.msgType == 'TRTC_VOICE_END'" class="zfb-tk-item-c-TRTC_VOICE_END" @click="sendVoiceCall">
							<view class="zfb-tk-TRTC zfb-tk-item-c">
								<view class="wxfont yuyin3"></view>
								<text>{{ callRecordText('语音通话') }}</text>
							</view>
						</view> 
						<view v-if="item.msgType == 'TRTC_VIDEO_END'" class="zfb-tk-item-c-TRTC_VIDEO_END" @click="sendVideoCall">
							<view class="zfb-tk-TRTC zfb-tk-item-c">
								<view class="wxfont shipin"></view>
								<text>{{ callRecordText('视频通话') }}</text>
							</view>
						</view>
						<!-- 呼叫发起气泡：只做展示，不绑点击，避免误触重拨 -->
						<view v-if="item.msgType == 'TRTC_VOICE_START'" class="zfb-tk-item-c-TRTC_VOICE_START">
							<view class="zfb-tk-TRTC zfb-tk-item-c">
								<view class="wxfont yuyin3"></view>
								<text>发起语音通话</text>
							</view>
						</view>
						<view v-if="item.msgType == 'TRTC_VIDEO_START'" class="zfb-tk-item-c-TRTC_VIDEO_START">
							<view class="zfb-tk-TRTC zfb-tk-item-c">
								<view class="wxfont shipin"></view>
								<text>发起视频通话</text>
							</view>
						</view>
						<view class="zfb-tk-item-c-video" v-if="item.msgType == 'VIDEO'" @click="openVideo(returnParse(item.content).videoUrl)">
							<image class="zfb-tk-item-c-img" :src="returnParse(item.content).url" mode="aspectFill"></image>
							<view class="zfb-tk-item-c-video-icon">
								<text class="wxfont bofang"></text>
							</view>
						</view>
						<view class="zfb-tk-item-c-CARD" v-if="item.msgType == 'CARD'" @click="goAddfriend(returnParse(item.content))">
							<view class="zfb-tk-item-c-CARD-top">
								<image class="zfb-tk-item-c-CARD-top-img" :src="returnParse(item.content).avatar" mode=""></image>
								<view class="zfb-tk-item-c-CARD-top-content">
									<view class="zfb-tk-item-c-CARD-title">{{returnParse(item.content).name}}</view>
									<view class="zfb-tk-item-c-CARD-no">{{returnParse(item.content).chatNo}}</view>
								</view>
							</view>
							<view class="zfb-tk-item-c-CARD-card">推荐名片</view>
						</view>
						<view v-if="showTrs" class="zfb-tk-item-c-VOICE-tras-text">{{returnParse(item.content).text}}</view>
						<!-- 图片 / 视频 / 位置 / 名片等：时间贴在内容块右下角内部 -->
						<view class="zfb-tk-ts zfb-tk-ts--over" v-if="clockOverlay">{{ clockText }}</view>
					</view>
				</view>
			</view>
		</view>
		<!-- #ifdef APP-NVUE -->
	</cell>
	<!-- #endif -->
</template>

<script>
import openTool from './openTool.vue'
import { formatClock } from '@/common/msm-format.js';
import msmCall from '@/common/msm-call.js';

/**
 * 把后端可能给出的「角色」取值统一成中文小字标识。
 * 目前线上后端（chat-api.jar）在 /group/getInfo 里**没有**返回任何角色字段，
 * 所以下面这些 key 是为「后端补字段后自动生效」预留的；
 * 在补字段之前，只有「群主」可以通过群信息里的群主 id 推断出来（见 groupMasterId）。
 */
const ROLE_LABELS = {
	master: '群主',
	owner: '群主',
	群主: '群主',
	1: '群主',
	admin: '管理员',
	administrator: '管理员',
	管理员: '管理员',
	2: '管理员'
};

export default {
	emits: ['tryagin','longpressItem'],
	name: 'chat-item',
	components:{
		openTool
	},
	props: {
		item: {
			type: Object,
			default: {}
		},
		talkTo: {
			type: Object,
			default: {}
		},
		itemKey: {
			type: Number
		},
		longTapItemKey: {
			type: [Number,String],
			default:''
		},
		/** 跨天时由父组件传入的日期分隔线文案（今天 / 昨天 / 9月9日），同一天为空 */
		dateLabel: {
			type: String,
			default: ''
		}
	},
	computed: {
		/** 气泡内右下角的时刻，如 1:41 */
		clockText() {
			return this.item && this.item.time ? formatClock(this.item.time) : '';
		},
		/** 居中系统提示（XXX 创建了群聊）不显示时刻 */
		isCenter() {
			return this.item.type === 3;
		},
		/** 纯文字气泡：时刻跟在文字最后一行右侧 */
		clockInline() {
			return !this.isCenter && this.item.msgType === 'TEXT' && !!this.clockText;
		},
		/** 图片/视频/位置/名片等：时刻浮在内容块右下角 */
		clockOverlay() {
			return !this.isCenter && this.item.msgType !== 'TEXT' && !!this.clockText;
		},
		/** 群聊里「对方」的消息才在气泡上方显示昵称；1v1 与自己的消息不显示 */
		senderName() {
			if (!this.showSenderMeta) return '';
			return this.item.nickName || '';
		},
		/** 昵称旁边的角色小字标识（群主 / 管理员），没有数据时为空 */
		roleLabel() {
			if (!this.showSenderMeta) return '';
			return this.resolveRole(this.item);
		},
		showSenderMeta() {
			return this.talkTo && this.talkTo.windowType === 'GROUP' && this.item.type === 1;
		},
		/** 群主 id：后端补字段后这里能拿到值，用来给群主的消息打「群主」标识 */
		groupMasterId() {
			const all = this.$store && this.$store.state ? this.$store.state.chatDatalist : null;
			if (!all || !this.talkTo) return '';
			const obj = all[this.talkTo.userId];
			if (!obj || !obj.groupInfo) return '';
			const g = obj.groupInfo;
			return g.masterId || g.masterUserId || g.master || '';
		}
	},
	watch:{
		longTapItemKey(v){
			if(this.itemKey==v){
				this.$refs['toolx'+v].showTab();
			}
		}
	},
	data() {
		return {
			innerAudioContext:'',
			paused:false,
			showTrs:false,
		};
	},
	methods: {
		sendVoiceCall() {
			// 发起语音通话：信令与跳转都由 msmCall 统一处理
			const all = this.$store.state.chatDatalist || {};
			const chat = all[this.talkTo.userId] || {};
			const peer = (this.talkTo.windowType === 'GROUP' ? chat.groupInfo : chat.fromInfo) || {};
			msmCall.startCall({
				userId: this.talkTo.userId,
				nickName: peer.nickName || '',
				portrait: peer.portrait || '',
				media: 'voice'
			});
		},
		sendVideoCall() {
			const all = this.$store.state.chatDatalist || {};
			const chat = all[this.talkTo.userId] || {};
			const peer = (this.talkTo.windowType === 'GROUP' ? chat.groupInfo : chat.fromInfo) || {};
			msmCall.startCall({
				userId: this.talkTo.userId,
				nickName: peer.nickName || '',
				portrait: peer.portrait || '',
				media: 'video'
			});
		},
		goAddfriend(e){
			uni.navigateTo({
				url:'../personInfo/detail?param='+e.userId+'&source=2'
			})
		},
		openVideo(e){
			this.$fc.plusDownload({onlinePath:e}).then(res=>{
				this.$fc.plusOpenFile({filePath:res})
			})
		},
		playVOICE(url){
			this.showTrs=false
			if(this.paused){
				this.innerAudioContext.destroy()
				this.paused=!this.paused
				return
			}
			this.innerAudioContext = uni.createInnerAudioContext();
			// var url='https://www.w3school.com.cn/i/horse.ogg'
			this.innerAudioContext.sessionCategory='soloAmbient'
			this.innerAudioContext.src = url;
			this.innerAudioContext.play()
			
			this.innerAudioContext.onPlay(() => {
				// console.log('播放')
				this.paused=true
			})
			this.innerAudioContext.onPause(() => {
				// console.log('暂停')
				this.paused=false
				this.innerAudioContext.destroy()
			})
		},
		goMap(e) {
			uni.openLocation({
				latitude: e.latitude,
				longitude: e.longitude,
				success: function() {}
			});
		},
		returnParse(txt) {
			return JSON.parse(txt);
		},
		tryagin(e, i) {
			this.$emit('tryagin', e, i);
		},
		gochatOne(e) {
			var source=e.windowType=="GROUP" ? '7' : '3'
			uni.navigateTo({
				url:'../personInfo/detail?param='+e.personId+'&source='+source
			})
		},
		longpressItem(e,i,v) {//长按回调
			console.log(e)
			this.$emit('longpressItem',e,i,v)
			if(this.itemKey==this.longTapItemKey){
				this.$refs['toolx'+this.itemKey].showTab();
			}
		},
		/**
		 * 通话记录气泡的文案。
		 * 内容有两种来源：
		 *   1) 新流程 —— content 是信令 JSON 信封，时长在 sig.dur 里；
		 *   2) 旧记录 —— content 直接就是「3分」这样的时长文本。
		 * 不做这个区分的话，新流程的 END 气泡会把一整串 JSON 显示出来。
		 */
		callRecordText(base) {
			const sig = msmCall.parseSignal(this.item.content);
			const dur = sig ? sig.dur : this.item.content;
			return dur ? base + ' 时长' + dur : base;
		},
		/** 解析发送人在群里的角色：优先用后端直接给的字段，其次用群主 id 推断 */
		resolveRole(item) {
			const raw = item.memberRole || item.userRole || item.role || item.groupRole || '';
			if (raw !== '' && raw !== null && raw !== undefined) {
				const hit = ROLE_LABELS[String(raw).toLowerCase()] || ROLE_LABELS[String(raw)];
				// 必须挡掉原型链上的方法（toString 之类），否则会把函数当标签渲染
				if (typeof hit === 'string') return hit;
			}
			const masterId = this.groupMasterId;
			if (masterId && String(item.personId) === String(masterId)) return '群主';
			return '';
		}
	}
};
</script>

<style lang="scss" scoped>
$avatarsize: 72rpx;   /* 36px */
$border-radius: 16rpx; /* 8px */

/* ============================================================
   消息气泡 —— 左右分栏 + 极简纯色 + 时间内嵌
   1. 一条消息 = 一行 flex：对方 justify-content:flex-start，自己 flex-end
   2. 行间距固定 4px，不用系统默认大留白
   3. 气泡只有底色：对方纯白，自己品牌淡蓝，无背景图无阴影
   4. 群聊昵称与「群主 / 管理员」标识同一行，标识 12px
   5. 时刻在气泡内部右下角（灰色 10px），日期只在跨天处出现分隔线
   ============================================================ */

.zfb-tk-item {
	position: relative;
	display: flex;
	align-items: flex-start;
	flex-wrap: wrap;
	width: 100%;
	box-sizing: border-box;
	/* 压缩留白：相邻气泡之间只留 4px */
	margin: 4px 0 0;
}

.zfb-tk-item .zfb-tk-item-c text {
	word-break: break-all;
}

.zfb-tk-msgleft,
.zfb-tk-msgright {
	text-align: left;
}

/* 对方：整行靠左 */
.zfb-tk-msgleft {
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
}

/* 自己：整行靠右（用 order 把头像换到右边，而不是 row-reverse + float） */
.zfb-tk-msgright {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}

.zfb-tk-msgright .zfb-tk-avatar {
	order: 2;
	margin-left: 10rpx;
}

.zfb-tk-msgright .zfb-tk-item-contentx {
	order: 1;
}

/* ---------- 日期分隔线（只在跨天处出现） ---------- */
.zfb-tk-datesep {
	flex: 0 0 100%;
	width: 100%;
	display: flex;
	flex-direction: row;
	justify-content: center;
	margin: 10px 0 6px;
}

.zfb-tk-datesep-text {
	font-size: 11px;
	line-height: 18px;
	color: var(--msm-text-muted);
	background: var(--msm-divider-light);
	border-radius: var(--msm-radius-pill);
	padding: 0 10px;
}

.zfb-tk-avatar {
	min-width: $avatarsize;
	width: $avatarsize;
	height: $avatarsize;
	border-radius: 50%;
}

.zfb-tk-msgleft .zfb-tk-avatar {
	margin-right: 10rpx;
}

.zfb-tk-msgcenter {
	font-size: 12px;
	display: flex;
	flex-direction: row;
	justify-content: center;
	width: 100%;
	color: var(--msm-text-muted);
}

.zfb-tk-item-c {
	box-sizing: border-box;
	position: relative;
	display: inline-block;
	border-radius: $border-radius;
}

.zfb-tk-msgleft .zfb-tk-item-c,
.zfb-tk-msgright .zfb-tk-item-c {
	min-height: $avatarsize;
	padding: 8px 12px;
	font-size: 15px;
	line-height: 1.4;
}

/* 对方：纯白 */
.zfb-tk-msgleft .zfb-tk-item-c {
	background: var(--msm-bubble-other);
	color: var(--msm-text);
}

/* 自己：品牌淡蓝，文字保持墨黑（蓝只做点缀，不靠反白撑对比） */
.zfb-tk-msgright .zfb-tk-item-c {
	background: var(--msm-bubble-self);
	color: var(--msm-text);
}

/* ---------- 群聊：昵称 + 角色小字（同一行） ---------- */
.zfb-tk-name {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 3px;
	max-width: 100%;
}

.zfb-tk-name-text {
	font-size: 12px;
	line-height: 16px;
	font-weight: 600;
	color: var(--msm-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.zfb-tk-role {
	font-size: 12px;
	line-height: 14px;
	color: var(--msm-text-secondary);
	background: var(--msm-divider-light);
	border-radius: var(--msm-radius-sm);
	padding: 1px 4px;
	margin-left: 6px;
	flex: none;
}

/* ---------- 气泡内右下角的时刻（灰色 10px） ---------- */
.zfb-tk-ts {
	float: right;
	margin: 3px 0 0 8px;
	font-size: 10px;
	line-height: 12px;
	color: var(--msm-text-muted);
	white-space: nowrap;
}

/* 图片 / 视频 / 位置 / 名片：浮在内容块右下角内部 */
.zfb-tk-ts--over {
	float: none;
	position: absolute;
	right: 6px;
	bottom: 6px;
	margin: 0;
	color: #fff;
	background: rgba(17, 27, 33, .45);
	border-radius: 3px;
	padding: 1px 4px;
}

.zfb-tk-time-notsend {
	font-size: 24px;
	color: var(--msm-danger);
	margin-top: 6px;
}
.zfb-tk-item-c-LOCATION {
	background: #fff;
	border: 1px #f0f2f4 solid;
	display: flex;
	flex-direction: column;
	width: 445rpx;
	border-radius: 12rpx;
	padding: 24rpx;
}
.zfb-tk-item-c-LOCATION-name {
	font-size: 28rpx;
	color: #101010;
	font-weight: bold;
}
.zfb-tk-item-c-LOCATION-address {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 12rpx;
}
.zfb-tk-item-c-LOCATION-map {
	background-color: #e5ffff;
	overflow: hidden;
	width: 445rpx;
	height: 150rpx;
}
.zfb-tk-item-c-img{
	border: 1px #eee solid;
	max-width: 310rpx;
	max-height: 450rpx;
}
.zfb-tk-item-c-video{
	position: relative;
}
.zfb-tk-item-c-video-icon{
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%,-50%);
	display: flex;flex-direction: row;justify-content: center;align-items: center;
}
.zfb-tk-item-c-video-icon text{
	font-size: 64rpx;
	color: #dddddd;
	text-shadow: 0px 0px 5px rgba(0,0,0,0.3);
}

.zfb-tk-item-c-VOICE{}
.vmove{
	animation: scalev 1s linear infinite;
	transform: scale(1);
}
@keyframes scalev {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.3);
	}
	100% {
		transform: scale(1);
	}
}
.zfb-tk-item-c-VOICE-tras{
	display: flex;flex-direction: row;align-items: center;
}
.zfb-tk-item-c-VOICE-tras text{
	padding:6rpx 12rpx;
	font-size: 24rpx;
	background-color: rgba(255, 255, 255, .9);
	border-radius: 12rpx;
	color: var(--msm-text-secondary);
	margin:0 12rpx;
}
.zfb-tk-item-c-VOICE-tras-icon{
	margin: 6rpx;
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background-color: #fa5151;
	position: relative;
}
.zfb-tk-item-c-VOICE-tras-text{
	width: 100%;
	font-size: 26rpx;
	color: #666;
	word-break: break-all;
	margin-bottom: 12rpx;
}
.zfb-tk-msgright .zfb-tk-item-c-VOICE-tras-text{
	text-align: right;
}
.zfb-tk-msgleft .zfb-tk-item-c-VOICE-tras-text{
	text-align: left;
}
.zfb-tk-msgleft .zfb-tk-item-c-VOICE-msg{
	flex-direction: row-reverse;
}
.zfb-tk-msgleft .zfb-tk-item-c-VOICE-tras{
	flex-direction: row-reverse;
}
.zfb-tk-item-c-VOICE-msg .zfb-tk-item-c{
	display: flex;flex-direction: row;align-items: center;
}
.zfb-tk-item-c-VOICE-msg{
	display: flex;flex-direction: row;align-items: center;
}
.zfb-tk-item-c-CARD{
	background: #fff;
	width: 440rpx;
	box-sizing: border-box;
	border: 1px #f0f2f4 solid;
	padding: 24rpx;
	border-radius: 12rpx;
}
.zfb-tk-item-c-CARD-top{
	display: flex;flex-direction: row;align-items: center;
}
.zfb-tk-item-c-CARD-top-img{
	width: 80rpx;
	min-width: 80rpx;
	height: 80rpx;
	margin-right: 24rpx;
	border-radius: 6rpx;
}
.zfb-tk-item-c-CARD-top-content{
	overflow: hidden;
	display: flex;flex-direction: column;
}
.zfb-tk-item-c-CARD-title{
	color: #070707;
	font-size: 32rpx;
}
.zfb-tk-item-c-CARD-no{
	font-size: 24rpx;
	color: #999;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.zfb-tk-item-c-CARD-card{
	font-size: 24rpx;
	color: #666;
	margin-top: 24rpx;
}

.zfb-tk-item-contentx{
	position: relative;
	display: flex;
	flex-direction: column;
	max-width: 544rpx;
}
.zfb-tk-item-contentx-name{
	color: #7C7C7E;
	font-size: 24rpx;
}
.zfb-tk-msgright .zfb-tk-item-contentx{
	align-items: flex-end;
}
.zfb-tk-msgleft .zfb-tk-item-contentx{
	align-items: flex-start;
}
.zfb-tk-item-contentx-c{
	display: flex;
	align-items: center;
	
}
.zfb-tk-msgleft .zfb-tk-item-contentx-c{
	flex-direction: row-reverse;
}
.zfb-tk-msgright .zfb-tk-item-contentx-c{
	flex-direction: row;
}
.zfb-tk-TRTC{
	align-items: center;
	display: flex;flex-direction: row;
}
.zfb-tk-TRTC .wxfont{
	font-size: 42rpx;
}
.zfb-tk-item-contentx-c-tool{display: flex;flex-direction: column;position: relative;}
.zfb-tk-msgleft .zfb-tk-item-contentx-c-tool{
	align-items: flex-start;
}
.zfb-tk-msgright .zfb-tk-item-contentx-c-tool{
	align-items: flex-end;
}
</style>
