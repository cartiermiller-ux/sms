<template>
	<view class="msm-page">
		<!-- ============ 品牌导航栏 ============ -->
		<view class="msm-header">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__brand">我</view>
					<view class="msm-header__sub">管理你的账号与偏好</view>
				</view>
			</view>
		</view>

		<!-- ============ 账号卡片 ============ -->
		<view class="msm-card account" v-if="userInfo">
			<view class="account__main" @click="goPersonDetail">
				<image
					class="account__avatar"
					:src="userInfo.portrait"
					mode="aspectFill"
					@click.stop="$fc.previewImagesolo(userInfo.portrait)"
				></image>
				<view class="account__body">
					<view class="account__name">{{ userInfo.nickName || '未设置昵称' }}</view>
					<view class="account__id">Msm ID：{{ userInfo.chatNo || '—' }}</view>
				</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
			<view class="account__qr" @click="goQrcode">
				<uni-icons type="scan" size="16" color="#2F8FE5"></uni-icons>
				<text class="account__qr-text">我的二维码</text>
			</view>
		</view>

		<!-- ============ 三个快捷入口 ============ -->
		<view class="msm-card stat-row">
			<view class="stat" @click="goFavorites">
				<view class="stat__icon">
					<uni-icons type="star" size="20" color="#2F8FE5"></uni-icons>
				</view>
				<view class="stat__label">收藏</view>
			</view>
			<view class="stat" @click="goMyCircle">
				<view class="stat__icon">
					<uni-icons type="images" size="20" color="#2F8FE5"></uni-icons>
					<view v-if="topicCount > 0" class="stat__dot"></view>
				</view>
				<view class="stat__label">朋友圈</view>
			</view>
			<view class="stat" @click="goNewFriends">
				<view class="stat__icon">
					<uni-icons type="personadd" size="20" color="#2F8FE5"></uni-icons>
					<view v-if="applyCount > 0" class="stat__dot"></view>
				</view>
				<view class="stat__label">新朋友</view>
			</view>
		</view>

		<!-- ============ 设置分组 ============ -->
		<view class="msm-gap"></view>
		<view class="msm-card">
			<view class="msm-cell msm-cell--tappable" @click="goAgreement">
				<view class="msm-cell__icon">
					<uni-icons type="locked" size="19" color="#2F8FE5"></uni-icons>
				</view>
				<view class="msm-cell__body">
					<view class="msm-cell__title">隐私与安全</view>
					<view class="msm-cell__desc">隐私政策与服务协议</view>
				</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
			<view class="msm-divider"></view>
			<view class="msm-cell msm-cell--tappable" @click="showAbout">
				<view class="msm-cell__icon">
					<uni-icons type="info" size="19" color="#2F8FE5"></uni-icons>
				</view>
				<view class="msm-cell__body">
					<view class="msm-cell__title">关于 Msm</view>
					<view class="msm-cell__desc">Simple. Social. Messaging.</view>
				</view>
				<view class="msm-cell__extra">v{{ versionName }}</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
			<view class="msm-divider"></view>
			<view class="msm-cell msm-cell--tappable" @click="goSettings">
				<view class="msm-cell__icon">
					<uni-icons type="gear" size="19" color="#2F8FE5"></uni-icons>
				</view>
				<view class="msm-cell__body">
					<view class="msm-cell__title">设置</view>
					<view class="msm-cell__desc">账号、通知、退出登录</view>
				</view>
				<uni-icons class="msm-arrow" type="arrowright" size="15" color="#C4CDD3"></uni-icons>
			</view>
		</view>
	</view>
</template>

<script>
import { versionName } from '@/manifest.json';

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
.msm-page {
	min-height: 100vh;
	background: var(--msm-background);
	padding-bottom: 20px;
}

/* ---------- 账号卡片 ---------- */
.account {
	margin-top: 10px;
	padding: 14px 16px 12px;
}

.account__main {
	display: flex;
	align-items: center;
}

.account__avatar {
	width: 56px;
	height: 56px;
	border-radius: 28px;
	margin-right: 14px;
	flex-shrink: 0;
	background: var(--msm-surface-sunken);
}

.account__body {
	flex: 1;
	min-width: 0;
}

.account__name {
	font-size: 18px;
	font-weight: 700;
	color: var(--msm-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.account__id {
	margin-top: 4px;
	font-size: 12.5px;
	color: var(--msm-text-secondary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.account__qr {
	margin-top: 12px;
	padding-top: 11px;
	border-top: 1px solid var(--msm-divider);
	display: flex;
	align-items: center;
}

.account__qr:active {
	opacity: .6;
}

.account__qr-text {
	margin-left: 6px;
	font-size: 13px;
	color: var(--msm-primary);
	font-weight: 500;
}

/* ---------- 三个快捷入口 ---------- */
.stat-row {
	display: flex;
	padding: 4px 0;
}

.stat {
	flex: 1;
	padding: 11px 4px 10px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stat:active {
	background: var(--msm-surface-sunken);
}

.stat__icon {
	position: relative;
	width: 40px;
	height: 40px;
	border-radius: var(--msm-radius-sm);
	background: var(--msm-primary-light);
	display: flex;
	align-items: center;
	justify-content: center;
}

.stat__dot {
	position: absolute;
	top: 8px;
	right: 8px;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--msm-danger);
}

.stat__label {
	margin-top: 7px;
	font-size: 12.5px;
	color: var(--msm-text);
}
</style>
