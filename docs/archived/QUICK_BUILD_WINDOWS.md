# 🚀 快速构建 Windows 版本

## 最简单的方法：GitHub Actions

### 5 分钟完成设置

#### 1️⃣ 创建 GitHub 仓库

访问 https://github.com/new 创建新仓库（可以是私有的）

#### 2️⃣ 推送代码

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/gas-price.git

# 推送
git branch -M main
git push -u origin main
```

#### 3️⃣ 创建 Release Tag

```bash
# 创建版本标签
git tag v0.1.0

# 推送标签（这会触发构建）
git push origin v0.1.0
```

#### 4️⃣ 等待构建

1. 访问你的 GitHub 仓库
2. 点击 "Actions" 标签
3. 查看构建进度（约 10-20 分钟）

#### 5️⃣ 下载安装包

构建完成后：
1. 点击 "Releases" 标签
2. 下载对应平台的安装包：
   - **Windows**: `.msi` 文件
   - **macOS**: `.dmg` 文件
   - **Linux**: `.deb` 或 `.AppImage` 文件

---

## 构建产物位置

### Windows
```
中国汽油价格管理_0.1.0_x64_en-US.msi
```

### macOS
```
中国汽油价格管理_0.1.0_aarch64.dmg  (Apple Silicon)
中国汽油价格管理_0.1.0_x64.dmg      (Intel)
```

### Linux
```
gas-price_0.1.0_amd64.deb
gas-price_0.1.0_amd64.AppImage
```

---

## 本地构建（备选方案）

如果你有 Windows 机器，可以本地构建：

### 在 Windows 上

```powershell
# 1. 克隆代码
git clone https://github.com/你的用户名/gas-price.git
cd gas-price

# 2. 安装依赖（如果还没有）
# Rust: https://rustup.rs/
# Node.js: https://nodejs.org/

# 3. 构建
cargo tauri build

# 4. 查找安装包
# 位置: target\release\bundle\msi\
```

---

## 测试 Windows 版本

### 在 Windows 上安装

1. 双击 `.msi` 文件
2. 按照安装向导操作
3. 安装完成后，从开始菜单启动应用

### 首次运行

应用会：
1. 创建数据库：`C:\Users\你的用户名\.gas_price\data\gas_prices.db`
2. 启动后端服务器（端口 8080）
3. 打开应用窗口

---

## 更新版本

### 1. 修改版本号

编辑 `tauri.conf.json`:
```json
{
  "package": {
    "version": "0.2.0"
  }
}
```

编辑 `Cargo.toml`:
```toml
[package]
version = "0.2.0"
```

### 2. 提交并创建新标签

```bash
git add .
git commit -m "Version 0.2.0"
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

### 3. 等待构建完成

新版本会自动构建并发布到 Releases。

---

## 故障排除

### 问题 1: GitHub Actions 构建失败

**检查**:
1. 查看 Actions 日志中的错误信息
2. 确保 `package.json` 存在
3. 确保 `tauri.conf.json` 配置正确

**常见错误**:
- 缺少依赖：在 workflow 中添加安装步骤
- 图标问题：确保图标是 RGBA 格式
- 权限问题：检查 GitHub token 权限

### 问题 2: Windows 安装包无法运行

**原因**: 缺少 WebView2

**解决**: 
1. 下载并安装 WebView2 Runtime
2. 访问: https://developer.microsoft.com/microsoft-edge/webview2/
3. 或在安装包中包含 WebView2（需要配置）

### 问题 3: 构建时间太长

**优化**:
1. 使用缓存（已在 workflow 中配置）
2. 只构建需要的平台
3. 使用 release 模式

---

## 高级配置

### 只构建 Windows 版本

修改 `.github/workflows/build.yml`:
```yaml
matrix:
  platform: [windows-latest]  # 只保留 Windows
```

### 添加代码签名

在 `tauri.conf.json` 中配置：
```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "你的证书指纹",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.digicert.com"
      }
    }
  }
}
```

### 自定义安装包名称

在 `tauri.conf.json` 中：
```json
{
  "package": {
    "productName": "中国汽油价格管理",
    "version": "0.1.0"
  }
}
```

---

## 检查清单

构建前确保：

- [ ] 所有代码已提交
- [ ] 版本号已更新
- [ ] 图标文件存在且格式正确（RGBA）
- [ ] `tauri.conf.json` 配置正确
- [ ] `package.json` 存在
- [ ] GitHub Actions workflow 文件存在

---

## 下一步

1. **测试**: 在 Windows 机器上测试安装包
2. **文档**: 编写用户使用文档
3. **发布**: 在 GitHub Releases 中发布正式版本
4. **分发**: 分享下载链接给用户

---

**开始构建**: 推送代码并创建 Tag，GitHub 会自动为你构建所有平台的安装包！🎉
