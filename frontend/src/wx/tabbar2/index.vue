<template>
	<view class="msm-page">
		<!-- ============ 统一顶栏：Logo ｜ 搜索胶囊 ｜ 添加好友 ｜ 头像 ============ -->
		<msm-topbar
			:value="keyword"
			:show-plus="true"
			placeholder="搜索联系人"
			@input="onSearchInput"
			@plus="openMore"
		></msm-topbar>

		<!-- ============ 快速入口（V2EX 式菜单行，不再是三宫格彩色图标） ============ -->
		<view v-if="!keyword" class="entry">
			<msm-card>
				<view class="msm-row msm-row--tappable" @click="goNewFriends">
					<view class="msm-row__icon">
						<uni-icons type="personadd" size="19" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">新朋友</view>
					</view>
					<view v-if="applyCount > 0" class="msm-badge msm-badge--row">{{ badgeText(applyCount) }}</view>
					<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
				</view>

				<view class="msm-row msm-row--tappable" @click="goGroups">
					<view class="msm-row__icon">
						<uni-icons type="staff" size="19" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">群聊</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
				</view>

				<view class="msm-row msm-row--tappable" @click="goScan">
					<view class="msm-row__icon">
						<uni-icons type="scan" size="19" color="#667781"></uni-icons>
					</view>
					<view class="msm-row__body">
						<view class="msm-row__title msm-row__title--plain">扫一扫</view>
					</view>
					<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
				</view>
			</msm-card>
		</view>

		<!-- ============ 联系人（字母分组，通栏白底行 + 1px 分隔线） ============ -->
		<msm-list
			:items="groups"
			:empty-title="keyword ? '没有找到联系人' : '通讯录还是空的'"
			:empty-desc="keyword ? '换个关键词试试' : '添加好友后，联系人会按拼音自动分组'"
			:empty-icon="keyword ? 'search' : 'staff'"
		>
			<view v-for="(g, gi) in groups" :key="gi" class="letter-group">
				<view class="msm-section">{{ g.letter }}</view>
				<view class="contact-list">
					<view
						v-for="(c, ci) in g.data"
						:key="c.userId"
						class="msm-row msm-row--tappable"
						@click="openContact(c)"
					>
						<view class="msm-row__avatar">
							<image class="contact__avatar-img" :src="c.avatar" mode="aspectFill"></image>
						</view>
						<view class="msm-row__body">
							<view class="msm-row__title">{{ c.name }}</view>
							<view v-if="c.chatNo" class="msm-row__meta">Msm ID：{{ c.chatNo }}</view>
						</view>
						<uni-icons class="msm-arrow" type="arrowright" size="13" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<template #empty>
				<view v-if="!keyword" class="msm-empty__action" @click="openMore">
					<view class="msm-btn msm-btn--sm">添加好友</view>
				</view>
			</template>
		</msm-list>

		<top-right-tool-wx ref="trtw"></top-right-tool-wx>
	</view>
</template>

<script>
import { formatCount } from '@/common/msm-format.js';

export default {
	data() {
		return {
			keyword: '',
			list: []
		};
	},
	computed: {
		friendApply() {
			return this.$store.state.friendApply;
		},
		applyCount() {
			return (this.friendApply && this.friendApply.count) || 0;
		},
		totalCount() {
			return this.list.reduce((n, g) => n + (g.data ? g.data.length : 0), 0);
		},
		/** 按关键词过滤（保留分组结构） */
		groups() {
			const kw = (this.keyword || '').trim().toLowerCase();
			if (!kw) return this.list;
			return this.list
				.map(g => ({
					letter: g.letter,
					data: g.data.filter(
						c =>
							String(c.name || '').toLowerCase().indexOf(kw) > -1 ||
							String(c.chatNo || '').toLowerCase().indexOf(kw) > -1
					)
				}))
				.filter(g => g.data.length);
		}
	},
	onShow() {
		this.getflist();
		this.$store.dispatch('tabBarpull');
	},
	methods: {
		badgeText(n) {
			return formatCount(n) || String(n);
		},
		/** 顶栏搜索框是受控组件，输入值回写到本页 keyword 上 */
		onSearchInput(v) {
			this.keyword = v || '';
		},
		openMore() {
			if (this.$refs['trtw']) this.$refs['trtw'].showTab();
		},
		goNewFriends() {
			uni.navigateTo({ url: '../search-friends/index' });
		},
		goGroups() {
			uni.navigateTo({ url: '../groupInfo/grouplist' });
		},
		goScan() {
			this.$fc.saoyisao();
		},
		openContact(c) {
			uni.navigateTo({ url: '../personInfo/detail?param=' + c.userId });
		},
		getflist() {
			this.$http.request({
				url: '/friend/friendList',
				method: 'POST',
				data: JSON.stringify({}),
				success: res => {
					if (res.data.code == 200) {
						var data = res.data.data;
						var list = [];
						for (var i = 0; i < data.length; i++) {
							var item = data[i];
							list.push({
								name: item.nickName,
								avatar: item.portrait,
								userId: item.userId,
								userType: item.userType,
								chatNo: item.chatNo
							});
						}
						this.list = this.$fc.sortList({ list: list, key: 'name' });
					}
				}
			});
		}
	}
};
</script>

<style lang="scss" scoped>
	/* ============================================================
	   通讯录页 —— 三栏顶栏 + 快速入口 + 字母分组联系人
	   行、头像、角标等基础件在 App.vue 全局样式里。
	   ============================================================ */
	.msm-page {
		min-height: 100vh;
		background: var(--msm-background);
		padding-bottom: 16px;
	}

	/* ---------- 快速入口卡片 ---------- */
	.entry {
		margin-top: 10px;
	}

	/* ---------- 联系人的头像图片本体 ---------- */
	.contact__avatar-img {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* ---------- 空状态行动按钮 ---------- */
	.msm-empty__action {
		margin-top: 18px;
	}
</style>
