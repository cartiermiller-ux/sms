// 本地/服务器 后端地址配置（唯一的接口地址来源）
//
// 为什么统一用同源 /api：
//   后端 8080 不对外暴露，由 Nginx 把 /api/ 反向代理到 127.0.0.1:8080。
//   H5 端因此始终调用「当前站点同源的 /api」，电脑调试 / 模拟器 / 线上都不用改配置。
//
// 站点已启用 HTTPS（https://imessage.uno），带来的好处：
//   · 浏览器允许定位（HTTP 下 navigator.geolocation 被禁止）
//   · WebSocket 走 wss，不会被混合内容拦截
//   · App 端不再触发 Android 9+ 的明文 HTTP 限制
//
// 本地开发时 Vite 也把 /api 代理到 8080（见 vite.config.js），规则完全一致。

// #ifdef H5
var ORIGIN = (typeof location !== 'undefined' && location.origin) ? location.origin : 'http://127.0.0.1:5173'
var API_HOST = ORIGIN + '/api'
// #endif

// #ifndef H5
// ↓↓↓ 打包成 App 时用这里：走 HTTPS 域名
//     本地真机调试可临时改成 http://<电脑局域网IP>:8080
var API_HOST = 'https://imessage.uno/api'
// #endif

// WebSocket 地址由 HTTP 地址推导，无需单独维护
// http -> ws，https -> wss
const WS_HOST = API_HOST.replace(/^http/, 'ws')

export default {
	API_HOST,
	WS_HOST
}
