@echo off
chcp 936 >nul
title 重新构建后端 chat-api

set "JAVA_HOME=%~dp0tools\jdk8u504-b01"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "MAVEN_OPTS=-Dfile.encoding=UTF-8"

echo ================================================
echo   重新构建后端 (mvn clean package -DskipTests)
echo ================================================
echo.

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [错误] 未找到 JDK8: %JAVA_HOME%
    pause
    exit /b 1
)

call "%~dp0tools\apache-maven-3.9.9\bin\mvn.cmd" -s "%~dp0tools\maven-settings.xml" -f "%~dp0backend\pom.xml" clean package -DskipTests

echo.
if %ERRORLEVEL%==0 (
    echo [成功] 构建完成: backend\target\chat-api.jar
) else (
    echo [失败] 构建失败，请查看上方日志。
)
pause
