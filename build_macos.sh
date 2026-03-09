#!/bin/bash

set -e

echo "🍎 构建 macOS 应用"
echo "=================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣ 清理旧的构建产物..."
rm -rf target/release/bundle/macos
rm -rf target/release/bundle/dmg
echo -e "${GREEN}✅ 清理完成${NC}"

echo ""
echo "2️⃣ 构建 macOS 应用（这可能需要 5-10 分钟）..."
cargo tauri build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 构建成功${NC}"

echo ""
echo "3️⃣ 查找构建产物..."

# 查找 .app 和 .dmg 文件
APP_PATH=$(find target/release/bundle/macos -name "*.app" -type d | head -1)
DMG_PATH=$(find target/release/bundle/dmg -name "*.dmg" -type f | head -1)

echo ""
echo "=================================="
echo -e "${GREEN}🎉 构建完成！${NC}"
echo "=================================="
echo ""
echo "📦 构建产物:"
echo ""

if [ -n "$APP_PATH" ]; then
    APP_SIZE=$(du -sh "$APP_PATH" | cut -f1)
    echo "   • 应用包: $APP_PATH"
    echo "     大小: $APP_SIZE"
fi

if [ -n "$DMG_PATH" ]; then
    DMG_SIZE=$(du -sh "$DMG_PATH" | cut -f1)
    echo ""
    echo "   • DMG 镜像: $DMG_PATH"
    echo "     大小: $DMG_SIZE"
fi

echo ""
echo "📋 使用方法:"
echo "   1. 双击 .dmg 文件打开"
echo "   2. 将应用拖到 Applications 文件夹"
echo "   3. 从启动台或 Applications 文件夹运行"
echo ""
echo "💡 分发给他人:"
echo "   • 发送 .dmg 文件即可"
echo "   • 首次打开可能需要在系统偏好设置中允许"
echo ""
