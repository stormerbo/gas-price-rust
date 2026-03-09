@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 中国汽油价格管理系统 - 打包工具
echo ========================================
echo.

echo 📍 检测到平台: Windows
echo.

REM 环境检查
echo 🔧 检查构建环境...

REM 检查 Rust
where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未安装 Rust 工具链
    echo 请访问 https://rustup.rs/ 安装 Rust
    exit /b 1
)

for /f "tokens=2" %%i in ('rustc --version') do (
    echo ✅ Rust 版本: %%i
    goto :rust_found
)
:rust_found

REM 检查 Tauri CLI
where cargo-tauri >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未安装 Tauri CLI，正在安装...
    cargo install tauri-cli
)

echo ✅ Tauri CLI 已安装

REM 检查图标文件
if not exist "icons\icon.ico" (
    echo ❌ 缺少 Windows 图标文件: icons\icon.ico
    exit /b 1
)
echo ✅ Windows 图标文件存在

echo.

REM 清理旧构建
echo 🧹 清理旧构建产物...
if exist "target\release\bundle" (
    rmdir /s /q "target\release\bundle"
    echo ✅ 已删除旧的 bundle 目录
) else (
    echo ✅ 无需清理
)

echo.

REM 执行打包
echo 🏗️  开始打包...
echo.

cargo tauri build

if %errorlevel% neq 0 (
    echo.
    echo ❌ 打包失败
    exit /b 1
)

echo.
echo ✅ 打包成功！
echo.

REM 显示构建产物
echo 📦 构建产物:
echo.
echo Windows 安装包:

for /r "target\release\bundle\msi" %%f in (*.msi) do (
    echo   • %%f
)

echo.
echo 🎉 打包完成！可以开始分发应用了
echo.
echo 💡 提示:
echo   - .msi 文件位于: target\release\bundle\msi\
echo   - 安装包已配置 WebView2 自动下载
echo   - 如需代码签名，请配置 tauri.conf.json 中的 certificateThumbprint

pause
