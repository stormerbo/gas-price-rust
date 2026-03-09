#!/bin/bash

set -e

echo "🐳 使用 Docker 构建完整的 Windows 安装包"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        echo ""
        echo "请先安装 Docker Desktop:"
        echo "  brew install --cask docker"
        echo ""
        exit 1
    fi

    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker 未运行${NC}"
        echo ""
        echo "请启动 Docker Desktop 后重试"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 已就绪${NC}"
}

# 构建镜像
build_image() {
    echo ""
    echo "1️⃣ 构建 Docker 镜像..."
    echo "   (首次构建可能需要 10-15 分钟)"
    echo ""
    
    docker build -f Dockerfile.windows-full -t gas-price-windows-full .
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Docker 镜像构建失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 镜像构建成功${NC}"
}

# 构建应用
build_app() {
    echo ""
    echo "2️⃣ 构建 Windows 应用..."
    echo "   这可能需要 15-30 分钟..."
    echo ""
    
    docker run --rm \
        -v "$(pwd)":/app \
        -w /app \
        gas-price-windows-full \
        bash -c "cargo build --release --target x86_64-pc-windows-gnu --bin gas-price-tauri"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 构建失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 应用构建成功${NC}"
}

# 打包
package_app() {
    echo ""
    echo "3️⃣ 打包应用..."
    echo ""
    
    # 创建发布目录
    RELEASE_DIR="release-windows"
    rm -rf "$RELEASE_DIR"
    mkdir -p "$RELEASE_DIR"
    
    # 复制可执行文件
    if [ -f "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" ]; then
        cp "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" "$RELEASE_DIR/"
        echo -e "${GREEN}✅ 复制可执行文件${NC}"
    else
        echo -e "${RED}❌ 未找到可执行文件${NC}"
        exit 1
    fi
    
    # 复制静态文件
    if [ -d "static" ]; then
        cp -r static "$RELEASE_DIR/"
        echo -e "${GREEN}✅ 复制静态文件${NC}"
    fi
    
    # 复制图标
    if [ -d "icons" ]; then
        cp -r icons "$RELEASE_DIR/"
        echo -e "${GREEN}✅ 复制图标${NC}"
    fi
    
    # 创建 README
    cat > "$RELEASE_DIR/README.txt" << 'EOF'
中国汽油价格管理系统 - Windows 版本
====================================

安装说明:
1. 解压所有文件到一个文件夹
2. 双击运行 gas-price-tauri.exe
3. 首次运行会创建数据库并启动服务器

系统要求:
- Windows 10/11 (64位)
- WebView2 Runtime (通常已预装)

数据库位置:
C:\Users\你的用户名\.gas_price\data\gas_prices.db

端口:
应用使用端口 8080，请确保该端口未被占用

如需帮助，请访问项目主页。
EOF
    
    echo -e "${GREEN}✅ 创建 README${NC}"
    
    # 创建 ZIP 包
    ZIP_NAME="gas-price-windows-v0.1.0.zip"
    cd "$RELEASE_DIR"
    zip -r "../$ZIP_NAME" .
    cd ..
    
    echo -e "${GREEN}✅ 创建 ZIP 包${NC}"
}

# 显示结果
show_results() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 构建完成！${NC}"
    echo "=========================================="
    echo ""
    echo "📦 构建产物:"
    echo ""
    
    if [ -f "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" ]; then
        SIZE=$(du -h "target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe" | cut -f1)
        echo "   可执行文件: target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe"
        echo "   文件大小: $SIZE"
    fi
    
    if [ -d "release-windows" ]; then
        echo ""
        echo "   发布目录: release-windows/"
        echo "   包含: 可执行文件 + 静态文件 + 图标"
    fi
    
    if [ -f "gas-price-windows-v0.1.0.zip" ]; then
        ZIP_SIZE=$(du -h "gas-price-windows-v0.1.0.zip" | cut -f1)
        echo ""
        echo "   ZIP 包: gas-price-windows-v0.1.0.zip"
        echo "   文件大小: $ZIP_SIZE"
    fi
    
    echo ""
    echo "📋 下一步:"
    echo "   1. 将 ZIP 包传输到 Windows 机器"
    echo "   2. 解压 ZIP 包"
    echo "   3. 运行 gas-price-tauri.exe"
    echo ""
    echo "💡 提示:"
    echo "   - 确保 Windows 已安装 WebView2 Runtime"
    echo "   - 首次运行会创建数据库"
    echo "   - 应用使用端口 8080"
    echo ""
}

# 主流程
main() {
    check_docker
    build_image
    build_app
    package_app
    show_results
}

# 运行
main
