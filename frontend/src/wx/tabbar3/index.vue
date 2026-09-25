<template>
	<view class="msm-page">
		<!-- ============ 导航栏 ============ -->
		<view class="msm-header">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__title">发现</view>
					<view class="msm-header__sub">看看朋友们在做什么</view>
				</view>
			</view>
		</view>

		<!-- ============ 朋友圈 ============ -->
		<view class="entry">
			<msm-card>
				<view class="msm-row msm-row--tappable" @click="goCircle">
					<view class="msm-row__icon">
						<uni-icons type="images" size="19" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">朋友圈</view>
						<view class="msm-row__meta">好友的动态与照片</view>
					</view>
					<view v-if="topicCount > 0" class="msm-badge msm-badge--row">{{ badgeText(topicCount) }}</view>
					<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
				</view>
			</msm-card>
		</view>

		<!-- ============ 扫一扫 / 附近 ============ -->
		<view class="entry entry--tight">
			<msm-card>
				<view class="msm-row msm-row--tappable" @click="goScan">
					<view class="msm-row__icon">
						<uni-icons type="scan" size="19" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">扫一扫</view>
						<view class="msm-row__meta">扫码加好友、识别二维码</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
				</view>

				<view class="msm-row msm-row--tappable" @click="goNearby">
					<view class="msm-row__icon">
						<uni-icons type="location" size="19" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">附近</view>
						<view class="msm-row__meta">发现附近也在使用 Msm 的人</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
				</view>
			</msm-card>
		</view>

		<top-right-tool-wx ref="trtw"></top-right-tool-wx>
	</view>
</template>

<script>
import { formatCount } from '@/common/msm-format.js';

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
		badgeText(n) {
			return formatCount(n) || String(n);
		},
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
	/* ============================================================
	   发现页 —— V2EX 风格
	   原来的三宫格彩色图标块已改为白底菜单行。
	   ============================================================ */
	.msm-page {
		min-height: 100vh;
		background: var(--msm-background);
		padding-bottom: 20px;
	}

	.entry {
		margin-top: 10px;
	}

	.entry--tight {
		margin-top: 0;
	}
</style>
