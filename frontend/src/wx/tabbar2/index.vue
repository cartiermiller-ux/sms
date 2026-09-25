<template>
	<view class="msm-page">
		<!-- ============ 品牌导航栏 ============ -->
		<view class="msm-header">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__brand">通讯录</view>
					<view class="msm-header__sub">{{ totalCount }} 位联系人</view>
				</view>
				<view class="msm-header__actions">
					<view class="msm-icon-btn" @click="focusSearch">
						<uni-icons type="search" size="21" color="#667781"></uni-icons>
					</view>
					<view class="msm-icon-btn" @click="openMore">
						<uni-icons type="personadd" size="21" color="#2F8FE5"></uni-icons>
					</view>
				</view>
			</view>

			<view class="msm-search">
				<uni-icons class="msm-search__icon" type="search" size="16" color="#8696A0"></uni-icons>
				<input
					class="msm-search__input"
					v-model="keyword"
					type="text"
					placeholder="搜索联系人"
					placeholder-class="msm-search__ph"
					confirm-type="search"
				/>
				<view v-if="keyword" class="msm-search__clear" @click="keyword = ''">
					<uni-icons type="clear" size="16" color="#8696A0"></uni-icons>
				</view>
			</view>
		</view>

		<!-- ============ 快速入口 ============ -->
		<view v-if="!keyword" class="quick">
			<view class="quick__item" @click="goNewFriends">
				<view class="quick__icon">
					<uni-icons type="personadd" size="20" color="#2F8FE5"></uni-icons>
				</view>
				<view class="quick__label">新朋友</view>
				<view v-if="applyCount > 0" class="quick__dot"></view>
			</view>
			<view class="quick__item" @click="goGroups">
				<view class="quick__icon">
					<uni-icons type="staff" size="20" color="#2F8FE5"></uni-icons>
				</view>
				<view class="quick__label">群聊</view>
			</view>
			<view class="quick__item" @click="goScan">
				<view class="quick__icon">
					<uni-icons type="scan" size="20" color="#2F8FE5"></uni-icons>
				</view>
				<view class="quick__label">扫一扫</view>
			</view>
		</view>

		<!-- ============ 联系人（字母分组，不用卡片，直接铺在页面上） ============ -->
		<block v-if="groups.length">
			<view v-for="(g, gi) in groups" :key="gi" class="letter-group">
				<view class="letter">{{ g.letter }}</view>
				<view class="contact-list">
					<view
						v-for="(c, ci) in g.data"
						:key="c.userId"
						class="contact"
						@click="openContact(c)"
					>
						<image class="contact__avatar" :src="c.avatar" mode="aspectFill"></image>
						<view class="contact__body">
							<view class="contact__name">{{ c.name }}</view>
							<view v-if="c.chatNo" class="contact__no">Msm ID：{{ c.chatNo }}</view>
						</view>
						<uni-icons class="msm-arrow" type="arrowright" size="14" color="#C4CDD3"></uni-icons>
					</view>
				</view>
			</view>
			<view class="list-tail"></view>
		</block>

		<!-- ============ 空状态 ============ -->
		<view v-else class="msm-empty">
			<view class="msm-empty__art">
				<uni-icons type="staff" size="44" color="#2F8FE5"></uni-icons>
			</view>
			<view class="msm-empty__title">{{ keyword ? '没有找到联系人' : '通讯录还是空的' }}</view>
			<view class="msm-empty__desc">{{ keyword ? '换个关键词试试' : '添加好友后，联系人会按拼音自动分组' }}</view>
			<view v-if="!keyword" class="msm-btn" @click="openMore">添加好友</view>
		</view>

		<top-right-tool-wx ref="trtw"></top-right-tool-wx>
	</view>
</template>

<script>
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
		focusSearch() {
			this.keyword = '';
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
.msm-page {
	min-height: 100vh;
	background: var(--msm-background);
	padding-bottom: 16px;
}

.msm-search__input {
	flex: 1;
	min-width: 0;
	font-size: 14.5px;
	color: var(--msm-text);
	background: transparent;
}

.msm-search__ph {
	color: var(--msm-text-muted);
	font-size: 14.5px;
}

.msm-search__clear {
	padding-left: 6px;
}

/* ---------- 快速入口 ---------- */
.quick {
	display: flex;
	margin: 10px 12px 4px;
	background: var(--msm-surface);
	border-radius: var(--msm-radius-md);
	overflow: hidden;
}

.quick__item {
	position: relative;
	flex: 1;
	padding: 13px 6px 11px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.quick__item:active {
	background: var(--msm-surface-sunken);
}

.quick__icon {
	width: 40px;
	height: 40px;
	border-radius: 11px;
	background: var(--msm-primary-light);
	display: flex;
	align-items: center;
	justify-content: center;
}

.quick__label {
	margin-top: 7px;
	font-size: 12.5px;
	color: var(--msm-text);
}

.quick__dot {
	position: absolute;
	top: 11px;
	right: 50%;
	margin-right: -26px;
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--msm-danger);
}

/* ---------- 字母分组（IOS/Telegram 式：字母在灰底上，联系人行白底通栏）---------- */
.letter-group {
	margin-top: 0;
}

.letter {
	padding: 12px 20px 5px;
	font-size: 12px;
	font-weight: 600;
	color: var(--msm-text-muted);
	letter-spacing: .5px;
	background: var(--msm-background);
}

.contact-list {
	background: var(--msm-surface);
}

.contact {
	position: relative;
	display: flex;
	align-items: center;
	height: 64px;
	padding: 0 16px;
	background: var(--msm-surface);
	box-sizing: border-box;
}

.contact:active {
	background: var(--msm-surface-sunken);
}

.contact::after {
	content: '';
	position: absolute;
	left: 72px;
	right: 0;
	bottom: 0;
	height: 1px;
	background: var(--msm-divider);
	transform: scaleY(0.5);
}

.contact:last-child::after {
	display: none;
}

.contact__avatar {
	width: 44px;
	height: 44px;
	border-radius: 22px;
	margin-right: 12px;
	flex-shrink: 0;
	background: var(--msm-surface-sunken);
}

.contact__body {
	flex: 1;
	min-width: 0;
}

.contact__name {
	font-size: 15px;
	color: var(--msm-text);
	line-height: 1.25;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.contact__no {
	margin-top: 2px;
	font-size: 12px;
	color: var(--msm-text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.list-tail {
	height: 16px;
}
</style>
