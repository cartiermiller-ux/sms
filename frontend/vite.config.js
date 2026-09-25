import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// ============================================================
//  本地开发代理配置
// ============================================================
//  背景（2026-09-25 实测）：
//    这台机器上 8080 端口被 php.exe 占用、3306 被 C:\likeshop-local 的
//    MySQL 5.7 占用（root 密码与我们配置的不一致），导致本地 Java 后端
//    启动就报 "Access denied for user 'root'@'127.0.0.1'" 然后退出。
//    结果 vite 把 /api 全代理到那个 PHP 上，前端拿到 HTML 而不是 JSON，
//    页面就报「请求失败」。
//
//  默认行为：代理到【线上后端】https://imessage.uno
//    - 无需本地 MySQL / Java 后端，开箱可用
//    - 数据是线上真实数据，适合调前端
//
//  想切回本地后端：
//    PowerShell 里先设环境变量再启动
//        $env:API_TARGET="http://127.0.0.1:8080"; npm run dev:h5
//    前提是本地后端能起来（要先把 8080 空出来、MySQL 密码配对）。
// ============================================================

const LOCAL_BACKEND = 'http://127.0.0.1:8080'
const REMOTE_BACKEND = 'https://imessage.uno'

const API_TARGET = process.env.API_TARGET || REMOTE_BACKEND
const isLocalBackend = API_TARGET === LOCAL_BACKEND

console.log(`\n[dev] /api 代理目标 -> ${API_TARGET}${isLocalBackend ? '  (本地后端，去掉 /api 前缀)' : '  (线上，保留 /api 前缀)'}\n`)

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true, // WebSocket 升级同样要代理（前端连的是 /api/ws）
        // 本地后端直接监听根路径，需要去掉 /api；
        // 线上是 Nginx，路径本身就是 /api/xxx，不能去。
        rewrite: isLocalBackend ? (p) => p.replace(/^\/api/, '') : undefined
      },
      '/preview': {
        target: API_TARGET,
        changeOrigin: true
      }
    },
    watch: {
      // 忽略编辑器原子写产生的临时目录，否则 fs 监听会因文件被占用而 EBUSY 崩溃
      ignored: ['**/.*.tmpdir/**', '**/node_modules/**', '**/dist/**', '**/.git/**']
    }
  }
})
