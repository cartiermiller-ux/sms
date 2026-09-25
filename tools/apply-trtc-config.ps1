# ============================================================
#  给线上后端写入真实的腾讯云 TRTC 凭据
#
#  用法：
#     powershell -ExecutionPolicy Bypass -File apply-trtc-config.ps1 `
#         -SdkAppId 1600164367 -SecretKey 295a079c...8574
#
#  为什么不用重新打包 jar：
#     Spring Boot 的外部配置优先级高于 jar 内的 BOOT-INF/classes/application-server.yml，
#     把 trtc 段单独写到 jar 同级的 config/ 目录即可覆盖，不用编译、不用动 jar。
#     外置文件名要和 profile 对齐：application-server.yml ← --spring.profiles.active=server
#
#  改完为什么要清 Redis：
#     TrtcServiceImpl.getSign() 会把签名缓存到 chat:trtc:sign:<userId>，
#     不清的话旧 appId 生成的签名会一直用到过期（7 天）。
#
#  实现注意：
#     bash 脚本用「不插值的」单引号 here-string 写，参数用占位符 __APPID__ / __SECRET__ 替换。
#     之前用 @"..."@ 插值 here-string，里面的 bash $(date +%s) 和 \$VAR 会被 PowerShell
#     先吃掉（$(...) 是子表达式、\$ 不是转义），结果脚本在远端跑不起来。
# ============================================================
param(
	[Parameter(Mandatory = $true)][string]$SdkAppId,
	[Parameter(Mandatory = $true)][string]$SecretKey,
	[Parameter(Mandatory = $false)][int]$Expire = 604800
)

$ErrorActionPreference = 'Stop'

if ($SdkAppId -notmatch '^\d{6,}$') {
	Write-Host "SdkAppId 必须是纯数字（腾讯云 TRTC 控制台的 SDKAppID，形如 1400xxxxxx），当前传的是：$SdkAppId" -ForegroundColor Red
	exit 1
}
if ($SecretKey -notmatch '^[0-9a-fA-F]{32,}$') {
	Write-Host "SecretKey 应该是 32 位以上的十六进制字符串，当前长度 $($SecretKey.Length)" -ForegroundColor Red
	exit 1
}

$SSH_HOST = '120.24.175.80'
$SSH_PORT = 22
$SSH_USER = 'root'
$SSH_PASS = '<REDACTED_SSH_PASSWORD>'
$SSH_TOOL = 'C:\im-local\ssh-tool\ssh-run.mjs'
$NODE = 'C:\Program Files\nodejs\node.exe'

$template = @'
set -e
BK=/www/wwwroot/msm/backend
mkdir -p $BK/config
[ -f $BK/chat-api.jar ] && cp -f $BK/chat-api.jar /tmp/chat-api.jar.bak-$(date +%s) || true
cat > $BK/config/application-server.yml <<'YML'
# 由 _deploy/tools/apply-trtc-config.ps1 写入：覆盖 jar 内 trtc 的占位符
trtc:
  appId: __APPID__
  expire: __EXPIRE__
  secret: __SECRET__
YML
chmod 600 $BK/config/application-server.yml
echo '--- 写入内容（secret 打码）---'
sed -E 's/(secret: ).*/\1***(已设置)/' $BK/config/application-server.yml
echo '--- 清掉旧的 TRTC 签名缓存 ---'
redis-cli --scan --pattern 'chat:trtc:sign:*' | while read k; do redis-cli DEL "$k" >/dev/null; done
echo "剩余签名缓存条数: $(redis-cli --scan --pattern 'chat:trtc:sign:*' | wc -l)"
echo '--- 重启后端 ---'
systemctl restart msm-backend
sleep 14
echo -n 'msm-backend 状态: '; systemctl is-active msm-backend
echo '--- 后端日志尾部 ---'
journalctl -u msm-backend -n 8 --no-pager | tail -8
'@

$remote = $template.Replace('__APPID__', $SdkAppId).Replace('__SECRET__', $SecretKey).Replace('__EXPIRE__', [string]$Expire)
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remote))

Write-Host "正在把 TRTC 配置推到 $SSH_HOST ..." -ForegroundColor Cyan
& $NODE $SSH_TOOL $SSH_HOST $SSH_PORT $SSH_USER $SSH_PASS "echo $b64 | base64 -d > /tmp/_trtc.sh && bash /tmp/_trtc.sh; rm -f /tmp/_trtc.sh" 2>&1 |
	ForEach-Object { ([string]$_).TrimEnd() }
