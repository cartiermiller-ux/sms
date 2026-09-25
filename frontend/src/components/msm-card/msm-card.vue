<template>
	<view class="msm-card" :class="{ 'msm-card--flush': flush, 'msm-card--plain': plain }">
		<!-- 卡片头部（可选）：标题 + 右侧“更多” -->
		<view v-if="title || more" class="msm-card__head" @click="$emit('head-click')">
			<text class="msm-card__head-title">{{ title }}</text>
			<text v-if="more" class="msm-card__head-more">{{ more }}</text>
		</view>
		<view v-else-if="$slots.head" class="msm-card__head">
			<slot name="head"></slot>
		</view>

		<!-- 卡片主体 -->
		<slot></slot>

		<!-- 卡片脚部（可选） -->
		<view v-if="footer" class="msm-card__foot">
			<text>{{ footer }}</text>
		</view>
		<view v-else-if="$slots.foot" class="msm-card__foot">
			<slot name="foot"></slot>
		</view>
	</view>
</template>

<script>
/**
 * MsmCard —— V2EX 风格的白底分组容器
 *
 * 只负责“一块白底 + 可选的头部/脚部 + 行与行之间的 1px 分割线”，
 * 行内容请用 .msm-row 系列类名自己写，或直接用默认插槽塞任意内容。
 *
 * 用法：
 *   <msm-card title="系统通知" more="全部">
 *     <view class="msm-row msm-row--tappable"> ... </view>
 *   </msm-card>
 */
export default {
	name: 'MsmCard',
	props: {
		// 头部标题，留空则不渲染头部
		title: { type: String, default: '' },
		// 头部右侧的次要文案（如“全部”“3 条”）
		more: { type: String, default: '' },
		// 脚部文案，留空则不渲染脚部
		footer: { type: String, default: '' },
		// 通栏卡片：左右不留白、无圆角
		flush: { type: Boolean, default: false },
		// 透明卡片：去掉白底，只保留行分隔线
		plain: { type: Boolean, default: false }
	},
	emits: ['head-click']
};
</script>
