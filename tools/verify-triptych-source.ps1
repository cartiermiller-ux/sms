# 三栏改造 —— 独立验证（退出登录逐行一致 + IM 逻辑完整性）
$ErrorActionPreference = 'Continue'
$fe = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\frontend\src"
$tools = "C:\我的下载\Uniapp+SpringBoot即时通讯APP源码 安卓iOS跨端\_deploy\tools"
$script:fail = 0

function Chk($label, $ok, $detail) {
    if ($ok) { Write-Host ("   OK   " + $label + $(if ($detail) { "  -> " + $detail } else { "" })) }
    else { Write-Host ("   FAIL " + $label + $(if ($detail) { "  -> " + $detail } else { "" })); $script:fail++ }
}
function ReadU8($p) { return [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }

# 取某个方法的方法体（花括号配对）
function Method-Body($text, $name) {
    $i = $text.IndexOf($name + '(')
    if ($i -lt 0) { return $null }
    $j = $text.IndexOf('{', $i); if ($j -lt 0) { return $null }
    $depth = 0
    for ($k = $j; $k -lt $text.Length; $k++) {
        if ($text[$k] -eq '{') { $depth++ }
        elseif ($text[$k] -eq '}') { $depth--; if ($depth -eq 0) { return $text.Substring($j, $k - $j + 1) } }
    }
    return $null
}
# 去注释、去所有空白，只留代码骨架
function Norm($code) {
    $c = [regex]::Replace($code, '(?m)^\s*//.*$', '')
    $c = [regex]::Replace($c, '//.*$', '')
    $c = [regex]::Replace($c, '\s+', '')
    return $c
}

$sys  = ReadU8 "$fe\wx\system\index.vue"
$tab4 = ReadU8 "$fe\wx\tabbar4\index.vue"
$t1   = ReadU8 "$fe\wx\tabbar1\index.vue"
$t2   = ReadU8 "$fe\wx\tabbar2\index.vue"
$apk  = ReadU8 "$tools\rebuild-apk-v2.ps1"

Write-Host "=== E. 退出登录逻辑：新设置页 vs 原 system/index.vue ==="
$bSys  = Norm (Method-Body $sys  'loginOut')
$bTab4 = Norm (Method-Body $tab4 'loginOut')
Write-Host ("   原实现 " + $bSys.Length + " 字符 / 新实现 " + $bTab4.Length + " 字符")
Chk "loginOut 主体逐字一致（去注释去空白）" ($bSys -eq $bTab4)
if ($bSys -ne $bTab4) {
    Write-Host "   --- 原 ---"
    Write-Host ("   " + $bSys)
    Write-Host "   --- 新 ---"
    Write-Host ("   " + $bTab4)
}
Chk "调用 /my/logout" ($bTab4.Contains('/my/logout'))
Chk "清除 Authorization" ($bTab4.Contains("removeStorageSync('Authorization')"))
Chk "H5 断 socket" ($bTab4.Contains('socketTaskClose'))
Chk "App 登出音视频" ($bTab4.Contains('TUICalling.logout'))
Chk "先回启动页" ($bTab4.Contains('pages/wxindex/index'))
Chk "TUICalling 条件导入仍在" ($tab4 -match '(?s)#ifdef APP-PLUS\s*const TUICalling = uni.requireNativePlugin')
Chk "退出登录有二次确认（showModal）" ($tab4 -match 'showModal')

Write-Host ""
Write-Host "=== F. 消息页（tabbar1）==="
Chk "标签 4 项含置顶" ($t1 -match "tabs: \['全部', '未读', '群聊', '置顶'\]")
Chk "置顶过滤 tabIndex===3 / top==='Y'" ($t1.Contains("if (this.tabIndex === 3) arr = arr.filter(v => v.top === 'Y');"))
Chk "不再设 index:2 角标" (-not $t1.Contains('setTabBarBadge({ index: 2'))
Chk "主动清 index:2 遗留角标" ($t1.Contains('removeTabBarBadge({ index: 2 })'))
Chk "聊天未读角标仍 index:0" ($t1.Contains('setTabBarBadge({ index: 0'))
Chk "好友申请角标仍 index:1" ($t1.Contains('setTabBarBadge({ index: 1'))
Chk "无独立搜索行" (-not $t1.Contains('class="msm-search"'))
foreach ($k in @('clickToSubmitSure', '../chatWindow/index?userId=', 'tabBarpull', 'openTool', 'open-tool', 'top-right-tool-wx', 'onLongPress', 'debounce')) {
    Chk ("IM 调用保留: " + $k) ($t1.Contains($k))
}

Write-Host ""
Write-Host "=== G. 通讯录页（tabbar2）==="
foreach ($k in @('/friend/friendList', 'sortList', '../personInfo/detail?param=', '../search-friends/index', '../groupInfo/grouplist', 'saoyisao', 'top-right-tool-wx')) {
    Chk ("IM 调用保留: " + $k) ($t2.Contains($k))
}
Chk "无独立搜索行" (-not $t2.Contains('class="msm-search"'))

Write-Host ""
Write-Host "=== H. 设置页（tabbar4）==="
foreach ($k in @('朋友圈', '收藏', '扫一扫', '附近的人', '账号与安全', '隐私与安全', '新消息通知', '关于 Msm', '退出登录', 'Msm ID')) {
    Chk ("含「" + $k + "」") ($tab4.Contains($k))
}
$navTargets = @{
    '../personDetail/index'  = 'wx\personDetail\index.vue'
    '../friendsCircle/index' = 'wx\friendsCircle\index.vue'
    '../favorites/index'     = 'wx\favorites\index.vue'
    '../nearby/index'        = 'wx\nearby\index.vue'
    '../system/index'        = 'wx\system\index.vue'
    '/pages/agreement/index' = 'pages\agreement\index.vue'
}
foreach ($k in $navTargets.Keys) {
    Chk ("跳转目标文件存在: " + $k) (Test-Path (Join-Path $fe $navTargets[$k]))
}
Chk "退出登录用危险色类" ($tab4.Contains('row__label--danger'))
Chk "行内无图标（纯工具风）" (-not ($tab4 -match '(?s)<view class="row"[^>]*>\s*<uni-icons'))

Write-Host ""
Write-Host "=== I. APK 重打包脚本 tabBar ==="
$m = [regex]::Match($apk, '(?s)\$tb\.list = @\(.*?\n\)')
Chk "tabBar 列表已整体重建" ($m.Success)
if ($m.Success) {
    $n = ([regex]::Matches($m.Value, "pagePath = '([^']+)'")).Count
    Chk "重建为 3 条" ($n -eq 3) ($n.ToString() + " 条")
    Chk "含 settings 图标" ($m.Value.Contains('settings.png'))
    Chk "不含 discover/me 图标" (-not ($m.Value -match 'discover|me\.png'))
}
Chk "已移除旧的 newIcons 循环" (-not $apk.Contains('$newIcons'))

Write-Host ""
Write-Host (">>> 断言失败总数: " + $script:fail)
if ($script:fail -gt 0) { exit 1 }
