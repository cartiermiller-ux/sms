# 微聊 IM（Uniapp + SpringBoot）本地部署说明

> 部署完成时间：2026-09-23
> 部署目录：`C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy`

---

## 一、当前运行状态

| 服务 | 地址 | 状态 |
|---|---|---|
| 后端 API | http://127.0.0.1:8080 （同时监听 `::`，局域网可达） | ✅ 已启动 |
| 前端 H5 | http://127.0.0.1:5173 （同时监听 `0.0.0.0`，局域网可达） | ✅ 已启动 |
| MySQL | 127.0.0.1:3306 / 库 `boot-im` | ✅ 已启动 |
| Redis | 127.0.0.1:6379 | ✅ 已启动（复用机器上已有的实例） |
| 文件存储 | `C:\im-local\upload` | ✅ 本地磁盘，无需 OSS |

**访问地址**（本机局域网 IP 为 `192.168.2.12`，换网络后请用 `ipconfig` 重新确认）：

```
电脑浏览器    http://127.0.0.1:5173/#/wx/login/index
模拟器 / 真机  http://192.168.2.12:5173/#/wx/login/index
Android AVD   http://10.0.2.2:5173/#/wx/login/index
```

> 模拟器里**不要用 127.0.0.1**，那指的是模拟器自己。详见第二节「用模拟器 / 真机访问」。

**演示账号**（可直接登录 http://127.0.0.1:5173/#/wx/login/index ）

```
手机号：13800000002   密码：abc12345   昵称：张三丰
手机号：13800000003   密码：abc12345   昵称：李四
```

> 密码**必须 8-20 位**，否则会被前端表单校验直接拦下（提示「至少输入8-20位」），
> 请求根本不会发到后端。应用内「修改密码」还额外要求 8-16 位且数字+字母组合。
> `abc12345` 同时满足这两套规则。
>
> 建议开两个浏览器窗口（一个正常 + 一个无痕）分别登录这两个账号，
> 互加好友后聊天，可以一并验证 WebSocket 收发消息。

> 新注册也完全可用：短信开关已关闭，`/auth/sendCode` 会把验证码直接写在接口返回值里，
> 前端会自动填入，无需任何短信服务商。
>
> 登录方式只有手机号（密码 或 短信验证码），**不涉及微信/第三方登录**，详见第四节第 6 条。

---

## 二、服务是怎么跑的（重要）

三个服务由 **Windows 计划任务**托管，不属于任何终端会话：

| 计划任务名 | 作用 | 端口 |
|---|---|---|
| `IM-Local-MySQL` | MySQL 数据库 | 3306 |
| `IM-Local-Backend` | 后端 chat-api | 8080 |
| `IM-Local-Frontend` | 前端 H5 开发服务器 | 5173 |

这样做的原因：早先版本用普通后台进程启动，**会话一结束服务就被回收**，
表现就是浏览器突然「打不开」。挂在计划任务服务（`svchost -s Schedule`）下之后，
关闭终端、注销重登、重启机器都不会影响它。

进程树形如：`svchost.exe(Schedule) → mysqld.exe / java.exe / npm.cmd`。

### 日常操作

```
0-安装并启动服务.cmd    安装计划任务（含开机自启）并立即启动   ← 主入口，需管理员
9-服务状态.cmd          查看计划任务与端口状态
9-停止服务.cmd          停止服务（保留计划任务）
9-卸载服务.cmd          停止服务并删除计划任务（不删数据）
```

> `0-安装并启动服务.cmd` 会自动申请管理员权限（UAC 弹窗点是即可）。
> 只需要执行一次；之后**开机自动启动**，无需任何操作。

### 前台手动启动（排查问题时用）

这三个脚本把服务跑在当前窗口里，能看到实时日志，关窗口即停止。
注意：**用它们之前请先 `9-停止服务.cmd`**，否则端口会被计划任务占用。

```
1-启动数据库.cmd     启动 MySQL
2-启动后端.cmd       启动 SpringBoot
3-启动前端H5.cmd     启动 H5 开发服务器
```

