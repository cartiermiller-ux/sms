<template>
	<view class="cc">
		<!-- 触发区：显示当前区号，点击展开列表 -->
		<view class="cc__trigger" @click="open">
			<text class="cc__code">+{{ current.code }}</text>
			<text class="cc__caret">▾</text>
		</view>

		<!-- 底部弹层：国家 / 地区列表（可搜索） -->
		<view v-if="visible" class="cc__mask" @click="close">
			<view class="cc__sheet" @click.stop>
				<view class="cc__head">
					<text class="cc__title">选择国家 / 地区</text>
					<text class="cc__close" @click="close">关闭</text>
				</view>

				<view class="cc__search">
					<uni-icons type="search" size="15" color="#8696A0"></uni-icons>
					<input
						class="cc__search-input"
						v-model="keyword"
						type="text"
						placeholder="搜索国家或区号"
						placeholder-class="cc__search-ph"
					/>
				</view>

				<scroll-view class="cc__list" scroll-y>
					<view
						v-for="c in filtered"
						:key="c.code + c.name"
						class="cc__item"
						:class="{ 'cc__item--on': c.code === current.code }"
						@click="pick(c)"
					>
						<text class="cc__item-name">{{ c.name }}</text>
						<text class="cc__item-code">+{{ c.code }}</text>
					</view>
					<view v-if="!filtered.length" class="cc__empty">没有匹配的国家 / 地区</view>
					<view class="cc__pad"></view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import { COUNTRIES, findCountry, DEFAULT_COUNTRY_CODE } from '@/common/msm-country.js';

/**
 * 国家 / 地区选择器（手机区号）
 *
 * 用法：
 *   <msm-country :value="countryCode" @change="onCountry" />
 *   onCountry(c) { this.countryCode = c.code }
 *
 * ⚠️ 区号目前只影响界面显示与前端位数校验。
 *    服务端仍只接受中国大陆号码（见 common/msm-country.js 文件头说明）。
 */
export default {
	name: 'MsmCountry',
	props: {
		// 当前区号，如 '86'
		value: { type: [String, Number], default: DEFAULT_COUNTRY_CODE }
	},
	emits: ['change'],
	data() {
		return {
			visible: false,
			keyword: ''
		};
	},
	computed: {
		current() {
			return findCountry(this.value);
		},
		filtered() {
			const kw = String(this.keyword || '').trim().toLowerCase();
			if (!kw) return COUNTRIES;
			const num = kw.replace(/^\+/, '');
			return COUNTRIES.filter(
				c =>
					c.name.toLowerCase().indexOf(kw) > -1 ||
					c.en.toLowerCase().indexOf(kw) > -1 ||
					(num && c.code.indexOf(num) > -1)
			);
		}
	},
	methods: {
		open() {
			this.keyword = '';
			this.visible = true;
		},
		close() {
			this.visible = false;
		},
		pick(c) {
			this.visible = false;
			this.$emit('change', c);
		}
	}
};
</script>

<style lang="scss" scoped>
	.cc {
		display: flex;
		align-items: center;
	}

	/* ---------- 触发区 ---------- */
	.cc__trigger {
		display: flex;
		align-items: center;
		padding: 6px 2px 6px 0;
	}

	.cc__code {
		font-size: 15px;
		color: var(--msm-text);
	}

	.cc__caret {
		margin-left: 4px;
		font-size: 10px;
		line-height: 1;
		color: var(--msm-text-muted);
	}

	/* ---------- 遮罩 + 底部弹层 ---------- */
	.cc__mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 999;
		background: rgba(17, 27, 33, .45);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.cc__sheet {
		background: #FFFFFF;
		border-radius: 8px 8px 0 0;
		overflow: hidden;
	}

	.cc__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px 12px;
	}

	.cc__title {
		font-size: 16px;
		font-weight: 600;
		color: var(--msm-text);
	}

	.cc__close {
		font-size: 14px;
		color: var(--msm-primary);
		padding: 4px 0 4px 12px;
	}

	/* ---------- 搜索 ---------- */
	.cc__search {
		display: flex;
		align-items: center;
		height: 40px;
		margin: 0 20px 8px;
		padding: 0 12px;
		background: var(--msm-background);
		border-radius: 4px;
	}

	.cc__search-input {
		flex: 1;
		min-width: 0;
		margin-left: 8px;
		font-size: 14px;
		color: var(--msm-text);
		background: transparent;
	}

	.cc__search-ph {
		color: var(--msm-text-muted);
		font-size: 14px;
	}

	/* ---------- 列表 ---------- */
	.cc__list {
		height: 46vh;
	}

	.cc__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 15px 20px;
		border-bottom: 1px solid var(--msm-divider-light);
	}

	.cc__item:active {
		background: var(--msm-background);
	}

	.cc__item-name {
		font-size: 15px;
		color: var(--msm-text);
	}

	.cc__item-code {
		font-size: 14px;
		color: var(--msm-text-muted);
	}

	/* 当前选中项用品牌蓝标示 */
	.cc__item--on .cc__item-name,
	.cc__item--on .cc__item-code {
		color: var(--msm-primary);
	}

	.cc__item--on .cc__item-name {
		font-weight: 600;
	}

	.cc__empty {
		padding: 40px 20px;
		text-align: center;
		font-size: 14px;
		color: var(--msm-text-muted);
	}

	.cc__pad {
		height: 24px;
	}
</style>
