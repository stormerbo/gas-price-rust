#!/bin/bash

# 测试端口冲突情况

echo "🧪 测试端口冲突场景"
echo "========================================"
echo ""

echo "1️⃣  启动占位服务器（占用 8080-8090 端口）..."

# 启动多个 Python 简单服务器占用端口
for port in {8080..8090}; do
    python3 -m http.server $port > /dev/null 2>&1 &
    echo "   占用端口 $port (PID: $!)"
done

echo ""
echo "2️⃣  等待服务器启动..."
sleep 2

echo "3️⃣  验证端口占用..."
for port in {8080..8090}; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "   ✅ 端口 $port 已被占用"
    else
        echo "   ❌ 端口 $port 未被占用"
    fi
done

echo ""
echo "4️⃣  启动应用（应该会因为端口冲突而失败）..."
open "target/release/bundle/macos/中国汽油价格管理.app"

echo ""
echo "5️⃣  等待 5 秒后检查应用状态..."
sleep 5

if ps aux | grep -v grep | grep "中国汽油价格管理" > /dev/null; then
    echo "✅ 应用正在运行（端口自动选择成功）"
else
    echo "❌ 应用未运行（可能因端口冲突闪退）"
fi

echo ""
echo "6️⃣  清理占位服务器..."
pkill -f "python3 -m http.server"

echo ""
echo "✅ 测试完成"
