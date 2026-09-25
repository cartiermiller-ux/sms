# Msm 视觉规范 —— 灰白降噪 + 品牌蓝点缀

> **本文档是当前生效的视觉规范。**
> 上一版「Msm Blue 品牌风」规范见 `Msm品牌视觉规范.md`（已标注废弃，仅作历史记录）。
>
> 定稿：2026-09-25
> 适用范围：4 个 tab 页、启动页、登录页、注册页
> **不改变任何 IM 底层逻辑**（`<script>` 段一律逐字保留）

---

## 〇、两轮演进的来龙去脉（重要，避免反复）

这次视觉改造**走了两轮**，第二轮的结论覆盖第一轮。读文档时请以本节的最终结论为准：

| 项 | ① 第一轮（纯灰白） | ② **第二轮（最终）** |
|---|---|---|
| 主色 | 无彩色，`#333333` | **品牌蓝 `#2F8FE5`，但只作「焦点」** |
| 品牌蓝用途 | 全部移除 | 选中态 / 链接 / 未读角标 / 输入框聚焦边框 |
| 主按钮 | `#333333` | **品牌蓝 `#2F8FE5`**（第三轮由墨黑改回，见下表） |
| 文字 | `#111111`/`#666666`/`#999999` | **`#111B21`/`#667781`/`#8696A0`** |
| 分割线 | `#E5E5E5` | **`#E0E0E0`** |
| 圆角 | 2–6px | **卡片/按钮 0–2px，头像直角** |
| 行内边距 | `12px` | **`16px 20px`** |
| 头像 | 40px 4px 圆角 | **40px 直角**（个人资料 60px 直角） |
| 未读角标 | 灰色 | **品牌蓝** |
| 标签选中态 | 墨黑文字 + 深灰下划线 | **墨黑文字 + 1px 蓝色下划线** |
| 快捷入口 | 菜单行 | **一行三列**（纯线条图标） |

**一句话记法**：底色和骨架是灰白的，**蓝色像金子一样省着用** —— 只出现在「选中 / 可点 / 聚焦 / 有未读」这四类地方。

---

## 一、Design Token

数值同时定义在**两处，必须保持一致**：

- `frontend/src/uni.scss` —— SCSS 变量（编译期）
- `frontend/src/App.vue` 的全局 `<style>` —— CSS 自定义属性（运行期）

### 1.1 色彩

```css
/* 品牌蓝：只做「焦点」—— 选中态 / 链接 / 未读角标 / 聚焦边框 */
--msm-primary:        #2F8FE5;
--msm-primary-dark:   #1F7ACC;   /* 蓝色按下态 */
--msm-primary-light:  #EAF4FD;   /* 极浅蓝，仅确需底色时用 */

/* 墨黑：标题与正文（不再用于按钮） */
--msm-ink:            #111B21;
--msm-ink-dark:       #000000;   /* 墨色按下态 */

/* 文字 */
--msm-text:           #111B21;   /* 页面大标题、列表主标题 */
--msm-text-secondary: #667781;   /* 描述、次级信息（时间/作者） */
--msm-text-muted:     #8696A0;   /* 输入框占位符、极次要信息、右箭头 */
--msm-text-faint:     #B7C2CB;   /* 禁用 */
--msm-text-inverse:   #FFFFFF;

/* 背景与边框 */
--msm-background:     #F5F5F5;   /* 页面底（用来衬托纯白卡片） */
--msm-surface:        #FFFFFF;   /* 卡片 / 列表 / 搜索框 / 输入框 */
--msm-surface-sunken: #F5F5F5;   /* 按下态 */
--msm-divider:        #E0E0E0;   /* 1px 极细分割线（列表行） */
--msm-divider-light:  #EAEAEA;   /* 更浅一档：表单输入行下划线 */

/* 语义色：只用于状态，不作装饰 */
--msm-success:        #388E3C;   /* 成功 / 已发送 */
--msm-danger:         #D32F2F;   /* 错误 / 失败 / 删除 / 退出登录 */
--msm-warning:        #F57C00;

/* 在线状态：绿色已让给「成功」，在线改用中性墨色 */
--msm-online:         #111B21;
--msm-offline:        #CCCCCC;
```

