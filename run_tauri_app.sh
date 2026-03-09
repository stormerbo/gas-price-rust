#!/bin/bash

echo "🚀 启动中国汽油价格管理桌面应用"
echo ""

# 检查端口 8080 是否被占用
echo "🔍 检查端口 8080..."
PORT_PID=$(lsof -ti :8080)

if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  端口 8080 已被占用 (PID: $PORT_PID)"
    echo "📋 进程信息:"
    ps -p $PORT_PID -o pid,comm,args
    echo ""
    read -p "是否停止该进程? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 停止进程 $PORT_PID..."
        kill $PORT_PID
        sleep 1
        echo "✅ 进程已停止"
    else
        echo "❌ 无法启动应用，端口被占用"
        exit 1
    fi
else
    echo "✅ 端口 8080 可用"
fi

echo ""
echo "🎨 启动桌面应用..."
echo ""

# 启动应用
cargo run --bin gas-price-tauri
