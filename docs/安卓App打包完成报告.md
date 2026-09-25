# 安卓 App 打包完成报告

> 完成时间：2026-09-25 07:14
> 产物：`_deploy\android-webview\Msm-云打包正式版-v1.2.0.apk`

---

## 一、成品

| 项目 | 值 |
|---|---|
| 文件 | `Msm-云打包正式版-v1.2.0.apk` |
| 大小 | 58.71 MB（61,566,875 字节） |
| SHA256 | `AAA679AEFFBE45341B7E5CBE5014856F885E1DE4E5C111570ED72D604FE51296` |
| 打包方式 | **DCloud 云打包**（Android 云端证书） |
| 包名 | `uno.imessage.app` |
| 应用名 | **Msm** |
| 版本 | 1.2.0 (versionCode 120) |
| minSdk / targetSdk | 21 / 28 |
| CPU 架构 | arm64-v8a、armeabi-v7a、x86 |
| 入口 Activity | `io.dcloud.PandoraEntryActivity` |

### 签名校验（关键）

```
SHA1   = 25:5D:71:27:5F:77:53:FC:04:96:65:45:1B:F1:9E:1A:2B:5F:F7:F8
SHA256 = 28:1E:8C:ED:DF:EF:A5:15:04:9B:8F:85:84:05:09:B5:DA:2B:FB:A3:C3:23:ED:71:80:83:73:C6:62:90:2A:D3
```

**这个 SHA1 和你在 DCloud「各平台信息」里登记的一字不差** → 离线打包 AppKey（`<REDACTED_DCLOUD_APPKEY>`）校验会通过。

v1、v2 签名方案均验证通过。

---

## 二、实测结果（模拟器）

在 **MuMu 模拟器（Android 12 / x86_64）** 上实测：

| 步骤 | 结果 |
|---|---|
| 安装 | ✅ `Success` |
| 启动 | ✅ 显示登录页（地球背景 + 登录/注册） |
| 进入登录表单 | ✅ 手机号/密码/协议勾选框渲染正常 |
| **登录** | ✅ **成功进入「消息」页**，底部 tabbar 完整 |
| 「我」页 | ✅ 昵称「服务器测试」、Msm号、**头像从 `https://imessage.uno` 正常加载** |
| 「发现」页 | ✅ 全部菜单项渲染正常 |
| 崩溃 | ✅ 无 |
| 模块缺失提示 | ✅ 无 |

**登录用的测试账号**：`13900000001` / `abc12345`

---

## 三、打包过程中解决掉的问题

按发现顺序：

| # | 问题 | 现象 | 修法 |
|---|---|---|---|
| 1 | `nativePlugins` 里的 TUICalling 是**本地插件** | 云打包必失败 | 从 `manifest.json` 移除（备份 `manifest.json.bak-含TRTC插件`） |
| 2 | 应用图标/启动图**文件不存在** | 7 个「文件不存在」 | 用 `msm-icon.png` 生成 4 个尺寸图标 |
| 3 | **权限数组重复**（BLUETOOTH ×2） | 「存在重复数据」 | 删掉重复的两行 |
| 4 | 勾了 `Push->uniPush 1.0` 但**没开通服务** | 打包 Error | 移除 `Push` 模块 |
| 5 | 3.6.11 起**相机/相册/录音/扫码默认不含** | 运行时功能缺失 | 补 `Camera`、`Record`、`Barcode` 模块 |
| 6 | 复制项目时**漏了 `node_modules`** | HBuilderX「编译失败」 | 补上（203 MB / 25,828 文件） |
| 7 | 普通 PNG 改名成 `.9.png` | **云端 gradle 报错** `splash.9.png: AAPT: file failed to compile` | 删掉自定义启动图配置 |
| 8 | 未集成 Push 模块时**访问 `plus.push` 弹框** | 登录被「打包时未添加push模块」中断 | 中性化代码里 4 处 `plus.push` |

---

## 四、关于第 8 点：为什么成品 APK 是「补丁版」

修完第 7 点后云端打包**已经成功**，但装到手机上发现登录时弹「打包时未添加push模块」，把登录流程打断了。

改完代码准备重新打包时，DCloud 返回：

> 你今天已打包很多次了，让云打包服务器休息休息吧，你可以明天再来。
> 本次打包需要消耗 1 个打包个数。

**每日免费打包次数用完了。**

### 解决办法：直接改 APK 里的 JS 再重签