> ### ⚠️ 蓝色的使用铁律
> **可以用的四个地方**（用完即止）：
> 1. **选中态**：底部 tab 的选中图标与文字、文字标签页的 1px 下划线、勾选中的复选框
> 2. **链接**：忘记密码、使用验证码登录、注册、创建新账号、获取验证码、协议链接
> 3. **未读角标**：列表内的 `.msm-badge`
> 4. **聚焦边框**：输入框 / 搜索框获得焦点时
>
> **绝对不能用的地方**：
> - ❌ ~~主按钮背景（用墨黑 `--msm-ink`）~~ —— **此条已在第三轮作废**：
>   实测「纯黑太重」，主按钮改为品牌蓝 `#2F8FE5`
> - ❌ 大面积底色、图标底块、卡片背景
> - ❌ 普通图标（用 `#667781`）
> - ❌ 普通正文（用 `#111B21` / `#667781`）
>
> ### 语义色铁律
> - **红色 `#D32F2F`** 只用于：错误、请求失败、删除、退出登录。
>   **未读角标不用红色** —— 用品牌蓝或 `.msm-badge`。
> - **绿色 `#388E3C`** 只用于：成功、已发送。
>   **在线状态不用绿色** —— 用 `--msm-online`（墨色点）。

### 1.2 圆角（克制）

```css
--msm-radius-sm:   0px;    /* 直角：头像、小标签 */
--msm-radius-md:   2px;    /* 卡片 / 按钮 / 输入框（主力值） */
--msm-radius-lg:   4px;    /* 搜索框 */
--msm-radius-pill: 999px;  /* 仅未读角标 */
```

### 1.3 尺寸与密度

```css
--msm-page-pad:  20px;   /* 页面左右留白 */
--msm-row-pad-y: 16px;   /* 列表行垂直内边距 —— 行高由内容决定 */
--msm-avatar:    40px;   /* 列表头像（直角） */
--msm-avatar-lg: 60px;   /* 个人资料头像（直角） */
```

| 元素 | 尺寸 |
|---|---|
| 主按钮 | 高 **48px**，圆角 2px，背景**品牌蓝 `#2F8FE5`** |
| 幽灵按钮 | 高 48px，透明底 + `1px #111B21` 描边 + 墨色文字（次要行动，视觉重量最轻） |
| 小按钮 | 高 36px |
| 输入框 | 高 **48px**，白底 + **1px `#E0E0E0` 边框**，圆角 2px，**聚焦变蓝** |
| 搜索框 | 高 **36px**，白底 + 1px 边框，圆角 **4px**，**聚焦变蓝** |
| 列表头像 | **40×40 直角** |
| 个人资料头像 | **60×60 直角** |
| 导航栏右上角头像 | 32×32 **正圆**（参考 V2EX 首页头部） |
| 列表行 | **高度自适应**，`padding: 16px 20px` |
| 卡片 | 无圆角/2px，无阴影，`margin-bottom: 8px` |
| 最小可点区域 | 44px |

### 1.4 字号

```css
--msm-font-display: 24px;  --msm-font-title:   18px;
--msm-font-heading: 16px;  --msm-font-body:    15px;
--msm-font-note:    13px;  --msm-font-caption: 11px;
```

列表行的实际用法：

| 位置 | 字号 / 字重 / 颜色 |
|---|---|
| 标题 | 16px / **600** / `#111B21` |
| 摘要 | 14px / 400 / `#667781` |
| 底部元信息（时间 · 置顶） | 12px / 400 / `#8696A0` |
| 菜单行标题 | 15px / **400** / `#111B21` |

### 1.5 阴影

```css
--msm-shadow-sm: none;
--msm-shadow-md: none;
--msm-shadow-lg: none;
```

> 三个变量名**保留但值统一为 `none`**，仅为兼容旧引用。
> 本方案**不使用任何阴影**，层次一律靠 1px 分割线与灰/白底对比表达。

---

## 二、通用类名速查

