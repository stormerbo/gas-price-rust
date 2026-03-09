#!/bin/bash

# 中国汽油价格管理系统 - 桌面应用构建脚本

echo "🏗️  构建中国汽油价格管理系统（桌面应用）"
echo ""

# 检查是否安装了 Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    echo "⚠️  未检测到 Tauri CLI"
    echo "📦 正在安装 Tauri CLI..."
    cargo install tauri-cli
    echo "✅ Tauri CLI 安装完成"
    echo ""
fi

# 检查是否需要生成图标
if [ ! -f "icons/icon.png" ]; then
    echo "⚠️  未找到应用图标"
    echo "💡 提示: 请将图标文件放置在 icons/icon.png"
    echo "   或运行: cargo tauri icon path/to/your/icon.png"
    echo ""
    read -p "是否继续构建？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 构建应用
echo "🔨 开始构建..."
cargo tauri build

echo ""
echo "✅ 构建完成！"
echo ""
echo "📦 构建产物位置："

# 检测操作系统并显示对应的构建产物路径
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   macOS App: target/release/bundle/macos/"
    echo "   macOS DMG: target/release/bundle/dmg/"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   Linux DEB: target/release/bundle/deb/"
    echo "   Linux AppImage: target/release/bundle/appimage/"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "   Windows MSI: target/release/bundle/msi/"
fi

echo ""
echo "🎉 可以开始分发应用了！"
