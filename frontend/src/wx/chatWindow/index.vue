<template>
	<view>
		<uni-popup ref="popup" type="center">
			<view class="popsendCard" :style="'height:' + windowHeight + 'px'"><sendCard @click="sendCardclick"></sendCard></view>
		</uni-popup>
		<uni-popup ref="popupfavorites" type="center" background-color="#fff" style="background-color: #fff;">
			<scroll-view scroll-y :style="'height:' + windowHeight + 'px'"><favorites type="2" @clickitem="clickitem"></favorites></scroll-view>
		</uni-popup>
		<view class="zfb-tk-main">
			<uni-list class="zfb-tk-conent" :border="false" style="background: none;"><chatItem v-for="(v, index) in chatWindowData" :key="'key' + index" :talkTo="talkTo" :itemKey="index" :item="v" @tryagin="tryagin" @longpressItem="longpressItem" :longTapItemKey="longTapItemKey"></chatItem></uni-list>
			<view class="autodownView"></view>
		</view>
		<view :style="'height: ' + keyboardHeight + 'px'"></view>
		<view v-if="showtool || showEmojitool" class="zfb-tk-tool-space"></view>
		<view class="zfb-tk-send-tool" :style="'transform: translateY(-' + keyboardHeight + 'px)'">
			<view class="zfb-tk-send-tool-c">
				<view class="zfb-tk-send-tool-icon wxfont" @click="changeShowVice" :class="showVice ? 'jianpan' : 'yuyin2'"></view>
				<view class="zfb-tk-send-tool-vioce" v-if="showVice"><view class="zfb-tk-send-tool-vioce-item" @longpress="startRecord" @touchend="endRecord">按住说话</view></view>
				<view v-else class="zfb-tk-send-tool-input-box" @click="msgFocus = true"><textarea @focus="showtool = false" :focus="msgFocus" class="zfb-tk-send-tool-input" :adjust-position="false" v-model="msg" placeholder="" hold-keyboard confirm-type="send" @confirm="sendMsg(msg, 'TEXT')" :maxlength="-1" auto-height /></view>
				<view @click="changeEmojiTool" class="zfb-tk-send-tool-more wxfont biaoqing"></view>
				<view v-if="msg !== ''" class="zfb-tk-send-tool-text" @touchend.prevent="sendMsg(msg, 'TEXT')">发送</view>
				<view v-else @click="changeTool" class="zfb-tk-send-tool-more wxfont gengduo"></view>
			</view>
			<view v-if="showtool" class="zfb-tk-send-tools">
				<view class="zfb-tk-send-tools-item" v-for="(v, i) in toolist" @click="toolClick(v)">
					<view class="zfb-tk-send-tools-icon"><view class="wxfont" :class="v.icon"></view></view>
					<view class="zfb-tk-send-tools-text">{{ v.title }}</view>
				</view>
			</view>
			<scroll-view :scroll-y="true" v-if="showEmojitool" class="wxemojitool">
				<view class="wxemojitool-content">
					<view class="wxemojitool-item" @click="addMsg(v)" v-for="(v, i) in emojilist" :key="i">{{ v }}</view>
				</view>
			</scroll-view>
		</view>
		<zmm-upload-image chooseType="chooseMedia" :show="false" ref="upload" @allComplete="upLoadallComplete" @oneComplete="upLoadoneComplete"></zmm-upload-image>
		<!-- #ifndef H5 -->
		<view class="zfb-tk-recorder" v-show="showRecorder"><zmm-recorder :show="showRecorder" ref="rec" @recorderStop="recorderStop"></zmm-recorder></view>
		<!-- #endif -->
	</view>
</template>