全部定义在 `App.vue` 的全局 `<style>` 里，任意页面可直接使用。

### 布局容器

| 类名 | 用途 |
|---|---|
| `.msm-header` | 自定义导航栏（sticky + 状态栏内边距 + 1px 底边） |
| `.msm-header--flat` | 内部已有自带分割线元素时去掉头部边框 |
| `.msm-header__brand` | 品牌字标（`M<em>sm</em>`，`em` 为品牌蓝） |
| `.msm-header__title` / `__sub` / `__actions` / `__bar` / `__left` | 导航栏内部件 |
| `.msm-icon-btn` | 导航栏图标按钮（34×34） |
| `.msm-avatar-btn` / `__img` | **导航栏右上角圆形用户头像**（32×32） |
| `.msm-search` / `__icon` / `__input` / `__ph` / `__clear` | 搜索框（白底细边框，聚焦变蓝） |
| `.msm-tabs` / `__item` / `__item--active` | 文字标签页（选中 = 墨黑文字 + **1px 蓝色下划线**） |
| `.msm-tabs--pad` / `--plain` / `--inCard` | 标签页变体 |
| `.msm-section` | 分组标题（直接贴在灰底上，不放进卡片） |
| `.msm-card` / `--flush` / `--plain` / `__head` / `__foot` | 白底卡片分组 |
| `.msm-gap` | 8px 间隔 |

### 列表行

| 类名 | 说明 |
|---|---|
| `.msm-row` | 列表行：白底、`padding: 16px 20px`、1px 底部分割线、`:last-child` 无分割线 |
| `.msm-row--tappable` | 按下变 `#F5F5F5` |
| `.msm-row--top` | 多行内容时顶部对齐（三行式卡片列表用这个） |
| `.msm-row__avatar` / `--lg` / `--group` / `-mini` | 40px 直角 / 60px 直角 / 群聊 2×2 九宫格 / 单格 |
| `.msm-row__icon` | 左侧纯线条图标位（24px，`#667781`，**无彩色底块**） |
| `.msm-row__body` / `__title` / `__title--plain` / `__desc` / `__desc--clamp2` / `__meta` / `__meta-sep` | 内容区层级 |
| `.msm-row__right` / `__time` / `__extra` | 右侧竖列 / 时间 / 次要文字 |
| `.msm-arrow` | 右箭头（`#8696A0`） |
| `.msm-divider` / `--full` | 缩进分割线 / 通栏分割线 |

### 状态件

| 类名 | 说明 |
|---|---|
| `.msm-badge` / `--danger` / `--row` | 未读角标（**品牌蓝**）/ 强调用红 / 直接排在行内 |
| `.msm-dot` / `--off` / `--inline` | 在线墨色点 / 离线浅灰点 / 行内 |
| `.msm-tag` | 小标签（浅灰底） |
| `.msm-empty` / `__art` / `__title` / `__desc` | 空状态（**只放灰色线条图标 + 灰字，无底块**） |
| `.msm-btn` / `--block` / `--ghost` / `--text` / `--danger` / `--sm` | 按钮（主按钮**品牌蓝**；`--ghost` 为白底深色描边；`--text` 为蓝色文字按钮） |
| `.msm-link` | 链接文字（品牌蓝） |

---

## 二之二、启动页与认证页（第三轮改造）

### 2.2.1 启动页 —— 单一入口 + 卖点填充

| 项 | 改前 | 改后 |
|---|---|---|
| Logo | 210×75 | **168×60**（缩小，把空间让给下方） |
| 标语 | `Connect freely.` + `和重要的人保持联系` | 不变 |
| 卖点 | 无（上方大片留白） | **4 条带蓝点的卖点**（`.splash__features`） |
| 入口 | 「登录」蓝色大按钮 + 「还没有账号？创建新账号」链接 | **唯一入口「开始使用」**，去掉注册链接 |
| 按钮样式 | 品牌蓝实心 | **幽灵按钮**：透明底 + `1px #111B21` 描边 + 墨色文字 |

