<template>
	<view class="msm-list">
		<!-- 空状态：中性灰，不用品牌色 -->
		<view v-if="isEmpty" class="msm-empty">
			<view class="msm-empty__art">
				<uni-icons :type="emptyIcon" size="28" color="#BBBBBB"></uni-icons>
			</view>
			<view class="msm-empty__title">{{ emptyTitle }}</view>
			<view v-if="emptyDesc" class="msm-empty__desc">{{ emptyDesc }}</view>
			<slot name="empty"></slot>
		</view>

		<!-- 列表内容 -->
		<block v-else>
			<slot></slot>
			<view v-if="showFoot && (loading || finished)" class="msm-list__foot">
				<text v-if="loading">{{ loadingText }}</text>
				<text v-else>{{ finishedText }}</text>
			</view>
		</block>
	</view>
</template>

<script>
/**
 * MsmList —— 列表容器（空状态 / 加载中 / 没有更多）
 *
 * 关于下拉刷新与上拉加载：
 *   uni-app 的下拉刷新是**页面级**能力，必须在 pages.json 里给该页开
 *   "enablePullDownRefresh": true，再在页面里实现 onPullDownRefresh()。
 *   本组件只负责「空状态」和底部「加载中 / 没有更多」提示的渲染。
 *   上拉加载请在页面的 onReachBottom() 里调用自己的加载函数。
 *
 * 用法（二选一）：
 *   <!-- A. 传入 items，组件自动判断是否空 -->
 *   <msm-list :items="chatList" :loading="loading" :finished="finished" empty-title="还没有会话">
 *     <view v-for="item in chatList" :key="item.id" class="msm-row"> ... </view>
 *   </msm-list>
 *
 *   <!-- B. 自己控制空状态 -->
 *   <msm-list :empty="!list.length" empty-title="暂无内容"> ... </msm-list>
 */
export default {
	name: 'MsmList',
	props: {
		// 传入数组则自动判断空状态；不传（null）时由 empty 属性决定
		items: { type: Array, default: null },
		// 手动指定空状态（items 为 null 时生效）
		empty: { type: Boolean, default: false },
		// 是否正在加载（首屏加载中不显示空状态）
		loading: { type: Boolean, default: false },
		// 是否已加载完全部数据
		finished: { type: Boolean, default: false },
		emptyIcon: { type: String, default: 'info' },
		emptyTitle: { type: String, default: '暂无内容' },
		emptyDesc: { type: String, default: '' },
		loadingText: { type: String, default: '加载中…' },
		finishedText: { type: String, default: '没有更多了' },
		showFoot: { type: Boolean, default: true }
	},
	computed: {
		isEmpty() {
			if (this.loading) return false;
			if (this.items) return this.items.length === 0;
			return this.empty;
		}
	}
};
</script>
