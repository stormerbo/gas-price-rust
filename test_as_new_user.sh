#!/bin/bash

# 模拟新用户首次运行应用的脚本

APP_PATH="target/release/bundle/macos/中国汽油价格管理.app"

echo "🧪 模拟新用户首次运行测试"
echo "========================================"
echo ""

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 应用不存在，请先运行 cargo tauri build"
    exit 1
fi

echo "1️⃣  关闭所有运行中的应用实例..."
pkill -f "中国汽油价格管理" || true
sleep 2

echo "2️⃣  添加隔离属性（模拟从网络下载）..."
xattr -w com.apple.quarantine "0081;$(date +%s);Safari;|com.apple.Safari" "$APP_PATH"

echo "3️⃣  验证隔离属性..."
xattr -l "$APP_PATH" | grep quarantine && echo "✅ 隔离属性已添加" || echo "⚠️  隔离属性添加失败"

echo ""
echo "4️⃣  尝试打开应用（这应该会触发 Gatekeeper）..."
echo "   如果出现'应用已损坏'提示，说明成功复现了问题"
echo ""

open "$APP_PATH"

echo ""
echo "5️⃣  查看应用日志（5秒后）..."
sleep 5

# 查看最近的日志
log show --predicate 'process == "中国汽油价格管理"' --last 30s --info 2>&1 | tail -30

echo ""
echo "6️⃣  检查应用是否在运行..."
if ps aux | grep -v grep | grep "中国汽油价格管理" > /dev/null; then
    echo "✅ 应用正在运行"
else
    echo "❌ 应用未运行（可能已闪退）"
fi

echo ""
echo "💡 如需移除隔离属性："
echo "   xattr -cr \"$APP_PATH\""
