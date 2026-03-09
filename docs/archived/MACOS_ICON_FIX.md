# macOS 应用图标不显示问题修复指南

## 问题描述
在 macOS 上启动 Tauri 应用时，没有显示自定义图标，而是显示默认的通用图标。

## 原因分析
1. macOS 系统缓存了旧的图标
2. 应用未正确签名（开发模式常见）
3. 图标文件路径或格式问题

## 解决方案

### 方案 1：清除图标缓存（推荐）

运行以下命令清除 macOS 图标缓存：

```bash
# 运行修复脚本
./fix_macos_icon.sh

# 或手动执行以下命令：
sudo rm -rf /Library/Caches/com.apple.iconservices.store
rm -rf ~/Library/Caches/com.apple.iconservices.store
killall Dock
killall Finder
```

### 方案 2：完全重新构建

```bash
# 1. 清理旧的构建文件
rm -rf src-tauri/target

# 2. 重新构建（开发模式）
cargo tauri dev

# 或构建生产版本
cargo tauri build
```

### 方案 3：手动安装应用

如果是生产构建，按以下步骤操作：

```bash
# 1. 构建应用
cargo tauri build

# 2. 找到构建的 .app 文件
# 位置：src-tauri/target/release/bundle/macos/

# 3. 完全删除旧的应用
rm -rf /Applications/中国汽油价格管理.app

# 4. 复制新的应用到应用程序文件夹
cp -r "src-tauri/target/release/bundle/macos/中国汽油价格管理.app" /Applications/

# 5. 清除图标缓存
sudo rm -rf /Library/Caches/com.apple.iconservices.store
killall Dock
```

### 方案 4：开发模式图标问题

在开发模式（`cargo tauri dev`）下，图标可能不会正确显示。这是正常的，因为：
- 开发模式的应用未签名
- macOS 对未签名应用的图标显示有限制

**解决办法：**
- 使用生产构建：`cargo tauri build`
- 或者接受开发模式下图标不显示的情况

## 验证图标文件

检查图标文件是否正确：

```bash
# 查看 .icns 文件信息
file icons/icon.icns
sips -g all icons/icon.icns

# 预览图标
open icons/icon.icns
```

当前图标文件状态：
- ✅ `icons/icon.icns` 存在
- ✅ 文件大小：109KB
- ✅ 格式：Mac OS X icon (icns)
- ✅ 分辨率：1024x1024
- ✅ 包含 alpha 通道

## 如果以上方法都不行

### 最后的解决方案：

```bash
# 1. 注销并重新登录 macOS
# 或者重启电脑

# 2. 检查 Info.plist 文件
# 位置：src-tauri/target/release/bundle/macos/中国汽油价格管理.app/Contents/Info.plist
# 确认 CFBundleIconFile 字段指向正确的图标文件

# 3. 手动触发图标更新
touch /Applications/中国汽油价格管理.app
```

## 常见问题

### Q: 为什么开发模式下图标不显示？
A: 这是正常的。macOS 对未签名的应用有限制。使用 `cargo tauri build` 构建生产版本。

### Q: 构建后图标还是不显示？
A: 清除图标缓存并重启 Dock：
```bash
sudo rm -rf /Library/Caches/com.apple.iconservices.store
killall Dock
```

### Q: 需要重新生成图标吗？
A: 当前的图标文件格式正确，不需要重新生成。

## 快速测试

运行以下命令快速测试：

```bash
# 清除缓存
./fix_macos_icon.sh

# 重新构建
cargo tauri build

# 安装并测试
open src-tauri/target/release/bundle/macos/中国汽油价格管理.app
```

## 参考资料

- [Tauri 图标配置文档](https://tauri.app/v1/guides/features/icons)
- [macOS 图标缓存问题](https://apple.stackexchange.com/questions/6901/how-can-i-refresh-the-icon-cache-in-os-x)