> 逻辑：真正的蓝色主按钮在登录页。启动页只负责「进入」，所以降级为幽灵按钮以降低视觉重量。
> 「开始使用」跳登录页 —— 该页同时提供「登录」与「注册」两条路径。

卖点文案只列**真实已实现**的能力（消息/群聊、语音视频通话、朋友圈、扫一扫），
**不要写「端到端加密」这类本产品没有的卖点**。

### 2.2.2 认证页表单 —— 下划线输入行

login / register / forgetPass 三页共用 `common/msm-auth.scss`。

| 项 | 改前 | 改后 |
|---|---|---|
| 输入框 | 白底 + 1px 全边框 + 圆角 4px，标签在上方单独一行 | **只有一条下划线**（`1px #EAEAEA`），标签与输入**水平并排** |
| 标签 | 独立一行（`.field__label`） | 左侧固定 **76px** 宽（`.form-item__label`） |
| 聚焦 | 整框边框变蓝 | **下划线变蓝**（`.form-item:focus-within`） |
| 「或」分割线 | 有 | **已删除** |
| 忘记密码 / 切换登录方式 | 各自独立成行 | **同一行左右各一个**（`.auth__links`，`space-between`） |
| 提交按钮 | 墨黑 `#111B21`，可能被默认 padding 撑高 | **品牌蓝 `#2F8FE5`**，`height: 48px` + `padding: 0` + `box-sizing: border-box` |
| 协议行 | 13px `#667781` | **12px `#8696A0`**（更轻，不抢视觉） |

结构：

```html
<view class="form-item">
  <view class="form-item__label">手机号码</view>
  <view class="form-item__field">
    <text class="form-item__cc">+86</text>
    <view class="form-item__sep"></view>
    <input class="form-item__input" placeholder="请输入手机号码" placeholder-class="form-item__ph" />
  </view>
</view>
```

```css
.form-item {
  display: flex; align-items: center; min-height: 54px;
  border-bottom: 1px solid var(--msm-divider-light);
}
.form-item:focus-within { border-bottom-color: var(--msm-primary); }
.form-item__label { width: 76px; flex-shrink: 0; color: var(--msm-text); }
.form-item__field { flex: 1; min-width: 0; display: flex; align-items: center; }
.form-item__input { flex: 1; border: none; outline: none; background: transparent; color: var(--msm-text); }
.form-item__ph { color: var(--msm-text-muted); }   /* 只有占位符是浅灰 */
```

> ⚠️ 占位符用浅灰 `#8696A0`，**已填写的值用正文色 `#111B21`**。
> 原始 brief 的示例里 `.input { color: #999 }` 会把已填内容也变浅灰，可读性差，故未采纳。

### 2.2.3 实测数据（线上 390×844 环境）

| 元素 | 实测值 |
|---|---|
| 登录提交按钮 | h **48px**、`rgb(47,143,229)`、radius 2px、padding 0 |
| 输入行 | h 55px、下划线 `rgb(234,234,234)`、无其他边框 |
| 链接行 | `display:flex` + `justify-content:space-between`，文案 `["忘记密码？","使用验证码登录"]` |
| 协议行 | 12px / `rgb(134,150,160)` |
| 启动页按钮 | 透明底 + `1px rgb(17,27,33)` 描边、文案「开始使用」 |
| 「或」分割线 | 已消除（DOM 中无 `.auth__or`） |

---

## 三、组件与工具

### 3.1 `<MsmCard>` — `components/msm-card/msm-card.vue`

白底分组容器，只负责「一块白底 + 可选头/脚 + 行间分割线」。

```vue
<msm-card title="系统通知" more="全部">
  <view class="msm-row msm-row--tappable"> ... </view>
</msm-card>
```

Props：`title` / `more` / `footer` / `flush` / `plain`；事件：`head-click`。

### 3.2 `<MsmList>` — `components/msm-list/msm-list.vue`

列表容器，负责**空状态**与底部「加载中 / 没有更多了」。

