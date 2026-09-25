<template>
	<view class="msm-page">
		<!-- ============ 导航栏 ============ -->
		<view class="msm-header msm-header--flat">
			<view class="msm-header__bar">
				<view class="msm-header__left">
					<view class="msm-header__brand">M<em>sm</em></view>
				</view>
				<view class="msm-header__actions">
					<view class="msm-icon-btn" @click="openMore">
						<uni-icons type="plusempty" size="20" color="#111B21"></uni-icons>
					</view>
					<!-- 右上角用户头像（圆形）—— 参考 V2EX 首页头部 -->
					<view class="msm-avatar-btn" @click="goMe">
						<image
							v-if="userInfo && userInfo.portrait"
							class="msm-avatar-btn__img"
							:src="userInfo.portrait"
							mode="aspectFill"
						></image>
						<uni-icons v-else type="staff" size="19" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 搜索 -->
			<view class="msm-search">
				<uni-icons class="msm-search__icon" type="search" size="15" color="#8696A0"></uni-icons>
				<input
					class="msm-search__input"
					v-model="keyword"
					type="text"
					placeholder="搜索聊天或联系人"
					placeholder-class="msm-search__ph"
					confirm-type="search"
				/>
				<view v-if="keyword" class="msm-search__clear" @click="keyword = ''">
					<uni-icons type="clear" size="15" color="#8696A0"></uni-icons>
				</view>
			</view>

			<!-- 标签页（自带下划线指示，同时充当导航栏底部分割线） -->
			<view class="msm-tabs">
				<view
					v-for="(t, i) in tabs"
					:key="i"
					class="msm-tabs__item"
					:class="{ 'msm-tabs__item--active': tabIndex === i }"
					@click="tabIndex = i"
				>{{ t }}</view>
			</view>
		</view>

		<!-- ============ 会话列表 ============ -->
		<msm-list
			:items="filteredList"
			:empty-title="emptyTitle"
			:empty-desc="emptyDesc"
			:empty-icon="keyword ? 'search' : 'info'"
		>
			<view
				v-for="(v, i) in filteredList"
				:key="v.userId"
				class="msm-row msm-row--top msm-row--tappable"
				@click="clickChat(v)"
				@longpress="onLongPress(v, i)"
			>
				<!-- 头像（近方形小圆角） -->
				<view v-if="v.windowType !== 'GROUP'" class="msm-row__avatar">
					<image class="msm-chat__avatar-img" :src="v.portrait" mode="aspectFill"></image>
				</view>
				<view v-else class="msm-row__avatar msm-row__avatar--group">
					<image
						v-for="(u, ui) in groupAvatars(v.portrait)"
						:key="ui"
						class="msm-row__avatar-mini"
						:src="u"
						mode="aspectFill"
					></image>
				</view>

				<!-- 内容：标题 / 摘要 / 底部元信息 -->
				<view class="msm-row__body">
					<view class="msm-row__title">{{ v.nickName }}</view>
					<view class="msm-row__desc">{{ v.content }}</view>
					<view class="msm-row__meta">
						<text>{{ formatTime(v.time) }}</text>
						<text v-if="v.top === 'Y'" class="msm-row__meta-sep">·</text>
						<text v-if="v.top === 'Y'">置顶</text>
					</view>
				</view>

				<!-- 右侧：未读角标（灰色数字） -->
				<view class="msm-row__right">
					<view v-if="Number(v.num) > 0" class="msm-badge">{{ badgeText(v.num) }}</view>
				</view>

				<!-- 长按菜单（置顶 / 删除） -->
				<open-tool :ref="'tool' + i" :data="v" :itemKey="i"></open-tool>
			</view>

			<!-- 空状态下的行动按钮 -->
			<template #empty>
				<view v-if="!keyword && tabIndex === 0" class="msm-empty__action" @click="openMore">
					<view class="msm-btn msm-btn--sm">发起聊天</view>
				</view>
			</template>
		</msm-list>

		<!-- 右上角 + 菜单 -->
		<top-right-tool-wx ref="trtw"></top-right-tool-wx>
	</view>
</template>

<script>
import openTool from '@/components/uni-list-chat-wx/openTool.vue';
import { formatListTime, formatCount } from '@/common/msm-format.js';

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
				// 注意：uni-app 的 setTabBarBadge 协议里只有 text，
				// 不支持 backgroundColor/color（传了也被忽略），角标固定为框架的红色。
				// 详见 Msm-V2EX视觉规范.md「底部 Tab」一节的说明。
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
		 * 会话时间显示（V2EX 紧凑格式，放在 meta 行里）：
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
			return formatListTime(s) || s;
		},
		/** 未读数量：>99 显示 99+ */
		badgeText(n) {
			return formatCount(n) || String(n);
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
		goMe() {
			// 右上角头像 -> 切到「我」（账号中心）
			uni.switchTab({ url: '../tabbar4/index' });
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
	/* ============================================================
	   消息页 —— V2EX 风格
	   列表行、头像、角标等基础件在 App.vue 的全局样式里，
	   这里只放本页独有的部分。
	   ============================================================ */
	.msm-page {
		min-height: 100vh;
		background: var(--msm-background);
		padding-bottom: 20px;
	}

	/* ---------- 搜索框内的输入 ---------- */
	.msm-search__input {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		color: var(--msm-text);
		background: transparent;
	}

	.msm-search__ph {
		color: var(--msm-text-faint);
		font-size: 13px;
	}

	.msm-search__clear {
		padding-left: 6px;
	}

	/* ---------- 会话行内头像的图片本体 ---------- */
	.msm-chat__avatar-img {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* ---------- 空状态里的行动按钮 ---------- */
	.msm-empty__action {
		margin-top: 18px;
	}
</style>
