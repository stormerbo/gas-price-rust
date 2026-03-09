#!/bin/bash

# 创建通用版本的安装包

set -e

APP_NAME="中国汽油价格管理"
APP_PATH="target/universal/${APP_NAME}.app"
DMG_NAME="${APP_NAME}_通用安装包_v0.1.0.dmg"
TEMP_DIR="temp_universal_installer"

echo "🚀 创建通用版本安装包..."

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 通用应用不存在: $APP_PATH"
    echo "请先运行 ./build_universal.sh"
    exit 1
fi

# 创建临时目录
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# 复制应用
echo "📦 复制应用..."
cp -R "$APP_PATH" "$TEMP_DIR/"

# 创建安装说明
cat > "$TEMP_DIR/安装说明.txt" << 'EOF'
中国汽油价格管理系统 - 通用版安装说明
================================

✅ 此版本同时支持：
   - Intel Mac (x86_64)
   - Apple Silicon Mac (M1/M2/M3)

安装步骤：

方法 1: 使用一键安装脚本（推荐）
1. 双击"一键安装.command"
2. 输入密码（如果需要）
3. 等待安装完成

方法 2: 手动安装
1. 将应用拖到"应用程序"文件夹
2. 右键点击应用，选择"打开"
3. 在弹出对话框中点击"打开"

如果遇到问题：
1. 双击"diagnose_crash.sh"查看诊断信息
2. 查看"用户安装说明.md"获取详细帮助

系统要求：
- macOS 10.15 (Catalina) 或更高版本
- 至少 100MB 可用磁盘空间
EOF

# 创建一键安装脚本
cat > "$TEMP_DIR/一键安装.command" << 'EOF'
#!/bin/bash

APP_NAME="中国汽油价格管理.app"

# 获取脚本所在目录（支持多种方式）
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
else
    SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
fi

echo "🚀 中国汽油价格管理系统 - 通用版安装程序"
echo "================================"
echo ""
echo "✅ 此版本同时支持 Intel 和 Apple Silicon Mac"
echo ""
echo "📂 脚本目录: $SCRIPT_DIR"
echo ""

# 检查应用是否存在
if [ ! -d "$SCRIPT_DIR/$APP_NAME" ]; then
    echo "❌ 找不到应用文件: $SCRIPT_DIR/$APP_NAME"
    echo ""
    echo "请确保此脚本和应用在同一目录下"
    echo ""
    echo "按任意键关闭..."
    read -n 1
    exit 1
fi

echo "📍 将应用复制到"应用程序"文件夹..."
if cp -R "$SCRIPT_DIR/$APP_NAME" "/Applications/"; then
    echo "✅ 复制成功"
else
    echo "❌ 复制失败，可能需要管理员权限"
    echo ""
    echo "按任意键关闭..."
    read -n 1
    exit 1
fi

echo "🔓 移除隔离属性..."
if xattr -cr "/Applications/$APP_NAME" 2>/dev/null; then
    echo "✅ 隔离属性已移除"
else
    echo "⚠️  移除隔离属性失败（可能不需要）"
fi

echo ""
echo "✅ 安装完成！"
echo ""
echo "应用已安装到: /Applications/$APP_NAME"
echo "你现在可以从启动台或应用程序文件夹打开应用了。"
echo ""
echo "💡 提示：此版本在 Intel 和 Apple Silicon Mac 上都能运行"
echo ""
echo "按任意键关闭此窗口..."
read -n 1

# 打开应用程序文件夹
open "/Applications"
EOF

chmod +x "$TEMP_DIR/一键安装.command"

# 复制诊断脚本
if [ -f "diagnose_crash.sh" ]; then
    cp diagnose_crash.sh "$TEMP_DIR/"
    chmod +x "$TEMP_DIR/diagnose_crash.sh"
fi

# 复制用户说明
if [ -f "用户安装说明.md" ]; then
    cp "用户安装说明.md" "$TEMP_DIR/"
fi

# 创建 DMG
echo "💿 创建 DMG 镜像..."
hdiutil create -volname "${APP_NAME} 通用安装包" \
    -srcfolder "$TEMP_DIR" \
    -ov -format UDZO \
    "$DMG_NAME"

# 清理临时文件
rm -rf "$TEMP_DIR"

echo ""
echo "✅ 通用安装包创建成功！"
echo ""
echo "📦 文件位置: $DMG_NAME"
echo "📊 文件大小: $(du -h "$DMG_NAME" | cut -f1)"
echo ""
echo "💡 此安装包同时支持："
echo "   ✅ Intel Mac (x86_64)"
echo "   ✅ Apple Silicon Mac (M1/M2/M3)"
echo ""
echo "📝 使用说明："
echo "   1. 将 DMG 文件发送给用户"
echo "   2. 用户打开 DMG 后，双击"一键安装.command""
echo "   3. 应用会自动安装并可在任何 Mac 上运行"
echo ""