```vue
<msm-list :items="chatList" :loading="loading" :finished="finished"
          empty-title="还没有任何聊天" empty-desc="开始一段新的对话吧" empty-icon="info">
  <view v-for="v in chatList" :key="v.userId" class="msm-row msm-row--top"> ... </view>
  <template #empty>
    <view class="msm-empty__action"><view class="msm-btn msm-btn--sm">发起聊天</view></view>
  </template>
</msm-list>
```

Props：`items` / `empty` / `loading` / `finished` / `emptyIcon` / `emptyTitle` / `emptyDesc` / `loadingText` / `finishedText` / `showFoot`。

> **关于下拉刷新**：uni-app 的下拉刷新是**页面级**能力，需在 `pages.json` 给该页开
> `"enablePullDownRefresh": true`，再在页面里实现 `onPullDownRefresh()`。
> 组件只负责空状态与底部提示；上拉加载请在页面 `onReachBottom()` 里自行调用加载函数。

### 3.3 格式化工具 — `common/msm-format.js`

| 函数 | 说明 |
|---|---|
| `formatTime(v)` | 相对时间：`刚刚` / `7分钟前` / `3小时前` / `昨天 14:20` / `3月5日` / `2024/3/5` |
| `formatListTime(v)` | 列表右列紧凑格式：`14:20` / `昨天` / `3月5日` / `2024/3/5` |
| `formatDateTime(v)` / `formatDate(v)` | 完整日期时间 / 仅日期 |
| `formatCount(n)` | 未读数量：`0→''`、`1–99→原样`、`>99→'99+'` |
| `formatMessageBrief(msg)` | 按消息类型产出摘要：`[图片]` / `[语音]` / `[视频]` / `[位置]` / `[语音通话]` … |
| `toDate(v)` | 稳妥解析后端时间 |

> **iOS 日期解析坑**：iOS 的 WebView（含 uni-app App 端）**无法解析**
> `"2024-01-01 12:00:00"` 这种带空格带横杠的格式，会得到 `Invalid Date`。
> `toDate()` 内部已统一把 `-` 换成 `/`，**所有时间格式化都必须走这个工具**，不要自己 `new Date(str)`。

> **本文件不含任何金额/货币函数**。brief 里的 `formatCurrency` 已确认不做 ——
> Msm 是即时通讯应用，没有余额与收支。

### 3.4 Logo 资产

| 文件 | 说明 |
|---|---|
| `static/msm-icon.png` | 原始方形 Logo（1024×1024，浅灰底 `#F0F0F0`），同时作为 App 图标 |
| `static/msm/logo.png` | **从上面抠出的透明底字标**（767×274，深色 `M` + 蓝色 `sm`），启动页与认证页使用 |

冒号后的空格、透明像素占比等细节见生成脚本逻辑：把 `#F0F0F0` 背景按通道差转成 alpha、
按内容包围盒裁剪、四周留 2% 边距。

---

## 四、底部 Tab

`pages.json`：

```json
"tabBar": {
  "color": "#8696A0",
  "selectedColor": "#2F8FE5",
  "borderStyle": "black",
  "backgroundColor": "#ffffff"
}
```

图标由 `tools/make-msm-icons.ps1` 生成（81×81，24 栅格 2px 描边线性图标）：

| 文件 | 颜色 |
|---|---|
| `static/msm/tab/{chat,contacts,discover,me}.png` | `#8696A0` |
| `static/msm/tab/{chat,contacts,discover,me}-on.png` | `#2F8FE5` |

> ⚠️ `make-msm-icons.ps1` **必须保存为带 BOM 的 UTF-8**。
> 没有 BOM 时 PowerShell 按 GBK 解码，中文注释的尾字节会「吃掉」后面的换行，
> 把 `Add-Type -AssemblyName System.Drawing` 吞进注释里，导致 System.Drawing 整个加载失败
> （症状：满屏 `Unable to find type [System.Drawing.*]`，且输出路径变成乱码）。

---

## 五、一个改不动的例外：底部 Tab 的未读角标

按「红色只用于错误」的语义，底部 tab 的未读角标本应改成品牌蓝。**试过但做不到**：

```js
// ❌ 无效：uni-app 的 setTabBarBadge 协议里只有 text
uni.setTabBarBadge({ index: 0, text: n, backgroundColor: '#2F8FE5', color: '#FFFFFF' });
```