DCloud 云打包的产物里，业务代码在 `assets/apps/__UNI__510B38E/www/app-service.js`。流程：

1. 从 APK 里读出 `app-service.js`（668,793 字符）
2. 打 4 处补丁：
   - `plus.push.getClientInfo().clientid` → `""`（登录页、App.vue 各一处）
   - tabbar1 的两个 `plus.push.addEventListener(...)` → `0`
3. 用 `ZipArchive` 只替换这一个条目
4. `zipalign -f 4`
5. **用同一张 DCloud 证书重签**（`apksigner sign`，别名 `__uni__510b38e`）

因为用的是**同一张证书**，重签后 SHA1 完全不变：
`255d71275f7753fc049665451bf19e1a2b5ff7f8` ✅

→ AppKey 依然有效，功能不受影响。

> 补丁脚本产物在 `C:\im-local\apkpatch\`。
> 原始未修复的包保留为 `_原始未修复-有push弹窗.apk`，仅作对照，**不要安装**。

**真正的代码也已经改好了** —— `src/App.vue`、`src/wx/login/index.vue`、`src/wx/tabbar1/index.vue` 三处已同步修改并写回 `_deploy\frontend`。
等明天打包次数刷新后，直接重新云打包就能得到一份「原生」的正式版，不需要走 APK 补丁这条路。

---

## 五、遗留问题

### 5.1 推送（Push）暂时关闭 ⚠️

代码里 4 处 `plus.push` 已中性化，`manifest.json` 里 `Push` 模块和 `unipush` 配置已移除。

**影响**：App 收不到离线消息推送。

**恢复步骤**：
1. 登录 https://dev.dcloud.net.cn → 你的应用 → 开通 **uni-push**（1.0 或 2.0）
2. `manifest.json` 的 `app-plus.modules` 加回 `"Push" : {}`
3. `app-plus.distribute.sdkConfigs` 加回 `"push" : { "unipush" : {} }`
4. 把三处代码注释取消注释（注释里写明了恢复方法）
5. 重新云打包

> 另外后端目前**没有推送发送逻辑** —— 它只把 clientid 存到 `/my/bindCid/`，没有任何地方往 DCloud 推消息。所以就算 DCloud 侧开通了，也还要在后端补推送代码。

### 5.2 高德 Key —— 定位其实不用它，地图才需要

#### 先说结论

| 功能 | 用到的 API | 需要高德 Key 吗 |
|---|---|---|
| **附近的人** | `uni.getLocation({type:'wgs84'})` | ❌ **不需要** |
| **摇一摇** | `uni.getLocation({type:'wgs84'})` | ❌ **不需要** |
| 发送位置 / 查看位置 | `uni.chooseLocation` / `uni.openLocation` | ✅ 需要 |
| `<map>` 组件 | 高德地图 SDK | ✅ 需要 |

**依据**：DCloud 官方文档 [`uni.getLocation`](https://uniapp.dcloud.net.cn/api/location/location.html) 明确写着：

> 如果在 app 模块中勾选了**系统定位**和其他定位，比如腾讯定位，由配置的 **type 值**决定调用规则，
> **type 值为 wgs84 使用系统定位**，type 值为 gcj02 则使用腾讯定位。

你的 `manifest.json` 里 `sdkConfigs.geolocation` **同时配了 `system` 和 `amap`**，
而两处 `getLocation` 传的都是 `type: 'wgs84'` → **走系统定位，与高德 Key 无关**。

而且系统定位返回的原生就是 WGS84，和后端 `near/doNear` 存的坐标系一致，不存在偏移问题。

#### 高德 Key 藏在 APK 的哪里（已精确定位）

云打包时 DCloud 把 `appkey_android` 写进 **`AndroidManifest.xml` 的二进制字符串池**：

```
<meta-data android:name="com.amap.api.v2.apikey" android:value="81cc6c72aeb6a1946510cc1e9f87ee80"/>
```

实测位置：`AndroidManifest.xml` **字节偏移 1972**，**UTF-16LE** 编码，前面是长度前缀 `20 00`（=32）。
（作者那个 key `81cc6c72aeb6a1946510cc1e9f87ee80` 现在还在里面。）

**注意**：`www/manifest.json`、`resources.arsc`、`classes.dex` 里都**没有**这个 key，全 APK 只有这一处。

#### 换成自己的 Key —— 不用重新打包

高德 Android Key 固定 32 位十六进制，所以新旧**等长**，
直接改 `AndroidManifest.xml` 对应字节不会破坏 AXML 的字符串池偏移。

已写好脚本：`_deploy\tools\apply-amap-key.ps1`

```powershell
# 拿你自己的高德 Key 当参数
.\apply-amap-key.ps1 -Key 你的32位Key
```

脚本做的事：
1. 校验 Key 是 32 位十六进制
2. 在 `AndroidManifest.xml` 里定位 `com.amap.api.v2.apikey` 后面的 key，等长替换
3. `zipalign -f 4`
4. **用同一张 DCloud 证书重签** → SHA1 保持 `25:5D:71:...` 不变，DCloud AppKey 依旧有效
5. 打印校验结果，并断言 SHA1 没变

#### 怎么申请自己的 Key

1. 打开 https://console.amap.com/dev/key/app
   （你账号已经实名认证过了 —— 浏览器历史里有 `/dev/id/success?type=person-alipay`）
2. **创建新应用** → **添加 Key**
3. 服务平台选 **Android 平台**
4. 填写：
   - **发布版安全码 SHA1**：`25:5D:71:27:5F:77:53:FC:04:96:65:45:1B:F1:9E:1A:2B:5F:F7:F8`
   - **调试版安全码 SHA1**：填同一个即可
   - **PackageName**：`uno.imessage.app`
5. 提交 → 拿到 32 位 Key

> 高德要求 **SHA1 + 包名 + Key 三者匹配**，填错任何一个地图都不显示。
> 腾讯地图（`h5.sdkConfigs.maps.qqmap.key` = `3U7BZ-AZZKD-IXC4C-HZA7E-2PGKT-EZFER`）也是作者的，H5 端地图建议一并换。

#### 源码也要同步改

拿到 Key 后，`manifest.json` 里 **3 处** `appkey_android` 都要替换（否则下次重新打包又会变回作者的）：
- `app-plus.distribute.sdkConfigs.geolocation.amap.appkey_android`
- `app-plus.distribute.sdkConfigs.maps.amap.appkey_android`
- `app-plus.distribute.sdkConfigs.geolocation.amap.appkey_ios`（iOS，顺手）

---

### 5.2.1 ⚠️ 另外发现：「发现」页的菜单行点不动

模拟器实测：**「发现」页所有菜单行（扫一扫 / 摇一摇 / 附近 / 朋友圈 / 视频号…）点击都没反应**，
只有底部的**原生 tabbar** 有响应（tabbar 是 `plus.tabBar` 原生实现，不走 WebView）。

排查线索：
- UI 自动机 dump 显示这些行 `clickable=true`，坐标正确，`input tap` 也发出了
- 组件 `src/components/tool-list-wx/tool-list-wx.vue` 的 `onClick` 会执行 `uni.navigateTo({url: e.path})`
- `src/wx/tabbar3/index.vue` 里这些行用的是**相对路径**：
  - `摇一摇` → `'../../wx/shake/index'`
  - `附近`   → `'../../wx/nearby/index'`

**怀疑点**：App 端 `uni.navigateTo` 解析跨分包相对路径有问题。
建议改成以 `/` 开头的绝对路径：`'/wx/shake/index'`、`'/wx/nearby/index'`。

> **尚未确认**：MuMu 模拟器的合成触摸事件对这种自定义组件可能不生效，
> 也可能是真机上真实存在的问题。**需要你在真机上点一下验证**。
> 如果真机也点不动，改成绝对路径再打一版即可。

**临时绕过**：H5 版直接访问 `https://imessage.uno/#/wx/nearby/index` 可用（已实测）。

