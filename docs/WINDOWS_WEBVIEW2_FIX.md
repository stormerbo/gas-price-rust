# Windows WebView2 错误修复指南

## 🔴 错误信息

```
由于找不到 WebView2Loader.dll，无法继续执行代码。重新安装程序可能会解决此问题。
```

## 📋 问题原因

Tauri 在 Windows 上依赖 **Microsoft Edge WebView2** 运行时来渲染界面。如果系统没有安装 WebView2，应用将无法启动。

## ✅ 解决方案

### 方案 1：自动安装 WebView2（推荐）

我已经更新了 `tauri.conf.json` 配置，添加了自动下载 WebView2 的设置。

**重新构建应用：**

```bash
# 清理旧的构建
rm -rf src-tauri/target/release/bundle

# 重新构建
cargo tauri build
```

新构建的安装包会在安装时自动下载并安装 WebView2。

### 方案 2：手动安装 WebView2

如果用户已经安装了应用，可以手动安装 WebView2：

**下载地址：**
- 官方下载：https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/
- 直接下载：https://go.microsoft.com/fwlink/p/?LinkId=2124703

**安装步骤：**
1. 下载 WebView2 运行时安装程序
2. 运行安装程序
3. 重新启动应用

### 方案 3：内嵌 WebView2（增加安装包大小）

如果希望安装包完全独立，可以内嵌 WebView2：

修改 `tauri.conf.json`：

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "webviewInstallMode": {
          "type": "embedBootstrapper"
        }
      }
    }
  }
}
```

这会将 WebView2 安装程序打包到应用中，安装包会增加约 150MB。

## 🔧 配置说明

### webviewInstallMode 选项

| 类型 | 说明 | 安装包大小 | 优缺点 |
|------|------|-----------|--------|
| `downloadBootstrapper` | 安装时下载 WebView2 | 小（~2MB） | ✅ 包小 ❌ 需要网络 |
| `embedBootstrapper` | 内嵌安装程序 | 中（~150MB） | ✅ 离线安装 ❌ 包较大 |
| `offlineInstaller` | 内嵌完整安装包 | 大（~150MB） | ✅ 完全离线 ❌ 包最大 |
| `fixedRuntime` | 使用固定版本 | 最大（~200MB） | ✅ 版本固定 ❌ 包很大 |
| `skip` | 不处理（默认） | 最小 | ❌ 用户需手动安装 |

**推荐配置：**
- 一般应用：`downloadBootstrapper`（已配置）
- 企业内网：`embedBootstrapper` 或 `offlineInstaller`

## 📦 重新构建步骤

```bash
# 1. 清理旧构建
cargo clean

# 2. 重新构建
cargo tauri build

# 3. 安装包位置
# src-tauri/target/release/bundle/msi/
```

## 🎯 验证

构建完成后，新的 MSI 安装包会：
1. 检测系统是否已安装 WebView2
2. 如果未安装，自动下载并安装
3. 安装完成后启动应用

## 📝 给用户的说明

如果你要分发应用给其他用户，可以在 README 中添加：

```markdown
## Windows 系统要求

本应用需要 Microsoft Edge WebView2 运行时。

- Windows 10 1809 及以上版本通常已预装
- 如果启动时提示缺少 WebView2，安装程序会自动下载安装
- 或手动下载：https://go.microsoft.com/fwlink/p/?LinkId=2124703
```

## 🔍 检查 WebView2 是否已安装

在 Windows 上检查：

```powershell
# 检查注册表
Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -Name pv

# 或查看文件
Test-Path "C:\Program Files (x86)\Microsoft\EdgeWebView\Application"
```

## 🆘 常见问题

### Q: 为什么 Windows 10 还是提示缺少 WebView2？
A: 旧版本的 Windows 10 可能没有预装。使用新的安装包会自动安装。

### Q: 能否让应用完全独立，不依赖 WebView2？
A: 不能。Tauri 必须依赖 WebView2。但可以使用 `embedBootstrapper` 内嵌安装程序。

### Q: 安装包太大怎么办？
A: 使用 `downloadBootstrapper`（已配置），安装包只有几 MB，安装时才下载 WebView2。

### Q: 用户没有网络怎么办？
A: 使用 `embedBootstrapper` 或 `offlineInstaller`，可以离线安装。

## 🔗 相关链接

- [Tauri Windows 配置文档](https://tauri.app/v1/guides/building/windows)
- [WebView2 官方文档](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/)
- [WebView2 下载页面](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/#download-section)

## 📅 更新日期

2026-02-27
