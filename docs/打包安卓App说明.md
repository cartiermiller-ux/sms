# 打包安卓 App（Msm）

> **2026-09-25 更新：域名 `imessage.uno` 已配好 HTTPS，情况有变化。**
>
> `https://imessage.uno/` 现在是**安全上下文**，手机浏览器**已经可以定位**，
> 不再必须打包 App。请先读第一节再决定。
>
> App 资源已经构建好：`_deploy\frontend\dist\build\app`

---

## 〇、先决定：还要不要打包 App？

| 方案 | 定位 | 说明 |
|---|---|---|
| **手机浏览器开 `https://imessage.uno/`** | ✅ 可用 | 最省事，改代码即时生效，无需打包 |
| 打包成 App | ✅ 可用 | 体验更好（原生壳、可推送、可上架），但要 DCloud 账号 + 打包流程 |

**只想验证功能 → 手机浏览器开域名即可。想要能装到手机上的应用 → 继续往下看。**

---

## 一、HTTPS 已经解决了定位问题

| 环境 | 定位可用性 |
|---|---|
| `http://120.24.175.80/`（HTTP） | ❌ 浏览器禁止 —— 实测报 `Only secure origins are allowed` |
| `https://imessage.uno/`（HTTPS） | ✅ **可用** —— 实测 `isSecureContext: true`，成功取到坐标 |
| 打包成 App | ✅ 走原生定位（`plus.geolocation` + 高德 SDK），更精确更快 |

App 的额外好处：原生壳体验、uniPush 推送、可上架应用市场。

---

## 二、打包前必须先做一件事：换掉 appid

`manifest.json` 里现在是**作者的 appid**：

```json
"appid" : "__UNI__CA19A2D"
```

云打包会校验 appid 归属，用别人的 appid **必定失败**（提示 appid 不属于当前账号）。所以：

1. 注册 DCloud 账号：https://dev.dcloud.net.cn/ （免费）
2. HBuilderX 右上角登录
3. 打开项目后，双击 `src\manifest.json` → **基础配置** → 点「**重新获取**」appid
   （会生成一个属于你账号的 `__UNI__XXXXXXX`）

---

## 三、打包步骤

```
1. HBuilderX → 文件 → 打开目录 → 选择
   C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\frontend

   （这是 uni-app CLI 工程，有 src\ 目录，HBuilderX 能正常识别）

2. 确认 src\common\config.js 里的 App 端地址已是 HTTPS：
      #ifndef H5
      var API_HOST = 'https://imessage.uno/api'
      #endif

   ★ 用 HTTPS 还绕开了 Android 9+ 对明文 HTTP 的拦截，「坑 1」就不会遇到。

3. 菜单「发行」→「原生App-云打包」

4. 打包界面按这样填：
   - 打包类型：正式版
   - Android：
       ☑ 使用 DCloud 公用测试证书（免费，无需自己生成）
       （将来上架应用市场再换自有证书）
   - iOS：需要付费的 Apple 开发者账号，先不勾
   - 广告联盟：不勾
   - 打包方式：云端打包

5. 点「打包」，等 5-15 分钟，完成后会自动下载 apk
```

---

## 四、装到手机上

1. 把 apk 传到手机安装（微信/QQ 传会被拦，建议用数据线或网盘）
2. 首次打开会申请权限，**定位权限必须允许**，建议选「始终允许」
3. 登录：`13900000001` / `abc12345`

---

## 五、装好后逐个验证

| 功能 | 预期 |
|---|---|
| 登录 | 能登上，底部 tabbar 出现 |
| 发消息 | 两个账号互加好友后可实时收发（WebSocket） |
| **附近的人** | 先弹隐私确认框 → 点「确定」→ 应能看到「临沧老王 / 南伞阿强 / 孟定小玉 / 清水河老李 / 老街阿珍」，带距离 |
| 摇一摇 | 能摇出人 |
| 发图片 | 能选图、上传、对方能收到 |

### 已有的测试账号（都在服务器上）

| 手机号 | 密码 | 昵称 | 上报的坐标位置 |
|---|---|---|---|
| 13900000001 | abc12345 | 服务器测试 | 未上报 |
| 13900000011 | abc12345 | 临沧老王 | 临沧市区 (23.8777, 100.0894) |
| 13900000012 | abc12345 | 南伞阿强 | 镇康南伞口岸 (23.7624, 98.8256) |
| 13900000013 | abc12345 | 孟定小玉 | 孟定镇 (23.5607, 99.0865) |
| 13900000014 | abc12345 | 清水河老李 | 清水河口岸 (23.8611, 98.7100) |
| 13900000015 | abc12345 | 老街阿珍 | 果敢老街 (23.6919, 98.7603) |

> 「附近的人」搜索半径已从**硬编码 100 公里改为可配置**（`platform.nearRadius`，服务器上设为 **500**）。
> 原因：果敢老街到临沧市区约 130 公里，原来的 100 公里会让两地互相看不到。
> 摇一摇本身没有半径限制。

---

> **注意**：「附近的人」会先弹一个隐私提示框（返回 / 确定），**必须点「确定」**才会去取定位。
> 不点的话页面就一直停在那，看起来像"定位没反应"。

---

## 六、可能遇到的坑

### 坑 1：App 连不上服务器（Android 9+ 明文流量限制）

**现在用 HTTPS 域名，基本不会遇到了。** 但如果改回 HTTP 地址就会出现：
Android 9 起系统默认禁止 App 使用明文 HTTP，表现为登录一直转圈或提示网络错误。

**确认方法**：用 `adb logcat` 看有没有 `Cleartext HTTP traffic to 120.24.175.80 not permitted`。

**解决**：用 HTTPS 地址（当前配置已经是），或改用 IP+HTTP 时在 manifest 里加明文流量白名单。

### 坑 2：定位仍然失败（高德 Key 是作者的）

`manifest.json` 里的高德定位 key 是**作者本人的**：

```json
"amap" : {
  "appkey_android" : "81cc6c72aeb6a1946510cc1e9f87ee80"
}
```

高德的 Android Key 通常**绑定应用的包名 + 签名 SHA1**，换了包名和证书后可能认证失败。

**解决办法**：
1. 申请自己的高德 Key（https://lbs.amap.com/ ，免费）—— 需要填 App 的包名和 SHA1
   （用 DCloud 公共测试证书时，SHA1 是固定的，HBuilderX 打包界面会显示）
2. 填到 `src\manifest.json` 的 `app-plus.distribute.sdkConfigs.geolocation.amap` 里

运气好的话作者这个 key 没绑包名，直接用也能定位。先打包试，不行再换。

> 另外 `manifest.json` 里同时配了 `geolocation.system`，云打包会一并带上系统定位模块，
> 所以即使高德 key 失效，系统定位仍可能可用。

---

## 七、打包后如果要更新代码

```powershell
# 改了前端
cd _deploy\frontend
npm run build:app        # 重新生成 dist\build\app
# 然后在 HBuilderX 里再走一次「发行 → 原生App-云打包」

# 改了 H5（网页版）
npm run build:h5         # 生成 dist\build\h5，上传覆盖服务器的 /www/wwwroot/msm/h5
```

App 端是**离线资源 + 原生壳**，服务器上的 H5 更新不会影响已装的 App，
必须重新打包才能让 App 拿到新代码。
