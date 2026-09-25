@echo off
chcp 936 >nul
title 启动后端 chat-api (http://127.0.0.1:8080)

cd /d "%~dp0backend"

set "JAVA_HOME=%~dp0tools\jdk8u504-b01"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo ================================================
echo   启动后端 chat-api
echo   地址 http://127.0.0.1:8080
echo ================================================
echo.

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [错误] 未找到 JDK8: %JAVA_HOME%
    pause
    exit /b 1
)

if not exist "target\chat-api.jar" (
    echo [错误] 未找到 target\chat-api.jar
    echo        请先运行  rebuild-backend.cmd  重新构建。
    pause
    exit /b 1
)

echo [提示] 启动前请确认 MySQL 与 Redis 已经在运行。
echo        关闭本窗口即可停止后端服务。
echo.

"%JAVA_HOME%\bin\java.exe" -Dfile.encoding=UTF-8 -jar "target\chat-api.jar"

echo.
echo [结束] 后端进程已退出。
pause
