@echo off
chcp 936 >nul
title 卸载 微聊 IM 本地服务

net session >nul 2>&1
if errorlevel 1 (
    echo 正在申请管理员权限 ...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================
echo   卸载 微聊 IM 本地服务
echo   停止服务并删除计划任务（不会删除数据）
echo ================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\service-manager.ps1" uninstall

echo.
pause
