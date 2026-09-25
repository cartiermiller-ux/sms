# HTTPS 与域名配置说明

> 完成时间：2026-09-25
> 域名：`imessage.uno` → `120.24.175.80`（阿里云 ECS）

---

## 一、现在的访问方式

| 入口 | 地址 | 说明 |
|---|---|---|
| **域名 HTTPS** | `https://imessage.uno/` | ✅ 推荐，定位/WebSocket/上传都正常 |
| 域名 HTTP | `http://imessage.uno/` | 301 自动跳转到 HTTPS |
| IP HTTP | `http://120.24.175.80/` | 保留可用（向后兼容，但**定位不可用**） |

**定位必须在 HTTPS 下**：浏览器禁止非安全上下文使用 `navigator.geolocation`，
HTTP 页面会直接报 `Only secure origins are allowed`。

---

## 二、证书

```
签发机构  Let's Encrypt
域名      imessage.uno（仅主域，www 子域没有解析记录所以没签）
有效期    2026-09-24 ~ 2026-12-23
证书路径  /etc/letsencrypt/live/imessage.uno/{fullchain.pem,privkey.pem}
自动续期  certbot.timer 已启用（systemd timer，到期前自动续）
```

手动测试续期：

```bash
certbot renew --dry-run
```

**如果以后加了 `www.imessage.uno` 的解析记录**，可以扩签证书：

```bash
certbot certonly --webroot -w /www/wwwroot/msm/h5 \
  -d imessage.uno -d www.imessage.uno --expand
```

---

## 三、Nginx 配置结构

```
/etc/nginx/snippets/msm-locations.conf     ← 公共 location 规则（HTTP/HTTPS 共用）
/etc/nginx/sites-available/msm.conf        ← 三个 server 块
```

`msm.conf` 里的三个 server：

| # | 监听 | server_name | 作用 |
|---|---|---|---|
| ① | 80 | `imessage.uno www.imessage.uno` | 301 跳 HTTPS，但放行 `/.well-known/acme-challenge/` |
| ② | 80 | `120.24.175.80` | 保持原来的 HTTP 行为（IP 访问向后兼容） |
| ③ | 443 | `imessage.uno` | HTTPS 主站，含 HSTS 等安全头 |

`msm-locations.conf` 里的路由：

```
/api/ws      → 127.0.0.1:8080/ws         WebSocket（带 Upgrade 头，read_timeout 3600s）
/api/       → 127.0.0.1:8080/            接口（去掉 /api 前缀）
/preview/    → 127.0.0.1:8080/preview/   上传文件的预览
/            → /www/wwwroot/msm/h5       H5 静态文件（hash 路由回退 index.html）
```

---

## 四、⚠️ 这台服务器上还有别的站点

配置时发现的，**改动 Nginx 时务必注意不要影响它们**：

| 站点 | 配置文件 | 说明 |
|---|---|---|
| `cartier.ccwu.cc` | `sites-enabled/cartier.ccwu.cc.conf` | 有 80 和 443 两个 server 块，反代到 `127.0.0.1:2345` |
| `restapi.amap.com` | `conf.d/restapi.amap.com.conf` | 高德 API 的本地伪装，root 指向 `/www/wwwroot/cartier.ccwu.cc/amap-shim` |

**坑点**：`conf.d/` 的加载顺序在 `sites-enabled/` **之前**，所以 `restapi.amap.com` 那个块
是 80 端口的**默认 server**。任何 `server_name` 匹配不上的请求（比如新域名）都会落到它上面。

这就是最初 `Host: imessage.uno` 返回高德 JSON 的原因 —— 把域名加进 `msm.conf` 的
`server_name` 之后就正常了。

**以后加新域名，记得同步加进 `msm.conf` 的 server_name。**

---

## 五、踩过的两个坑

### 坑 1：混合内容（Mixed Content）导致图片全裂

站点上了 HTTPS 后，后端 `upload.serverUrl` 还写着 `http://120.24.175.80/preview/`，
浏览器把返回的头像/图片当作**不安全内容直接拦截**，控制台报：

