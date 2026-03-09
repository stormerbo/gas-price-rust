#!/bin/bash

# 创建 macOS 安装包脚本
# 此脚本会创建一个包含应用和安装说明的 DMG

set -e

APP_NAME="中国汽油价格管理"
APP_PATH="target/release/bundle/macos/${APP_NAME}.app"
DMG_NAME="${APP_NAME}_安装包_v0.1.0.dmg"
TEMP_DIR="temp_installer"

echo "🚀 创建 macOS 安装包..."

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 应用不存在: $APP_PATH"
    echo "请先运行 cargo tauri build"
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
中国汽油价格管理系统 - 安装说明
================================

由于此应用未经过 Apple 公证，首次打开时需要执行以下步骤：

方法 1: 使用右键菜单（推荐）
1. 将应用拖到"应用程序"文件夹
2. 右键点击应用图标
3. 选择"打开"
4. 在弹出的对话框中点击"打开"

方法 2: 使用终端命令
1. 打开"终端"应用
2. 执行以下命令（将应用拖到终端窗口会自动填入路径）：
   xattr -cr /Applications/中国汽油价格管理.app
3. 双击打开应用

方法 3: 修改系统设置
1. 打开"系统设置" > "隐私与安全性"
2. 找到被阻止的应用提示
3. 点击"仍要打开"

注意事项：
- 此应用是开源软件，代码可在 GitHub 查看
- 如需签名版本，请联系开发者

技术支持：
- 如遇到问题，请查看项目文档或提交 Issue
EOF

# 创建快捷安装脚本
cat > "$TEMP_DIR/一键安装.command" << 'EOF'
#!/bin/bash

APP_NAME="中国汽油价格管理.app"

# 获取脚本所在目录（支持多种方式）
if [ -n "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
else
    SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
fi

echo "🚀 中国汽油价格管理系统 - 安装程序"
echo "================================"
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
echo "按任意键关闭此窗口..."
read -n 1

# 打开应用程序文件夹
open "/Applications"
EOF

chmod +x "$TEMP_DIR/一键安装.command"

# 创建 DMG
echo "💿 创建 DMG 镜像..."

# 复制诊断脚本
if [ -f "diagnose_crash.sh" ]; then
    cp diagnose_crash.sh "$TEMP_DIR/"
    chmod +x "$TEMP_DIR/diagnose_crash.sh"
fi

hdiutil create -volname "${APP_NAME} 安装包" \
    -srcfolder "$TEMP_DIR" \
    -ov -format UDZO \
    "$DMG_NAME"

# 清理临时文件
rm -rf "$TEMP_DIR"

echo ""
echo "✅ 安装包创建成功！"
echo ""
echo "📦 文件位置: $DMG_NAME"
echo "📊 文件大小: $(du -h "$DMG_NAME" | cut -f1)"
echo ""
echo "💡 使用说明："
echo "   1. 将 DMG 文件发送给用户"
echo "   2. 用户打开 DMG 后，双击"一键安装.command""
echo "   3. 应用会自动安装到"应用程序"文件夹并移除隔离属性"
echo ""
