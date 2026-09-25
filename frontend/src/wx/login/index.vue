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
			<view class="auth__title">欢迎回来</view>
			<view class="auth__sub">登录继续使用 Msm</view>
		</view>

		<form class="auth__form" @submit="sublogin">
			<!-- 手机号码（左侧固定宽标签 + 右侧输入，只保留下划线） -->
			<view class="form-item">
				<view class="form-item__label">手机号码</view>
				<view class="form-item__field">
					<text class="form-item__cc">+{{ countryCode }}</text>
					<view class="form-item__sep"></view>
					<input class="form-item__input" maxlength="11" type="text" placeholder="请输入手机号码" placeholder-class="form-item__ph" name="phone" v-model="form.phone" />
					<view class="form-item__suffix" v-if="form.phone" @click="form.phone = ''">
						<uni-icons type="clear" size="18" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 密码 -->
			<view class="form-item" v-if="!logintype">
				<view class="form-item__label">密码</view>
				<view class="form-item__field">
					<input class="form-item__input" type="text" placeholder="请输入密码" placeholder-class="form-item__ph" name="password" v-model="form.password" :password="showPassword" />
					<view class="form-item__suffix" @click="changePassword">
						<uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="19" color="#8696A0"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 验证码 -->
			<view class="form-item" v-if="logintype">
				<view class="form-item__label">验证码</view>
				<view class="form-item__field">
					<input class="form-item__input" type="text" placeholder="请输入验证码" placeholder-class="form-item__ph" name="code" v-model="form.code" />
					<view class="form-item__code" :class="{ 'form-item__code--dim': loading }" @click="loading ? null : getMsgCode()">
						{{ loading ? time + 's 后重发' : '获取验证码' }}
					</view>
				</view>
			</view>

			<!-- 忘记密码 / 使用验证码登录：并排放在输入框下方，省掉原来的「或」分割线 -->
			<view class="auth__links">
				<text v-if="!logintype" class="auth__link" @click="goForgetPass">忘记密码？</text>
				<view v-else></view>
				<text class="auth__link" @click="changeLogintype">
					{{ logintype ? '使用密码登录' : '使用验证码登录' }}
				</text>
			</view>

			<!-- 协议（弱化：12px 浅灰） -->
			<view class="auth__agree">
				<view class="auth__agree-tap" @click="agree = !agree">
					<checkbox style="transform:scale(0.6);pointer-events:none" :checked="agree" color="#2F8FE5" />
					<text class="auth__agree-text">我已阅读并同意</text>
				</view>
				<text class="auth__agree-link" @click="goagreement()">《隐私及服务协议》</text>
			</view>

			<!-- 登录 -->
			<button class="auth__submit" form-type="submit">登录</button>
		</form>

		<!-- 底部 -->
		<view class="auth__foot">
			<text class="auth__foot-dim">还没有账号？</text>
			<text class="auth__foot-strong" @click="goRegister">注册</text>
		</view>
	</view>
</template>

<script>
	// #ifdef APP-PLUS
	const TUICalling = uni.requireNativePlugin("TUICallingUniPlugin-TUICallingModule");
	// #endif
	export default {
		data() {
			return {
				form: {
					phone: "",
					password: ""
				},
				countryCode: "86",
				loading: false,
				timer: null,
				time: 60,
				logintype: false,
				showPassword: true,
				agree: false,
			}
		},
		onLoad() {},
		methods: {
			goBack() {
				const pages = getCurrentPages();
				if (pages && pages.length > 1) {
					uni.navigateBack();
				} else {
					uni.reLaunch({ url: '/pages/wxindex/index' });
				}
			},
			goRegister() {
				uni.redirectTo({ url: '../register/index' });
			},
			goForgetPass(){
				uni.navigateTo({
					url:'../forgetPass/index'
				})
			},
			changeLogintype() {
				this.logintype=!this.logintype
				if(this.logintype){
					this.form = {
						phone: this.form.phone,
						code: ""
					}
				}
				if(!this.logintype){
					this.form = {
						phone: this.form.phone,
						password: ""
					}
				}
			},
			changePassword() {
				this.showPassword = !this.showPassword;
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
				if(!this.form.phone||!reg.test(this.form.phone)){
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
					phone:this.form.phone,
					type:'2'//登录
				}
				this.$http.request({
					url: '/auth/sendCode',
					method: 'POST',
					data:JSON.stringify(formData),
					success: (res) => {
						if (res.data.code == 200) {
							// todo验证码
							this.form.code=res.data.data.code
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
				// var formData = e.detail.value;
				var formData = JSON.parse(JSON.stringify(this.form));
				var checkRes = this.$zmmFormCheck.check(formData, rules);
				// #ifdef APP-PLUS
				// 未集成 Push 模块时访问 plus.push 会弹出"未添加push模块"提示框并中断登录，
				// 故此处直接置空。日后开通 uni-push 并勾选 Push 模块后，可恢复为
				// var cid = plus.push.getClientInfo().clientid
				var cid = ''
				formData['cid'] = cid
				// #endif
				// #ifdef H5
				// todo
				var cid=''
				formData['cid'] = cid
				// #endif
				uni.setStorageSync('cid', cid);
				console.log(cid)
				if (checkRes) {
					if (!this.agree) {
						uni.showToast({
							title: '请先同意《隐私及服务协议》',
							icon: 'none'
						});
						return;
					}
					uni.showLoading()
					if (!this.logintype) {
						formData.password=this.$md5.hex_md5(formData.password)
						this.$http.request({//手机+密码
							url: '/auth/login',
							method: 'POST',
							data:JSON.stringify(formData),
							success: (res) => {
								if (res.data.code == 200) {
									this.loginDone(res.data.data.token)
								}
							}
						});
					}
					if (this.logintype) {
						this.$http.request({//手机+验证码
							url: '/auth/loginByCode',
							method: 'POST',
							data:JSON.stringify(formData),
							success: (res) => {
								if (res.data.code == 200) {
									this.loginDone(res.data.data.token)
								}
							}
						});
					}
				} else {
					uni.showToast({
						title: this.$zmmFormCheck.error,
						icon: "none",
						position: 'bottom'
					});
				}
			},
			loginDone(token){
				uni.setStorageSync('Authorization', token);
				// #ifdef H5
				this.$socketTask.connectSocket()
				// #endif
				this.$store.dispatch('get_UserInfo').then(res=>{
					// #ifdef APP-PLUS
					var nickName=res.nickName
					var portrait=res.portrait
					this.$http.request({
						url: '/trtc/getSign',
						success: (res) => {
							var sdkAppID=res.data.data.appId
							var userID=res.data.data.userId
							var userSig=res.data.data.sign
							TUICalling.login({//登录音视频
							    sdkAppID: sdkAppID, 
							    userID: userID,
							    userSig: userSig
							},(res) => {
							    console.log('音视频登录成功')
								TUICalling.setUserNickname({
								    nickName: nickName
								})
								TUICalling.setUserAvatar({
								    avatar: portrait
								})
								plus.io.requestFileSystem(plus.io.PRIVATE_WWW, function(fs) {
								    fs.root.getFile('/static/longcall.mp3', {
								        create: false
								    }, function(fileEntry) {
								        fileEntry.file(function(file) {
											TUICalling.setCallingBell({
											    ringtone: file.fullPath
											},(res) => {
												console.log(JSON.stringify(res))
											})
										});
								    });
								});
							})
						}
					});
					// #endif
				})
				uni.reLaunch({
					url: '../tabbar1/index'
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	/* 认证页共用样式：白底 + 中性灰（V2EX 风） */
	@import '@/common/msm-auth.scss';
</style>