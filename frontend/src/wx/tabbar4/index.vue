<template>
	<view class="msm-page">
		<!-- ============ 导航栏 ============ -->
		<view class="msm-header">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__title">我</view>
					<view class="msm-header__sub">管理你的账号与偏好</view>
				</view>
			</view>
		</view>

		<!-- ============ 账号卡片（无圆角、无阴影，1px 分割线） ============ -->
		<view class="account-wrap" v-if="userInfo">
			<msm-card>
				<view class="msm-row msm-row--tappable" @click="goPersonDetail">
					<view class="msm-row__avatar msm-row__avatar--lg">
						<image
							class="account__avatar-img"
							:src="userInfo.portrait"
							mode="aspectFill"
							@click.stop="$fc.previewImagesolo(userInfo.portrait)"
						></image>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title">{{ userInfo.nickName || '未设置昵称' }}</view>
						<view class="msm-row__meta">Msm ID：{{ userInfo.chatNo || '—' }}</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="14" color="#8696A0"></uni-icons>
				</view>

				<view class="msm-row msm-row--tappable" @click="goQrcode">
					<view class="msm-row__icon">
						<uni-icons type="scan" size="20" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">我的二维码</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="14" color="#8696A0"></uni-icons>
				</view>
			</msm-card>
		</view>

		<!-- ============ 快捷入口：一行三列，纯线条图标 ============ -->
		<view class="entry">
			<msm-card>
				<view class="stat-row">
					<view class="stat" @click="goFavorites">
						<view class="stat__icon">
							<uni-icons type="star" size="22" color="#111B21"></uni-icons>
						</view>
						<view class="stat__label">收藏</view>
					</view>

					<view class="stat" @click="goMyCircle">
						<view class="stat__icon">
							<uni-icons type="images" size="22" color="#111B21"></uni-icons>
							<view v-if="topicCount > 0" class="stat__badge">{{ badgeText(topicCount) }}</view>
						</view>
						<view class="stat__label">朋友圈</view>
					</view>

					<view class="stat" @click="goNewFriends">
						<view class="stat__icon">
							<uni-icons type="personadd" size="22" color="#111B21"></uni-icons>
							<view v-if="applyCount > 0" class="stat__badge">{{ badgeText(applyCount) }}</view>
						</view>
						<view class="stat__label">新朋友</view>
					</view>
				</view>
			</msm-card>
		</view>

		<!-- ============ 设置分组 ============ -->
		<view class="entry">
			<msm-card>
				<view class="msm-row msm-row--tappable" @click="goAgreement">
					<view class="msm-row__icon">
						<uni-icons type="locked" size="20" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">隐私与安全</view>
						<view class="msm-row__meta">隐私政策与服务协议</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="14" color="#8696A0"></uni-icons>
				</view>

				<view class="msm-row msm-row--tappable" @click="showAbout">
					<view class="msm-row__icon">
						<uni-icons type="info" size="20" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">关于 Msm</view>
						<view class="msm-row__meta">Simple. Social. Messaging.</view>
					</view>
					<view class="msm-row__extra">v{{ versionName }}</view>
					<uni-icons class="msm-arrow" type="arrowright" size="14" color="#8696A0"></uni-icons>
				</view>

				<view class="msm-row msm-row--tappable" @click="goSettings">
					<view class="msm-row__icon">
						<uni-icons type="gear" size="20" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">设置</view>
						<view class="msm-row__meta">账号、通知、退出登录</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="14" color="#8696A0"></uni-icons>
				</view>
			</msm-card>
		</view>
	</view>
</template>

<script>
import { versionName } from '@/manifest.json';
import { formatCount } from '@/common/msm-format.js';

export default {
	data() {
		return {
			versionName
		};
	},
	computed: {
		userInfo() {
			return this.$store.state.userInfo;
		},
		topicReply() {
			return this.$store.state.topicReply;
		},
		friendApply() {
			return this.$store.state.friendApply;
		},
		topicCount() {
			return (this.topicReply && this.topicReply.count) || 0;
		},
		applyCount() {
			return (this.friendApply && this.friendApply.count) || 0;
		}
	},
	onShow() {
		this.$store.dispatch('tabBarpull');
	},
	methods: {
		badgeText(n) {
			return formatCount(n) || String(n);
		},
		goPersonDetail() {
			uni.navigateTo({ url: '../../wx/personDetail/index' });
		},
		goQrcode() {
			uni.navigateTo({ url: '../../wx/personDetail/QRcode' });
		},
		goFavorites() {
			uni.navigateTo({ url: '../../wx/favorites/index' });
		},
		goMyCircle() {
			uni.navigateTo({ url: '../../wx/friendsCircle/person' });
		},
		goNewFriends() {
			uni.navigateTo({ url: '../../wx/search-friends/index' });
		},
		goAgreement() {
			uni.navigateTo({ url: '/pages/agreement/index' });
		},
		goSettings() {
			uni.navigateTo({ url: '../system/index' });
		},
		showAbout() {
			uni.showModal({
				title: 'Msm',
				content: `版本 v${this.versionName}\nSimple. Social. Messaging.`,
				showCancel: false,
				confirmText: '知道了'
			});
		}
	}
};
</script>

<style lang="scss" scoped>
	/* ============================================================
	   我（账号中心）—— 灰白降噪 + 蓝色点缀
	   ============================================================ */
	.msm-page {
		min-height: 100vh;
		background: var(--msm-background);
		padding-bottom: 20px;
	}

	.account-wrap {
		margin-top: 8px;
	}

	.entry {
		margin-top: 0;
	}

	.account__avatar-img {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* ---------- 快捷入口：一行三列 ---------- */
	.stat-row {
		display: flex;
	}

	.stat {
		flex: 1;
		padding: 18px 6px 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat:active {
		background: var(--msm-surface-sunken);
	}

	.stat__icon {
		position: relative;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.stat__label {
		margin-top: 10px;
		font-size: 13px;
		color: var(--msm-text-secondary);
	}

	/* 角标用品牌蓝（蓝是焦点色） */
	.stat__badge {
		position: absolute;
		top: -6px;
		left: 50%;
		margin-left: 4px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		box-sizing: border-box;
		border-radius: 999px;
		background: var(--msm-primary);
		color: #FFFFFF;
		font-size: 10px;
		font-weight: 600;
		line-height: 16px;
		text-align: center;
	}
</style>
