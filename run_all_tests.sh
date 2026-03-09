#!/bin/bash

# 综合测试脚本

echo "🧪 中国汽油价格管理系统 - 综合测试"
echo "========================================"
echo ""

# 确保应用已构建
if [ ! -d "target/release/bundle/macos/中国汽油价格管理.app" ]; then
    echo "❌ 应用未构建，正在构建..."
    cargo tauri build || exit 1
fi

echo "📋 测试列表："
echo "   1. 正常启动测试"
echo "   2. 隔离属性测试（模拟新用户）"
echo "   3. 端口冲突测试"
echo "   4. 缺少资源文件测试"
echo ""

read -p "选择测试 (1-4, 或 'all'): " choice

case $choice in
    1)
        echo ""
        echo "🧪 测试 1: 正常启动"
        echo "========================================"
        ./test_direct_run.sh
        ;;
    2)
        echo ""
        echo "🧪 测试 2: 隔离属性（模拟新用户）"
        echo "========================================"
        ./test_as_new_user.sh
        ;;
    3)
        echo ""
        echo "🧪 测试 3: 端口冲突"
        echo "========================================"
        ./test_port_conflict.sh
        ;;
    4)
        echo ""
        echo "🧪 测试 4: 缺少资源文件"
        echo "========================================"
        ./test_missing_resources.sh
        ;;
    all)
        echo ""
        echo "🧪 运行所有测试..."
        echo ""
        
        echo "=== 测试 1: 正常启动 ==="
        timeout 5 ./test_direct_run.sh || true
        pkill -f "中国汽油价格管理" || true
        sleep 2
        
        echo ""
        echo "=== 测试 2: 隔离属性 ==="
        ./test_as_new_user.sh
        xattr -cr "target/release/bundle/macos/中国汽油价格管理.app"
        pkill -f "中国汽油价格管理" || true
        sleep 2
        
        echo ""
        echo "=== 测试 3: 端口冲突 ==="
        ./test_port_conflict.sh
        pkill -f "python3 -m http.server" || true
        pkill -f "中国汽油价格管理" || true
        sleep 2
        
        echo ""
        echo "=== 测试 4: 缺少资源文件 ==="
        ./test_missing_resources.sh
        pkill -f "中国汽油价格管理" || true
        
        echo ""
        echo "✅ 所有测试完成"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac
