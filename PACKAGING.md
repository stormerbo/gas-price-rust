# 打包指南

本文档说明如何为中国汽油价格管理系统创建跨平台安装包。

## ⚠️ 重要说明

**Tauri 应用必须在目标平台上进行构建**：
- macOS 应用必须在 macOS 系统上打包
- Windows 应用必须在 Windows 系统上打包
- 不支持交叉编译

如果需要同时发布 macOS 和 Windows 版本，你需要：
1. 在 macOS 上运行 `build_package.sh` 生成 macOS 版本
2. 在 Windows 上运行 `build_package.bat` 生成 Windows 版本
3. 或者使用 GitHub Actions 等 CI/CD 服务自动化构建

## 环境要求

### 通用要求
- Rust 工具链 (>= 1.70.0)
- Tauri CLI
- Node.js 和 npm（如果需要构建前端）

### macOS 特定要求
- macOS 10.15 或更高版本
- Xcode Command Line Tools: `xcode-select --install`
- 可选：Apple Developer 证书（用于代码签名）

### Windows 特定要求
- Windows 10 或更高版本
- Visual Studio Build Tools 或 Visual Studio
- WiX Toolset v3 (用于生成 MSI)

## 快速开始

### macOS

在 macOS 系统上打包 macOS 应用：

```bash
# 赋予执行权限（首次运行）
chmod +x build_package.sh

# 执行打包
./build_package.sh
```

### Windows

在 Windows 系统上打包 Windows 应用：

```cmd
# 双击运行或在命令行执行
build_package.bat
```

### 跨平台构建方案

如果你需要同时构建两个平台的版本，有以下选择：

1. **GitHub Actions**（推荐）：免费、自动化、无需本地 Windows 环境
2. **双系统方案**：分别在 macOS 和 Windows 上运行打包脚本
3. **虚拟机方案**：在 macOS 上使用 Parallels/VMware 运行 Windows
4. **云服务方案**：使用 AWS/Azure 的 Windows 虚拟机

**注意**：Docker 方案不可行，因为：
- Windows 容器只能在 Windows 主机上运行
- Tauri 需要系统原生 GUI 组件（WebView），无法在容器中运行
- 不支持交叉编译

## 构建产物位置

### macOS
- 应用包 (.app): `target/release/bundle/macos/`
- 磁盘镜像 (.dmg): `target/release/bundle/dmg/`
- 用户友好安装包: 运行 `./create_installer.sh` 生成

### Windows
- 安装包 (.msi): `target/release/bundle/msi/`

## 分发注意事项

### macOS 应用分发问题

**问题**: 未签名的应用在其他 Mac 上打开时会提示"应用已损坏"

**原因**: macOS Gatekeeper 安全机制会阻止未经 Apple 公证的应用

**解决方案**:

#### 方案 1: 创建用户友好安装包（推荐）

运行安装包创建脚本：
```bash
./create_installer.sh
```

这会创建一个包含以下内容的 DMG：
- 应用本身
- 安装说明文档
- 一键安装脚本（自动移除隔离属性）

用户只需：
1. 打开 DMG
2. 双击"一键安装.command"
3. 应用自动安装并可正常使用

#### 方案 2: 告诉用户手动处理

用户收到应用后，可以使用以下任一方法：

**方法 A: 右键打开（最简单）**
1. 右键点击应用
2. 选择"打开"
3. 在弹出对话框中点击"打开"

**方法 B: 终端命令**
```bash
xattr -cr /path/to/中国汽油价格管理.app
```

**方法 C: 系统设置**
1. 打开"系统设置" > "隐私与安全性"
2. 找到被阻止的应用
3. 点击"仍要打开"

#### 方案 3: 代码签名（最佳，但需要付费）

需要 Apple Developer 账号（$99/年）：
1. 获取 Developer ID Application 证书
2. 在 `tauri.conf.json` 中配置签名
3. 可选：进行公证（notarization）

