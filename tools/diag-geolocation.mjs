// 检测浏览器定位能力：安全上下文、权限、实际取点结果
// 用法: node diag-geolocation.mjs <cdpPort> <url>
import fs from 'node:fs'

const CDP_PORT = Number(process.argv[2] || 9222)
const TARGET = process.argv[3] || 'http://120.24.175.80/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
const ws = new WebSocket(page.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('WS 失败')) })
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id); pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  }
}
const send = (method, params) => new Promise((resolve, reject) => {
  const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') }
  return r.result?.value
}

await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true })
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

console.log('目标:', TARGET)
await send('Page.navigate', { url: 'about:blank' }); await sleep(1000)
await send('Page.navigate', { url: TARGET }); await sleep(12000)

const r1 = await evaluate(`JSON.stringify({
  isSecureContext: window.isSecureContext,
  protocol: location.protocol,
  host: location.host,
  hasGeolocation: !!navigator.geolocation,
  permissionsAPI: !!navigator.permissions
}, null, 2)`)
console.log('\n===== 环境 =====')
console.log(r1)

// 授权定位后实际调用一次
try {
  await send('Browser.grantPermissions', { origin: new URL(TARGET).origin, permissions: ['geolocation'] })
  console.log('\n（已尝试授予定位权限）')
} catch (e) { console.log('\n授予权限失败:', e.message) }

// 设置一个模拟坐标：云南临沧附近 23.88, 100.09
await send('Emulation.setGeolocationOverride', { latitude: 23.8777, longitude: 100.0894, accuracy: 50 })

const r2 = await evaluate(`
  new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(JSON.stringify({ ok:false, reason:'navigator.geolocation 不存在' })); return; }
    const t = setTimeout(() => resolve(JSON.stringify({ ok:false, reason:'超时无响应' })), 8000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); resolve(JSON.stringify({ ok:true, lat:p.coords.latitude, lng:p.coords.longitude, acc:p.coords.accuracy })); },
      (e) => { clearTimeout(t); resolve(JSON.stringify({ ok:false, code:e.code, message:e.message })); },
      { timeout: 7000 }
    );
  })
`)
console.log('\n===== navigator.geolocation 调用结果 =====')
console.log(r2)

// 再通过 uni.getLocation 走一遍（uni-app 的封装）
const r3 = await evaluate(`
  new Promise((resolve) => {
    if (typeof uni === 'undefined') { resolve('uni 未定义'); return; }
    uni.getLocation({
      type: 'wgs84',
      success: (res) => resolve('成功: ' + JSON.stringify(res)),
      fail: (err) => resolve('失败: ' + JSON.stringify(err)),
    });
    setTimeout(() => resolve('uni.getLocation 超时无回调'), 8000);
  })
`)
console.log('\n===== uni.getLocation 调用结果 =====')
console.log(r3)

ws.close()
