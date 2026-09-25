<template>
	<view class="msm-page">
		<!-- ============ 统一顶栏（设置页不放搜索，左右仍为 Logo / 头像）============ -->
		<msm-topbar :show-search="false"></msm-topbar>

		<!-- ============ 账号行 ============ -->
		<view v-if="userInfo" class="acct" @click="goProfile">
			<view class="acct__avatar">
				<image
					v-if="userInfo.portrait"
					class="acct__avatar-img"
					:src="userInfo.portrait"
					mode="aspectFill"
				></image>
				<uni-icons v-else type="staff" size="24" color="#8696A0"></uni-icons>
			</view>
			<view class="acct__body">
				<view class="acct__name">
					<text class="acct__nick">{{ userInfo.nickName || '未设置昵称' }}</text>
					<text class="acct__arrow">›</text>
				</view>
				<view class="acct__id">Msm ID: {{ userInfo.chatNo || '—' }}</view>
			</view>
		</view>

		<view class="sep"></view>

		<!-- ============ 分组一：社交入口 ============ -->
		<view class="grp">
			<view class="row" @click="goMoments">
				<text class="row__label">朋友圈</text>
				<view class="row__right">
					<view v-if="topicCount > 0" class="msm-badge">{{ badgeText(topicCount) }}</view>
					<text class="row__arrow">›</text>
				</view>
			</view>

			<view class="row" @click="goFavorites">
				<text class="row__label">收藏</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>

			<view class="row" @click="goScan">
				<text class="row__label">扫一扫</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>

			<view class="row" @click="goNearby">
				<text class="row__label">附近的人</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>
		</view>

		<view class="sep"></view>

		<!-- ============ 分组二：账号与安全 ============ -->
		<view class="grp">
			<view class="row" @click="goAccountSecurity">
				<text class="row__label">账号与安全</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>

			<view class="row" @click="goPrivacy">
				<text class="row__label">隐私与安全</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>

			<view class="row" @click="goNotify">
				<text class="row__label">新消息通知</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>
		</view>

		<view class="sep"></view>

		<!-- ============ 分组三：关于 ============ -->
		<view class="grp">
			<view class="row" @click="showAbout">
				<text class="row__label">关于 Msm</text>
				<view class="row__right">
					<text class="row__value">v{{ versionName }}</text>
					<text class="row__arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 退出登录前多留一点空白 -->
		<view class="sep sep--wide"></view>

		<!-- ============ 退出登录 ============ -->
		<view class="grp">
			<view class="row" @click="confirmLogout">
				<text class="row__label row__label--danger">退出登录</text>
				<view class="row__right"><text class="row__arrow">›</text></view>
			</view>
		</view>

		<view class="tail"></view>
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

		/* ---------- 账号 ---------- */
		goProfile() {
			uni.navigateTo({ url: '../personDetail/index' });
		},

		/* ---------- 社交入口 ---------- */
		goMoments() {
			uni.navigateTo({ url: '../friendsCircle/index' });
		},
		goFavorites() {
			uni.navigateTo({ url: '../favorites/index' });
		},
		goScan() {
			this.$fc.saoyisao();
		},
		goNearby() {
			uni.navigateTo({ url: '../nearby/index' });
		},

		/* ---------- 账号与安全 ---------- */
		goAccountSecurity() {
			// 修改密码 / 清空聊天记录 / 升级检测都在这个页面里
			uni.navigateTo({ url: '../system/index' });
		},
		goPrivacy() {
			uni.navigateTo({ url: '/pages/agreement/index' });
		},
		goNotify() {
			// 目前没有通知设置页，如实提示而不是给一个点了没反应的死行
			uni.showToast({ title: '通知设置暂未开放', icon: 'none' });
		},

		/* ---------- 关于 ---------- */
		showAbout() {
			uni.showModal({
				title: 'Msm',
				content: `版本 v${this.versionName}\nSimple. Social. Messaging.`,
				showCancel: false,
				confirmText: '知道了'
			});
		},

		/* ---------- 退出登录 ---------- */
		confirmLogout() {
			uni.showModal({
				title: '退出登录',
				content: '确定要退出当前账号吗？',
				confirmText: '退出',
				confirmColor: '#D32F2F',
				success: res => {
					if (res.confirm) this.loginOut();
				}
			});
		},

		/**
		 * 退出登录 —— 与 wx/system/index.vue 里的 loginOut 保持逐行一致
		 * （连分号风格都一致，便于日后两处一起改；不是重写，是搬运）
		 */
		loginOut() {
			uni.reLaunch({
				url: '../../pages/wxindex/index'
			}).then(res => {
				uni.removeStorageSync('Authorization')
				// 退出登录
				this.$http.request({
					url: '/my/logout',
					success: (res) => {}
				});
				// #ifdef H5
				this.$socketTask.socketTaskClose()
				// #endif
			})
		}
	}
};
</script>

<style lang="scss" scoped>
	/* ============================================================
	   设置页 —— 极简工具风
	   · 顶栏：Logo ｜（无搜索）｜ 头像
	   · 账号行：头像 + 昵称› + Msm ID（ID 缩进对齐昵称）
	   · 分组之间用通栏浅灰细线，组内行不加分割线
	   · 所有行都没有图标，只有文字 + 右箭头
	   ============================================================ */
	.msm-page {
		min-height: 100vh;
		background: #FFFFFF;
	}

	/* ---------- 账号行 ---------- */
	.acct {
		display: flex;
		align-items: center;
		padding: 16px var(--msm-page-pad) 18px;
	}

	.acct:active {
		background: var(--msm-background);
	}

	.acct__avatar {
		width: 48px;
		height: 48px;
		margin-right: 14px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--msm-background);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.acct__avatar-img {
		width: 100%;
		height: 100%;
		display: block;
	}

	.acct__body {
		flex: 1;
		min-width: 0;
	}

	.acct__name {
		display: flex;
		align-items: center;
	}

	.acct__nick {
		font-size: 17px;
		font-weight: 600;
		color: var(--msm-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.acct__arrow {
		margin-left: 6px;
		font-size: 16px;
		line-height: 1;
		color: var(--msm-text-muted);
		flex-shrink: 0;
	}

	.acct__id {
		margin-top: 5px;
		font-size: 13px;
		color: var(--msm-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* ---------- 通栏浅灰细线（分组之间）---------- */
	.sep {
		height: 1px;
		background: var(--msm-divider-light);
	}

	/* 退出登录之前留多一点空白 */
	.sep--wide {
		margin-top: 28px;
	}

	/* ---------- 分组与行 ---------- */
	.grp {
		background: #FFFFFF;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 52px;
		padding: 0 var(--msm-page-pad);
	}

	.row:active {
		background: var(--msm-background);
	}

	.row__label {
		font-size: 16px;
		color: var(--msm-text);
	}

	.row__label--danger {
		color: var(--msm-danger);
	}

	.row__right {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		margin-left: 12px;
	}

	.row__value {
		font-size: 14px;
		color: var(--msm-text-muted);
	}

	.row__arrow {
		margin-left: 8px;
		font-size: 16px;
		line-height: 1;
		color: var(--msm-text-muted);
	}

	/* 底部留白，避免最后一行贴着 tabBar */
	.tail {
		height: 24px;
	}
</style>
