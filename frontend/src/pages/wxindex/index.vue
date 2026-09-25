<template>
	<view class="splash">
		<view class="splash__body">
			<!-- ============ 品牌区（居中）============ -->
			<view class="splash__brand">
				<image class="splash__logo" src="../../static/msm/logo.png" mode="aspectFit"></image>
				<text class="splash__slogan">Connect freely.</text>
				<text class="splash__slogan-cn">和重要的人保持联系</text>
			</view>

			<!-- ============ 底部：唯一入口 + 合规链接 ============ -->
			<view class="splash__actions">
				<view class="splash__btn" hover-class="splash__btn--active" @click="goLogin">开始使用</view>

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
	methods: {
		// 「开始使用」是唯一入口：登录页同时提供「登录」与「注册」两条路径
		goLogin() {
			uni.navigateTo({ url: '../../wx/login/index' });
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
	   启动页 —— 纯白底 + Logo + 标语 + 单一入口
	   2026-09-25 调整：
	     · Logo 由 210px 缩到 168px
	     · 「登录」改为唯一入口「开始使用」，降级为幽灵按钮
	       （真正的蓝色主按钮在登录页，这里只负责「进入」）
	     · 曾加过 4 条产品卖点，后按需求移除，改为纯居中构图
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
		padding: calc(var(--status-bar-height, 0px) + 20px) 28px 26px;
	}

	/* ---------- 品牌区 ---------- */
	.splash__brand {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	/* Logo 原图 767×274（约 2.8:1） */
	.splash__logo {
		width: 168px;
		height: 60px;
	}

	.splash__slogan {
		margin-top: 16px;
		font-size: 14px;
		letter-spacing: .4px;
		color: var(--msm-text-secondary);
	}

	/* 中文标语 —— 品牌的一句话定位，比英文标语重一级 */
	.splash__slogan-cn {
		margin-top: 8px;
		font-size: 15px;
		letter-spacing: 2px;
		color: var(--msm-text);
	}

	/* ---------- 底部操作区 ---------- */
	.splash__actions {
		flex-shrink: 0;
	}

	/* 唯一入口 = 幽灵按钮（白底 + 深色描边），视觉重量最轻 */
	.splash__btn {
		height: 48px;
		box-sizing: border-box;
		border-radius: var(--msm-radius-md);
		background: transparent;
		border: 1px solid var(--msm-text);
		color: var(--msm-text);
		font-size: 16px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.splash__btn--active {
		background: var(--msm-surface-sunken);
	}

	.splash__footer {
		margin-top: 18px;
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
