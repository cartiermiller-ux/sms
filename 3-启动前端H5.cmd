@echo off
chcp 936 >nul
title 启动前端 H5 (http://127.0.0.1:5173)

cd /d "%~dp0frontend"

echo ================================================
echo   启动前端 H5 开发服务器
echo   地址 http://127.0.0.1:5173
echo ================================================
echo.

if not exist "node_modules" (
    echo [提示] 未检测到 node_modules，正在安装依赖 ...
    call npm install --no-audit --no-fund
)

echo [提示] 首次启动需要编译，请稍等。
echo        关闭本窗口即可停止前端服务。
echo.

call npm run dev:h5

echo.
echo [结束] 前端进程已退出。
pause