### 其它脚本

```
rebuild-backend.cmd    改完后端代码/配置后重新打包，然后 9-停止服务 → 0-安装并启动服务
build-frontend-h5.cmd  打包 H5 静态产物（产物在 frontend\dist\build\h5）
```

### 脚本编码约定

`.cmd` 脚本保存为 **GBK 编码 + CRLF 换行**，这是刻意的：
中文 Windows 的 cmd 用 GBK 才不会乱码；而 LF-only 的批处理会让 cmd.exe
把行拆散执行（表现为一堆 `'xxx' is not recognized as an internal or external command`）。

`tools\service-manager.ps1` 则是 **UTF-8 with BOM + CRLF** ——
PowerShell 5.1 读无 BOM 的 UTF-8 脚本会当成 ANSI，中文全变乱码。

改动请编辑 `_gen\` 下的源文件再重新生成，不要直接用记事本改成品文件。

### 用模拟器 / 真机访问

**不要用 `127.0.0.1`** —— 在模拟器里它指的是模拟器自己，不是你的电脑。

前端已改成监听 `0.0.0.0`（所有网卡），接口地址也会**自动跟随页面主机名**，
所以你在哪个地址打开页面，接口就自动打到同一个主机的 8080，不用改任何配置。

本机局域网 IP（用 `ipconfig` 可查，换网络后会变）：

```
192.168.2.12   (Wi-Fi 2)
192.168.2.11   (Wi-Fi)
```

按设备选地址：

| 设备 | 打开的地址 |
|---|---|
| 电脑浏览器 | `http://127.0.0.1:5173/#/wx/login/index` |
| Android Studio AVD | `http://10.0.2.2:5173/#/wx/login/index` |
| 雷电 / MuMu / 夜神 等 | `http://192.168.2.12:5173/#/wx/login/index` |
| 手机真机（同一 Wi-Fi） | `http://192.168.2.12:5173/#/wx/login/index` |

`10.0.2.2` 是 Android 官方模拟器固定的「宿主机」别名，只对 AVD 有效。
国产模拟器多数直接桥接到局域网，用局域网 IP 即可；如果连不上，
在模拟器设置里把网络模式改成「桥接」再重试。

排查顺序：

```powershell
# 1) 确认服务在监听所有网卡（应该是 0.0.0.0 / ::）
Get-NetTCPConnection -State Listen -LocalPort 5173,8080 | Select-Object LocalAddress,LocalPort

# 2) 在本机确认局域网 IP 可达
Invoke-WebRequest http://192.168.2.12:5173/ -UseBasicParsing | Select-Object StatusCode
```

> 本机防火墙三个配置都是关闭的，不会拦截。如果日后打开了防火墙，
> 需要为 TCP 5173 和 8080 添加入站放行规则。
>
> 本机有两个 Wi-Fi 网卡（`.11` 和 `.12`），模拟器/手机要和电脑在同一网段
> （都是 `192.168.2.x`）。

### 想在模拟器里跑真正的 App（而不是 H5 页面）

那就是打包流程了，不是开链接：用 HBuilderX 打开 `frontend` 工程 →
「运行」→「运行到手机或模拟器」。注意先把 `src\common\config.js` 里
`#ifndef H5` 分支的 `HOST` 改成电脑局域网 IP。

---

## 三、目录结构

