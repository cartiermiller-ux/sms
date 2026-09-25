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
			<view class="auth__title">创建账号</view>
			<view class="auth__sub">开始使用 Msm</view>
		</view>

		<form class="auth__form" @submit="sublogin">
			<!-- 手机号码 -->
			<view class="field">
				<view class="field__label">手机号码</view>
				<view class="field__box">
					<view class="field__cc">+{{ countryCode }}</view>
					<view class="field__sep"></view>
					<input class="field__input" maxlength="11" type="text" placeholder="请输入手机号码" placeholder-class="field__ph" name="phone" v-model="phone" />
					<view class="field__suffix" v-if="phone.length > 0" @click="phone = ''">
						<uni-icons type="clear" size="18" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 验证码 -->
			<view class="field">
				<view class="field__label">验证码</view>
				<view class="field__box">
					<input class="field__input" type="text" placeholder="请输入验证码" placeholder-class="field__ph" name="code" v-model="code" />
					<view class="field__code" :class="{ 'field__code--dim': loading }" @click="loading ? null : getMsgCode()">
						{{ loading ? time + 's 后重发' : '获取验证码' }}
					</view>
				</view>
			</view>

			<!-- 昵称（已按 手机号 → 验证码 → 昵称 → 密码 的顺序调整） -->
			<view class="field">
				<view class="field__label">昵称</view>
				<view class="field__box">
					<input class="field__input" type="text" placeholder="你的昵称" placeholder-class="field__ph" name="nickName" />
				</view>
			</view>

			<!-- 密码 -->
			<view class="field">
				<view class="field__label">密码</view>
				<view class="field__box">
					<input class="field__input" type="text" placeholder="设置密码（8-20 位）" placeholder-class="field__ph" name="password" :password="showPassword" />
					<view class="field__suffix" @click="changePassword">
						<uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="19" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 协议 -->
			<view class="auth__agree">
				<view class="auth__agree-tap" @click="agree = !agree">
					<checkbox style="transform:scale(0.6);pointer-events:none" :checked="agree" color="#2F8FE5" />
					<text class="auth__agree-text">我已阅读并同意</text>
				</view>
				<text class="auth__agree-link" @click="goTerms">《服务条款》</text>
				<text class="auth__agree-text">和</text>
				<text class="auth__agree-link" @click="goPrivacy">《隐私政策》</text>
			</view>

			<!-- 创建账号 -->
			<button class="auth__submit" form-type="submit">创建账号</button>
		</form>

		<!-- 底部 -->
		<view class="auth__foot">
			<text class="auth__foot-dim">已有账号？</text>
			<text class="auth__foot-strong" @click="goLogin">登录</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				code:'',
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
		onLoad() {
		},
		methods: {
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
			goLogin(){
				uni.redirectTo({
					url: '../login/index'
				})
			},
			/** 服务条款 —— 走后端配置的协议地址 */
			goTerms() {
				this.goagreement();
			},
			/** 隐私政策 —— 走线上隐私政策页 */
			goPrivacy() {
				this.openUrl('https://imessage.uno/privacy');
			},
			openUrl(url) {
				if (!url) return;
				// #ifdef H5
				window.open(url);
				// #endif
				// #ifdef APP-PLUS
				this.$fc.openWebView(url);
				// #endif
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
				var reg = /^1[0-9]{10,10}$/;
				if(!this.phone||!reg.test(this.phone)){
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
					type:'1'//注册
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
				var rules = {
					phone: {
						rules: [{
							checkType: "required",
							errorMsg: "请填写手机号码"
						}, {
							checkType: "phone",
							errorMsg: "请填写正确的手机号码"
						}]
					},
					password: {
						rules: [{
							checkType: "required",
							errorMsg: "请输入密码"
						}, {
							checkType: "string",
							checkRule: "8,20",
							errorMsg: "密码至少输入8-20位"
						}]
					},
					nickName: {
						rules: [{
							checkType: "required",
							errorMsg: "请输入昵称"
						}, {
							checkType: "string",
							checkRule: "1,20",
							errorMsg: "昵称至少输入1-20位"
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
					this.$http.request({
						url: '/auth/register',
						method: 'POST',
						data:JSON.stringify(formData),
						success: (res) => {
							if (res.data.code == 200) {
								uni.showToast({
									title:'注册成功',
									complete() {
										setTimeout(()=>{
											uni.redirectTo({
												url:'/wx/login/index'
											})
										},1500)
									}
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
