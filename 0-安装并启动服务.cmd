@echo off
chcp 936 >nul
title 安装并启动 微聊 IM 本地服务

rem 注册计划任务需要管理员权限，不是管理员就自动申请提升
net session >nul 2>&1
if errorlevel 1 (
    echo 正在申请管理员权限 ...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================
echo   安装并启动 微聊 IM 本地服务
echo   用 Windows 计划任务托管，开机自动启动
echo ================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\service-manager.ps1" install

echo.
pause