```
_deploy\
├── backend\                  后端源码 + target\chat-api.jar（可运行）
├── frontend\                 前端源码（已改造为 uni-app Vue3 Vite CLI 工程）
│   ├── src\                  源码（原 HBuilderX 工程根目录的内容整体移入）
│   ├── index.html            H5 入口
│   ├── vite.config.js        Vite 配置（端口 5173）
│   └── node_modules\         已安装依赖
├── tools\
│   ├── jdk8u504-b01\         内置 JDK 8（SpringBoot 2.1 必须用 JDK 8）
│   ├── apache-maven-3.9.9\   内置 Maven
│   ├── maven-settings.xml    Maven 配置（阿里云镜像 + 仓库指向 C:\im-local\m2repo）
│   ├── service-manager.ps1   计划任务管理（install/start/stop/restart/status/uninstall）
│   ├── verify-ws.mjs         WebSocket 连通性自检脚本
│   ├── verify-h5.mjs         H5 页面真实渲染自检脚本
│   └── cdp-eval.mjs          在浏览器页面里执行 JS，用于接口联调
├── data\upload\              （备用目录，实际用的是 C:\im-local\upload）
├── _gen\                     脚本源文件，改脚本改这里再重新生成
├── 0-安装并启动服务.cmd       安装计划任务并启动（主入口）
├── 1-启动数据库.cmd           以下三个用于前台手动排查
├── 2-启动后端.cmd
├── 3-启动前端H5.cmd
├── 9-服务状态.cmd
├── 9-停止服务.cmd
├── 9-卸载服务.cmd
├── rebuild-backend.cmd
└── build-frontend-h5.cmd
```

> `_gen\*.cmd.txt` / `_gen\*.ps1.txt` 是脚本源文件（UTF-8、LF，便于编辑）。
> 修改后重新生成到成品位置——`.cmd` 转成 GBK + CRLF，`.ps1` 转成 UTF-8 BOM + CRLF：
>
> ```powershell
> $dep = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy"
> $gbk = [System.Text.Encoding]::GetEncoding(936)
> Get-ChildItem "$dep\_gen" -Filter *.cmd.txt | ForEach-Object {
>   $t = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
>   $t = ($t -replace "`r`n", "`n") -replace "`n", "`r`n"
>   [System.IO.File]::WriteAllText((Join-Path $dep ($_.Name -replace '\.txt$','')), $t, $gbk)
> }
> $t = [System.IO.File]::ReadAllText("$dep\_gen\service-manager.ps1.txt", [System.Text.Encoding]::UTF8)
> $t = ($t -replace "`r`n", "`n") -replace "`n", "`r`n"
> [System.IO.File]::WriteAllText("$dep\tools\service-manager.ps1", $t, (New-Object System.Text.UTF8Encoding($true)))
> ```

---

## 四、部署过程中的关键改动

### 1. 后端换了源码（重要）

你下载的 `im-platform` **无法编译**。它的 `pom.xml` 依赖两个私有仓库产物：

```xml
<dependency><groupId>com.platform</groupId><artifactId>core-utils</artifactId><version>1.0.0</version></dependency>
<dependency><groupId>com.platform</groupId><artifactId>core-upload</artifactId><version>1.0.0</version></dependency>
```

而仓库 `https://q3z3-maven.pkg.coding.net/repository/boot-tools/maven/` **已经 404 失效**，
压缩包里又只有 `platform-api` 一个子模块，缺失约 30 个类
（`common.core` / `common.enums` / `common.upload` / `common.web` / `common.version` 等），
Gitee 上的 `im-platform` 仓库同样只有这一个模块。