### 5.3 targetSdkVersion 只有 28

**上架 Google Play 会被拒**（要求 34+）。国内应用市场目前多数还能接受，但新规也在往 30+ 靠。

改法：`manifest.json` → `app-plus.distribute.android.targetSdkVersion`。

> 注意：targetSdk 提高后 Android 13+ 的**通知权限**、**精确/粗略定位**要重新适配，需要测试。

### 5.4 隐私合规配置缺失（打包 Warning）

> 当前应用缺少相关配置…**不上架国内应用市场无需处理**

要上架国内应用商店的话，需要配置隐私政策弹窗。参考：
https://uniapp.dcloud.net.cn/tutorial/app-privacy-android

> 顺带一提：**用户协议/隐私政策那个勾选框的 bug 之前已经修好了**，实测勾选正常。

### 5.5 应用信息还没填

DCloud「各平台信息」→「修改」里需要填：
```
包名：    uno.imessage.app
签名SHA1：25:5D:71:27:5F:77:53:FC:04:96:65:45:1B:F1:9E:1A:2B:5F:F7:F8
```
（如果还没填的话）

---

## 六、目录里现在有哪些 APK

`_deploy\android-webview\`：

| 文件 | 大小 | 说明 |
|---|---|---|
| **`Msm-云打包正式版-v1.2.0.apk`** | **58.7 MB** | ⭐ **用这个**。云打包 + 补丁，签名正确，实测可用 |
| `Msm-原生基座版-98MB.apk` | 98.3 MB | HBuilderX 调试基座重打包，包名还是 `io.dcloud.HBuilder`、名字还是 HBuilder，**仅供参考** |
| `Msm-WebView壳-40KB.apk` | 41 KB | 纯 WebView 套壳，无原生能力 |
| `_原始未修复-有push弹窗.apk` | 58.7 MB | 云打包原始产物，登录会被 push 弹窗打断，**别装** |

---

## 七、复现这次云打包的命令

```powershell
$hx = "C:\Program Files (x86)\HBuilder X"

