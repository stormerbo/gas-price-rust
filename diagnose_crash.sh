#!/bin/bash

# 诊断应用崩溃问题的脚本

APP_NAME="中国汽油价格管理"
APP_PATH="/Applications/${APP_NAME}.app"

echo "🔍 诊断 ${APP_NAME} 崩溃问题"
echo "========================================"
echo ""

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 应用未安装在: $APP_PATH"
    echo "请先安装应用"
    exit 1
fi

echo "✅ 应用已安装"
echo ""

# 检查可执行文件
EXEC_PATH="$APP_PATH/Contents/MacOS/${APP_NAME}"
if [ ! -f "$EXEC_PATH" ]; then
    echo "❌ 找不到可执行文件: $EXEC_PATH"
    exit 1
fi

echo "✅ 可执行文件存在"
echo ""

# 检查资源文件
RESOURCES_PATH="$APP_PATH/Contents/Resources"
echo "📁 检查资源文件..."
if [ -d "$RESOURCES_PATH/static" ]; then
    echo "✅ static 目录存在"
    echo "   文件数量: $(find "$RESOURCES_PATH/static" -type f | wc -l)"
else
    echo "❌ static 目录不存在"
fi
echo ""

# 检查端口占用
echo "🔌 检查端口 8080..."
if lsof -i :8080 > /dev/null 2>&1; then
    echo "⚠️  端口 8080 已被占用"
    lsof -i :8080
else
    echo "✅ 端口 8080 可用"
fi
echo ""

# 尝试运行应用并捕获输出
echo "🚀 尝试启动应用（将显示详细日志）..."
echo "按 Ctrl+C 停止"
echo "========================================"
echo ""

"$EXEC_PATH" 2>&1
