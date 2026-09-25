# Msm 音视频通话接入说明（TRTCCloud）

> 2026-09-26 · 把原来的 `TUICallingUniPlugin` 换成腾讯云官方 **TRTCCloud** 原生插件 + 自写通话页

---

## 一、结论先行：跑通还需要两样东西

代码已经全部接好，但**现在打出来的包仍然打不了电话**，缺两样外部条件：

| # | 缺什么 | 谁来做 | 说明 |
|---|---|---|---|
| **1** | 腾讯云 TRTC 的 **SDKAppID + SDKSecretKey** | 你（腾讯云控制台创建应用） | 后端 `trtc.appId` / `trtc.secret` 目前是占位符 `xxxxxxxxxx`，`/trtc/getSign` 返回的 appId 不是数字，SDK 进不了房 |
| **2** | 一次 **DCloud 云打包** | 我（一条命令，要花当天打包额度） | 原生插件只能靠云打包进 APK；本地把 `www/` 塞进旧基座的做法加不了原生代码 |
| 3 | 一台**真机** | 你 | 腾讯官方明确说 TRTC 不支持模拟器 |

拿到 1 之后，第 2 步一条命令就能出包：

```powershell
cd C:\HBuilderX
.\cli.exe pack --project C:\im-local\hx-frontend --platform android `
    --android.packagename uno.imessage.app --android.androidpacktype 3
```
（`androidpacktype 3` = 用云端证书，也就是之前那把 `__uni__510b38e`，SHA1 不变，老用户可以直接覆盖安装）

---

## 二、为什么不用原来的 TUICalling 插件

原代码 8 个文件在调 `uni.requireNativePlugin("TUICallingUniPlugin-TUICallingModule")`，
但 `nativeplugins/` 里的 TUICalling 从来没进过 APK —— 实测当前 APK 的三个 dex 里
**搜不到任何 `TUICalling` / `TRTCCloud` / `LiteAVSDK` 字符串**，`.so` 里也没有 LiteAV 库。
原因是 TUICalling 依赖腾讯 IM SDK（`ImSDK_Plus.framework` + 一堆 bundle），云打包时被丢掉。

换成官方 TRTCCloud 插件（体积小、依赖干净）后，通话界面改成自己写。

原来的 TUICalling 插件目录**没有删**，移到了：
`_deploy\tools\_before-sync\nativeplugins-备份\TUICallingUniPlugin-TUICallingModule`

---

## 三、装了哪些东西

```
frontend/
├─ nativeplugins/                             ← 项目根（hx-frontend\nativeplugins）
│  └─ TRTCCloudUniPlugin-TRTCCloudImpl/      ← 新增（104.7 MB，含 Android aar + iOS framework）
│     ├─ package.json                        插件声明（id 就是 TRTCCloudUniPlugin-TRTCCloudImpl）
│     ├─ android/TRTCCloudUniPlugin-release.aar
│     └─ ios/  (TXLiteAVSDK_Professional.framework 等)
│  ※ 同一份也放进了 frontend/src/nativeplugins/ —— 这个项目是 HBuilderX CLI 工程
│    （源码在 src/ 下），云端打包到底读项目根还是读 src 没有明确文档，
│    两处都放一份最稳；实测 uni build 不会把它复制进产物，所以不会让 APK 变大。
└─ src/
   ├─ common/TrtcCloud/                      ← 新增：腾讯官方 JS 封装层 v1.4.8
   │  ├─ lib/index.js                        TrtcCloud.createInstance() 等全部 API
   │  ├─ lib/TrtcCloudImpl.js                内部：uni.requireNativePlugin(...)
   │  ├─ lib/TrtcDefines.js                  枚举（TRTCAppScene / TRTCAudioRoute / ...）
   │  └─ view/TrtcLocalView.nvue             本地画面原生组件包装
   │     view/TrtcRemoteView.nvue            远端画面原生组件包装
   ├─ common/msm-call.js                     ← 新增：信令 + 房间 + 状态（本项目自己的）
   └─ pages/call/
      ├─ index.nvue                          ← 新增：真机通话页（视频画面必须 nvue）
      └─ index.vue                           ← 新增：H5 占位提示页
