#!/bin/bash

# 中国汽油价格管理系统 - macOS 打包脚本（通用版本）
# 注意：此脚本构建同时支持 Intel 和 Apple Silicon 的通用二进制
# Windows 应用需要在 Windows 系统上使用 build_package.bat 打包

set -e

echo "🚀 中国汽油价格管理系统 - macOS 通用版打包工具"
echo "========================================"
echo ""

# 检测平台
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 此脚本只能在 macOS 上运行"
    echo "💡 Windows 打包请在 Windows 系统上运行 build_package.bat"
    exit 1
fi

echo "📍 当前平台: macOS"
echo "🎯 构建目标: 通用二进制 (Intel + Apple Silicon)"
echo ""

# 环境检查
echo "🔧 检查构建环境..."

# 检查 Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ 未安装 Rust 工具链"
    echo "请访问 https://rustup.rs/ 安装 Rust"
    exit 1
fi

RUST_VERSION=$(rustc --version | awk '{print $2}')
echo "✅ Rust 版本: $RUST_VERSION"

# 检查 Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    echo "⚠️  未安装 Tauri CLI，正在安装..."
    cargo install tauri-cli
fi

echo "✅ Tauri CLI 已安装"

# 检查图标文件
if [ ! -f "icons/icon.icns" ]; then
    echo "❌ 缺少 macOS 图标文件: icons/icon.icns"
    exit 1
fi
echo "✅ macOS 图标文件存在"

echo ""

# 清理旧构建
echo "🧹 清理旧构建产物..."
if [ -d "target/release/bundle" ]; then
    rm -rf target/release/bundle
    echo "✅ 已删除旧的 bundle 目录"
else
    echo "✅ 无需清理"
fi

echo ""

# 安装目标架构
echo "🎯 准备构建目标..."
rustup target add x86_64-apple-darwin 2>/dev/null || true
rustup target add aarch64-apple-darwin 2>/dev/null || true
echo "✅ 构建目标已准备"

echo ""

# 执行打包
echo "🏗️  开始打包通用版本..."
echo ""

# 构建 Intel 版本
echo "📦 构建 Intel (x86_64) 版本..."
cargo tauri build --target x86_64-apple-darwin

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Intel 版本打包失败"
    exit 1
fi

echo ""
echo "📦 构建 Apple Silicon (arm64) 版本..."
cargo tauri build --target aarch64-apple-darwin

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Apple Silicon 版本打包失败"
    exit 1
fi

echo ""
echo "🔗 合并为通用二进制..."

# 创建通用应用
APP_NAME="中国汽油价格管理"
INTEL_APP="target/x86_64-apple-darwin/release/bundle/macos/${APP_NAME}.app"
ARM_APP="target/aarch64-apple-darwin/release/bundle/macos/${APP_NAME}.app"
UNIVERSAL_APP="target/universal/${APP_NAME}.app"

rm -rf target/universal
mkdir -p target/universal
cp -R "$ARM_APP" "$UNIVERSAL_APP"

# 合并二进制
lipo -create \
    "$INTEL_APP/Contents/MacOS/${APP_NAME}" \
    "$ARM_APP/Contents/MacOS/${APP_NAME}" \
    -output "$UNIVERSAL_APP/Contents/MacOS/${APP_NAME}"

echo ""
echo "✅ 打包成功！"
echo ""

# 显示构建产物
echo "📦 构建产物:"
echo ""

echo "通用应用包 (Intel + Apple Silicon):"
SIZE=$(du -sh "$UNIVERSAL_APP" | awk '{print $1}')
echo "  • $UNIVERSAL_APP ($SIZE)"

# 验证架构
echo ""
echo "🔍 验证架构:"
lipo -info "$UNIVERSAL_APP/Contents/MacOS/${APP_NAME}"

echo ""
echo "🎉 打包完成！可以开始分发应用了"
echo ""
echo "💡 提示:"
echo "  - 通用应用位于: target/universal/"
echo "  - 此版本同时支持 Intel 和 Apple Silicon Mac"
echo "  - 如需代码签名，请配置 tauri.conf.json 中的 signingIdentity"
echo ""
echo "⚠️  注意: Windows 应用需要在 Windows 系统上打包"
echo "   请将项目复制到 Windows 系统，运行 build_package.bat"
