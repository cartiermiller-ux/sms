<template>
	<view class="msm-page">
		<!-- ============ 统一顶栏：Logo ｜ 搜索胶囊 ｜ + ｜ 头像 ============ -->
		<msm-topbar
			:value="keyword"
			:show-plus="true"
			placeholder="搜索聊天或联系人"
			@input="onSearchInput"
			@plus="openMore"
		></msm-topbar>

		<!-- 标签页（顶栏已提供分割线，这里用 --plain 去掉重复边框） -->
		<view class="msm-tabs msm-tabs--pad msm-tabs--plain">
			<view
				v-for="(t, i) in tabs"
				:key="i"
				class="msm-tabs__item"
				:class="{ 'msm-tabs__item--active': tabIndex === i }"
				@click="tabIndex = i"
			>{{ t }}</view>
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
			tabs: ['全部', '未读', '群聊', '置顶'],
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
			if (this.tabIndex === 3) arr = arr.filter(v => v.top === 'Y');
			return arr;
		},
		emptyTitle() {
			if (this.keyword) return '没有找到相关聊天';
			if (this.tabIndex === 1) return '没有未读消息';
			if (this.tabIndex === 2) return '还没有群聊';
			if (this.tabIndex === 3) return '没有置顶会话';
			return '还没有任何聊天';
		},
		emptyDesc() {
			if (this.keyword) return '换个关键词试试';
			if (this.tabIndex === 1) return '所有消息都看过了';
			if (this.tabIndex === 2) return '拉上朋友建个群吧';
			if (this.tabIndex === 3) return '长按会话可以置顶';
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
			// 底部从 4 栏砍成 3 栏后，index:2 由「发现」变成了「设置」，
			// 朋友圈未读再挂到 tab 角标上会跑到设置上，故此处不再设置 tab 角标；
			// 改为在设置页的「朋友圈」那一行显示数量（见 wx/tabbar4/index.vue）。
			deep: true,
			immediate: false,
			handler(val) {
				// 清掉历史遗留的角标（旧版本可能已经设过 index:2）
				uni.removeTabBarBadge({ index: 2 });
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
		/** 顶栏搜索框是受控组件，输入值回写到本页 keyword 上 */
		onSearchInput(v) {
			this.keyword = v || '';
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
	   消息页 —— 三栏顶栏 + 下划线标签页 + 卡片列表
	   顶栏与列表行的基础件都在 App.vue 的全局样式里，
	   这里只放本页独有的部分。
	   ============================================================ */
	.msm-page {
		min-height: 100vh;
		background: var(--msm-background);
		padding-bottom: 20px;
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
