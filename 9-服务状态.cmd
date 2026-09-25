@echo off
chcp 936 >nul
title 微聊 IM 本地服务状态

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\service-manager.ps1" status

echo.
pause
