<template>
	<view class="msm-page">
		<!-- ============ 品牌导航栏 ============ -->
		<view class="msm-header">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__brand">M<em>sm</em></view>
					<view class="msm-header__sub">与你保持联系</view>
				</view>
				<view class="msm-header__actions">
					<view class="msm-icon-btn" @click="focusSearch">
						<uni-icons type="search" size="22" color="#667781"></uni-icons>
					</view>
					<view class="msm-icon-btn" @click="openMore">
						<uni-icons type="plusempty" size="22" color="#2F8FE5"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 搜索 -->
			<view class="msm-search">
				<uni-icons class="msm-search__icon" type="search" size="17" color="#8696A0"></uni-icons>
				<input
					class="msm-search__input"
					v-model="keyword"
					type="text"
					placeholder="搜索聊天或联系人"
					placeholder-class="msm-search__ph"
					confirm-type="search"
				/>
				<view v-if="keyword" class="msm-search__clear" @click="keyword = ''">
					<uni-icons type="clear" size="17" color="#8696A0"></uni-icons>
				</view>
			</view>

			<!-- 分段筛选 -->
			<view class="msm-segment">
				<view
					v-for="(t, i) in tabs"
					:key="i"
					class="msm-segment__item"
					:class="{ 'msm-segment__item--active': tabIndex === i }"
					@click="tabIndex = i"
				>{{ t }}</view>
			</view>
		</view>

		<!-- ============ 会话列表 ============ -->
		<view v-if="filteredList.length" class="chat-list">
			<view
				v-for="(v, i) in filteredList"
				:key="v.userId"
				class="chat"
				@click="clickChat(v)"
				@longpress="onLongPress(v, i)"
			>
				<!-- 头像 -->
				<view class="chat__avatar-wrap">
					<image
						v-if="v.windowType !== 'GROUP'"
						class="chat__avatar"
						:src="v.portrait"
						mode="aspectFill"
					></image>
					<view v-else class="chat__avatar chat__avatar--group">
						<image
							v-for="(u, ui) in groupAvatars(v.portrait)"
							:key="ui"
							class="chat__avatar-mini"
							:src="u"
							mode="aspectFill"
						></image>
					</view>
					<view v-if="Number(v.num) > 0" class="chat__badge">
						{{ Number(v.num) > 99 ? '99+' : v.num }}
					</view>
				</view>

				<!-- 内容 -->
				<view class="chat__body">
					<view class="chat__row">
						<text class="chat__name">{{ v.nickName }}</text>
						<text class="chat__time">{{ formatTime(v.time) }}</text>
					</view>
					<view class="chat__row chat__row--bottom">
						<text class="chat__note">{{ v.content }}</text>
						<view v-if="v.top === 'Y'" class="chat__pin">
							<uni-icons type="arrowup" size="11" color="#2F8FE5"></uni-icons>
							<text class="chat__pin-text">置顶</text>
						</view>
					</view>
				</view>

				<!-- 长按菜单（置顶 / 删除） -->
				<open-tool :ref="'tool' + i" :data="v" :itemKey="i"></open-tool>
			</view>
		</view>

		<!-- ============ 空状态 ============ -->
		<view v-else class="msm-empty">
			<view class="empty-logo">
				<image class="empty-logo__img" src="/static/msm-icon.png" mode="aspectFit"></image>
			</view>
			<view class="msm-empty__title">{{ emptyTitle }}</view>
			<view class="msm-empty__desc">{{ emptyDesc }}</view>
			<view v-if="!keyword && tabIndex === 0" class="msm-btn" @click="openMore">发起聊天</view>
		</view>

		<!-- 右上角 + 菜单 -->
		<top-right-tool-wx ref="trtw"></top-right-tool-wx>
	</view>
</template>

<script>
import openTool from '@/components/uni-list-chat-wx/openTool.vue';

