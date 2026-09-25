<#
    微聊 IM 本地部署 - 服务管理
    用 Windows 计划任务托管三个服务，使其独立于任何终端会话，开机自动启动。

    用法：
        powershell -ExecutionPolicy Bypass -File service-manager.ps1 install     安装并启动
        powershell -ExecutionPolicy Bypass -File service-manager.ps1 start       启动
        powershell -ExecutionPolicy Bypass -File service-manager.ps1 stop        停止
        powershell -ExecutionPolicy Bypass -File service-manager.ps1 restart     重启
        powershell -ExecutionPolicy Bypass -File service-manager.ps1 status      查看状态
        powershell -ExecutionPolicy Bypass -File service-manager.ps1 uninstall   停止并删除
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('install', 'start', 'stop', 'restart', 'status', 'uninstall')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

# 部署根目录 = 本脚本所在目录(tools)的上一级
$DeployRoot = Split-Path -Parent $PSScriptRoot

$MySQLExe = 'C:\likeshop-local\mysql\bin\mysqld.exe'
$MySQLIni = 'C:\likeshop-local\my.ini'
$NpmCmd   = 'C:\Program Files\nodejs\npm.cmd'

$Ports = @(
    @{ Port = 3306; Label = 'MySQL      ' },
    @{ Port = 8080; Label = '后端 chat-api' },
    @{ Port = 5173; Label = '前端 H5    ' },
    @{ Port = 6379; Label = 'Redis      ' }
)

function Get-ServiceSpecs {
    @(
        @{
            Name       = 'IM-Local-MySQL'
            Exe        = $MySQLExe
            Arg        = ('--defaults-file={0}' -f $MySQLIni)
            WorkingDir = 'C:\likeshop-local'
            Desc       = '微聊IM 本地部署 - MySQL (3306)'
        },
        @{
            Name       = 'IM-Local-Backend'
            Exe        = (Join-Path $DeployRoot 'tools\jdk8u504-b01\bin\java.exe')
            Arg        = ('-Dfile.encoding=UTF-8 -jar "{0}"' -f (Join-Path $DeployRoot 'backend\target\chat-api.jar'))
            WorkingDir = (Join-Path $DeployRoot 'backend')
            Desc       = '微聊IM 本地部署 - 后端 chat-api (8080)'
        },
        @{
            Name       = 'IM-Local-Frontend'
            Exe        = $NpmCmd
            Arg        = 'run dev:h5'
            WorkingDir = (Join-Path $DeployRoot 'frontend')
            Desc       = '微聊IM 本地部署 - 前端 H5 (5173)'
        }
    )
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PortState([int]$Port) {
    $c = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($c) { return $true }
    return $false
}

function Show-Status {
    Write-Host '================= 计划任务 ================='
    foreach ($s in Get-ServiceSpecs) {
        $t = Get-ScheduledTask -TaskName $s.Name -ErrorAction SilentlyContinue
        if ($null -eq $t) {
            Write-Host ('  {0,-18} 未安装' -f $s.Name)
        }
        else {
            $i = $t | Get-ScheduledTaskInfo
            Write-Host ('  {0,-18} {1,-10} 上次运行 {2}' -f $t.TaskName, $t.State, $i.LastRunTime)
        }
    }
    Write-Host ''
    Write-Host '================= 端口 ================='
    foreach ($p in $Ports) {
        $state = if (Get-PortState $p.Port) { '运行中' } else { '未运行' }
        Write-Host ('  {0}  {1}' -f $p.Label, $state)
    }
    Write-Host ''
    Write-Host '  前端地址  http://127.0.0.1:5173'
    Write-Host '  后端地址  http://127.0.0.1:8080'
    Write-Host '  演示账号  13800000002 / abc12345  (张三丰)'
    Write-Host '            13800000003 / abc12345  (李四)'
}

function Invoke-Install {
    if (-not (Test-Admin)) {
        Write-Host '[错误] 注册计划任务需要管理员权限。'
        Write-Host '       请右键本脚本 -> 以管理员身份运行。'
        exit 1
    }
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
    $trigger = New-ScheduledTaskTrigger -AtLogOn

    foreach ($s in Get-ServiceSpecs) {
        if (-not (Test-Path $s.Exe)) {
            Write-Host ('[错误] 找不到可执行文件: {0}' -f $s.Exe)
            exit 1
        }
        $a = New-ScheduledTaskAction -Execute $s.Exe -Argument $s.Arg -WorkingDirectory $s.WorkingDir
        Register-ScheduledTask -TaskName $s.Name -Action $a -Trigger $trigger `
            -Settings $settings -Force -Description $s.Desc | Out-Null
        Write-Host ('[已注册] {0}' -f $s.Name)
    }
    Write-Host ''
    Invoke-Start
}

function Invoke-Start {
    foreach ($s in Get-ServiceSpecs) {
        $t = Get-ScheduledTask -TaskName $s.Name -ErrorAction SilentlyContinue
        if ($null -eq $t) {
            Write-Host ('[跳过] {0} 未安装，请先执行 install' -f $s.Name)
            continue
        }
        if ($t.State -eq 'Running') {
            Write-Host ('[跳过] {0} 已在运行' -f $s.Name)
            continue
        }
        Start-ScheduledTask -TaskName $s.Name
        Write-Host ('[已启动] {0}' -f $s.Name)
    }
    Write-Host ''
    Write-Host '等待服务就绪（约 60 秒）...'
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        if ((Get-PortState 8080) -and (Get-PortState 5173) -and (Get-PortState 3306)) { break }
    }
    Write-Host ''
    Show-Status
}

function Invoke-Stop {
    foreach ($s in Get-ServiceSpecs) {
        $t = Get-ScheduledTask -TaskName $s.Name -ErrorAction SilentlyContinue
        if ($null -eq $t) { continue }
        if ($t.State -ne 'Running') {
            Write-Host ('[跳过] {0} 未在运行' -f $s.Name)
            continue
        }
        Stop-ScheduledTask -TaskName $s.Name
        Write-Host ('[已停止] {0}' -f $s.Name)
    }
    # 计划任务停止后子进程可能仍在，兜底按端口清理
    Start-Sleep -Seconds 3
    foreach ($p in $Ports) {
        foreach ($c in (Get-NetTCPConnection -State Listen -LocalPort $p.Port -ErrorAction SilentlyContinue)) {
            if ($p.Port -eq 6379) { continue }   # Redis 是独立服务，不动
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host ('[强制结束] 端口 {0} 的残留进程 {1}' -f $p.Port, $c.OwningProcess)
        }
    }
}

function Invoke-Uninstall {
    Invoke-Stop | Out-Null
    foreach ($s in Get-ServiceSpecs) {
        $t = Get-ScheduledTask -TaskName $s.Name -ErrorAction SilentlyContinue
        if ($null -eq $t) {
            Write-Host ('[跳过] {0} 未安装' -f $s.Name)
            continue
        }
        Unregister-ScheduledTask -TaskName $s.Name -Confirm:$false
        Write-Host ('[已删除] {0}' -f $s.Name)
    }
    Write-Host ''
    Write-Host '已卸载。之后需要手动运行 1/2/3 脚本启动服务。'
}

switch ($Action) {
    'install'   { Invoke-Install }
    'start'     { Invoke-Start }
    'stop'      { Invoke-Stop;     Write-Host ''; Show-Status }
    'restart'   { Invoke-Stop | Out-Null; Start-Sleep -Seconds 3; Invoke-Start }
    'status'    { Show-Status }
    'uninstall' { Invoke-Uninstall }
}
