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
					// 音视频：改用官方 TRTCCloud 原生插件（见 common/msm-call.js）。
					// TRTCCloud 没有「登录」这一步 —— App 启动时不再预热，
					// 通话页在真正进房前才调 /trtc/getSign 取签名，避免签名过期。
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
			// 以前这里会读本地存储里的 key 'call'，把 TUICalling 结束后留下的
			// { userId, trtcId, startTime, type } 拼成一条 TRTC_*_END 记录推到聊天里。
			// 换成自写通话页后，通话记录改由通话页在挂断时直接 pushOutMsg 生成
			// （见 pages/call/index.nvue 的 hangup），没有任何地方再写 key 'call'，
			// 所以这段死代码删掉，避免日后误以为通话记录是这里产生的。
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
	   Msm 全局样式 —— 灰白降噪 + 品牌蓝点缀
	   Design Token 的运行时部分 + 通用容器类
	   （数值与 uni.scss 中的 SCSS 变量保持一致）
	   注意：不使用 flex gap —— 老安卓 WebView 不支持，统一用 margin。
	   ============================================================ */
	page,
	:root {
		/* 品牌蓝：只做「焦点」—— 选中态 / 链接 / 未读角标 / 聚焦边框 */
		--msm-primary: #2F8FE5;
		--msm-primary-dark: #1F7ACC;
		--msm-primary-light: #EAF4FD;

		/* 墨黑：主按钮与标题（与 Logo 的深色呼应） */
		--msm-ink: #111B21;
		--msm-ink-dark: #000000;

		/* 文字 */
		--msm-text: #111B21;
		--msm-text-secondary: #667781;
		--msm-text-muted: #8696A0;
		--msm-text-faint: #B7C2CB;
		--msm-text-inverse: #FFFFFF;

		/* 背景与边框 */
		--msm-background: #F5F5F5;
		--msm-surface: #FFFFFF;
		--msm-surface-sunken: #F5F5F5;
		--msm-divider: #E0E0E0;
		/* 更浅的分割线：用于表单输入行下划线（比列表分割线再轻一档） */
		--msm-divider-light: #EAEAEA;

		/* 消息气泡：极简纯色，无背景图无阴影。
		   自己 = 品牌淡蓝（蓝只做点缀，文字仍用墨黑，不靠反白撑对比） */
		--msm-bubble-other: #FFFFFF;
		--msm-bubble-self: #E3F0FC;

		/* 语义色：只用于状态，不作装饰 */
		--msm-success: #388E3C;
		--msm-danger: #D32F2F;
		--msm-warning: #F57C00;

		/* 在线状态：绿色已让给「成功」，在线改用中性墨色 */
		--msm-online: #111B21;
		--msm-offline: #CCCCCC;

		/* 圆角（克制：卡片与按钮接近直角，头像直角） */
		--msm-radius-sm: 0px;
		--msm-radius-md: 2px;
		--msm-radius-lg: 4px;
		--msm-radius-pill: 999px;

		/* 尺寸 */
		--msm-page-pad: 20px;
		--msm-row-pad-y: 16px;
		--msm-avatar: 40px;
		--msm-avatar-lg: 60px;

		/* 阴影：本方案不使用阴影。
		   保留这三个变量名只为兼容旧引用（值统一为 none），
		   层次一律靠 1px 分割线与灰/白底对比表达。 */
		--msm-shadow-sm: none;
		--msm-shadow-md: none;
		--msm-shadow-lg: none;
	}

	page {
		background-color: var(--msm-background);
		color: var(--msm-text);
		font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	/* ============================================================
	   1.5 统一顶栏 —— 三栏：左 Logo ｜ 中搜索胶囊 ｜ 右头像
	   ------------------------------------------------------------
	   参考 V2EX 首页头部。左右各留 16px 边距，两端「像门神一样」稳住顶部；
	   Logo 高 28px、头像 36px 正圆 —— 头像刻意不比 Logo 显眼。
	   设置页不放搜索，用 .msm-topbar__spacer 撑开保持左右对齐。
	   ============================================================ */
	.msm-topbar {
		display: flex;
		align-items: center;
		padding: calc(var(--status-bar-height, 0px) + 8px) 16px 8px;
		background: var(--msm-surface);
		border-bottom: 1px solid var(--msm-divider);
	}

	/* 左：Logo（小） */
	.msm-topbar__logo {
		width: 78px;    /* 28px 高 × 原图 2.8:1 比例 */
		height: 28px;
		flex-shrink: 0;
	}

	/* 中：搜索胶囊 —— 撑满剩余空间，浅灰底、全圆角 */
	.msm-topbar__search {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		height: 34px;
		margin: 0 12px;
		padding: 0 12px;
		background: var(--msm-background);
		border-radius: var(--msm-radius-pill);
	}

	.msm-topbar__search-icon {
		margin-right: 6px;
		flex-shrink: 0;
	}

	.msm-topbar__input {
		flex: 1;
		min-width: 0;
		font-size: 14px;
		color: var(--msm-text);
		background: transparent;
	}

	.msm-topbar__ph {
		color: var(--msm-text-muted);
		font-size: 14px;
	}

	.msm-topbar__clear {
		padding-left: 6px;
		flex-shrink: 0;
	}

	/* 中：不需要搜索时（设置页）用它撑开，保证左 Logo / 右头像仍分列两端 */
	.msm-topbar__spacer {
		flex: 1;
		min-width: 0;
	}

	/* 中：顶栏里的次要图标按钮（如「发起聊天」的 +） */
	.msm-topbar__icon {
		width: 32px;
		height: 32px;
		margin-right: 8px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--msm-radius-md);
		color: var(--msm-text-secondary);
	}

	.msm-topbar__icon:active {
		background: var(--msm-surface-sunken);
	}

	/* 右：圆形用户头像（36px，比 Logo 略小一号的视觉重量） */
	.msm-topbar__avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--msm-background);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.msm-topbar__avatar:active {
		opacity: .65;
	}

	.msm-topbar__avatar-img {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* ============================================================
	   3. 文字标签页（选中 = 墨黑文字 + 1px 蓝色下划线）
	   ============================================================ */
	.msm-tabs {
		display: flex;
		align-items: flex-end;
		background: var(--msm-surface);
		border-bottom: 1px solid var(--msm-divider);
	}

	/* 独立使用时左右留白；嵌在已留白的容器里则用不带 --pad 的版本 */
	.msm-tabs--pad {
		padding: 0 var(--msm-page-pad);
	}

	/* 不需要自带分割线时（外层已有边框） */
	.msm-tabs--plain {
		border-bottom: 0;
	}

	.msm-tabs__item {
		position: relative;
		padding: 12px 0 11px;
		margin-right: 24px;
		font-size: 15px;
		line-height: 1;
		color: var(--msm-text-secondary);
	}

	.msm-tabs__item--active {
		color: var(--msm-text);
		font-weight: 600;
	}

	.msm-tabs__item--active::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 1px;
		background: var(--msm-primary);
	}

	/* ============================================================
	   4. 分组标题（直接贴在灰底上，不放进卡片里）
	   ============================================================ */
	.msm-section {
		padding: 16px var(--msm-page-pad) 8px;
		font-size: 13px;
		color: var(--msm-text-muted);
		letter-spacing: .3px;
	}

	/* ============================================================
	   5. 卡片 / 分组容器（无圆角、无阴影、1px 细线）
	   ============================================================ */
	.msm-card {
		background: var(--msm-surface);
		border-radius: var(--msm-radius-md);
		margin: 0 var(--msm-page-pad) 8px;
		overflow: hidden;
	}

	/* 通栏卡片：左右不留白，仅靠 1px 线分隔 */
	.msm-card--flush {
		margin-left: 0;
		margin-right: 0;
		border-radius: 0;
	}

	.msm-card--plain {
		background: transparent;
		border-radius: 0;
	}

	/* 卡片头部：深灰小标题 + 右侧次要文案 */
	.msm-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px var(--msm-page-pad) 10px;
		border-bottom: 1px solid var(--msm-divider);
	}

	.msm-card__head-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--msm-text-secondary);
	}

	.msm-card__head-more {
		font-size: 13px;
		color: var(--msm-text-muted);
	}

	/* 卡片脚部 */
	.msm-card__foot {
		padding: 10px var(--msm-page-pad);
		border-top: 1px solid var(--msm-divider);
		font-size: 13px;
		color: var(--msm-text-muted);
	}

	.msm-gap {
		height: 8px;
	}

	/* ============================================================
	   6. 列表行（白底、内容自适应高度、1px 底部分割线）
	   ============================================================ */
	.msm-row {
		display: flex;
		align-items: center;
		padding: var(--msm-row-pad-y) var(--msm-page-pad);
		background: var(--msm-surface);
		border-bottom: 1px solid var(--msm-divider);
	}

	.msm-row:last-child {
		border-bottom: 0;
	}

	.msm-row--tappable:active {
		background: var(--msm-surface-sunken);
	}

	/* 多行内容时顶部对齐 */
	.msm-row--top {
		align-items: flex-start;
	}

	/* 左头像：正方形（直角），与「降噪」基调一致 */
	.msm-row__avatar {
		width: var(--msm-avatar);
		height: var(--msm-avatar);
		margin-right: 12px;
		border-radius: var(--msm-radius-sm);
		flex-shrink: 0;
		background: var(--msm-background);
		overflow: hidden;
	}

	/* 个人资料用大头像 */
	.msm-row__avatar--lg {
		width: var(--msm-avatar-lg);
		height: var(--msm-avatar-lg);
		margin-right: 14px;
	}

	/* 群聊九宫格头像：外层仍是方框，内部 2×2 铺满 */
	.msm-row__avatar--group {
		display: flex;
		flex-wrap: wrap;
	}

	.msm-row__avatar-mini {
		width: 50%;
		height: 50%;
		display: block;
	}

	/* 左侧纯线条图标（无彩色底块），统一 #667781 */
	.msm-row__icon {
		width: 24px;
		height: 24px;
		margin-right: 14px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--msm-text-secondary);
	}

	.msm-row__body {
		flex: 1;
		min-width: 0;
	}

	.msm-row__title {
		font-size: 16px;
		font-weight: 600;
		color: var(--msm-text);
		line-height: 1.35;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* 菜单行标题：常规字重 */
	.msm-row__title--plain {
		font-weight: 400;
		font-size: 15px;
	}

	.msm-row__desc {
		margin-top: 5px;
		font-size: 14px;
		color: var(--msm-text-secondary);
		line-height: 1.45;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* 摘要显示两行 */
	.msm-row__desc--clamp2 {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		white-space: normal;
	}

	.msm-row__meta {
		margin-top: 6px;
		font-size: 12px;
		color: var(--msm-text-muted);
		line-height: 1.3;
		display: flex;
		align-items: center;
	}

	.msm-row__meta-sep {
		margin: 0 6px;
		color: var(--msm-divider);
	}

	/* 右侧区（角标），纵向排列靠右 */
	.msm-row__right {
		margin-left: 12px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
	}

	.msm-row__time {
		font-size: 12px;
		color: var(--msm-text-muted);
		line-height: 1.2;
	}

	.msm-row__extra {
		font-size: 14px;
		color: var(--msm-text-muted);
		flex-shrink: 0;
		margin-left: 8px;
	}

	/* ============================================================
	   7. 角标 / 状态点 / 标签
	   ============================================================ */
	/* 未读角标：品牌蓝（蓝是「焦点色」，用在这里正合适） */
	.msm-badge {
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: var(--msm-radius-pill);
		background: var(--msm-primary);
		color: #FFFFFF;
		font-size: 11px;
		font-weight: 600;
		line-height: 18px;
		text-align: center;
	}

	/* 需要强调（真正出错）时才用红色 */
	.msm-badge--danger {
		background: var(--msm-danger);
		color: #FFFFFF;
	}

	/* 角标直接排在列表行里（不放进右侧竖列）时的间距 */
	.msm-badge--row {
		margin-left: 8px;
		margin-right: 2px;
	}

	/* 在线状态点：在线 = 墨色，离线 = 浅灰 */
	.msm-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--msm-radius-pill);
		background: var(--msm-online);
		flex-shrink: 0;
	}

	.msm-dot--off {
		background: var(--msm-offline);
	}

	.msm-dot--inline {
		display: inline-block;
		margin-right: 5px;
		vertical-align: middle;
	}

	.msm-tag {
		display: inline-block;
		height: 20px;
		line-height: 20px;
		padding: 0 6px;
		margin-right: 6px;
		border-radius: var(--msm-radius-sm);
		background: var(--msm-background);
		color: var(--msm-text-secondary);
		font-size: 12px;
	}

	/* ============================================================
	   8. 箭头 / 分割线
	   ============================================================ */
	.msm-arrow {
		margin-left: 8px;
		color: var(--msm-text-muted);
		font-size: 15px;
		flex-shrink: 0;
	}

	.msm-divider {
		height: 1px;
		margin-left: var(--msm-page-pad);
		background: var(--msm-divider);
	}

	.msm-divider--full {
		margin-left: 0;
	}

	/* ============================================================
	   9. 空状态（极简：只放一个灰色线条图标 + 灰字，无底块）
	   ============================================================ */
	.msm-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 64px 32px 32px;
		text-align: center;
	}

	.msm-empty__art {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--msm-text-muted);
	}

	.msm-empty__title {
		margin-top: 16px;
		font-size: 16px;
		font-weight: 600;
		color: var(--msm-text);
	}

	.msm-empty__desc {
		margin-top: 8px;
		font-size: 14px;
		line-height: 1.6;
		color: var(--msm-text-muted);
	}

	/* 列表底部提示（加载中 / 没有更多了） */
	.msm-list__foot {
		padding: 18px 0 22px;
		text-align: center;
		font-size: 13px;
		color: var(--msm-text-muted);
	}

	/* ============================================================
	   10. 按钮
	   ------------------------------------------------------------
	   主按钮 = 品牌蓝 #2F8FE5
	   （2026-09-25 调整：原先用墨黑 #111B21，实测「纯黑太重」，
	     改为品牌蓝以降低视觉重量；墨黑现在只用于标题与正文）
	   ============================================================ */
	.msm-btn {
		height: 48px;
		padding: 0 24px;
		border-radius: var(--msm-radius-md);
		background: var(--msm-primary);
		color: #FFFFFF;
		font-size: 16px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.msm-btn:active {
		background: var(--msm-primary-dark);
	}

	.msm-btn--block {
		width: 100%;
	}

	/* 幽灵按钮：白底 + 1px 深色描边 + 深色文字（次要行动，视觉重量最轻） */
	.msm-btn--ghost {
		background: transparent;
		color: var(--msm-text);
		border: 1px solid var(--msm-text);
	}

	.msm-btn--ghost:active {
		background: var(--msm-surface-sunken);
	}

	/* 文字按钮：蓝色（链接语义） */
	.msm-btn--text {
		background: transparent;
		color: var(--msm-primary);
		padding: 0 8px;
	}

	.msm-btn--danger {
		background: var(--msm-danger);
	}

	.msm-btn--sm {
		height: 36px;
		padding: 0 18px;
		font-size: 14px;
	}

	.msm-btn__hint {
		margin-top: 14px;
		font-size: 13px;
		color: var(--msm-text-muted);
		text-align: center;
	}

	/* ============================================================
	   11. 链接（统一品牌蓝）
	   ============================================================ */
	.msm-link {
		color: var(--msm-primary);
		font-size: 14px;
	}

	.msm-link:active {
		color: var(--msm-primary-dark);
	}

</style>
