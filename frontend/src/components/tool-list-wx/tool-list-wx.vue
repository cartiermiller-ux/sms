<template>
	<view class="xw-tool-list">
		<view class="xw-tool-list-content" v-if="type=='list'">
			<template v-for="(item, i) in list" :key="i">
				<view class="xw-tool-item" @click="onClick(item,i)" @longpress="onlongpress(item,i)" v-if="item.title">
					<image v-if="item.icon" class="xw-tool-img" :src="item.icon" mode="aspectFill"></image>
					<view class="xw-tool-text">
						<uni-badge v-if="item.type == 'dottext'" text="1" is-dot absolute="rightTop" size="normal">
							<text>{{ item.title }}</text>
						</uni-badge>
						<text v-else>{{ item.title }}</text>
					</view>
					<view class="xw-tool-else">
						<view v-for="(v, index) in item.else" :key="index">
							<uni-badge v-if="v.type == 'dotimg'" class="xw-tool-badge" text="1" is-dot absolute="rightTop" size="normal"><image :src="v.content" mode="aspectFill"></image></uni-badge>
							<image v-if="v.type == 'img'" :src="v.content" mode="aspectFill"></image>
							<uni-badge v-if="v.type == 'dottext'" class="xw-tool-badge" text="1" is-dot absolute="rightTop" size="normal"><view class="text">{{ v.content }}</view></uni-badge>
							<view class="text" v-if="v.type == 'text'">{{ v.content }}</view>
						</view>
					</view>
					<uni-icons v-if="!item.hideRight" class="xw-tool-right" type="right" size="16" color="#b5b5b5"></uni-icons>
				</view>
			</template>
		</view>
		<view class="xw-tool-list-content" v-if="type=='btns'">
			<view class="xw-tool-btn-item" v-for="(item, i) in list" :key="i" @click="onClick(item,i)" @longpress="onlongpress(item,i)">
				<view class="xw-tool-btn-icon wxfont " :class="item.icon"></view>
				<view class="xw-tool-btn-text">{{item.title}}</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'toolListWx', //微信功能列表
	data() {
		return {};
	},
	emits: ['itemClick','onlongpress'],
	props: {
		list: {
			type: Array
		},
		type: {
			type: String,
			default: 'list' //list列表icon为图片，btns按钮组icon为字体
		}
	},
	methods: {
		onlongpress(e,i){
			this.$emit('onlongpress', e,i);
		},
		onClick(e,i) {
			this.$emit('itemClick', e,i);
			if (e.path=='#') {
				return;
			}
			if (!e.path&&!e.hideRight) {
				uni.showToast({
					title: '未开通',
					icon: 'none'
				});
				return;
			}
			uni.navigateTo({
				url: e.path
			});
		}
	}
};
</script>

<style scoped>
/* ============================================================
   Msm 通用功能列表（Compact Density）
   —— 与全局 .msm-card / .msm-cell 视觉一致：
      白底卡片、12px 左右边距、行高 52px、16px 标题、13px 右侧值
   ============================================================ */
.xw-tool-list {
	display: flex;
	flex-direction: column;
	background-color: var(--msm-surface, #ffffff);
	border-radius: var(--msm-radius-md, 14px);
	margin: 0 12px 10px;
	overflow: hidden;
}

.xw-tool-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	min-height: 52px;
	padding: 8px 16px;
	border-bottom: 1px solid var(--msm-divider, #E9EDEF);
	font-size: 16px;
	color: var(--msm-text, #111B21);
	box-sizing: border-box;
}
.xw-tool-item:active {
	background: var(--msm-surface-sunken, #F0F4F6);
}
.xw-tool-item:nth-last-child(1) {
	border-bottom: none;
}
.xw-tool-img {
	width: 24px;
	height: 24px;
	margin-right: 12px;
	border-radius: 6px;
	flex-shrink: 0;
}

.xw-tool-text {
	white-space: nowrap;
	margin-right: auto;
	overflow: hidden;
	text-overflow: ellipsis;
}

.xw-tool-else {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
}
.xw-tool-else image {
	width: 28px;
	height: 28px;
	border-radius: 6px;
}
.xw-tool-else .text {
	color: var(--msm-text-muted, #8696A0);
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 200px;
}
.xw-tool-else image,
.xw-tool-else .text {
	margin-left: 8px;
}

.xw-tool-right {
	margin-left: 8px;
}
.xw-tool-btn-item{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	min-height: 50px;
	padding: 8px 16px;
	border-bottom: 1px solid var(--msm-divider, #E9EDEF);
	font-size: 15px;
	font-weight: 500;
	color: var(--msm-primary, #2F8FE5);
	box-sizing: border-box;
}
.xw-tool-btn-item:active {
	background: var(--msm-surface-sunken, #F0F4F6);
}
.xw-tool-btn-item:nth-last-child(1) {
	border-bottom: none;
}
.xw-tool-btn-icon{
	margin-right: 8px;
}
</style>
