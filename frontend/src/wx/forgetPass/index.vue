<template>
	<view class="auth">
		<!-- 返回 -->
		<view class="auth__nav">
			<view class="auth__back" hover-class="auth__back--active" @click="goBack">
				<uni-icons type="left" size="21" color="#111B21"></uni-icons>
			</view>
		</view>

		<!-- 品牌头 -->
		<view class="auth__head">
			<image class="auth__logo" src="../../static/msm/logo.png" mode="aspectFit"></image>
			<view class="auth__title">找回密码</view>
			<view class="auth__sub">验证手机号后设置新密码</view>
		</view>

		<form class="auth__form" @submit="sublogin">
			<!-- 手机号码（左侧固定宽标签 + 右侧输入，只保留下划线） -->
			<view class="form-item">
				<view class="form-item__label">手机号码</view>
				<view class="form-item__field">
					<!-- 国家 / 地区区号：点击可选择，不再写死 -->
					<msm-country :value="countryCode" @change="onCountryChange"></msm-country>
					<view class="form-item__sep"></view>
					<input class="form-item__input" :maxlength="phoneMax" type="text" placeholder="填写手机号码" placeholder-class="form-item__ph" name="phone" v-model="phone" />
					<view class="form-item__suffix" v-if="phone.length > 0" @click="phone = ''">
						<uni-icons type="clear" size="18" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 验证码 -->
			<view class="form-item">
				<view class="form-item__label">验证码</view>
				<view class="form-item__field">
					<input class="form-item__input" type="text" placeholder="请输入验证码" placeholder-class="form-item__ph" name="code" v-model="code" />
					<view class="form-item__code" :class="{ 'form-item__code--dim': loading }" @click="loading ? null : getMsgCode()">
						{{ loading ? time + 's 后重发' : '获取验证码' }}
					</view>
				</view>
			</view>

			<!-- 新密码 -->
			<view class="form-item">
				<view class="form-item__label">新密码</view>
				<view class="form-item__field">
					<input class="form-item__input" type="text" placeholder="设置新密码（8-20 位）" placeholder-class="form-item__ph" name="password" :password="showPassword" />
					<view class="form-item__suffix" @click="changePassword">
						<uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="19" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 协议（弱化：12px 浅灰） -->
			<view class="auth__agree auth__agree--top">
				<view class="auth__agree-tap" @click="agree = !agree">
					<checkbox style="transform:scale(0.6);pointer-events:none" :checked="agree" color="#2F8FE5" />
					<text class="auth__agree-text">我已阅读并同意</text>
				</view>
				<text class="auth__agree-link" @click="goagreement()">《隐私及服务协议》</text>
			</view>

			<!-- 找回密码 -->
			<button class="auth__submit" form-type="submit">找回密码</button>
		</form>

		<!-- 底部 -->
		<view class="auth__foot">
			<text class="auth__foot-dim">已修改？</text>
			<text class="auth__foot-strong" @click="goLogin">去登录</text>
		</view>
	</view>
</template>

<script>
	import { phoneMaxLen, isValidPhone } from '@/common/msm-country.js';
	export default {
		data() {
			return {
				code: '',
				countryCode: '86',
				loading: false,
				timer: null,
				time: 60,
				logintype: 0,
				phone: '',
				cid: '',
				showPassword: true,
				agree: false,
			}
		},
		computed: {
			// 手机号输入框最大长度随所选地区变化（+86 为 11 位）
			phoneMax() {
				return phoneMaxLen(this.countryCode);
			}
		},
		onLoad() {},
		methods: {
			// 选择国家 / 地区后只更新区号；号码由用户重新填写，避免误当成同一号码
			onCountryChange(c) {
				if (!c || c.code === this.countryCode) return;
				this.countryCode = c.code;
				this.phone = '';
			},
			goBack() {
				const pages = getCurrentPages();
				if (pages && pages.length > 1) {
					uni.navigateBack();
				} else {
					uni.reLaunch({ url: '/pages/wxindex/index' });
				}
			},
			changePassword() {
				this.showPassword = !this.showPassword;
			},
			goLogin() {
				uni.navigateTo({
					url: '../login/index'
				})
			},
			goagreement() {
				// uni.navigateTo({//本地协议
				// 	url: '../../pages/agreement/index?name=Msm'
				// })
				this.$http.request({//在线协议
					url: '/common/getAgreement',
					success: (res) => {
						if (res.data.code == 200) {
							// #ifdef H5
							window.open(res.data.data)
							// #endif
							// #ifdef APP-PLUS
							this.$fc.openWebView(res.data.data)
							// #endif
						}
					}
				});
			},
			getMsgCode() {
				// 校验规则随所选国家 / 地区变化（+86 仍是 1 开头的 11 位）
				if(!isValidPhone(this.countryCode, this.phone)){
					uni.showToast({
						title:'请输入正确的手机号',
						icon:'none'
					})
					return
				}
				this.loading = true
				this.timer = setInterval(() => {
					this.time--
					if (this.time <= 0) {
						clearInterval(this.timer)
						this.loading = false
						this.time = 60
					}
				}, 1000)
				var formData={
					phone:this.phone,
					type:'3'//找回密码
				}
				this.$http.request({
					url: '/auth/sendCode',
					method: 'POST',
					data:JSON.stringify(formData),
					success: (res) => {
						if (res.data.code == 200) {
							// todo验证码
							this.code=res.data.data.code
							uni.showToast({
								title:'验证码已发送至你的手机',
								icon:'none'
							})
						}
					}
				});
			},
			rMathfloor(min, max) { //返回包括最大/小值
				return Math.floor(Math.random() * (max - min + 1)) + min
			},
			sublogin(e) {
				// +86 沿用项目自带的 phone 校验规则；
				// 其他地区项目校验器不认，改为「非空 + 下方 isValidPhone 长度校验」
				var phoneRules = [{
					checkType: "required",
					errorMsg: "请填写手机号码"
				}];
				if (this.countryCode === '86') {
					phoneRules.push({
						checkType: "phone",
						errorMsg: "请填写正确的手机号码"
					});
				}
				var rules = {
					phone: {
						rules: phoneRules
					},
					password: {
						rules: [{
							checkType: "required",
							errorMsg: "请输入密码"
						}, {
							checkType: "string",
							checkRule: "8,20",
							errorMsg: "至少输入8-20位"
						}]
					},
					code: {
						rules: [{
							checkType: "required",
							errorMsg: "请输入验证码"
						}]
					}
				};
				var formData = e.detail.value;
				var checkRes = this.$zmmFormCheck.check(formData, rules);
				formData.password=this.$md5.hex_md5(formData.password)
				if (checkRes) {
					if (!this.agree) {
						uni.showToast({
							title: '请先同意《隐私及服务协议》',
							icon: 'none'
						});
						return;
					}
					if (!isValidPhone(this.countryCode, formData.phone)) {
						uni.showToast({
							title: '请输入正确的手机号',
							icon: 'none'
						});
						return;
					}
					this.$http.request({
						url: '/auth/forget',
						method: 'POST',
						data:JSON.stringify(formData),
						success: (res) => {
							if (res.data.code == 200) {
								uni.showToast({
									title:'密码修改成功'
								})
							}
						}
					});
				} else {
					uni.showToast({
						title: this.$zmmFormCheck.error,
						icon: "none",
						position: 'bottom'
					});
				}
			},
		}
	}
</script>

<style lang="scss" scoped>
	/* 认证页共用样式：白底 + Msm Blue */
	@import '@/common/msm-auth.scss';
</style>
