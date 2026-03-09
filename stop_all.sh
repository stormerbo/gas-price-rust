#!/bin/bash

echo "🛑 停止所有 gas-price 相关进程"
echo ""

# 查找所有相关进程
PIDS=$(pgrep -f "gas-price")

if [ -z "$PIDS" ]; then
    echo "✅ 没有运行中的进程"
    exit 0
fi

echo "📋 找到以下进程:"
ps -p $PIDS -o pid,comm,args

echo ""
read -p "是否停止所有这些进程? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 停止进程..."
    pkill -f "gas-price"
    sleep 1
    
    # 验证是否停止
    REMAINING=$(pgrep -f "gas-price")
    if [ -z "$REMAINING" ]; then
        echo "✅ 所有进程已停止"
    else
        echo "⚠️  部分进程仍在运行，尝试强制停止..."
        pkill -9 -f "gas-price"
        sleep 1
        echo "✅ 强制停止完成"
    fi
else
    echo "❌ 取消操作"
fi