export default {
	components: { openTool },
	data() {
		return {
			keyword: '',
			tabIndex: 0,
			tabs: ['全部', '未读', '群聊'],
			longTapItemKey: 0,
			tranMsg: '',
			list: [],
			toplist: [],
			NOTtoplist: [],
			clickToSubmitSure: null
		};
	},
	computed: {
		userInfo() {
			return this.$store.state.userInfo;
		},
		chatlist() {
			return this.$store.state.chatlist;
		},
		chatListNum() {
			return this.$store.state.chatListNum;
		},
		topicReply() {
			return this.$store.state.topicReply;
		},
		friendApply() {
			return this.$store.state.friendApply;
		},

		/** 置顶优先 + 时间倒序 */
		sortedList() {
			return this.toplist.concat(this.NOTtoplist);
		},
		/** 搜索 + 分段筛选结果 */
		filteredList() {
			let arr = this.sortedList;
			const kw = (this.keyword || '').trim().toLowerCase();
			if (kw) {
				arr = arr.filter(v =>
					String(v.nickName || '').toLowerCase().indexOf(kw) > -1 ||
					String(v.content || '').toLowerCase().indexOf(kw) > -1
				);
			}
			if (this.tabIndex === 1) arr = arr.filter(v => Number(v.num) > 0);
			if (this.tabIndex === 2) arr = arr.filter(v => v.windowType === 'GROUP');
			return arr;
		},
		emptyTitle() {
			if (this.keyword) return '没有找到相关聊天';
			if (this.tabIndex === 1) return '没有未读消息';
			if (this.tabIndex === 2) return '还没有群聊';
			return '还没有任何聊天';
		},
		emptyDesc() {
			if (this.keyword) return '换个关键词试试';
			if (this.tabIndex === 1) return '所有消息都看过了';
			if (this.tabIndex === 2) return '拉上朋友建个群吧';
			return '开始一段新的对话吧';
		}
	},
	onLoad() {
		this.clickToSubmitSure = this.$fc.debounce(
			e => {
				uni.navigateTo({
					url: '../chatWindow/index?userId=' + e.userId + '&windowType=' + e.windowType
				});
			},
			1000,
			true
		);
	},
	watch: {
		chatListNum: {
			deep: true,
			immediate: false,
			handler(val) {
				if (val > 0) {
					uni.setTabBarBadge({ index: 0, text: val.toString() });
				} else {
					uni.removeTabBarBadge({ index: 0 });
				}
			}
		},
		topicReply: {
			deep: true,
			immediate: false,
			handler(val) {
				if (val.count && val.count > 0) {
					uni.setTabBarBadge({ index: 2, text: val.count.toString() });
				} else {
					uni.removeTabBarBadge({ index: 2 });
				}
			}
		},
		friendApply: {
			deep: true,
			immediate: false,
			handler(val) {
				if (val.count && val.count > 0) {
					uni.setTabBarBadge({ index: 1, text: val.count.toString() });
				} else {
					uni.removeTabBarBadge({ index: 1 });
				}
			}
		},
		chatlist: {
			deep: true,
			immediate: false,
			handler(val) {
				var obj = JSON.parse(JSON.stringify(val));
				var newarr = [];
				var toplist = [];
				var NOTtoplist = [];
				for (var k in obj) {
					obj[k]['xtime'] = new Date(obj[k]['time']).getTime().toString();
					if (obj[k]['userId']) {
						newarr.push(obj[k]);
					}
					if (obj[k]['userId'] && obj[k]['top'] == 'Y') {
						toplist.push(obj[k]);
					}
					if (obj[k]['userId'] && obj[k]['top'] == 'N') {
						NOTtoplist.push(obj[k]);
					}
				}
				const byTime = (a, b) => b['xtime'] - a['xtime'];
				newarr.sort(byTime);
				toplist.sort(byTime);
				NOTtoplist.sort(byTime);
				this.list = newarr;
				this.toplist = toplist;
				this.NOTtoplist = NOTtoplist;
			}
		}
	},
	onShow() {
		this.$store.dispatch('tabBarpull');
	},
	mounted() {
		// #ifdef APP-PLUS
		// 【已停用】未集成 Push 模块时，只要访问 plus.push 就会弹出
		// "打包时未添加push模块" 提示框，所以这里整段注释掉。
		// 日后开通 uni-push、在 manifest.json 勾选 Push 模块并重新打包后，
		// 把下面这段取消注释即可恢复推送监听。
		//
		// plus.push.addEventListener('click', msg => {
		// 	this.tranMsg = JSON.stringify(msg);
		// 	var data = JSON.parse(msg.content);
		// 	this.$fc.getPush(data);
		// });
		// plus.push.addEventListener('receive', msg => {
		// 	this.tranMsg = JSON.stringify(msg);
		// 	var data = JSON.parse(msg.content);
		// 	this.$fc.getPush(data);
		// });
		// #endif
	},
	methods: {
		/**
		 * 会话时间显示：
		 *   今天    -> 09:41
		 *   昨天    -> 昨天
		 *   今年    -> 9月25日
		 *   更早    -> 2025/9/25
		 * 服务端如果已经给了短格式（如 "11:32"、"昨天"），原样返回。
		 */
		formatTime(t) {
			if (!t) return '';
			const s = String(t).trim();
			if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s)) return s;
			const d = new Date(s.replace(/-/g, '/'));
			if (isNaN(d.getTime())) return s;
			const p = n => (n < 10 ? '0' + n : '' + n);
			const now = new Date();
			const sameDay = (a, b) =>
				a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
			if (sameDay(d, now)) return p(d.getHours()) + ':' + p(d.getMinutes());
			if (sameDay(d, new Date(now.getTime() - 86400000))) return '昨天';
			if (d.getFullYear() === now.getFullYear()) return d.getMonth() + 1 + '月' + d.getDate() + '日';
			return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
		},
		/** 群头像：portrait 是 JSON 数组字符串 */
		groupAvatars(portrait) {
			try {
				var data = JSON.parse(portrait);
				if (!Array.isArray(data)) return [];
				return data.slice(0, 4);
			} catch (e) {
				return [];
			}
		},
		focusSearch() {
			// 点放大镜/搜索框时把关键词清空，方便重新输入
			this.keyword = '';
		},
		openMore() {
			if (this.$refs['trtw']) this.$refs['trtw'].showTab();
		},
		onLongPress(v, i) {
			this.longTapItemKey = i;
			const r = this.$refs['tool' + i];
			const inst = Array.isArray(r) ? r[0] : r;
			if (inst && inst.showTab) inst.showTab();
		},
		clickChat(e) {
			this.clickToSubmitSure(e);
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

/* ---------- 搜索框内的输入 ---------- */
.msm-search__input {
	flex: 1;
	min-width: 0;
	font-size: 15px;
	color: var(--msm-text);
	background: transparent;
}

.msm-search__ph {
	color: var(--msm-text-muted);
	font-size: 15px;
}

.msm-search__clear {
	padding-left: 6px;
}

/* ---------- 会话列表 ---------- */
.chat-list {
	background: var(--msm-surface);
}

.chat {
	position: relative;
	display: flex;
	align-items: center;
	padding: 10px 16px;
	background: var(--msm-surface);
}

.chat:active {
	background: var(--msm-surface-sunken);
}

.chat::after {
	content: '';
	position: absolute;
	left: 76px;
	right: 0;
	bottom: 0;
	height: 1px;
	background: var(--msm-divider);
	transform: scaleY(0.5);
}

.chat:last-child::after {
	display: none;
}

/* 头像 54px */
.chat__avatar-wrap {
	position: relative;
	flex-shrink: 0;
}

.chat__avatar {
	width: 48px;
	height: 48px;
	border-radius: 24px;
	background: var(--msm-surface-sunken);
	display: block;
}

.chat__avatar--group {
	display: flex;
	flex-wrap: wrap;
	overflow: hidden;
	border-radius: 14px;
	background: var(--msm-surface-sunken);
}

.chat__avatar-mini {
	width: 50%;
	height: 50%;
	display: block;
}

.chat__badge {
	position: absolute;
	top: -2px;
	right: -4px;
	min-width: 20px;
	height: 20px;
	padding: 0 6px;
	box-sizing: border-box;
	border-radius: 999px;
	background: var(--msm-danger);
	border: 2px solid var(--msm-surface);
	color: #fff;
	font-size: 11px;
	font-weight: 600;
	line-height: 16px;
	text-align: center;
}

/* 内容区 */
.chat__body {
	flex: 1;
	min-width: 0;
	margin-left: 12px;
}

.chat__row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.chat__row--bottom {
	margin-top: 5px;
}

.chat__name {
	flex: 1;
	min-width: 0;
	font-size: 15px;
	font-weight: 600;
	color: var(--msm-text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chat__time {
	margin-left: 8px;
	flex-shrink: 0;
	font-size: 11.5px;
	color: var(--msm-text-muted);
}

.chat__note {
	flex: 1;
	min-width: 0;
	font-size: 13.5px;
	color: var(--msm-text-secondary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chat__pin {
	margin-left: 8px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.chat__pin-text {
	margin-left: 2px;
	font-size: 11px;
	color: var(--msm-primary);
}

/* ---------- 空状态 ---------- */
.empty-logo {
	width: 78px;
	height: 78px;
	border-radius: 22px;
	overflow: hidden;
	background: var(--msm-surface);
	box-shadow: var(--msm-shadow-md);
	display: flex;
	align-items: center;
	justify-content: center;
}

.empty-logo__img {
	width: 78px;
	height: 78px;
}
</style>
