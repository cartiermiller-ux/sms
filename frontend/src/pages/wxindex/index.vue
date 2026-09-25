<template>
	<view class="splash">
		<view class="splash__body">
			<!-- ============ 品牌区：Logo 居中放大，全页唯一焦点 ============ -->
			<view class="splash__brand">
				<image class="splash__logo" src="../../static/msm/logo.png" mode="aspectFit"></image>
				<text class="splash__slogan">Connect freely.</text>
				<text class="splash__slogan-cn">和重要的人保持联系</text>
			</view>

			<!-- ============ 底部：操作 ============ -->
			<view class="splash__actions">
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
					if (res.data.code === 200) this.openUrl(res.data.data);
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
	/* ============================================================
	   启动页 —— 纯白底 + Logo 居中放大
	   浅灰底交给内容页；这里是入口，用纯白让 Logo 成为唯一焦点。
	   ============================================================ */
	.splash {
		position: relative;
		width: 100vw;
		min-height: 100vh;
		background: #FFFFFF;
	}

	.splash__body {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100vh;
		box-sizing: border-box;
		padding: calc(var(--status-bar-height, 0px) + 28px) 28px 28px;
	}

	/* ---------- 品牌区 ---------- */
	.splash__brand {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* Logo 原图 767×274（约 2.8:1），放大到 210px 宽 */
	.splash__logo {
		width: 210px;
		height: 75px;
	}

	.splash__slogan {
		margin-top: 20px;
		font-size: 14px;
		letter-spacing: .4px;
		color: var(--msm-text-secondary);
	}

	/* 中文标语 —— 品牌的一句话定位，比英文标语重一级 */
	.splash__slogan-cn {
		margin-top: 10px;
		font-size: 15px;
		letter-spacing: 2px;
		color: var(--msm-text);
	}

	/* ---------- 底部操作区 ---------- */
	.splash__actions {
		flex-shrink: 0;
	}

	/* 主按钮 = 墨黑（蓝色只做焦点，不做大面积色块） */
	.splash__btn {
		height: 48px;
		border-radius: var(--msm-radius-md);
		background: var(--msm-ink);
		color: #FFFFFF;
		font-size: 16px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.splash__btn--active {
		background: var(--msm-ink-dark);
	}

	/* 次要操作：纯文字 */
	.splash__link {
		margin-top: 14px;
		padding: 10px 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.splash__link-dim {
		font-size: 14px;
		color: var(--msm-text-muted);
	}

	/* 「创建新账号」是链接语义 —— 用品牌蓝 */
	.splash__link-strong {
		font-size: 14px;
		font-weight: 600;
		color: var(--msm-primary);
	}

	.splash__footer {
		margin-top: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.splash__foot-link {
		font-size: 13px;
		color: var(--msm-text-muted);
		padding: 8px 4px;
	}

	.splash__foot-dot {
		font-size: 13px;
		color: var(--msm-divider);
		margin: 0 8px;
	}
</style>
