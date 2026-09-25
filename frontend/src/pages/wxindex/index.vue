<template>
	<view class="splash">
		<!-- 品牌主视觉：地球 + 通信节点（已合成进图片，跨设备不会错位） -->
		<image class="splash__bg" src="../../static/msm/splash-bg.jpg" mode="aspectFill"></image>

		<view class="splash__body">
			<!-- ============ 顶部品牌 ============ -->
			<view class="splash__top">
				<view class="splash__logo">
					<text class="splash__logo-m">M</text><text class="splash__logo-sm">sm</text>
				</view>
			</view>

			<!-- ============ 底部：标语 + 操作 ============ -->
			<view class="splash__bottom">
				<view class="splash__tagline">
					<text class="splash__tagline-en">Connect freely.</text>
					<text class="splash__tagline-cn">与世界保持联系</text>
				</view>

				<view class="splash__btn" hover-class="splash__btn--active" @click="goLogin">登录</view>

				<view class="splash__link" @click="goRegister">
					<text class="splash__link-dim">还没有账号？</text>
					<text class="splash__link-strong">创建新账号</text>
				</view>

				<view class="splash__footer">
					<text class="splash__foot-link" @click="goPrivacy">隐私政策</text>
					<text class="splash__foot-dot">·</text>
					<text class="splash__foot-link" @click="goAgreement">服务条款</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {};
	},
	methods: {
		goLogin() {
			uni.navigateTo({ url: '../../wx/login/index' });
		},
		goRegister() {
			uni.navigateTo({ url: '../../wx/register/index' });
		},
		goPrivacy() {
			this.openUrl('https://imessage.uno/privacy');
		},
		goAgreement() {
			this.$http.request({
				url: '/common/getAgreement',
				success: res => {
					if (res.data.code == 200) this.openUrl(res.data.data);
				}
			});
		},
		openUrl(url) {
			if (!url) return;
			// #ifdef H5
			window.open(url);
			// #endif
			// #ifdef APP-PLUS
			this.$fc.openWebView(url);
			// #endif
		}
	}
};
</script>

<style lang="scss" scoped>
.splash {
	position: relative;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background: #04070c;
}

.splash__bg {
	position: absolute;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
}

.splash__body {
	position: relative;
	z-index: 2;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: 100vh;
	box-sizing: border-box;
	padding: calc(var(--status-bar-height, 0px) + 20px) 24px 22px;
}

/* ---------- 顶部品牌 ---------- */
.splash__top {
	display: flex;
	justify-content: center;
}

.splash__logo {
	font-size: 28px;
	font-weight: 700;
	letter-spacing: -0.6px;
	line-height: 1;
}

.splash__logo-m {
	color: #ffffff;
}

.splash__logo-sm {
	color: #2F8FE5;
}

/* ---------- 底部 ---------- */
.splash__bottom {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.splash__tagline {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 18px;
}

.splash__tagline-en {
	font-size: 18px;
	font-weight: 600;
	color: #ffffff;
	letter-spacing: .2px;
}

.splash__tagline-cn {
	margin-top: 6px;
	font-size: 13px;
	color: rgba(255, 255, 255, .62);
	letter-spacing: 1.4px;
}

/* 主按钮 —— 全场唯一的实心按钮 */
.splash__btn {
	width: 100%;
	height: 52px;
	border-radius: 999px;
	background: #2F8FE5;
	color: #fff;
	font-size: 17px;
	font-weight: 600;
	letter-spacing: 1px;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 10px 30px rgba(47, 143, 229, .38);
}

.splash__btn--active {
	background: #1677C8;
	box-shadow: 0 4px 14px rgba(47, 143, 229, .28);
}

/* 次要操作 —— 纯文字 */
.splash__link {
	margin-top: 12px;
	padding: 8px 12px;
	display: flex;
	align-items: center;
}

.splash__link-dim {
	font-size: 14px;
	color: rgba(255, 255, 255, .55);
}

.splash__link-strong {
	font-size: 14px;
	font-weight: 600;
	color: #4FA8F0;
}

.splash__footer {
	margin-top: 14px;
	display: flex;
	align-items: center;
}

.splash__foot-link {
	font-size: 12px;
	color: rgba(255, 255, 255, .42);
	padding: 6px 4px;
}

.splash__foot-dot {
	font-size: 12px;
	color: rgba(255, 255, 255, .28);
	margin: 0 8px;
}
</style>