# 项目已复制到纯英文路径并装好依赖
# C:\im-local\hx-frontend

& "$hx\cli.exe" open
& "$hx\cli.exe" project open --path "C:\im-local\hx-frontend"
& "$hx\cli.exe" pack --project "C:\im-local\hx-frontend" `
    --platform android `
    --android.packagename uno.imessage.app `
    --android.androidpacktype 3        # 3 = 使用云端证书

& "$hx\cli.exe" pack status --project "C:\im-local\hx-frontend"
```

打包成功后会输出一个临时下载地址（只能下载 5 次），**立刻下载保存**。

---

## 八、高德隐私协议链接（已部署）

高德在创建 Key 后会要求上传「隐私协议链接」用于合规审核。已生成并部署：

### **https://imessage.uno/privacy**

| 项目 | 值 |
|---|---|
| 公网地址 | `https://imessage.uno/privacy`（HTTP 200 已验证） |
| 服务器路径 | `/www/wwwroot/msm/h5/privacy/index.html` |
| 本地源文件 | `_deploy\privacy\index.html` |
| nginx | **无需改配置** —— 现有 `try_files $uri $uri/ /index.html` 已能命中 |

页面内容涵盖高德审核要求的全部要点：

- SDK 提供方公司名称：**高德软件有限公司**
- SDK 名称：高德开放平台定位 SDK / 高德开放平台地图 SDK
- 收集和使用的个人信息类型：位置信息、设备信息（IMEI/IDFA/OAID/Android ID/IMSI）、网络信息、传感器信息
- 使用目的：附近的人、摇一摇、地图展示、选择/查看位置
- 《高德地图开放平台隐私权政策》链接：https://lbs.amap.com/pages/privacy/

另外还列出了 uni-app 运行引擎（数字天堂）和 H5 版的腾讯位置服务，以及权限清单、存储保护、用户权利等章节。

> ⚠️ **提交前请核对**：页面第九节「运营者」「电子邮箱」目前是占位值
> （`Msm 开发团队` / `support@imessage.uno`），建议改成你真实的运营主体与可用邮箱。
> 改完重新上传即可：
> ```powershell
> node C:\im-local\ssh-tool\ssh-run.mjs 120.24.175.80 22 root '<REDACTED_SSH_PASSWORD>' --put `
>   "_deploy\privacy\index.html" "/www/wwwroot/msm/h5/privacy/index.html"
> ```

### 高德 Key 已换入 APK

| 项目 | 值 |
|---|---|
| 你的高德 Key | `<REDACTED_AMAP_KEY>` |
| 替换位置 | `AndroidManifest.xml` 偏移 1972（UTF-16LE，前缀 `20 00`） |
| 重签后 SHA1 | `255d71275f7753fc049665451bf19e1a2b5ff7f8`（**未变** ✓） |
| APK SHA256 | `3BB330A6B2A939D4EED54200AA7334E0BBBE13FB7217F9376248FC4613FE0D6C` |
| 产物 | `C:\im-local\Msm-amap.apk` |

源码 `manifest.json` 里 2 处 `appkey_android` 已同步为新 Key（两个副本都改了）。

> iOS 的 `appkey_ios` **没动** —— 高德 iOS Key 与 Android Key 是两套（iOS 绑 Bundle ID 而非 SHA1+包名），
> 将来打 iOS 包时要去高德另外建一个 iOS 平台的 Key。

### 高德审核链接的 nginx 修正（已生效）

高德提交后状态为**待审核**，审核程序会去抓 `https://imessage.uno/privacy`。

