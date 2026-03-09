# 🪟 在 macOS 上构建 Windows 应用

## 方案对比

| 方案 | 难度 | 推荐度 | 说明 |
|------|------|--------|------|
| GitHub Actions | ⭐ 简单 | ⭐⭐⭐⭐⭐ | 自动化，支持所有平台 |
| Docker | ⭐⭐ 中等 | ⭐⭐⭐ | 需要配置 Docker |
| Windows 虚拟机 | ⭐⭐⭐ 复杂 | ⭐⭐⭐⭐ | 最可靠 |

---

## 方案 1: GitHub Actions（推荐）⭐

### 优点
- ✅ 完全自动化
- ✅ 同时构建 macOS、Windows、Linux
- ✅ 不需要本地配置
- ✅ 免费（公开仓库）

### 步骤

#### 1. 初始化 Git 仓库（如果还没有）

```bash
git init
git add .
git commit -m "Initial commit"
```

#### 2. 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 创建新仓库（可以是私有的）
3. 按照提示推送代码：

```bash
git remote add origin https://github.com/你的用户名/gas-price.git
git branch -M main
git push -u origin main
```

#### 3. 创建 Release Tag

```bash
# 创建版本标签
git tag v0.1.0
git push origin v0.1.0
```

#### 4. 等待构建完成

1. 访问你的 GitHub 仓库
2. 点击 "Actions" 标签
3. 等待构建完成（约 10-20 分钟）
4. 构建完成后，在 "Releases" 中下载各平台的安装包

### 构建产物

- **Windows**: `.msi` 安装包
- **macOS**: `.dmg` 磁盘镜像
- **Linux**: `.deb` 和 `.AppImage`

---

## 方案 2: 使用 Docker

### 前提条件

安装 Docker Desktop for Mac:
```bash
brew install --cask docker
```

### 步骤

#### 1. 创建 Dockerfile

```bash
cat > Dockerfile.windows << 'EOF'
FROM rust:latest

# 安装交叉编译工具
RUN apt-get update && apt-get install -y \
    mingw-w64 \
    && rm -rf /var/lib/apt/lists/*

# 添加 Windows 目标
RUN rustup target add x86_64-pc-windows-gnu

WORKDIR /app
COPY . .

# 构建
CMD ["cargo", "build", "--release", "--target", "x86_64-pc-windows-gnu"]
EOF
```

#### 2. 构建 Docker 镜像

```bash
docker build -f Dockerfile.windows -t gas-price-windows .
```

#### 3. 运行构建

```bash
docker run --rm -v $(pwd):/app gas-price-windows
```

### 注意事项

⚠️ Tauri 的 Windows 构建需要特定的依赖，Docker 方案可能需要额外配置。

---

## 方案 3: 使用 Windows 虚拟机

### 选项 A: Parallels Desktop（付费）

1. 安装 Parallels Desktop
2. 创建 Windows 11 虚拟机
3. 在虚拟机中安装开发环境
4. 构建应用

### 选项 B: UTM（免费）

1. 安装 UTM:
   ```bash
   brew install --cask utm
   ```

2. 下载 Windows 11 ARM 版本
3. 创建虚拟机
4. 在虚拟机中构建

### 选项 C: 使用实体 Windows 机器

如果你有 Windows 电脑：

1. 克隆代码到 Windows 机器
2. 安装依赖
3. 构建应用

---

## 在 Windows 上构建（参考）

如果你选择方案 3，在 Windows 上需要：

### 1. 安装依赖

```powershell
# 安装 Rust
winget install Rustlang.Rustup

# 安装 Node.js
winget install OpenJS.NodeJS

# 安装 WebView2（通常已预装）
# 如果没有，访问: https://developer.microsoft.com/microsoft-edge/webview2/
```

### 2. 克隆代码

```powershell
git clone https://github.com/你的用户名/gas-price.git
cd gas-price
```

### 3. 构建应用

```powershell
# 开发版本
cargo run --bin gas-price-tauri

# 生产版本
cargo tauri build
```

### 4. 查找构建产物

```
target/release/bundle/msi/中国汽油价格管理_0.1.0_x64_en-US.msi
```

---

## 推荐流程

### 对于个人使用

1. 使用 **GitHub Actions**（方案 1）
2. 推送代码到 GitHub
3. 创建 Release Tag
4. 下载构建好的安装包

### 对于开发测试

1. 在 macOS 上开发和测试
2. 使用 GitHub Actions 构建 Windows 版本
3. 在 Windows 虚拟机中测试

### 对于生产发布

1. 使用 GitHub Actions 自动构建所有平台
2. 在各平台上测试
3. 发布 Release

---

## 快速开始：GitHub Actions

### 1. 准备代码

```bash
# 确保所有修改已提交
git add .
git commit -m "Ready for release"
```

### 2. 创建 GitHub 仓库并推送

```bash
# 创建仓库后
git remote add origin https://github.com/你的用户名/gas-price.git
git push -u origin main
```

### 3. 创建 Release

```bash
# 创建版本标签
git tag v0.1.0
git push origin v0.1.0
```

### 4. 查看构建进度

访问: `https://github.com/你的用户名/gas-price/actions`

### 5. 下载构建产物

构建完成后，访问: `https://github.com/你的用户名/gas-price/releases`

---

## 常见问题

### Q: GitHub Actions 构建失败？

**A**: 检查以下几点：
1. `package.json` 是否存在（即使是空的也要有）
2. `tauri.conf.json` 配置是否正确
3. 查看 Actions 日志中的具体错误

### Q: 构建的 Windows 应用无法运行？

**A**: 确保：
1. 目标 Windows 系统已安装 WebView2
2. 应用签名（可选，但推荐）
3. 防火墙设置允许应用运行

### Q: 可以在 macOS 上测试 Windows 应用吗？

**A**: 不能直接运行，但可以：
1. 使用虚拟机测试
2. 使用 Wine（不推荐，可能有问题）
3. 在实际 Windows 机器上测试

---

## 最简单的方法

如果你只是想快速构建 Windows 版本：

1. **创建 GitHub 仓库**
2. **推送代码**
3. **创建 Tag**: `git tag v0.1.0 && git push origin v0.1.0`
4. **等待 10-20 分钟**
5. **下载 Windows 安装包**

就这么简单！🎉

---

## 相关文档

- [Tauri 构建指南](https://tauri.app/v1/guides/building/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [交叉编译指南](https://tauri.app/v1/guides/building/cross-platform)

---

**推荐**: 使用 GitHub Actions，最简单且支持所有平台！
