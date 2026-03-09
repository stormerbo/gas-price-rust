#!/bin/bash

set -e

echo "🐳 使用 Docker 构建 Windows 版本"
echo "=================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo ""
    echo "请先安装 Docker Desktop:"
    echo "  brew install --cask docker"
    echo ""
    echo "或访问: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker 未运行"
    echo ""
    echo "请启动 Docker Desktop 后重试"
    exit 1
fi

echo "✅ Docker 已就绪"
echo ""

# 构建 Docker 镜像
echo "1️⃣ 构建 Docker 镜像..."
docker build -f Dockerfile.windows -t gas-price-windows-builder .

if [ $? -ne 0 ]; then
    echo "❌ Docker 镜像构建失败"
    exit 1
fi

echo "✅ Docker 镜像构建成功"
echo ""

# 运行构建
echo "2️⃣ 开始构建 Windows 应用..."
echo "   这可能需要 10-30 分钟，请耐心等待..."
echo ""

docker run --rm \
    -v "$(pwd)":/app \
    -w /app \
    gas-price-windows-builder

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "✅ 构建成功！"
echo ""

# 检查构建产物
if [ -f "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" ]; then
    echo "📦 构建产物位置:"
    echo "   target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe"
    echo ""
    
    # 显示文件大小
    SIZE=$(du -h "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" | cut -f1)
    echo "   文件大小: $SIZE"
    echo ""
    
    echo "🎉 完成！"
    echo ""
    echo "下一步:"
    echo "  1. 将 .exe 文件复制到 Windows 机器"
    echo "  2. 同时复制 static/ 文件夹"
    echo "  3. 在 Windows 上运行 gas-price-tauri.exe"
else
    echo "⚠️  未找到构建产物"
    echo "   请检查构建日志中的错误信息"
fi
