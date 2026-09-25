@echo off
chcp 936 >nul
title 打包前端 H5 静态产物

cd /d "%~dp0frontend"

echo ================================================
echo   打包 H5 静态文件
echo ================================================
echo.

if not exist "node_modules" (
    echo [提示] 未检测到 node_modules，正在安装依赖 ...
    call npm install --no-audit --no-fund
)

call npm run build:h5

echo.
if %ERRORLEVEL%==0 (
    echo [成功] 产物目录: frontend\dist\build\h5
    echo        可用任意静态服务器托管，例如:
    echo        npx serve frontend\dist\build\h5
) else (
    echo [失败] 打包失败，请查看上方日志。
)
pause