实测（`@dcloudio/uni-h5` 3.0.0-5020620260917001）：

- `SetTabBarBadgeProtocol` 只声明了 `text`（+ `index`），**没有 `backgroundColor` / `color`**，
  传了会被静默忽略；
- H5 端角标固定渲染成 `<div class="uni-tabbar__reddot uni-tabbar__badge">`，
  计算样式为 `background: rgb(244, 53, 48)`；
- App 端 tabBar 是 **5+ 运行时的原生组件**（`plus.tabBar`），CSS 覆盖不到。

**当前选择：保持红色不动。** 理由是不做「H5 蓝、App 红」的半吊子修复 —— 平台间不一致比统一用红更糟；
而且红色未读角标本身是强用户习惯。

如果坚持要改，两条路（都需要额外工作量）：

1. **只在 H5 用 CSS 覆盖** `.uni-tabbar__badge { background: #2F8FE5 !important; }`
   —— 快，但会造成 H5 与 App 视觉不一致。
2. **改用自定义 tabBar**（`pages.json` 里 `"custom": true` + 自绘组件）
   —— H5 与 App 完全一致、角标可任意配色，但切换逻辑、红点、安全区都要自己实现，
   属于结构性改动，建议单独立项。

> **列表内的未读角标（`.msm-badge`）已经是品牌蓝**，不受此限制影响。

---

## 六、已知遗留（下一步可做）

以下页面**不在本次改造范围内**，目前仍是原作者的老样式：

| 页面 | 问题 |
|---|---|
| `wx/chatWindow/index.vue` | 聊天气泡 + 输入栏是微信风格，且**硬编码微信绿 `#1BC418`** |
| `components/friends-circle-list-item` / `friends-circle-detail` | 同上，`#1BC418` 发送按钮 |
| `wx/search-friends/index.vue` | `#1BC418` 按钮 |
| `wx/forgetPass/index.vue` | 旧样式 |
| `wx/system/index.vue`（设置） | 旧样式 |
| `wx/friendsCircle/*` | 旧样式 |

`#1BC418` 共残留 **4 处**，建议下一轮一并清除。

另外：

- 导航栏右上角的圆形用户头像目前只加在**消息页**（对齐 V2EX 首页）。
  如需在通讯录 / 发现页也显示，复用 `.msm-avatar-btn` 即可。
- 上一轮的 APK（`android-webview/*.apk`）仍是旧的 Msm Blue 版本，
  要让 App 端生效需重新打包（改动的只是 `www/` 资源与图标，可用现有的
  `tools/rebuild-apk-v2.ps1` 换资源 + 重签，DCloud 证书 SHA1 不变）。

---

## 七、改造涉及的文件

```
frontend/src/uni.scss                             design token
frontend/src/App.vue                              运行期变量 + 全部通用容器类
frontend/src/pages.json                           tabBar 配色
frontend/src/common/msm-auth.scss                 认证页样式
frontend/src/common/msm-format.js                 格式化工具
frontend/src/components/msm-card/msm-card.vue     卡片组件
frontend/src/components/msm-list/msm-list.vue     列表容器
frontend/src/pages/wxindex/index.vue              启动页（Logo 居中放大）
frontend/src/wx/login/index.vue                   登录页
frontend/src/wx/register/index.vue                注册页
frontend/src/wx/tabbar1/index.vue                 消息（卡片列表 + 右上角头像）
frontend/src/wx/tabbar2/index.vue                 通讯录
frontend/src/wx/tabbar3/index.vue                 发现
frontend/src/wx/tabbar4/index.vue                 我（一行三列快捷入口）
frontend/src/static/msm/logo.png                  新增：透明底字标
frontend/src/static/msm/tab/*.png                 8 个 tab 图标
tools/make-msm-icons.ps1                          图标配色
tools/v2ex-shots.mjs / v2ex-rows.mjs              截图与取色验证脚本
```

改造前的 `App.vue` 与第一轮的 8 个旧图标备份在 `tools/_before-v2ex/`。
