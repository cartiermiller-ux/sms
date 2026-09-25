<template>
	<view class="msm-fallback">
		<view class="msm-fallback__card">
			<view class="msm-fallback__title">通话功能需要在 App 内使用</view>
			<view class="msm-fallback__desc">
				实时音视频依赖 TRTC 原生插件与 nvue 原生渲染，网页版（H5）无法承载。
				请到「Msm 安卓 / iOS 客户端」里发起或接听通话。
			</view>
			<view class="msm-fallback__btn" @click="back">返回</view>
		</view>
	</view>
</template>

<script>
/**
 * 通话页的 H5 / 小程序占位实现。
 *
 * 同名目录下还有 index.nvue —— uni-app 的规则是：
 *   App 端优先用 .nvue，其它端用 .vue
 * 所以真机走原生渲染（index.nvue），网页走这个提示页。
 */
export default {
	methods: {
		back() {
			uni.navigateBack({
				delta: 1,
				fail: () => {
					uni.reLaunch({ url: '/wx/tabbar1/index' });
				}
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.msm-fallback {
	min-height: 100vh;
	background: var(--msm-background);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 var(--msm-page-pad);
	box-sizing: border-box;
}

.msm-fallback__card {
	width: 100%;
	background: var(--msm-surface);
	padding: 24px 20px;
	box-sizing: border-box;
}

.msm-fallback__title {
	font-size: 16px;
	font-weight: 600;
	color: var(--msm-text);
}

.msm-fallback__desc {
	margin-top: 10px;
	font-size: 13px;
	line-height: 1.6;
	color: var(--msm-text-secondary);
}

.msm-fallback__btn {
	margin-top: 20px;
	height: 48px;
	line-height: 48px;
	text-align: center;
	font-size: 15px;
	color: #fff;
	background: var(--msm-primary);
	border-radius: var(--msm-radius-md);
}
</style>
