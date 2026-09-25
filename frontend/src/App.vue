<script>
	import {
		version
	} from '../package.json'
	import {
		versionName
	} from '@/manifest.json'
	import consoleImgs from '@/common/consoleImgs.js'
	// #ifdef APP-PLUS
	import appUpgrade from '@/common/appUpgrade.js';
	const TUICalling = uni.requireNativePlugin("TUICallingUniPlugin-TUICallingModule");
	// #endif
	export default {
		onLaunch: function() {
			// #ifdef H5
			console.log(
				`%c Msm %c v${version} `,
				'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
				'background:#007aff ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;'
			)
			console.log(consoleImgs.fz)
			// todo 下列两行
			uni.setStorageSync('device', 'H5');
			uni.setStorageSync('version', versionName);
			this.$http.request({
				url: '/common/getVersion',
				success: (res) => {
					if(res.data.data.upgrade=='Y'){
						console.log(
							`%c 有新版本 `+res.data.data.version,
							'background:#007aff ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;'
						)
					}
				}
			});
			// #endif
			console.log('App Launch')
			let token= uni.getStorageSync('Authorization');
			if (!token) {
				//不存在则跳转至登录页
				// #ifdef APP-PLUS
				plus.navigator.closeSplashscreen();
				// #endif
			} else {
				// #ifdef H5
				this.$socketTask.connectSocket()
				// #endif
				this.$store.dispatch('get_UserInfo').then(res=>{
					// #ifdef APP-PLUS
					var nickName=res.nickName
					var portrait=res.portrait
					this.$http.request({
						url: '/trtc/getSign',
						success: (res) => {
							var sdkAppID=res.data.data.appId
							var userID=res.data.data.userId
							var userSig=res.data.data.sign
							TUICalling.login({//登录音视频
							    sdkAppID: sdkAppID, 
							    userID: userID,
							    userSig: userSig
							},(res) => {
							    console.log('音视频登录成功')
								TUICalling.setUserNickname({
								    nickName: nickName
								})
								TUICalling.setUserAvatar({
								    avatar: portrait
								})
								plus.io.requestFileSystem(plus.io.PRIVATE_WWW, function(fs) {
								    fs.root.getFile('/static/longcall.mp3', {
								        create: false
								    }, function(fileEntry) {
								        fileEntry.file(function(file) {
											TUICalling.setCallingBell({
											    ringtone: file.fullPath
											},(res) => {
												console.log(JSON.stringify(res))
											})
										});
								    });
								});
								
							})
						}
					});
					// 未集成 Push 模块时访问 plus.push 会弹出"未添加push模块"提示框，
					// 故此处跳过。日后开通 uni-push 并勾选 Push 模块后，可恢复为
					// var nowCid = plus.push.getClientInfo().clientid
					var nowCid = ''
					if (nowCid) {
						this.$http.request({
							url: '/my/bindCid/'+nowCid,
							success: (res) => {
								console.log('新cid'+nowCid)
								uni.setStorageSync('cid', nowCid);
							}
						});
					}
					// #endif
				})
				uni.reLaunch({
					url: "wx/tabbar1/index",
				}).then(res=>{
					// #ifdef APP-PLUS
					plus.navigator.closeSplashscreen();
					// #endif
				})
			}
			// #ifdef APP-PLUS
			//升级检测
			uni.getSystemInfo({
				success: (res)=> {
					uni.setStorageSync('device', res.platform);
					plus.runtime.getProperty(plus.runtime.appid, (widgetInfo)=> {
						uni.setStorageSync('version', widgetInfo.version);
						this.$http.request({
							url: '/common/getVersion',
							success: (res) => {
								if(res.data.data.upgrade=='Y'){
									appUpgrade.init({
										titleText: '版本更新'+res.data.data.version,
										packageUrl:res.data.data.url,
										content: res.data.data.content,
										forceUpgrade:res.data.data.forceUpgrade=='Y' ? true : false
									});
									appUpgrade.show();
								}
							}
						});
					});
				}
			});
			// #endif
		},
		onShow: function() {
			console.log('App Show')
			uni.getStorage({
				key: 'call',
				success: (res) => {
					var callx=res.data
					if(callx){
						var call=JSON.parse(callx)
						function getInervalHour(startDate) {//获取两个时间之间的小时
							if (!startDate) {
								return '0秒'
							}
							var ms = new Date().getTime() - startDate;
							if (ms < 0) return '0秒';
							if((ms/1000)<60){
								return Math.floor(ms / 1000)+'秒';
							}else{
								return Math.floor(ms / 1000 /60)+'分';
							}
						}
						var msgType=''
						if(call.type=='audio'){
							msgType='TRTC_VOICE_END'
						}
						if(call.type=='video'){
							msgType='TRTC_VIDEO_END'
						}
						this.$fc.pushOutMsg({
							msgContent:getInervalHour(call.startTime),
							msgType:msgType,
							windowType:'SINGLE',
							userId:call.userId,
						})
						uni.removeStorageSync('call')
					}
				}
			});
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	@import '@/uni_modules/uni-scss/index.scss';
	@import "@/static/styles/animation.css";
	/* #ifndef APP-NVUE */
	@import '@/static/customicons.css';

	// 设置整个项目的背景色
	page {
		box-sizing: border-box;
	}

	/* #endif */

	/* ============================================================
	   Msm 品牌全局样式
	   Design Token 的运行时部分 + 通用容器类
	   （数值与 uni.scss 中的 SCSS 变量保持一致）
	   注意：不使用 flex gap，老安卓 WebView 不支持，统一用 margin。
	   ============================================================ */
	page,
	:root {
		--msm-primary: #2F8FE5;
		--msm-primary-dark: #1677C8;
		--msm-primary-light: #EAF4FD;
		--msm-cyan: #18B6D9;
		--msm-gradient: linear-gradient(135deg, #2F8FE5 0%, #18B6D9 100%);

		--msm-text: #111B21;
		--msm-text-secondary: #667781;
		--msm-text-muted: #8696A0;
		--msm-text-inverse: #FFFFFF;

		--msm-background: #F7F9FA;
		--msm-surface: #FFFFFF;
		--msm-surface-sunken: #F0F4F6;
		--msm-divider: #E9EDEF;

		--msm-success: #21C063;
		--msm-danger: #EA4335;
		--msm-warning: #F5A623;

		--msm-radius-sm: 10px;
		--msm-radius-md: 14px;
		--msm-radius-lg: 18px;
		--msm-radius-pill: 999px;

		--msm-shadow-sm: 0 1px 2px rgba(17, 27, 33, .06);
		--msm-shadow-md: 0 2px 12px rgba(17, 27, 33, .08);
		--msm-shadow-lg: 0 8px 28px rgba(47, 143, 229, .18);
	}

	page {
		background-color: var(--msm-background);
		color: var(--msm-text);
		font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	/* ---------- 自定义导航栏（navigationStyle: custom 时使用） ---------- */
	.msm-header {
		position: sticky;
		top: 0;
		z-index: 90;
		background: var(--msm-surface);
		padding: calc(var(--status-bar-height, 0px) + 4px) 20px 0;
		box-shadow: 0 1px 0 var(--msm-divider);
	}

	.msm-header__bar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		min-height: 40px;
	}

	.msm-header__left {
		padding-bottom: 5px;
	}

	.msm-header__brand {
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -.4px;
		line-height: 1;
		color: var(--msm-text);
	}

	.msm-header__brand em {
		font-style: normal;
		color: var(--msm-primary);
	}

	.msm-header__sub {
		margin-top: 3px;
		font-size: 12px;
		color: var(--msm-text-secondary);
		line-height: 1;
	}

	.msm-header__actions {
		display: flex;
		align-items: center;
		padding-bottom: 4px;
	}

	.msm-icon-btn {
		width: 36px;
		height: 36px;
		margin-left: 2px;
		border-radius: var(--msm-radius-pill);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--msm-text-secondary);
	}

	.msm-icon-btn:active {
		background: var(--msm-surface-sunken);
	}

	/* ---------- 搜索框 ---------- */
	.msm-search {
		display: flex;
		align-items: center;
		height: 36px;
		margin: 8px 0 10px;
		padding: 0 12px;
		background: var(--msm-surface-sunken);
		border-radius: var(--msm-radius-pill);
		color: var(--msm-text-muted);
		font-size: 15px;
	}

	.msm-search__icon {
		margin-right: 8px;
		flex-shrink: 0;
	}

	/* ---------- 分段筛选 ---------- */
	.msm-segment {
		display: flex;
		padding-bottom: 9px;
	}

	.msm-segment__item {
		padding: 4px 13px;
		margin-right: 8px;
		border-radius: var(--msm-radius-pill);
		font-size: 13px;
		color: var(--msm-text-secondary);
		background: var(--msm-surface-sunken);
	}

	.msm-segment__item--active {
		background: var(--msm-primary);
		color: #fff;
		font-weight: 600;
	}

	/* ---------- 卡片 / 分组 ---------- */
	.msm-card {
		background: var(--msm-surface);
		border-radius: var(--msm-radius-md);
		margin: 0 12px 10px;
		overflow: hidden;
	}

	.msm-gap {
		height: 10px;
	}

	.msm-group-title {
		padding: 6px 16px 8px;
		font-size: 13px;
		color: var(--msm-text-muted);
		letter-spacing: .3px;
	}

	/* ---------- 列表行 ---------- */
	.msm-cell {
		display: flex;
		align-items: center;
		min-height: 56px;
		padding: 8px 16px;
		background: var(--msm-surface);
	}

	.msm-cell--tappable:active {
		background: var(--msm-surface-sunken);
	}

	.msm-cell__icon {
		width: 38px;
		height: 38px;
		margin-right: 14px;
		border-radius: var(--msm-radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--msm-primary-light);
		color: var(--msm-primary);
	}

	.msm-cell__icon--plain {
		background: transparent;
	}

	.msm-cell__body {
		flex: 1;
		min-width: 0;
	}

	.msm-cell__title {
		font-size: 16px;
		color: var(--msm-text);
		line-height: 1.35;
	}

	.msm-cell__desc {
		margin-top: 3px;
		font-size: 13px;
		color: var(--msm-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.msm-cell__extra {
		margin-left: 10px;
		font-size: 13px;
		color: var(--msm-text-muted);
		flex-shrink: 0;
	}

	.msm-arrow {
		margin-left: 8px;
		color: #C4CDD3;
		font-size: 15px;
		flex-shrink: 0;
	}

	.msm-divider {
		height: 1px;
		margin-left: 16px;
		background: var(--msm-divider);
	}

	/* ---------- 未读角标 ---------- */
	.msm-badge {
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		margin-left: 10px;
		border-radius: var(--msm-radius-pill);
		background: var(--msm-danger);
		color: #fff;
		font-size: 11px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* ---------- 空状态 ---------- */
	.msm-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 46px 32px 32px;
		text-align: center;
	}

	.msm-empty__art {
		width: 84px;
		height: 84px;
		border-radius: 50%;
		background: var(--msm-primary-light);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.msm-empty__title {
		margin-top: 18px;
		font-size: 17px;
		font-weight: 600;
		color: var(--msm-text);
	}

	.msm-empty__desc {
		margin-top: 8px;
		font-size: 14px;
		line-height: 1.6;
		color: var(--msm-text-secondary);
	}

	.msm-btn {
		margin-top: 26px;
		height: 46px;
		padding: 0 34px;
		border-radius: var(--msm-radius-pill);
		background: var(--msm-primary);
		color: #fff;
		font-size: 16px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--msm-shadow-lg);
	}

	.msm-btn:active {
		background: var(--msm-primary-dark);
	}

</style>
