<template>
	<view class="msm-page">
		<!-- ============ 品牌导航栏 ============ -->
		<view class="msm-header">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__brand">发现</view>
					<view class="msm-header__sub">看看朋友们在做什么</view>
				</view>
			</view>
		</view>

		<!-- ============ 朋友圈 ============ -->
		<view class="msm-card entry-card">
			<view class="entry" @click="goCircle">
				<view class="entry__icon">
					<uni-icons type="images" size="21" color="#2F8FE5"></uni-icons>
				</view>
				<view class="entry__body">
					<view class="entry__title">朋友圈</view>
					<view class="entry__desc">好友的动态与照片</view>
				</view>
				<view v-if="topicCount > 0" class="msm-badge">{{ topicCount > 99 ? '99+' : topicCount }}</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
		</view>

		<!-- ============ 扫一扫 / 附近 ============ -->
		<view class="msm-card entry-card">
			<view class="entry" @click="goScan">
				<view class="entry__icon">
					<uni-icons type="scan" size="21" color="#2F8FE5"></uni-icons>
				</view>
				<view class="entry__body">
					<view class="entry__title">扫一扫</view>
					<view class="entry__desc">扫码加好友、识别二维码</view>
				</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
			<view class="entry-divider"></view>
			<view class="entry" @click="goNearby">
				<view class="entry__icon">
					<uni-icons type="location" size="21" color="#2F8FE5"></uni-icons>
				</view>
				<view class="entry__body">
					<view class="entry__title">附近</view>
					<view class="entry__desc">发现附近也在使用 Msm 的人</view>
				</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
		</view>

		<top-right-tool-wx ref="trtw"></top-right-tool-wx>
	</view>
</template>

<script>
export default {
	computed: {
		topicReply() {
			return this.$store.state.topicReply;
		},
		topicCount() {
			return (this.topicReply && this.topicReply.count) || 0;
		}
	},
	onShow() {
		this.$store.dispatch('tabBarpull');
	},
	methods: {
		goCircle() {
			uni.navigateTo({ url: '../friendsCircle/index' });
		},
		goScan() {
			this.$fc.saoyisao();
		},
		goNearby() {
			uni.navigateTo({ url: '../nearby/index' });
		}
	}
};
</script>

<style lang="scss" scoped>
.msm-page {
	min-height: 100vh;
	background: var(--msm-background);
	padding-bottom: 20px;
}

.entry-card {
	margin-top: 10px;
}

.entry {
	display: flex;
	align-items: center;
	padding: 11px 16px;
}

.entry:active {
	background: var(--msm-surface-sunken);
}

.entry__icon {
	width: 38px;
	height: 38px;
	margin-right: 12px;
	flex-shrink: 0;
	border-radius: var(--msm-radius-sm);
	background: var(--msm-primary-light);
	display: flex;
	align-items: center;
	justify-content: center;
}

.entry__body {
	flex: 1;
	min-width: 0;
}

.entry__title {
	font-size: 15px;
	color: var(--msm-text);
}

.entry__desc {
	margin-top: 3px;
	font-size: 12px;
	color: var(--msm-text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.entry-divider {
	height: 1px;
	margin-left: 66px;
	background: var(--msm-divider);
}
</style>
