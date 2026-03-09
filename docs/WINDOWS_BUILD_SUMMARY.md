# Windows 构建问题总结

## 🔴 问题

在 Windows 上运行打包后的应用时出现错误：
```
由于找不到 WebView2Loader.dll，无法继续执行代码。重新安装程序可能会解决此问题。
```

## 🔍 根本原因

Tauri 在 Windows 上依赖 **Microsoft Edge WebView2** 运行时来渲染界面。如果：
1. 用户系统没有安装 WebView2
2. 安装包没有配置自动安装 WebView2

应用就会因为找不到 WebView2Loader.dll 而无法启动。

## ✅ 解决方案

### 已完成的修复

1. **更新 tauri.conf.json**
   ```json
   {
     "tauri": {
       "bundle": {
         "windows": {
           "webviewInstallMode": {
             "type": "downloadBootstrapper"
           }
         }
       }
     }
   }
   ```

2. **创建重新构建脚本**
   - `rebuild_windows.sh` - 自动清理并重新构建

3. **创建文档**
   - `docs/WINDOWS_WEBVIEW2_FIX.md` - 详细的技术文档
   - `WINDOWS_用户安装说明.md` - 用户友好的安装指南
   - 更新 `TROUBLESHOOTING.md` - 添加此问题到故障排除指南

## 🚀 重新构建步骤

```bash
# 方法 1: 使用脚本（推荐）
./rebuild_windows.sh

# 方法 2: 手动构建
rm -rf src-tauri/target/release/bundle
cargo tauri build
```

## 📦 新安装包特性

重新构建后的安装包会：
1. ✅ 自动检测系统是否已安装 WebView2
2. ✅ 如果未安装，自动下载并安装（需要网络）
3. ✅ 安装完成后正常启动应用
4. ✅ 用户无需手动操作

## 📊 配置选项对比

| 配置 | 安装包大小 | 是否需要网络 | 说明 |
|------|-----------|-------------|------|
| `downloadBootstrapper` ⭐ | ~2MB | 是 | 推荐：包小，安装时下载 |
| `embedBootstrapper` | ~150MB | 否 | 内嵌安装程序，离线可用 |
| `offlineInstaller` | ~150MB | 否 | 完整离线安装包 |
| `fixedRuntime` | ~200MB | 否 | 固定版本，包最大 |
| `skip`（默认） | 最小 | - | 不处理，用户需手动安装 |

**当前配置**: `downloadBootstrapper` - 平衡了包大小和用户体验

## 🎯 给用户的说明

如果用户遇到此问题，告诉他们：

1. **使用新的安装包**（推荐）
   - 重新下载最新的安装包
   - 新安装包会自动安装 WebView2

2. **手动安装 WebView2**
   - 下载：https://go.microsoft.com/fwlink/p/?LinkId=2124703
   - 安装后重新启动应用

## 📝 相关文档

- [详细技术文档](WINDOWS_WEBVIEW2_FIX.md)
- [用户安装说明](../WINDOWS_用户安装说明.md)
- [故障排除指南](../TROUBLESHOOTING.md)

## 🔗 参考链接

- [Tauri Windows 配置](https://tauri.app/v1/guides/building/windows)
- [WebView2 官方文档](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/)
- [WebView2 下载](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/#download-section)

## ✨ 预防措施

为避免将来出现类似问题：

1. ✅ 始终在 `tauri.conf.json` 中配置 `webviewInstallMode`
2. ✅ 在 README 中说明系统要求
3. ✅ 提供清晰的用户安装指南
4. ✅ 在故障排除文档中记录此问题

## 📅 更新日期

2026-02-27
