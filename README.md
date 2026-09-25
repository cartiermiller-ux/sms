# Msm

> **Simple. Social. Messaging.**
> 基于 uni-app (Vue 3) + Spring Boot 的即时通讯应用，安卓 / iOS / H5 跨端。

---

## 这是什么

一套完整的即时通讯产品工程，包含：

| 部分 | 说明 |
|---|---|
| **frontend** | uni-app (Vue 3 + Vite) 客户端，编译到 H5 / Android / iOS |
| **backend** | Spring Boot 2.1 服务端（chat-api） |
| **android** | 安卓打包脚本与离线打包工程参考 |
| **tools** | 开发/部署/验证用脚本 |
| **docs** | 部署、配置、品牌规范等文档 |
| **privacy** | 隐私政策页（高德开放平台审核用） |
| **screenshots** | 各页面预览截图 |

---

## 技术栈

**前端**

- uni-app `3.0.0-5020620260917001`（Vue 3）
- Vite 5.2.8、Sass、vuex 4
- 自研 Design Token 体系（Msm Blue `#2F8FE5` + Graphite）

**后端**

- Spring Boot `2.1.1.RELEASE`（需要 **JDK 8**）
- Undertow、Shiro（token 鉴权）、MyBatis-Plus 3.4.3
- ShardingSphere 4.1.1（分库分表）、Redis、MySQL

---

## 本地运行

### 后端

```bash
cd backend
mvn clean package -DskipTests
java -jar target/chat-api.jar --spring.profiles.active=dev
```

需要本地 MySQL（`application-dev.yml` 里配置）和 Redis。
**数据库密码等敏感项已替换为 `CHANGE_ME`，请自行填写。**

### 前端

```bash
cd frontend
npm install
npm run dev:h5        # 浏览器开发
npm run build:h5      # 构建 H5
npm run build:app     # 构建 App 资源（供 HBuilderX 云打包 / 离线打包）
```

开发服务器默认 `http://localhost:5173`，`/api` 走 Vite 代理：

```js
// frontend/vite.config.js
const REMOTE_BACKEND = 'https://your-server.example.com'
const API_TARGET = process.env.API_TARGET || REMOTE_BACKEND
```

指向本地后端：`API_TARGET=http://127.0.0.1:8080 npm run dev:h5`

---

## 品牌规范

四个主页面 + 启动/认证页已按统一规范重做：

- **主色** `#2F8FE5`（Msm Blue），辅助 `#18B6D9`（Cyan）
- **文字** `#111B21` / `#667781` / `#8696A0`
- **底部 Tab** 24px 圆角线性图标，未选中 `#667781`，选中 `#2F8FE5`
- **Compact Density**：输入框 52px、主按钮 52px、列表行 64–72px、页面边距 20px
- 绿色只用于「在线 / 成功 / 已连接」状态，不承担品牌色

Design Token 定义在：

- `frontend/src/uni.scss` —— SCSS 变量（编译期）
- `frontend/src/App.vue` —— CSS 自定义属性（运行期）+ 通用容器类
- `frontend/src/common/msm-auth.scss` —— 认证页共用样式

详见 [`docs/Msm品牌视觉规范.md`](docs/Msm品牌视觉规范.md)。

---

## 目录结构

```
.
├── frontend/                 uni-app 客户端
│   ├── src/
│   │   ├── App.vue           全局样式 + Design Token
│   │   ├── pages.json        路由 / tabBar / 分包
│   │   ├── manifest.json     应用配置（appid / 包名 / 模块）
│   │   ├── common/           请求封装、工具、主题
│   │   ├── components/       自定义组件
│   │   ├── pages/            主包页面
│   │   ├── wx/               聊天相关页面（分包）
│   │   └── static/           图标、启动页主视觉
│   ├── vite.config.js
│   └── package.json
├── backend/                  Spring Boot 服务端
│   └── src/main/
│       ├── java/com/platform/
│       └── resources/        配置文件 + Mapper XML
├── android/                  安卓打包脚本
├── tools/                    开发/验证脚本
├── docs/                     文档
├── privacy/                  隐私政策页
└── screenshots/              页面截图
```

---

## ⚠️ 安全说明

本仓库是**公开**的，以下内容**已从仓库中排除**：

- 所有 `.keystore` / `.jks` 签名密钥 —— **绝不应提交到任何仓库**
- 服务器 SSH 密码、数据库密码、证书密码 —— 文档中已替换为 `<REDACTED_*>` 占位符
- DCloud 离线打包 AppKey
- `node_modules` / `dist` / `target` / APK / JDK / Maven 等构建产物

**保留的内容**：`frontend/src/manifest.json` 里的高德 Android Key。
这类 Key 由高德按「包名 + 签名 SHA1」校验，换一个包名或证书即失效，因此不构成实际泄露风险；
且移除后项目将无法定位。如你仍希望移除，改成 `YOUR_AMAP_ANDROID_KEY` 即可。

---

## 已知限制

- **推送（Push）功能已停用** —— `manifest.json` 未勾选 Push 模块，代码中 4 处 `plus.push` 已中性化。
  原因是未开通 uni-push 服务；且**后端目前没有推送发送逻辑**，只把 clientid 存到 `/my/bindCid/`。
- **音视频通话**依赖腾讯 TRTC 原生插件（`nativeplugins/TUICallingUniPlugin`，约 130 MB），
  未包含在本仓库中。需要时从 DCloud 插件市场获取。
- **`targetSdkVersion` 为 28** —— 上架 Google Play 需提高到 34+。
- 会话列表存储于**客户端本地存储**（`<userId>_chatlistData`），不是服务端拉的；
  换设备或重装后列表为空，需等新消息才会重新出现。
