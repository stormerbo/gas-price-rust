#!/bin/bash

# 直接运行二进制文件查看详细输出

APP_PATH="target/release/bundle/macos/中国汽油价格管理.app"
EXEC_PATH="$APP_PATH/Contents/MacOS/中国汽油价格管理"

echo "🧪 直接运行二进制文件测试"
echo "========================================"
echo ""

if [ ! -f "$EXEC_PATH" ]; then
    echo "❌ 可执行文件不存在"
    exit 1
fi

echo "1️⃣  关闭所有运行中的实例..."
pkill -f "中国汽油价格管理" || true
sleep 2

echo ""
echo "2️⃣  直接运行可执行文件（查看详细输出）..."
echo "   按 Ctrl+C 停止"
echo "========================================"
echo ""

"$EXEC_PATH" 2>&1
