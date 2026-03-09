#!/bin/bash

# 测试缺少资源文件的情况

APP_PATH="target/release/bundle/macos/中国汽油价格管理.app"
RESOURCES_PATH="$APP_PATH/Contents/Resources"

echo "🧪 测试缺少资源文件场景"
echo "========================================"
echo ""

if [ ! -d "$APP_PATH" ]; then
    echo "❌ 应用不存在"
    exit 1
fi

echo "1️⃣  备份 static 目录..."
if [ -d "$RESOURCES_PATH/static" ]; then
    mv "$RESOURCES_PATH/static" "$RESOURCES_PATH/static.backup"
    echo "✅ static 目录已备份"
else
    echo "⚠️  static 目录不存在"
fi

echo ""
echo "2️⃣  尝试启动应用（应该会因缺少资源而失败）..."
open "$APP_PATH"

echo ""
echo "3️⃣  等待 5 秒后检查..."
sleep 5

if ps aux | grep -v grep | grep "中国汽油价格管理" > /dev/null; then
    echo "⚠️  应用仍在运行"
else
    echo "✅ 应用已闪退（成功复现问题）"
fi

echo ""
echo "4️⃣  恢复 static 目录..."
if [ -d "$RESOURCES_PATH/static.backup" ]; then
    mv "$RESOURCES_PATH/static.backup" "$RESOURCES_PATH/static"
    echo "✅ static 目录已恢复"
fi

echo ""
echo "✅ 测试完成"