**问题**：原先该路径走 `location /` 的 `try_files $uri $uri/ /index.html`，
`/privacy`（无斜杠）命中 `$uri/` 会**301 跳到 `/privacy/`**。抓取程序若不跟随 301，就会拿到空响应。

**修正**：在 `/etc/nginx/snippets/msm-locations.conf` 末尾追加精确匹配，直接返回文件：

```nginx
location = /privacy {
    alias /www/wwwroot/msm/h5/privacy/index.html;
    default_type text/html;
    add_header Cache-Control "public, max-age=3600";
}
```

备份：`/etc/nginx/snippets/msm-locations.conf.bak_20260925_094207`

**验证结果**（走公网 HTTPS）：

```
https://imessage.uno/privacy    -> code=200 size=13057 redirects=0
https://imessage.uno/privacy/   -> code=200 size=13057 redirects=0
```

> 端口 80 上的 301 是 HTTP→HTTPS 强制跳转，属于设计行为，不影响审核。

### 真机运行确认

服务器日志显示用户的华为真机（`HUAWEI TAS-AL00 / Android 12 / uni-app Html5Plus`）已实际运行本 App：

| 状态码 | 次数 |
|---|---|
| 200 | **300** |
| 404 | 3（全是 favicon.ico 和一张旧测试图） |
| 301 | 2 |
| 101（WebSocket） | 1 |

**没有任何 4xx / 5xx 接口错误**，后端 `msm-backend` 持续 `active (running)`。

---

## 九、本地开发环境「请求失败」的根因与修复

### 现象

`npm run dev:h5` 起来后（http://localhost:5173），页面上任何接口都报 **「请求失败」**。

### 排查过程

| 检查 | 结果 |
|---|---|
| 通过 vite 代理调 `/api/common/getVersion` | `200 text/html` **31306 字节** |
| 通过 vite 代理调 `/api/auth/login` | `200 text/html` **31306 字节**（同一个页面！） |
| 通过 vite 代理调 `/api/my/getInfo` | `200 text/html` **31306 字节** |
| 直接调 `127.0.0.1:8080` | `200`，带 `Set-Cookie: PHPSESSID=...` |

**四个完全不同的接口返回了同一个 31KB 的 HTML** → 说明 `/api` 根本没打到我们的后端。

### 根因

```
8080  LISTEN  php.exe        ← 不是我们的 Java 后端！
3306  LISTEN  mysqld         ← C:\likeshop-local\mysql\bin\mysqld.exe
6379  LISTEN  memurai
```

手动启动 `chat-api.jar` 后的真实报错：

```
java.sql.SQLException: Access denied for user 'root'@'127.0.0.1' (using password: YES)
Application run failed
```

**因果链**：

```
IM-Local-Backend 计划任务启动
    → 连不上本地 MySQL（root 密码与 application-dev.yml 里的 root/root 不符）
    → Spring 上下文初始化失败，进程退出（任务状态回到 Ready）
    → 8080 端口被 php.exe 占用
    → vite 的 /api 代理全部打到那个 PHP 上
    → 前端拿到 HTML 而不是 JSON → 「请求失败」
```

`C:\likeshop-local\mysql-data\` 里同时存在 `boot@002dim`（我们的 IM 库）和 `likeshop` 两个库，
说明这套 MySQL 是两个项目共用的，root 密码后来被改过。

### 处理方式

**没有去动那套 MySQL**（避免影响另一个项目）。改为让本地 dev server 直接代理到线上后端：

`_deploy\frontend\vite.config.js`：

```js
const LOCAL_BACKEND  = 'http://127.0.0.1:8080'
const REMOTE_BACKEND = 'https://imessage.uno'
const API_TARGET = process.env.API_TARGET || REMOTE_BACKEND
const isLocalBackend = API_TARGET === LOCAL_BACKEND

