@echo off
chcp 936 >nul
title 停止 微聊 IM 本地服务

echo ================================================
echo   停止 微聊 IM 本地服务（保留计划任务）
echo ================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\service-manager.ps1" stop

echo.
echo 提示 计划任务仍保留，双击 0-安装并启动服务.cmd 可再次启动。
echo.
pause
