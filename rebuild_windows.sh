#!/bin/bash

# Windows 应用重新构建脚本（修复 WebView2 问题）

echo "🔧 重新构建 Windows 应用（包含 WebView2 自动安装）"
echo ""

# 检查是否在正确的目录
if [ ! -f "tauri.conf.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 清理旧的构建
echo "1️⃣ 清理旧的构建文件..."
rm -rf src-tauri/target/release/bundle
echo "   ✓ 清理完成"
echo ""

# 重新构建
echo "2️⃣ 开始构建 Windows 应用..."
echo "   这可能需要几分钟时间..."
echo ""

cargo tauri build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 构建成功！"
    echo ""
    echo "📦 安装包位置："
    echo "   src-tauri/target/release/bundle/msi/"
    echo ""
    echo "📝 新安装包特性："
    echo "   • 自动检测 WebView2"
    echo "   • 如未安装，自动下载并安装 WebView2"
    echo "   • 无需用户手动安装依赖"
    echo ""
    echo "🎯 下一步："
    echo "   1. 找到 .msi 安装包"
    echo "   2. 在 Windows 系统上安装"
    echo "   3. 首次安装会自动下载 WebView2（需要网络）"
    echo ""
else
    echo ""
    echo "❌ 构建失败"
    echo ""
    echo "💡 可能的原因："
    echo "   1. 缺少 Rust 工具链"
    echo "   2. 缺少 Tauri CLI"
    echo "   3. 依赖项未安装"
    echo ""
    echo "🔧 解决方案："
    echo "   cargo install tauri-cli"
    echo ""
    exit 1
fi