```
Mixed Content: The page at 'https://imessage.uno/...' was loaded over HTTPS,
but requested an insecure image 'http://120.24.175.80/preview/default-portrait.jpg'
```

**修复**（两处都要改）：

1. 配置：`application-server.yml` 的 `upload.serverUrl` 改为 `https://imessage.uno/preview/`
   —— 影响**新上传**的文件
2. 存量数据：数据库里已存的 HTTP 地址要批量替换 —— 影响**已有**的记录

```sql
UPDATE chat_user       SET portrait = REPLACE(portrait, 'http://120.24.175.80/preview/', 'https://imessage.uno/preview/') WHERE portrait LIKE 'http://120.24.175.80/preview/%';
UPDATE chat_msg        SET content  = REPLACE(content,  'http://120.24.175.80/preview/', 'https://imessage.uno/preview/') WHERE content  LIKE '%http://120.24.175.80/preview/%';
UPDATE chat_topic      SET content  = REPLACE(content,  'http://120.24.175.80/preview/', 'https://imessage.uno/preview/') WHERE content  LIKE '%http://120.24.175.80/preview/%';
UPDATE chat_topic      SET cover    = REPLACE(cover,    'http://120.24.175.80/preview/', 'https://imessage.uno/preview/') WHERE cover    LIKE 'http://120.24.175.80/preview/%';
UPDATE chat_group      SET portrait = REPLACE(portrait, 'http://120.24.175.80/preview/', 'https://imessage.uno/preview/') WHERE portrait LIKE '%http://120.24.175.80/preview/%';
UPDATE chat_group_info SET portrait = REPLACE(portrait, 'http://120.24.175.80/preview/', 'https://imessage.uno/preview/') WHERE portrait LIKE '%http://120.24.175.80/preview/%';
```

> 改 `application-server.yml` 后需要 `rebuild-backend.cmd` 重新打包并上传 jar 才生效。

### 坑 2：默认头像文件漏传

`default-portrait.jpg` 只在本机存在，服务器上 `/www/wwwroot/msm/upload/` 里没有，
导致**所有用户头像 404**。补传即可：

```powershell
# 用 tools/ssh-run.mjs 上传，或宝塔文件管理器
```

---

## 六、验证清单（均为实测通过）

| 项目 | 结果 |
|---|---|
| `https://imessage.uno/` | ✅ HTTP 200，标题 `Msm` |
| `https://imessage.uno/api/common/getVersion` | ✅ 后端正常响应（连续 6 次全 200） |
| 证书校验 | ✅ Let's Encrypt 有效证书 |
| `http://imessage.uno/` | ✅ 301 跳 HTTPS |
| `http://120.24.175.80/` | ✅ 200（IP 访问仍可用） |
| ACME 续期路径 | ✅ HTTP 可达，不会被 301 拦 |
| **浏览器定位** | ✅ `isSecureContext: true`，`navigator.geolocation` 成功返回坐标 |
| **WebSocket** | ✅ `wss://imessage.uno/api/ws` 握手成功，心跳返回 `ok` |
| **文件上传** | ✅ 返回 `https://imessage.uno/preview/...`，可直接访问 |
| **附近的人** | ✅ 登录后可见 4 个测试账号及距离，**控制台零错误** |
| 其它站点 | ✅ `cartier.ccwu.cc`、`restapi.amap.com` 均未受影响 |

---

## 七、关于 ICP 备案

服务器在**大陆**（阿里云），域名对外提供服务需要 ICP 备案。

- **技术上现在就完全可用**（已验证），备案是合规层面的要求
- 未备案时，阿里云/运营商有可能对 80/443 的域名访问做拦截，届时需要补办
- `.uno` 后缀**可以备案**（部分新顶级域不被 MIIT 接受，`.uno` 不在其列）
- 备案流程：阿里云备案控制台提交，通常 7-20 个工作日

**如果被拦截**，临时方案是继续用 IP 访问
（但 IP 上是 HTTP，**定位不可用**，只能靠 App 的原生定位）。
