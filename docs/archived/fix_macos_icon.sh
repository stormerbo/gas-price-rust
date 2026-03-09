#!/bin/bash

# macOS 图标修复脚本
# 用于清除图标缓存并重新构建应用

echo "🔧 修复 macOS 应用图标"
echo "========================"
echo ""

# 1. 清除 macOS 图标缓存
echo "1️⃣ 清除 macOS 图标缓存..."
sudo rm -rf /Library/Caches/com.apple.iconservices.store
rm -rf ~/Library/Caches/com.apple.iconservices.store

# 2. 重启 Dock 和 Finder
echo "2️⃣ 重启 Dock 和 Finder..."
killall Dock
killall Finder

# 3. 清理旧的构建文件
echo "3️⃣ 清理旧的构建文件..."
rm -rf src-tauri/target/release/bundle

# 4. 重新构建应用
echo "4️⃣ 重新构建应用..."
echo "   请运行以下命令之一："
echo ""
echo "   开发模式："
echo "   cargo tauri dev"
echo ""
echo "   生产构建："
echo "   cargo tauri build"
echo ""
echo "✅ 图标缓存已清除！"
echo ""
echo "📝 注意事项："
echo "   1. 如果图标仍未显示，请完全删除旧的 .app 文件"
echo "   2. 重新构建应用后，将新的 .app 拖到应用程序文件夹"
echo "   3. 如果还是不行，注销并重新登录 macOS"
