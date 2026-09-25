@echo off
chcp 936 >nul
title 启动 MySQL - boot-im 数据库

set "MYSQL_BIN=C:\likeshop-local\mysql\bin"
set "MYSQL_INI=C:\likeshop-local\my.ini"

rem 带 /auto 参数时(供一键启动/开机自启调用)不等待按键
set "AUTO="
if /I "%~1"=="/auto" set "AUTO=1"

echo ================================================
echo   启动 MySQL (127.0.0.1:3306 / 库 boot-im)
echo ================================================
echo.

if not exist "%MYSQL_BIN%\mysqld.exe" (
    echo [错误] 未找到 %MYSQL_BIN%\mysqld.exe
    echo        请修改本脚本顶部的 MYSQL_BIN 变量，指向你的 MySQL 安装目录。
    if not defined AUTO pause
    exit /b 1
)

call :PORT_OPEN 3306
if not errorlevel 1 (
    echo [跳过] MySQL 已经在运行。
    goto :DONE
)

echo [执行] 正在启动 MySQL ...
rem 用独立窗口启动(/MIN)，这样关闭本窗口时不会把 MySQL 一起关掉
start "MySQL Server" /MIN "%MYSQL_BIN%\mysqld.exe" --defaults-file="%MYSQL_INI%"

echo [等待] 等待端口 3306 就绪 ...
set /a WAIT=0
:WAITLOOP
call :PORT_OPEN 3306
if not errorlevel 1 goto :STARTED
set /a WAIT+=1
if %WAIT% GEQ 40 goto :TIMEOUT
rem 用 ping 当 sleep，它不依赖标准输入，比 timeout 更可靠
ping -n 2 127.0.0.1 >nul
goto :WAITLOOP

:STARTED
echo [成功] MySQL 已启动。
goto :DONE

:TIMEOUT
echo [失败] 等待 40 秒后端口 3306 仍未就绪。
echo        请检查 %MYSQL_INI% 的配置以及数据目录是否正常。
if not defined AUTO pause
exit /b 1

:DONE
echo.
echo 连接信息  主机 127.0.0.1  端口 3306
echo 账号      root
echo 密码      root
echo 数据库    boot-im
echo.
echo 提示 MySQL 运行在独立的 "MySQL Server" 窗口里，
echo      关闭那个窗口才会停止 MySQL。
echo.
if not defined AUTO pause
exit /b 0

:PORT_OPEN
rem 端口处于 LISTENING 返回 0，否则返回 1
netstat -an | findstr /C:":%~1" | findstr /I "LISTENING" >nul
exit /b %ERRORLEVEL%
