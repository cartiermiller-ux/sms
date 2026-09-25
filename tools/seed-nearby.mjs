// 在服务器上造「附近的人」测试数据：注册用户 + 上报位于果敢老街/临沧一带的坐标
// 用法: node seed-nearby.mjs <baseUrl> <commonPassword>

const BASE = process.argv[2] || 'http://120.24.175.80/api'
const PWD = process.argv[3] || 'abc12345'

import crypto from 'node:crypto'
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex')

const H = { device: 'H5', version: '1.2.0', 'Content-Type': 'application/json' }

async function post(path, body, extraHeaders = {}) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { ...H, ...extraHeaders },
    body: JSON.stringify(body)
  })
  return r.json()
}

// 地点按纬度从北到南，均在果敢老街 / 临沧一带
const users = [
  { phone: '13900000011', nick: '临沧老王',   lat: 23.8777, lng: 100.0894, place: '临沧市区' },
  { phone: '13900000012', nick: '南伞阿强',   lat: 23.7624, lng: 98.8256,  place: '镇康南伞口岸' },
  { phone: '13900000013', nick: '孟定小玉',   lat: 23.5607, lng: 99.0865,  place: '孟定镇' },
  { phone: '13900000014', nick: '清水河老李', lat: 23.8611, lng: 98.7100,  place: '清水河口岸' },
  { phone: '13900000015', nick: '老街阿珍',   lat: 23.6919, lng: 98.7603,  place: '果敢老街' }
]

const pwdHash = md5(PWD)
const FIXED_CODE = process.argv[4] || '8888'   // 由 scripts/seed-codes.sh 直接写入 Redis，绕开发送频率限制

for (const u of users) {
  try {
    // 1) 尝试注册（验证码已由 seed-codes.sh 预置到 Redis）
    const reg = await post('/auth/register', { phone: u.phone, password: pwdHash, nickName: u.nick, code: FIXED_CODE })
    let tag = ''
    if (reg.code === 200) {
      tag = '[新建]  '
    } else if (/已注册/.test(reg.msg || '')) {
      tag = '[已存在]'
    } else {
      console.log(`  [失败] ${u.phone} 注册: ${reg.msg}`)
      continue
    }
    // 2) 登录拿 token
    const l = await post('/auth/login', { phone: u.phone, password: pwdHash })
    if (l.code !== 200) { console.log(`  [失败] ${u.phone} 登录: ${l.msg}`); continue }
    // 3) 上报坐标到「附近的人」
    const n = await post('/near/doNear', { longitude: u.lng, latitude: u.lat }, { Authorization: l.data.token })
    const cnt = Array.isArray(n.data) ? n.data.length : '?'
    console.log(`  ${tag} ${u.phone} ${u.nick.padEnd(6)} @ ${u.place.padEnd(12)} 上报坐标 -> code=${n.code}, 能看到附近 ${cnt} 人`)
  } catch (e) {
    console.log(`  [异常] ${u.phone}: ${e.message}`)
  }
  await new Promise((r) => setTimeout(r, 1200))
}

console.log('\n完成。可登录任意一个账号查看「附近的人」。')