配置示例：
```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

## 配置说明

打包配置位于 `tauri.conf.json` 文件中：

### 应用信息
```json
{
  "package": {
    "productName": "中国汽油价格管理",
    "version": "0.1.0"
  }
}
```

### Windows 配置
```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "webviewInstallMode": {
          "type": "downloadBootstrapper"
        },
        "wix": {
          "language": "zh-CN"
        }
      }
    }
  }
}
```

- `downloadBootstrapper`: 安装时自动下载 WebView2（推荐，安装包小）
- 其他选项：`embedBootstrapper`（内嵌安装器，约 1.8MB）、`offlineInstaller`（完整离线安装器，约 150MB）

### macOS 配置
```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "minimumSystemVersion": "10.15"
      }
    }
  }
}
```

## 代码签名

### macOS 代码签名

1. 加入 Apple Developer Program ($99/年)
2. 获取 Developer ID Application 证书
3. 在 `tauri.conf.json` 中配置：

```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

### Windows 代码签名

1. 获取代码签名证书（如 DigiCert、Sectigo）
2. 在 `tauri.conf.json` 中配置：

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT"
      }
    }
  }
}
```

## 常见问题

### 构建失败

1. **检查 Rust 版本**
   ```bash
   rustc --version
   # 应该 >= 1.70.0
   ```

2. **更新 Tauri CLI**
   ```bash
   cargo install tauri-cli --force
   ```

3. **清理构建缓存**
   ```bash
   cargo clean
   ```

### Windows 特定问题

1. **缺少 WiX Toolset**
   - 下载并安装：https://wixtoolset.org/releases/

2. **WebView2 相关错误**
   - 确保 `webviewInstallMode` 配置正确
   - 用户安装时需要网络连接（downloadBootstrapper 模式）

### macOS 特定问题

1. **应用无法打开（Gatekeeper）**
   - 需要代码签名
   - 或者用户右键点击 -> 打开

2. **图标不显示**
   - 确保 `icons/icon.icns` 文件存在且格式正确

## 手动构建

如果不使用打包脚本，可以手动执行：

```bash
# 清理旧构建
rm -rf target/release/bundle

# 执行构建
cargo tauri build

# 查看产物
ls -lh target/release/bundle/
```

## 版本发布

1. 更新 `tauri.conf.json` 中的版本号
2. 更新 `Cargo.toml` 中的版本号
3. 在各自平台上执行打包脚本
4. 测试安装包
5. 创建 GitHub Release 并上传安装包

## 使用 GitHub Actions 自动化构建（推荐）

### 方案 1: 手动触发构建

1. 将代码推送到 GitHub
2. 进入仓库的 **Actions** 标签页
3. 选择 **Manual Build** workflow
4. 点击 **Run workflow**
5. 选择构建平台：
   - `both` - 同时构建 macOS 和 Windows
   - `macos` - 只构建 macOS
   - `windows` - 只构建 Windows
6. 等待构建完成（约 10-15 分钟）
7. 在 workflow 运行页面下载构建产物

### 方案 2: 自动发布

当你推送一个版本标签时，自动构建并创建 GitHub Release：

```bash
# 更新版本号
# 编辑 tauri.conf.json 和 Cargo.toml

# 提交更改
git add .
git commit -m "Release v0.1.0"

# 创建并推送标签
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions 会自动：
1. 在 macOS 和 Windows 上构建应用
2. 创建 GitHub Release
3. 上传安装包到 Release

### GitHub Actions 的优势

✅ **完全免费**（公开仓库）
✅ **自动化**：推送代码即可触发构建
✅ **多平台**：同时构建 macOS 和 Windows
✅ **无需本地环境**：不需要 Windows 机器
✅ **可重复**：每次构建环境一致
✅ **缓存支持**：加速后续构建

### 构建时间

- macOS: 约 8-12 分钟
- Windows: 约 10-15 分钟
- 总计: 约 15-20 分钟（并行执行）

## 参考资料

- [Tauri 官方文档](https://tauri.app/)
- [Tauri 构建指南](https://tauri.app/v1/guides/building/)
- [WiX Toolset 文档](https://wixtoolset.org/documentation/)
- [macOS 代码签名指南](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
