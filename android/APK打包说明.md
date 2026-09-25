# APK 打包说明（两个版本）

> 打包时间：2026-09-25
> 两个 APK 都在 `_deploy\android-webview\` 目录下

---

## 一、选哪个？

| 文件 | 大小 | 本质 | 建议 |
|---|---|---|---|
| **`Msm-原生基座版-98MB.apk`** | 98.3 MB | **真正的 uni-app 原生 App** | ✅ **用这个** |
| `Msm-WebView壳-40KB.apk` | 41 KB | 内置浏览器打开网站 | 备选，体积小但功能受限 |

---

## 二、原生基座版（推荐）

### 它是什么

把 HBuilderX 自带的 **uni-app 安卓标准基座**（`android_base.apk`，DCloud 官方运行时）
和我们构建的项目产物**封装**在一起，得到一个独立的原生 App。

运行时是 **DCloud Android SDK 15.26**，和云打包出来的 App 是同一套运行时。

### 制作原理

基座从 `assets/apps/<appid>/www/` 加载项目，`assets/data/dcloud_control.xml` 是应用清单：

```xml
<!-- 改之前 -->
<apps><app appid="HBuilder" appver="15.26"/></apps>

<!-- 改之后 -->
<apps><app appid="__UNI__CA19A2D" appver="1.2.0"/></apps>
```

我们构建的 `dist\build\app` 目录（171 个文件）正好就是那个 `www` 的内容，
整个塞进 `assets/apps/__UNI__CA19A2D/www/` 即可。

**关键点**：基座里的 `resources.arsc` 是 **STORED（未压缩）**，
重新打包后必须保持未压缩，否则 Android 拒绝安装。脚本里有校验。

### 重新打包

```powershell
powershell -ExecutionPolicy Bypass -File _deploy\android-webview\build-base-apk.ps1
```

产物：`C:\im-local\msm-base-apk\Msm-base.apk`

> 改了前端代码后，先 `cd _deploy\frontend && npm run build:app` 重新生成产物，再跑上面这条。

### 模拟器实测结果（Android 12）

| 验证项 | 结果 |
|---|---|
| 安装 | ✅ `adb install` 成功 |
| 启动 | ✅ 无崩溃，进程正常 |
| 加载我们的项目 | ✅ 注册页、登录页原生渲染 |
| **登录** | ✅ 用 `13900000001 / abc12345` 登录成功 |
| **网络（HTTPS）** | ✅ 从 `https://imessage.uno/api` 取到用户数据 |
| **头像加载** | ✅ HTTPS 图片正常显示 |
| 界面完整性 | ✅ tabbar（消息/通讯录/发现/我）、图标、列表全部正常 |
| 协议勾选框 | ✅ 正常勾选（之前修的 bug 在原生端也是好的） |

### 已知不足

| 问题 | 说明 |
|---|---|
| **应用名还是「HBuilder」** | 名字和图标在 `resources.arsc` 里，改它需要 apktool 反编译重编。功能不受影响，只是桌面图标名字不对 |
| **包名是 `io.dcloud.HBuilder`** | 同上。装过官方基座的设备会覆盖/共用数据 |
| **nativePlugins 不生效** | `manifest.json` 里的腾讯 TRTC 音视频插件（`TUICallingUniPlugin`）**没有**打进基座，所以实时音视频通话用不了 |
| **不能上架应用市场** | 这是 DCloud 的调试基座，正式上架要走云打包 |
| **DCloud 官方运行时的合规性** | 基座是 DCloud 的调试运行时，封装成独立 App 属于灰色地带。商业使用建议走官方云打包 |

### 想要正式版怎么办

走 DCloud 云打包（约 5 分钟）：

```
1. 注册 https://dev.dcloud.net.cn/
2. HBuilderX 登录 → 打开 _deploy\frontend
3. src\manifest.json → 基础配置 → 重新获取 appid（现在还是作者的 __UNI__CA19A2D）
4. 发行 → 原生App-云打包 → Android 用 DCloud 公用测试证书 → 打包
```

云打包出来的会有正确的应用名、图标，能上架，nativePlugins 也会生效。

---

## 三、WebView 壳版本（备选）

### 它是什么

一个极简的 Android 项目（`MainActivity.java` 约 200 行），用 WebView 打开
`https://imessage.uno/`。因为网站本身在 HTTPS 下功能完整，所以体验和网页版一致。

### 特点

| | |
|---|---|
| 优点 | 体积小（41 KB）、不依赖 DCloud、自己完全可控 |
| 缺点 | 不是原生 App，无推送，WebView 性能和原生有差距 |
| 定位 | ✅ 已接入定位权限 + 放行网页定位请求 |
| 文件选择 | ✅ 已接入（发图片/语音要用） |
| 返回键 | ✅ 网页内后退，到头才退出 |

### 重新打包

```powershell
powershell -ExecutionPolicy Bypass -File _deploy\android-webview\build-apk.ps1
```

产物：`C:\im-local\msm-android\build\Msm.apk`

---

## 四、两个 APK 的安装

两个包名不同（`io.dcloud.HBuilder` vs `uno.imessage.app`），**可以同时安装**。

```powershell
# 用电脑装（需要 adb 和数据线/模拟器）
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "路径\xxx.apk"
```

手机安装：把 apk 传到手机（微信/QQ 会拦，建议数据线或网盘），点开允许「未知来源」。

---

## 五、测试账号

| 手机号 | 密码 | 昵称 |
|---|---|---|
| 13900000001 | abc12345 | 服务器测试 |
| 13900000011 | abc12345 | 临沧老王 |
| 13900000012 | abc12345 | 南伞阿强 |
| 13900000013 | abc12345 | 孟定小玉 |
| 13900000014 | abc12345 | 清水河老李 |
| 13900000015 | abc12345 | 老街阿珍 |

> 「附近的人」会先弹隐私确认框，**必须点「确定」**才会取定位。
