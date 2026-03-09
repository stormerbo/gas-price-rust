#!/bin/bash

set -e

echo "🐳 使用 Docker 构建 Windows 应用"
echo "=================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Docker
echo "检查 Docker..."
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 未运行，请启动 Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已就绪${NC}"

# 构建镜像
echo ""
echo "1️⃣ 构建 Docker 镜像（首次可能需要 10-15 分钟）..."
docker build -f Dockerfile.windows-full -t gas-price-windows-full . || {
    echo -e "${RED}❌ Docker 镜像构建失败${NC}"
    exit 1
}
echo -e "${GREEN}✅ Docker 镜像构建成功${NC}"

# 构建应用
echo ""
echo "2️⃣ 构建 Windows 应用（可能需要 15-30 分钟）..."
docker run --rm \
    -v "$(pwd)":/app \
    -w /app \
    gas-price-windows-full \
    bash -c "cargo build --release --target x86_64-pc-windows-gnu --bin gas-price-tauri" || {
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
}
echo -e "${GREEN}✅ 应用构建成功${NC}"

# 打包
echo ""
echo "3️⃣ 打包应用..."
RELEASE_DIR="release-windows"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# 复制文件
cp "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" "$RELEASE_DIR/"
cp -r static "$RELEASE_DIR/"
cp -r icons "$RELEASE_DIR/"

# 创建 README
cat > "$RELEASE_DIR/README.txt" << 'EOF'
中国汽油价格管理系统 - Windows 版本
====================================

运行方法:
1. 双击 gas-price-tauri.exe
2. 首次运行会创建数据库并启动服务器

系统要求:
- Windows 10/11 (64位)
- WebView2 Runtime (通常已预装)

数据库位置:
C:\Users\你的用户名\.gas_price\data\gas_prices.db
EOF

# 创建 ZIP
ZIP_NAME="gas-price-windows-v0.1.0.zip"
cd "$RELEASE_DIR" && zip -r "../$ZIP_NAME" . && cd ..

echo -e "${GREEN}✅ 打包完成${NC}"

# 显示结果
echo ""
echo "=================================="
echo -e "${GREEN}🎉 构建完成！${NC}"
echo "=================================="
echo ""
echo "📦 构建产物:"
echo "   • 可执行文件: target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe"
echo "   • 发布目录: release-windows/"
echo "   • ZIP 包: $ZIP_NAME"
echo ""
echo "📋 下一步:"
echo "   1. 将 ZIP 包传输到 Windows 机器"
echo "   2. 解压并运行 gas-price-tauri.exe"
echo ""