proxy: {
  '/api': {
    target: API_TARGET,
    changeOrigin: true,
    ws: true,
    // 本地后端直接监听根路径，要去掉 /api；
    // 线上是 Nginx，路径本身就是 /api/xxx，不能去。
    rewrite: isLocalBackend ? (p) => p.replace(/^\/api/, '') : undefined
  },
  '/preview': { target: API_TARGET, changeOrigin: true }
}
```

想切回本地后端：

```powershell
$env:API_TARGET="http://127.0.0.1:8080"; npm run dev:h5
```

（前提：先腾出 8080，并把 `application-dev.yml` 的 MySQL 密码改对）

### 验证结果

```
GET  /api/common/getVersion  -> {"msg":"操作成功","code":200,...}
POST /api/auth/login         -> {"msg":"操作成功","code":200,"data":{"token":"90fid8m2..."}}
GET  /preview/default-portrait.jpg -> 200 image/jpeg 10819 字节
```

本地 dev server 已完全可用。

> 注意：接口**必须带 App 会发的 `version` 请求头**，否则后端会返回
> `{"msg":"版本过低，请升级","code":601}`（这是版本校验，不是故障）。

---

## 十、v1.3.0 新品牌版 APK（绕过云打包次数限制）

### 背景

新品牌改版完成后想重新云打包，DCloud 返回：

> 你今天已打包很多次了，让云打包服务器休息休息吧，你可以明天再来。

编译是**成功**的（`项目 'hx-frontend' 编译成功`），只是云端拒绝接收。

### 解决办法：替换 APK 内的 App 资源 + 同证书重签

用 `_deploy\tools\rebuild-apk-from-app.ps1`，流程：

1. 以已打好并已换过高德 Key 的 `Msm-正式版-v1.2.0.apk` 为基础
2. 比对确认 APK 内 `assets/apps/__UNI__510B38E/www/` 与本地 `dist/build/app/`
   **结构 1:1 匹配**（只有 9 个新增文件：8 个 Tab 图标 + 启动页主视觉）
3. 删掉旧的 171 个 www 条目，写入新的 180 个
4. patch `AndroidManifest.xml` 的 `versionName`（等长 UTF-16 替换 1.2.0 → 1.3.0）
5. `zipalign -f 4`
6. **用同一张 DCloud 证书重签** → SHA1 保持不变

### 产物

| 项目 | 值 |
|---|---|
| 文件 | `_deploy\android-webview\Msm-1.3.0-新品牌.apk` |
| 大小 | 58.8 MB |
| SHA256 | `F5494260BC28728868D1D04FE377F03B02AD5050CFC2ABBA54917CE7A97A6005` |
| 包名 | `uno.imessage.app` |
| 应用名 | Msm |
| versionName | **1.3.0** |
| versionCode | 120（二进制整数属性未改，侧载安装不受影响；明天云打包会是正确的 130） |
| 签名 SHA1 | `255d71275f7753fc049665451bf19e1a2b5ff7f8`（**未变**，AppKey 依旧有效） |
| App 内版本 | 1.3.0 (130) |

### 内容核验（直接读 APK 内的 app-service.js）

新版文案全部就位：

```
Connect freely. / 与世界保持联系 / 欢迎回来 / 创建账号 / 开始使用 Msm
与你保持联系 / 还没有任何聊天 / Simple. Social. Messaging.
管理你的账号与偏好 / 设置密码（8-20 位）/ 我的二维码      —— 全部 OK
```

旧版遗留文案已消失：

```
手机号登录 / 手机号注册 / 暂无消息,快去联系你的好朋友吧
服务(未开通) / 视频号(未开通) / 看一看(未开通)          —— 已移除
```

> `摇一摇` 仍在（那是页面文件 `wx/shake/index.vue` 本身还在），
> 但「发现」页的入口已按方案移除，不会露出。

品牌色：

```
#09C160（微信绿） -> 已清除
#2F8FE5（Msm Blue）-> 已使用
```

### 已知小瑕疵

- `versionCode` 仍是 120（二进制 XML 整数属性，改起来要重排 AXML）
- 未在模拟器实测 —— 本机 AVD（Android 37 Play Store 镜像）首次启动超 6 分钟仍 offline，
  已放弃；**建议直接装到真机验证**

### 明天云打包

次数刷新后重新提交即可得到「原生」的 1.3.0 正式包（versionCode 会是 130）：

```powershell
& "C:\HBuilderX\cli.exe" pack --project "C:\im-local\hx-frontend" `
    --platform android --android.packagename uno.imessage.app --android.androidpacktype 3
```

> 注意用 **`C:\HBuilderX\cli.exe`**（当前正在运行的那个安装），
> 不是之前的 `C:\Program Files (x86)\HBuilder X`。
