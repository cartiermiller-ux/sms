<template>
	<view class="msm-topbar">
		<!-- 左：Logo（28px，克制，不与头像抢视觉） -->
		<image class="msm-topbar__logo" src="/static/msm/logo.png" mode="aspectFit"></image>

		<!-- 中：搜索胶囊（设置页传 :show-search="false"，用占位撑开保持左右对齐） -->
		<view v-if="showSearch" class="msm-topbar__search">
			<uni-icons class="msm-topbar__search-icon" type="search" size="15" color="#8696A0"></uni-icons>
			<input
				class="msm-topbar__input"
				:value="value"
				type="text"
				:placeholder="placeholder"
				placeholder-class="msm-topbar__ph"
				confirm-type="search"
				@input="onInput"
			/>
			<view v-if="value" class="msm-topbar__clear" @click="clear">
				<uni-icons type="clear" size="15" color="#8696A0"></uni-icons>
			</view>
		</view>
		<view v-else class="msm-topbar__spacer"></view>

		<!-- 中右：可选次要动作（消息页的「+」） -->
		<view v-if="showPlus" class="msm-topbar__icon" @click="$emit('plus')">
			<uni-icons type="plusempty" size="20" color="#111B21"></uni-icons>
		</view>

		<!-- 右：圆形用户头像 —— 点击切到「设置」页（账号行就在该页顶部） -->
		<view class="msm-topbar__avatar" @click="onAvatar">
			<image v-if="portrait" class="msm-topbar__avatar-img" :src="portrait" mode="aspectFill"></image>
			<uni-icons v-else type="staff" size="20" color="#8696A0"></uni-icons>
		</view>
	</view>
</template>

<script>
/**
 * 统一顶栏 —— 三栏结构：左 Logo ｜ 中搜索胶囊 ｜ 右圆形头像
 *
 * 用法：
 *   <msm-topbar :value="keyword" @input="v => keyword = v" />
 *   <msm-topbar :show-search="false" />                 // 设置页
 *   <msm-topbar :show-plus="true" @plus="openMore" />   // 消息页
 *
 * 头像点击行为：切到「设置」Tab（该页顶部就是账号行，等于更快的个人资料入口）。
 * 搜索是「受控」的：组件不改内部状态，只把输入值 emit 出去，由页面决定怎么过滤。
 */
export default {
	name: 'MsmTopbar',
	props: {
		// 搜索关键词（受控）
		value: { type: String, default: '' },
		// 是否显示中间搜索胶囊
		showSearch: { type: Boolean, default: true },
		// 是否显示「+」次要动作
		showPlus: { type: Boolean, default: false },
		placeholder: { type: String, default: '搜索' }
	},
	emits: ['input', 'plus', 'avatar'],
	computed: {
		portrait() {
			const u = this.$store && this.$store.state ? this.$store.state.userInfo : null;
			return (u && u.portrait) || '';
		}
	},
	methods: {
		onInput(e) {
			this.$emit('input', e.detail.value);
		},
		clear() {
			this.$emit('input', '');
		},
		onAvatar() {
			this.$emit('avatar');
			// 三个使用方都在 wx/<tab>/index，相对路径一致
			uni.switchTab({ url: '../tabbar4/index' });
		}
	}
};
</script>