因此改用作者的**后续自包含版本** [`lakaola/chat-api`](https://gitee.com/lakaola/chat-api)：
它把 `core-utils`、`core-upload` 合并进了主工程，并新增了**本地磁盘存储**
（`UploadLocalServiceImpl`），无需 OSS 即可收发图片。
接口路径与你的前端完全一致（`/auth/login`、`/auth/sendCode`、`/file/upload`、`/trtc/getSign` …）。

### 2. 后端配置改动

文件：`backend\src\main\resources\application-dev.yml`

| 配置项 | 原值 | 改后 | 原因 |
|---|---|---|---|
| `platform.rootPath` | `E:/platform/uploadPath` | `C:/im-local/upload` | 本地存储目录，**必须是纯 ASCII 且不含空格**，否则 Spring 的 `file:` 资源定位会抛 URI 解析异常 |
| `platform.cors` | `N` | `Y` | H5 在 5173，调 8080 属跨域，必须开 |
| `upload.uploadType` | `oss` | `local` | 不依赖阿里云 OSS |
| `upload.serverUrl` | 阿里云域名 | `http://127.0.0.1:8080/preview/` | 必须与 `PlatformConfig.PREVIEW`（`/preview/**`）一致，且**以 `/` 结尾** |
| `upload.region` | OSS 区域 | `C:/im-local/upload` | `uploadType=local` 时该字段被复用为落盘目录 |
| `jdbc-url` | 无 `useSSL` | 增加 `useSSL=false` | MySQL 5.7 的 SSL 用的是 JDK8u504 已禁用的旧协议，默认尝试 SSL 会抛 `SSLHandshakeException` |

改了以上任何一项，需要双击 `rebuild-backend.cmd` 重新打包。

### 3. 后端代码改动

| 文件 | 改动 | 原因 |
|---|---|---|
| `common/constant/AppConstants.java` | `DEFAULT_PORTRAIT` 由 `static final` 改为 `static`，默认值改为 `/preview/default-portrait.jpg` | 原值指向 `http://q3z3-im.oss-cn-beijing.aliyuncs.com/...`，该外链**已 404**，新用户头像会裂图 |
| `common/upload/config/UploadConfig.java` | 新增 `@PostConstruct initDefaultPortrait()` | 启动时依据 `upload.serverUrl` 自动推导默认头像地址，换域名/IP 不用改代码 |

默认头像文件已放在 `C:\im-local\upload\default-portrait.jpg`。

### 4. 前端改造（HBuilderX 工程 → Vite CLI 工程）

原工程是 HBuilderX 格式（源码在根目录、无 npm 依赖声明），无法用命令行跑。
改造内容：

1. **整体移入 `src/`**：`App.vue`、`main.js`、`pages.json`、`manifest.json`、`uni.scss`、
   `common/`、`components/`、`pages/`、`static/`、`store/`、`uni_modules/`、`wx/`、`wl/`、
   `nativeplugins/`、`key/`、`unpackage/`
2. **新增 `package.json`**，版本组合取自官方模板 `dcloudio/uni-preset-vue#vite`：
   `@dcloudio/* = 3.0.0-5020620260917001`、`vite 5.2.8`、`vue ^3.4.21`、`rollup 4.14.3`
   另外补装了两个原工程缺失但被引用到的依赖：`vuex@4.1.0`、`sass@1.77.8`
3. **新增 `vite.config.js`**：端口固定 127.0.0.1:5173
4. **重写 `index.html`**：入口指向 `/src/main.js`，并补了 favicon（消除 404）
5. **接口地址集中管理**：新增 `src/common/config.js`

```js
const API_HOST = 'http://127.0.0.1:8080'   // 改这里即可切换环境
const WS_HOST  = API_HOST.replace(/^http/, 'ws')
```

`common/request.js` 与 `common/socketTask.js` 已改为从这个文件读取，
不再硬编码线上的 `https://im-api.q3z3.com` / `wss://im-api.q3z3.com`。

6. `src/App.vue`：`./package.json` 改为 `../package.json`（因为文件位置从根目录移到了 `src/`）

> **真机/模拟器调试**：手机和电脑在同一局域网时，把 `API_HOST` 改成
> `http://<电脑局域网IP>:8080`；安卓模拟器访问宿主机用 `http://10.0.2.2:8080`。

### 5. 修复的源码 bug：「已阅读并同意」勾选框点了没用

**症状**：勾选框明明显示已勾选，点登录却提示「请先同意《隐私及服务协议》」，死活登不进去。

**根因**：`<label for="agree">` 包住了 uni-app 的 `<checkbox>`。uni-app H5 把 `<label>` 渲染成
`<uni-label>`，它会在点击时转发一次点击给 `#agree`，于是**一次真实点击触发了两次取反**：

```
真实点击 → uni-label 转发 click 到 #agree → 冒泡到父容器 → agree = !agree   (第 1 次取反)
         → 原始 click 冒泡到父容器        → agree = !agree   (第 2 次取反)
结果：agree 回到原值 false，但复选框视觉状态已经被切到"已勾选"
```

所以视觉与逻辑状态**正好相反**，且点偶数次等于没点。用 JS 的 `element.click()`
不会走 label 转发路径，所以自动化测试一度漏掉了这个 bug。

**修复**：去掉 `<label>` 包装，只保留父容器单一点击路径，让 `:checked="agree"` 全权驱动视觉。
共 4 个页面存在同一问题，均已修复：

| 文件 | 说明 |
|---|---|
| `src/wx/login/index.vue` | 登录页 |
| `src/wx/register/index.vue` | 注册页 |
| `src/wx/forgetPass/index.vue` | 找回密码页 |
| `src/wl/login/index.vue` | 另一个登录页 |

**修复前后对比**（真实鼠标点击，`tools/verify-agree-realclick.mjs` 实测）：

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 点 1 次 | 视觉已勾选，`agree=false` → **登录失败** | 视觉已勾选，`agree=true` → **登录成功** |
| 点 2 次 | 视觉未勾选，`agree=false` → 登录失败 | 视觉未勾选，`agree=false` → 登录失败（符合预期） |

> 这个 bug 是作者源码自带的，App 端打包后同样存在。

### 6. 登录方式说明

**登录不调用微信，也没有任何第三方登录。** 全部基于手机号：

| 接口 | 方式 |
|---|---|
| `POST /auth/login` | 手机号 + 密码 |
| `POST /auth/loginByCode` | 手机号 + 短信验证码 |
| `POST /auth/register` | 手机号 + 验证码 + 密码 + 昵称 |
| `POST /auth/forget` | 手机号 + 验证码，重置密码 |

两点容易误解的地方：

- `ShiroConfiguration` 里有 `filters.put("oauth2", ...)`，但 `"oauth2"` 只是这条
  Shiro 过滤链的**名字字符串**，实际过滤器是自定义的 `ShiroTokenFilter`（基于 token 鉴权），
  和 OAuth2 协议无关。
- 原始 `im-platform` 里有个 `ShiroLoginThird(String openId)` 类（第三方登录的骨架），
  但**没有任何 Controller 调用它**，前端也没有 `uni.login` / 微信 provider 调用；
  当前部署的 `chat-api` 更是已经把这个类删掉了。

### 7. 应用改名与换图标（Msm）

原品牌「微聊」已整体替换为 **Msm**，图标用提供的字标图生成。

**改名范围**（源码中已无 `微聊` 残留，共替换 22 处）：

| 位置 | 改动 |
|---|---|
| `src/manifest.json` | `name` → `Msm`，`description` → `Msm`（App 安装后显示的名称） |
| `index.html` | `<title>` → `Msm`（H5 浏览器标签页标题） |
| `src/App.vue` | 控制台横幅 `考拉Team 微聊` → `Msm` |
| `src/wx/personDetail/*`、`personInfo/*`、`tabbar4` 等 | 界面文案「微聊号」→「Msm号」、「加我微聊」→「加我Msm」 |
| `src/wx/search-friends`、`pages.json`、`wx/system` 等 | 搜索占位符、页面标题等同步替换 |
| `package.json` | `description` 更新 |

**图标**：由 `assets\msm-logo.png` 生成 manifest 引用的全部 17 个尺寸
（安卓 72/96/144/192，iOS 20/29/40/58/60/76/80/87/120/152/167/180/1024），
输出到 `src\unpackage\res\icons\`，另存一份 `src\static\msm-icon.png` 作为 H5 favicon。

生成方式（字标居中占宽度 72%，画布底色取自字标外侧的背景均值）：

```powershell
powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1 -Source assets\msm-logo.png -Ratio 0.72
```

换 Logo 时重跑这一条即可，会自动重新计算包围盒和底色。

> **启动图（splash）未改动**：`unpackage\res\splash\` 里的三张图是微信风格的
> 星空地球通用图，本身不含文字品牌，所以无需替换。若要换，直接覆盖这三个文件
> （注意是 `.9.png` 九宫格格式）。

> **H5 端的图标**只在浏览器标签页体现。App 端的图标和名称要重新打包才会生效
> （见第七节）。

---

## 五、已验证的功能

| 验证项 | 结果 |
|---|---|
| 后端启动 | ✅ 8080 端口监听正常 |
| `/common/getVersion`、`/common/getAgreement` | ✅ HTTP 200 |
| 发送验证码 → 注册 → 登录 | ✅ 全流程通过，中文昵称正确落库（`张三丰` = `E5BCA0E4B889E4B8B0`） |
| 前端 H5 页面真实渲染 | ✅ 无头 Chrome 渲染出登录页，可见文本为「登录 / 注册」 |
| 浏览器跨域调用后端 | ✅ 从 5173 页面 `fetch` 8080 登录接口返回 200 和 token |
| 文件上传 + 预览 | ✅ 上传落盘 `C:\im-local\upload\2026\09\23\xxx.jpg`，返回的 `fullPath` 可直接访问（`image/jpeg` 200） |
| WebSocket 握手 + 心跳 | ✅ `ws://127.0.0.1:8080/ws?Authorization=<token>` 握手成功，心跳返回 `ok` |
| 浏览器真实点击走完登录 | ✅ 填表 → 勾选协议 → 点登录 → 跳转 `#/wx/tabbar1/index`，拿到 token（`tools/verify-agree-realclick.mjs`） |
| 「已阅读并同意」勾选框 | ✅ 修复后点 1 次=勾选且登录成功，点 2 次=取消且被拦截（详见第四节第 5 条） |

自检脚本（服务已启动时可随时重跑）：

```powershell
# md5("abc12345") = d6b0ab7f1c8ab8f514db9a6d85de160a
$token = (Invoke-RestMethod "http://127.0.0.1:8080/auth/login" -Method Post `
  -ContentType "application/json" -Headers @{device="H5";version="1.2.0"} `
  -Body '{"phone":"13800000002","password":"d6b0ab7f1c8ab8f514db9a6d85de160a"}').data.token

node _deploy\tools\verify-ws.mjs $token
```

其它自检脚本（需要先用 `--remote-debugging-port=9222` 起一个 Chrome）：

```
tools\verify-h5.mjs              页面能否正常渲染、控制台有无报错
tools\verify-login-flow.mjs      填表并登录的流程测试
tools\verify-agree-realclick.mjs 用真实鼠标事件测协议勾选框（复现/验证本 bug）
tools\cdp-eval.mjs               在页面里执行任意 JS，用于接口联调
```

> 注意：前端登录前会先把密码做一次 MD5，所以用接口直接登录时要传密文的 MD5。
> `md5("abc12345") = d6b0ab7f1c8ab8f514db9a6d85de160a`。

---

## 六、尚未接入的第三方能力

以下功能代码完整，但需要你申请对应平台账号后填配置才能用（不填不影响聊天主流程）：

| 功能 | 配置文件位置 | 需要什么 |
|---|---|---|
| 实时音视频通话（TRTC） | `application-dev.yml` 的 `trtc:` | 腾讯云 TRTC 的 appId / secret |
| 消息推送（uniPush） | 前端 `manifest.json` | DCloud uniPush 配置 |
| 位置/附近的人 | `application-dev.yml` 的 `amap.key` | 高德开放平台 Key |
| 语音转文字 / 机器人 | `application-dev.yml` 的 `tencent:` | 腾讯云 NLP 的 appId/appKey/appSecret |
| 短信验证码 | `application-dev.yml` 的 `platform.sms` | 改为 `Y` 并接入短信服务商 |

另有一处已知的小瑕疵：`AppConstants.VIDEO_PARAM` 是阿里云 OSS 专用的视频截帧参数，
本地存储模式下发视频消息时，封面图会带上这个无效参数（视频本身能正常播放）。

---

## 七、打包成安卓 / iOS App

前端工程已经是标准 uni-app Vue3 工程，两种方式：

**方式 A：HBuilderX（本机已安装，`C:\Program Files (x86)\HBuilder X`）**

1. 用 HBuilderX 打开 `_deploy\frontend`
2. 改 `src\common\config.js` 里的 `API_HOST` 为电脑局域网 IP
3. 「发行」→「原生App-云打包」

**方式 B：命令行**

```cmd
cd _deploy\frontend
npm run build:app
```
产物在 `dist\build\app`，再用 HBuilderX 或本地离线打包工具出 apk/ipa。

> HBuilderX 打开时会提示 `src` 目录结构，这是 CLI 工程的标准布局，属正常现象。

---

## 八、常见问题

**Q：昨天还能访问，今天打开「无法访问」/ 连接被拒绝**
A：先看状态：双击 `9-服务状态.cmd`（或命令行执行）。按端口自查：

```powershell
foreach ($p in 8080,5173,3306,6379) {
  $c = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
  "$p : " + $(if ($c) { "运行中" } else { "未运行" })
}
```

恢复：双击 `0-安装并启动服务.cmd`（会自动申请管理员权限）即可。

> 服务已托管给 Windows 计划任务，**开机自动启动**，正常情况下不该再出现这个问题。
> 如果确实又停了，多半是三个任务被禁用或删除——重新执行一次安装即可。
> 也可以在「任务计划程序」里查看 `IM-Local-*` 三个任务的运行历史。

> 注意 Redis(6379) 是机器上原有的独立服务，不在这套计划任务里，一般不受影响。

**Q：双击 .cmd 后满屏 `'xxx' is not recognized as an internal or external command`**
A：脚本编码/换行被改坏了。`.cmd` 必须是 **GBK + CRLF**，`.ps1` 必须是 **UTF-8 BOM + CRLF**
（详见第二节末尾）。用 `_gen` 里的源文件重新生成一遍即可。

**Q：后端启动报 `Communications link failure` / `SSLHandshakeException`**
A：MySQL 没启动，或 `jdbc-url` 里的 `useSSL=false` 被改掉了。先运行 `1-启动数据库.cmd`。

**Q：后端启动报 `Unknown database 'boot-im'`**
A：数据库未导入。导入命令（脚本用的是 ASCII 路径，避免中文路径问题）：

```cmd
copy "_src\chat-api\doc\sql\boot-im.sql" C:\likeshop-local\boot-im.sql
cmd /c ""C:\likeshop-local\mysql\bin\mysql.exe" -h 127.0.0.1 -u root -proot --default-character-set=utf8mb4 < C:\likeshop-local\boot-im.sql"
```

**Q：前端页面能打开但接口全部失败**
A：`platform.cors` 必须是 `Y`；`src\common\config.js` 的 `API_HOST` 要指向后端地址。

**Q：上传图片后显示裂图**
A：`upload.serverUrl` 与 `platform.rootPath` 要配套：
`serverUrl` 指向 `http://<后端地址>/preview/`（**结尾必须有斜杠**），
`rootPath` 是磁盘目录，两者指向同一批文件。

**Q：改了 `application-dev.yml` 不生效**
A：配置打进了 jar，需要双击 `rebuild-backend.cmd` 重新打包。

**Q：前端开发服务器报 `EBUSY ... watch`**
A：编辑器原子写产生的临时文件导致，`vite.config.js` 里已加 `server.watch.ignored` 忽略规则。

---

## 九、与原始下载包的关系

```
原始下载包（未改动）
└── Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\
    ├── 前端im-uniapp-master.zip        → 解压到 frontend\，已改造为 CLI 工程
    ├── 后端im-platform-master.zip      → 解压到 backend\，因私有依赖失效无法编译，未使用
    └── _src\                           → 从 Gitee 拉取的完整源码
        ├── chat-api\                   → 实际部署的后端（自包含版）★
        ├── chat-uniapp\                → 作者配套前端（仅作比对，未使用）
        └── im-platform\                → 原后端仓库（同样缺私有依赖）
```

原始 zip 与解压出来的 `frontend\im-uniapp-master` 均**保持原样未修改**，
所有改动都发生在 `_deploy` 目录内。