```

`src/manifest.json` 的改动：

```jsonc
"app-plus": {
    "nativePlugins": { "TRTCCloudUniPlugin-TRTCCloudImpl": {} },   // 新增
    "distribute": {
        "android": {
            "permissions": [
                // 新增这三条（原来没有，不加的话采集会被系统拒）
                "...CAMERA", "...RECORD_AUDIO", "...MODIFY_AUDIO_SETTINGS"
            ]
        },
        "ios": {
            "privacyDescription": { NSCameraUsageDescription: "...", NSMicrophoneUsageDescription: "...", ... }
        }
    }
}
```

`src/pages.json` 新增页面（放在**主包**，因为 nvue 页面不能进分包）：

```jsonc
{ "path": "pages/call/index", "name": "msmcall", "aliasPath": "/msmcall",
  "style": { "navigationStyle": "custom", "app-plus": { "titleNView": false, "background": "#111B21" } } }
```

---

## 四、信令怎么走的（没改后端）

后端的 `PushMsgEnum` 是**封闭枚举**，多一种消息类型都会反序列化失败，所以只能复用这 4 种：

```
TRTC_VOICE_START / TRTC_VIDEO_START / TRTC_VOICE_END / TRTC_VIDEO_END
```

真正的状态塞进消息 `content` 的 JSON 信封里：

```jsonc
{ "v": 1, "k": "msm-call", "s": "invite", "media": "video", "roomId": 123456789 }
```

| `s` | 用哪种消息类型发 | 含义 |
|---|---|---|
| `invite` | START | 主叫发起呼叫 |
| `accept` | START | 被叫接听 |
| `reject` | END | 被叫拒接 |
| `cancel` | END | 主叫在对方接听前取消 |
| `hangup` | END | 通话中任一方挂断 |
| `busy` | END | 被叫已在通话中，自动回占线 |

`k: "msm-call"` 是防误判的标识 —— 普通聊天内容 `JSON.parse` 出来没有这个字段，一律当普通消息处理。

进房参数：`roomId` 用 9 位纯数字（不用 `strRoomId`，避免两种房间号混用的坑）；
`userId` 用后端 `/trtc/getSign` 返回的那个（带 `u` 前缀）。

> ⚠️ 已知限制：后端 `/chat/sendMsg` 会校验好友关系，所以**只能 1v1 打给好友**，群通话打不了。
> 要做群通话得后端另开通路。

---

## 五、界面

- 视频通话：远端画面铺满，本地画面右上角小窗（接通后才出现）
- 语音通话：大头像 + 昵称 + 计时
- 被叫：接听（品牌蓝）/ 拒接（红）
- 通话中：静音 / 摄像头开关 / 前后摄像头翻转 / 免提 / 挂断
- 通话中保持屏幕常亮（`plus.device.setWakelock`）
- 安卓 6+ 的摄像头与麦克风**运行时权限**在进房前主动申请

配色沿用 Msm 的规范：底色墨黑 `#111B21`、强调用品牌蓝 `#2F8FE5`、挂断用语义红 `#D32F2F`。

> 图标用的是 emoji（🎙 📹 🔄 🔊 ✕ ✓）。nvue 里加载自定义图标字体要在原生层注册，成本高，
> 所以先用 emoji；每个按钮下面都有中文标签，即使某台机器 emoji 显示不出来也不影响使用。

---

## 六、给后端换上真凭据（拿到 SDKAppID 后执行）

不用重新编译 jar —— Spring Boot 的外部配置优先级高于 jar 内的 `application-server.yml`：

```powershell
cd _deploy\tools
powershell -ExecutionPolicy Bypass -File apply-trtc-config.ps1 `
    -SdkAppId 1400xxxxxx -SecretKey <32位 SDKSecretKey>
```

脚本会：写 `/www/wwwroot/msm/backend/config/application-server.yml` → 清掉 Redis 里
旧的 `chat:trtc:sign:*` 签名缓存 → 重启 `msm-backend` → 回显配置（secret 打码）。

---

## 七、参考

- 腾讯云官方 uni-app 接入文档：https://cloud.tencent.com/document/product/647/116550
- 官方 JS 封装层下载：https://web.sdk.qcloud.com/trtc/uniapp/download/TrtcCloud.zip
- 官方原生插件（插件市场 id 7774）：https://ext.dcloud.net.cn/plugin?id=7774
- HBuilderX 云打包 CLI：https://hx.dcloud.net.cn/cli/pack