<script>
// #ifdef APP-PLUS
const TUICalling = uni.requireNativePlugin('TUICallingUniPlugin-TUICallingModule');
// #endif
let observer = null;
import favorites from '../favorites/index.vue';
import chatItem from './chat-item.vue';
import sendCard from './sendCard.vue';
export default {
	components: {
		chatItem,
		sendCard,
		favorites
	},
	data() {
		return {
			isBottomHeight: '',
			clickToSubmitSure: null,
			autodown: true,
			emojilist: ['😁', '😂', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😌', '😍', '😏', '😒', '😓', '😔', '😖', '😘', '😚', '😜', '😝', '😞', '😠', '😡', '😢', '😣', '😤', '😥', '😨', '😩', '😪', '😫', '😭', '😰', '😱', '😲', '😳', '😵', '😷', '😸', '😹', '😺', '😻', '😼', '😽', '😾', '😿', '🙀', '🙅', '🙆', '🙇', '🙈', '🙉', '🙊', '🙋', '🙌', '🙍', '🙎', '🙏'],
			showRecorder: false,
			showVice: false,
			toolist: [
				{
					title: '相册',
					icon: 'tupian'
				},
				{
					title: '拍摄',
					icon: 'xiangji'
				},
				{
					title: '位置',
					icon: 'dingwei'
				},
				{
					title: '语音',
					icon: 'yrecord'
				},
				{
					title: '名片',
					icon: 'mingpian'
				},
				{
					title: '收藏',
					icon: 'shoucang'
				}
			],
			msgFocus: false,
			showtool: false,
			showEmojitool: false,
			msg: '',
			timer: '',
			talkTo: '',
			keyboardHeight: 0,
			windowHeight: 0,
			longTapItemKey: '',
			// chatWindowData:[],
			localData: {},
			showtitleNViewBtns: true
		};
	},
	computed: {
		userinfo() {
			return this.$store.state.userInfo;
		},
		chatListInfo() {
			return this.$store.state.chatlist[this.talkTo.userId];
		},
		chatDataState() {
			return this.$store.state.chatDataState;
		},
		chatDataUserId() {
			return this.$store.state.chatDataUserId;
		},
		chatWindowData() {
			this.$store.dispatch('getchatDatalist');
			if (this.$store.state.chatDatalist[this.talkTo.userId]) {
				return this.$store.state.chatDatalist[this.talkTo.userId].list;
			}
		}
	},
	watch: {
		chatDataState: {
			deep: true,
			immediate: true,
			handler(v) {
				if (this.chatDataUserId == this.talkTo.userId) {
					this.scrolltoBottom();
					this.clickToSubmitSure();
				}
			}
		},
		keyboardHeight: {
			deep: true,
			immediate: true,
			handler(v) {
				if (v > 0) {
					this.showEmojitool = false;
				}
			}
		}
	},
	onLoad(e) {
		this.talkTo = e;
		// 根据Id
		this.$store
			.dispatch('createChatObj', {
				userId: this.talkTo.userId,
				windowType: this.talkTo.windowType
			})
			.then(res => {
				this.localData = res.data;
				if (e.windowType == 'SINGLE') {
					uni.setNavigationBarTitle({
						title: this.localData.fromInfo.nickName
					});
				}
				this.$store.dispatch('getchatDatalist');
				this.$store.dispatch('getChatList');
				if (this.localData.fromInfo && this.localData.fromInfo.userType == 'normal') {
					this.toolist.push({
						title: '音视频',
						icon: 'yspin'
					});
				} else {
					this.$fc.setTitleNViewBtns(0, '');
					this.showtitleNViewBtns = false;
				}
				if (this.localData.groupInfo && this.localData.groupInfo.userId) {
					this.$fc.setTitleNViewBtns(0, '\ue623');
					this.showtitleNViewBtns = true;
				}
				this.scrolltoBottom();
			});
		this.clickToSubmitSure = this.$fc.debounce(
			() => {
				observer = uni.createIntersectionObserver(this);
				observer.relativeTo('.zfb-tk-main').observe('.autodownView', res => {
					var isBottomH = res.intersectionRect.top + res.intersectionRect.height;
					if (!this.isBottomHeight) {
						this.isBottomHeight = res.relativeRect.height + res.relativeRect.top - 56;
					}

					if (parseInt(isBottomH) < parseInt(this.isBottomHeight) + 40) {
						this.autodown = true;
					} else {
						this.autodown = false;
					}
				});
			},
			100,
			false
		);
	},
	onPageScroll() {
		this.clickToSubmitSure();
	},
	onReady() {},
	onShow() {
		if (this.chatListInfo && this.chatListInfo.nickName) {
			uni.setNavigationBarTitle({
				title: this.chatListInfo.nickName
			});
		}
	},
	mounted() {
		// #ifdef APP-PLUS
		uni.onKeyboardHeightChange(res => {
			this.keyboardHeight = res.height;
		});
		// #endif
	},
	onUnload() {
		if (observer) {
			observer.disconnect();
		}
		if (this.chatListInfo) {
			this.chatListInfo.num = 0;
			this.$store.dispatch('updateChatListInfoById', { userId: this.talkTo.userId, data: this.chatListInfo });
		}
	},
	methods: {
		addMsg(e) {
			this.msg += e;
		},
		clickitem(e, i) {
			//发送收藏
			this.sendMsg(e.content, e.collectType);
			this.closepopup('popupfavorites');
		},
		longpressItem(e, i) {
			this.longTapItemKey = i;
		},
		startRecord() {
			this.$refs['rec'].startRecord();
			this.showRecorder = true;
		},
		endRecord() {
			this.$refs['rec'].stopRecord();
		},
		recorderStop(e) {
			uni.showLoading({ title: '发送中' });
			this.$http.uploadFile({
				url: '/file/uploadAudio',
				filePath: e.recordFilePath,
				name: 'file',
				fileType: 'audio',
				success: res => {
					var data = JSON.parse(res.data);
					if (data.code == 200) {
						var msg = {
							time: e.recordTime,
							url: data.data.fullPath,
							text: data.data.sourceText
						};
						this.sendMsg(JSON.stringify(msg), 'VOICE');
					}
				}
			});
			this.$refs['rec'].clear(); //清理录音
			// 隐藏语音组件
			this.showRecorder = false;
			// this.showtool=false
		},
		changeShowVice() {
			this.showVice = !this.showVice;
		},
		upLoadoneComplete(e) {
			this.sendMsg(JSON.stringify(e), e.type);
		},
		upLoadallComplete(e) {
			// this.sendMsg(JSON.stringify(e),'IMAGE')
		},
		changeEmojiTool() {
			this.showEmojitool = !this.showEmojitool;
			this.showtool = false;
		},
		changeTool() {
			this.showtool = !this.showtool;
			this.showEmojitool = false;
		},
		sendCardclick(e) {
			this.$refs.popup.close();
			this.sendMsg(JSON.stringify(e.item.data), 'CARD');
		},
		open() {
			uni.getSystemInfo({
				success: res => {
					this.windowHeight = res.windowHeight;
				}
			});
			this.$refs.popup.open('top');
		},
		closepopup(e) {
			this.$refs[e].close();
		},
		openpopup(e) {
			this.$refs[e].open('top');
		},
		tryagin(e, i) {
			//重新发送
			this.chatWindowData.splice(i, 1);
			this.chatWindowData.splice(i, 1);
			this.$store.dispatch('updateChatById', {
				userId: this.talkTo.userId,
				data: this.chatWindowData
			});
			this.$nextTick(() => {
				this.sendMsg(e.content, e.msgType);
			});
		},
		sendVoiceCall() {
			//发起语音
			uni.showLoading({
				title: '发起语音通话'
			});
			var formdata = {
				userId: this.talkTo.userId,
				msgType: 'TRTC_VOICE_START',
				content: 'TRTC_VOICE_START'
			};
			this.$http.request({
				url: '/chat/sendMsg',
				method: 'POST',
				data: JSON.stringify(formdata),
				success: res => {
					if (res.data.code == '200') {
						if (res.data.data.status !== '0') {
							uni.showToast({
								title: res.data.data.statusLabel,
								icon: 'none'
							});
							return;
						}
						var userInfo = res.data.data.userInfo;
						var data = {
							userId: userInfo.userId,
							trtcId: userInfo.trtcId,
							nickName: userInfo.nickName,
							portrait: userInfo.portrait,
							startTime: new Date().getTime(),
							type: 'audio'
						};
						uni.setStorage({
							key: 'call',
							data: JSON.stringify(data),
							success: function() {
								TUICalling.call({
									userID: userInfo.trtcId,
									type: 1
								});
							}
						});
					}
				}
			});
		},
		sendVideoCall() {
			//发起视频
			uni.showLoading({
				title: '发起视频通话'
			});
			var formdata = {
				userId: this.talkTo.userId,
				msgType: 'TRTC_VIDEO_START',
				content: 'TRTC_VIDEO_START'
			};
			this.$http.request({
				url: '/chat/sendMsg',
				method: 'POST',
				data: JSON.stringify(formdata),
				success: res => {
					if (res.data.code == '200') {
						if (res.data.data.status !== '0') {
							uni.showToast({
								title: res.data.data.statusLabel,
								icon: 'none'
							});
							return;
						}
						var userInfo = res.data.data.userInfo;
						var data = {
							userId: userInfo.userId,
							trtcId: userInfo.trtcId,
							nickName: userInfo.nickName,
							portrait: userInfo.portrait,
							startTime: new Date().getTime(),
							type: 'video'
						};
						uni.setStorage({
							key: 'call',
							data: JSON.stringify(data),
							success: function() {
								TUICalling.call({
									userID: userInfo.trtcId,
									type: 2
								});
							}
						});
					}
				}
			});
		},
		toolClick(e) {
			switch (e.title) {
				case '位置':
					uni.chooseLocation({
						success: res => {
							this.sendMsg(JSON.stringify(res), 'LOCATION');
						}
					});
					break;
				case '相册':
					this.$refs['upload'].chooseTap();
					break;
				case '语音':
					this.startRecord();
					break;
				case '名片':
					this.open();
					break;
				case '音视频':
					uni.showActionSheet({
						itemList: ['视频通话', '语音通话'],
						success: res => {
							switch (res.tapIndex) {
								case 0:
									this.sendVideoCall();
									break;
								case 1:
									this.sendVoiceCall();
									break;
								default:
									break;
							}
						}
					});
					break;
				case '收藏':
					this.openpopup('popupfavorites');
					uni.getSystemInfo({
						success: res => {
							// #ifdef APP-PLUS
							this.windowHeight = res.windowHeight - res.statusBarHeight - res.safeArea.top - res.safeAreaInsets.top;
							// #endif
							// #ifndef APP-PLUS
							this.windowHeight = res.windowHeight;
							// #endif
						}
					});
					break;
				case '拍摄':
					// #ifdef APP-PLUS
					var _this = this;
					uni.showActionSheet({
						itemList: ['拍摄图片', '拍摄视频'],
						success: res => {
							switch (res.tapIndex) {
								case 0:
									getImage();
									break;
								case 1:
									getVideo();
									break;
								default:
									break;
							}
						},
						fail: function(res) {
							console.log(res.errMsg);
						}
					});
					function getImage() {
						//拍照事件
						var cmr = plus.camera.getCamera();
						cmr.captureImage(
							function(p) {
								plus.io.resolveLocalFileSystemURL(
									p,
									function(entry) {
										//读取图片信息
										compressImage(entry.toLocalURL(), entry.name); //压缩图片
									},
									function(e) {
										console.log('读取拍照文件错误：' + e.message);
									}
								);
							},
							function(e) {
								console.log(e);
							},
							{
								filename: 'file:///storage/emulated/0/Documents/weiliao/'
							}
						);
					}
					function getVideo() {
						//拍摄视频
						var cmr = plus.camera.getCamera();
						cmr.startVideoCapture(
							function(p) {
								plus.io.resolveLocalFileSystemURL(
									p,
									function(entry) {
										//读取文件信息
										compressVideo(entry.fullPath, entry.name); //压缩视频
									},
									function(e) {
										console.log('读取视频文件错误：' + e.message);
									}
								);
							},
							function(e) {
								console.log(e);
							},
							{
								filename: 'file:///storage/emulated/0/Documents/weiliao/'
							}
						);
					}
					function compressImage(url, filename) {
						//压缩图片
						var name = 'file:///storage/emulated/0/Documents/weiliao/' + filename;
						plus.zip.compressImage(
							{
								src: url, //src: (String 类型 )压缩转换原始图片的路径
								dst: name, //压缩转换目标图片的路径
								quality: 60, //quality: (Number 类型 )压缩图片的质量.取值范围为1-100
								overwrite: true //overwrite: (Boolean 类型 )覆盖生成新文件
							},
							function(e) {
								//压缩后
								// openFile(e.target)
								uni.showLoading({ title: '发送中' });
								sendPhoto(e.target); //发送
							},
							function(error) {
								console.log('压缩图片失败，请稍候再试');
							}
						);
					}
					function compressVideo(url, filename) {
						//压缩视频
						// var name = 'file:///storage/emulated/0/Documents/weiliao/compress/' + filename;
						plus.zip.compressVideo(
							{
								src: url, //src: (String 类型 )压缩转换原始路径
								// filename: name, //压缩后的路径
								quality: 'medium' //压缩级别low medium high
							},
							function(e) {
								//压缩后
								// openFile(e.tempFilePath)
								uni.showLoading({ title: '发送中' });
								sendVideo(e.tempFilePath); //发送
							},
							function(error) {
								console.log('压缩视频失败，请稍候再试');
							}
						);
					}
					function openFile(filePath) {
						//打开文件
						let system = uni.getSystemInfoSync().platform;
						if (system == 'ios') {
							filePath = encodeURI(filePath);
						}
						uni.openDocument({
							filePath,
							success: res => {
								console.log('打开文件成功');
							}
						});
					}

					function sendPhoto(filePath) {
						//发送图片
						_this.$http.uploadFile({
							url: '/file/upload',
							filePath: filePath,
							name: 'file',
							fileType: 'image',
							success: res => {
								var data = JSON.parse(res.data);
								if (data.code == 200) {
									var msg = {
										name: data.data.fileName,
										url: data.data.fullPath
									};
									_this.sendMsg(JSON.stringify(msg), 'IMAGE');
								}
							}
						});
					}
					function sendVideo(filePath) {
						//发送视频
						_this.$http.uploadFile({
							url: '/file/uploadVideo',
							filePath: filePath,
							name: 'file',
							fileType: 'video',
							success: res => {
								var data = JSON.parse(res.data);
								if (data.code == 200) {
									var msg = {
										name: data.data.fileName,
										videoUrl: data.data.fullPath,
										url: data.data.screenShot
									};
									_this.sendMsg(JSON.stringify(msg), 'VIDEO');
								}
							}
						});
					}
					// #endif
					break;

				default:
					break;
			}
		},
		sendMsg(e, msgType) {
			if (!e) {
				return;
			}
			this.$fc.pushOutMsg({
				msgContent: e,
				msgType: msgType,
				windowType: this.talkTo.windowType,
				userId: this.talkTo.userId
			});
			this.msg = '';
			// #ifdef H5
			this.msgFocus = false;
			this.$nextTick(() => {
				this.msgFocus = true;
			});
			// #endif
		},
		startRecognize() {
			//语音文本输入
			// #ifdef H5
			uni.showToast({
				title: 'H5暂不支持',
				icon: 'none'
			});
			return;
			// #endif
			let _this = this;
			let options = {};
			options.engine = 'baidu';
			options.punctuation = false; // 是否需要标点符号
			options.timeout = 10 * 1000;
			plus.speech.startRecognize(
				options,
				function(s) {
					_this.msg = _this.msg + s;
				},
				function(e) {
					uni.showToast({
						title: '语音识别失败：' + e.message,
						icon: 'none'
					});
				}
			);
		},
		scrolltoBottom() {
			if (this.autodown) {
				this.$nextTick(() => {
					this.timer = setTimeout(() => {
						uni.pageScrollTo({
							scrollTop: 9999999,
							duration: 10
						});
					}, 200);
				});
			}
		}
	},
	onNavigationBarButtonTap(e) {
		if (!this.showtitleNViewBtns) {
			return;
		}
		switch (e.index) {
			case 0:
				if (this.talkTo.windowType == 'GROUP') {
					uni.navigateTo({
						url: '../groupInfo/detail?param=' + this.talkTo.userId
					});
				}
				if (this.talkTo.windowType == 'SINGLE') {
					uni.navigateTo({
						url: '../personInfo/detail?param=' + this.talkTo.userId
					});
				}
				break;
			default:
				break;
		}
	}
};
</script>

<style lang="scss" scoped>
.autodownView {
	height: 1px;
	width: 100%;
	opacity: 0;
}
.uni-list {
	background: none;
}

/* ---------- 消息区 ---------- */
.zfb-tk-main {
	padding: 8px 16px 0;
	padding-bottom: 62px;
}

/* ---------- 输入栏 ---------- */
.zfb-tk-send-tool {
	background: var(--msm-surface);
	position: fixed;
	left: 0;
	bottom: 0;
	width: 100%;
	transition: all 0.1s;
	border-top: 1px solid var(--msm-divider);
}
.zfb-tk-send-tool-c {
	position: relative;
	z-index: 3;
	padding: 8px 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-around;
}

.zfb-tk-send-tool-c .zfb-tk-send-tool-btn {
	transition: color 0.5s;
}
.zfb-tk-send-tool-input-box {
	overflow: auto;
	flex: 1;
	margin: 0 8px;
	min-height: 38px;
	max-height: 116px;
	background: var(--msm-surface-sunken);
	border-radius: 19px;
	box-sizing: border-box;
	padding: 9px 14px;
}
.zfb-tk-send-tool .zfb-tk-send-tool-input {
	padding: 0;
	width: 100%;
	background: transparent;
	font-size: 15px;
	line-height: 20px;
	color: var(--msm-text);
}
.zfb-tk-send-tool-vioce {
	box-sizing: border-box;
	flex: 1;
	margin: 0 8px;
	height: 38px;
	border-radius: 19px;
	background: var(--msm-surface-sunken);
	display: flex;
	flex-direction: row;
	align-items: center;
}
.zfb-tk-send-tool-vioce-item {
	text-align: center;
	font-size: 14px;
	line-height: 38px;
	flex: 1;
}
.zfb-tk-send-tool-vioce-item:nth-child(1) {
	border-right: 1px solid var(--msm-divider);
}
.zfb-tk-send-tool-text {
	white-space: nowrap;
	padding: 9px 16px;
	border-radius: 10px;
	background: var(--msm-primary);
	color: #fff;
	font-size: 14px;
	font-weight: 600;
}
.zfb-tk-send-tool-more,
.zfb-tk-send-tool-icon {
	font-size: 28px;
	color: var(--msm-text-secondary);
}

/* ---------- 工具面板（附件） ---------- */
.zfb-tk-tool-space {
	height: 200px;
}
.zfb-tk-send-tools {
	height: 200px;
	width: 100%;
	background: var(--msm-surface);
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-content: flex-start;
	padding: 8px 12px;
	box-sizing: border-box;
}
.zfb-tk-send-tools-item {
	padding: 12px 6px;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 25%;
	box-sizing: border-box;
}
.zfb-tk-send-tools-icon {
	background: var(--msm-primary-light);
	width: 52px;
	height: 52px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	border-radius: 14px;
}
.zfb-tk-send-tools-icon .wxfont {
	color: var(--msm-primary);
	font-size: 30px;
}
.zfb-tk-send-tools-text {
	font-size: 12px;
	color: var(--msm-text-secondary);
	margin-top: 8px;
}
.zfb-tk-recorder {
	width: 250rpx;
	height: 250rpx;
	left: 50%;
	transform: translateX(-50%);
	bottom: 680rpx;
	box-sizing: border-box;
	text-align: center;
	position: fixed;
	border-radius: 50%;
	background-color: #f8f8f8;
	box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
	padding: 20rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
}
.popsendCard {
	display: flex;
	background-color: #fff;
	overflow: auto;
}
.popsendCard-close {
	width: 100%;
	text-align: center;
	height: 70rpx;
	line-height: 70rpx;
	font-size: 42rpx;
	background-color: #fff;
	position: fixed;
	bottom: 0;
	left: 0;
	z-index: 9999;
}
.wxemojitool {
	height: 200px;
}
.wxemojitool-content {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
}
.wxemojitool-item {
	font-size: 26px;
	width: 44px;
	height: 44px;
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
}
</style>
