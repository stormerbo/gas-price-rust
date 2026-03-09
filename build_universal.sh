#!/bin/bash

# 构建通用二进制（支持 Intel 和 Apple Silicon）

set -e

echo "🚀 构建通用二进制版本"
echo "========================================"
echo ""

echo "1️⃣  安装目标架构..."
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

echo ""
echo "2️⃣  清理旧构建..."
rm -rf target/release/bundle
rm -rf target/x86_64-apple-darwin/release/bundle
rm -rf target/aarch64-apple-darwin/release/bundle

echo ""
echo "3️⃣  构建 x86_64 (Intel) 版本..."
cargo tauri build --target x86_64-apple-darwin

echo ""
echo "4️⃣  构建 aarch64 (Apple Silicon) 版本..."
cargo tauri build --target aarch64-apple-darwin

echo ""
echo "5️⃣  创建通用二进制..."

# 获取应用名称
APP_NAME="中国汽油价格管理"
INTEL_APP="target/x86_64-apple-darwin/release/bundle/macos/${APP_NAME}.app"
ARM_APP="target/aarch64-apple-darwin/release/bundle/macos/${APP_NAME}.app"
UNIVERSAL_APP="target/universal/${APP_NAME}.app"

# 创建通用应用目录
rm -rf target/universal
mkdir -p target/universal

# 复制 ARM 版本作为基础
cp -R "$ARM_APP" "$UNIVERSAL_APP"

# 使用 lipo 合并二进制文件
INTEL_BIN="$INTEL_APP/Contents/MacOS/${APP_NAME}"
ARM_BIN="$ARM_APP/Contents/MacOS/${APP_NAME}"
UNIVERSAL_BIN="$UNIVERSAL_APP/Contents/MacOS/${APP_NAME}"

lipo -create "$INTEL_BIN" "$ARM_BIN" -output "$UNIVERSAL_BIN"

echo ""
echo "6️⃣  验证通用二进制..."
lipo -info "$UNIVERSAL_BIN"
file "$UNIVERSAL_BIN"

echo ""
echo "7️⃣  创建 DMG..."
DMG_NAME="${APP_NAME}_通用版_v0.1.0.dmg"
hdiutil create -volname "${APP_NAME} 通用版" \
    -srcfolder "$UNIVERSAL_APP" \
    -ov -format UDZO \
    "$DMG_NAME"

echo ""
echo "✅ 构建完成！"
echo ""
echo "📦 通用应用: $UNIVERSAL_APP"
echo "📦 DMG 文件: $DMG_NAME"
echo "📊 文件大小: $(du -h "$DMG_NAME" | cut -f1)"
echo ""
echo "💡 此版本同时支持："
echo "   - Intel Mac (x86_64)"
echo "   - Apple Silicon Mac (arm64)"
