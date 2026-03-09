# 🐳 使用 Docker 构建 Windows 版本

## 前提条件

### 1. 安装 Docker Desktop

```bash
brew install --cask docker
```

或访问: https://www.docker.com/products/docker-desktop

### 2. 启动 Docker Desktop

确保 Docker Desktop 正在运行（菜单栏会显示 Docker 图标）

---

## 快速开始

### 方法 1: 简单构建（推荐）

只构建可执行文件：

```bash
./build_windows_docker.sh
```

构建产物：
```
target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe
```

### 方法 2: 完整构建

构建并打包成 ZIP：

```bash
./build_windows_full.sh
```

构建产物：
```
gas-price-windows-v0.1.0.zip
├── gas-price-tauri.exe
├── static/
├── icons/
└── README.txt
```

---

## 详细步骤

### 1. 准备环境

```bash
# 检查 Docker 是否安装
docker --version

# 检查 Docker 是否运行
docker info
```

### 2. 构建 Docker 镜像

```bash
# 简单版本
docker build -f Dockerfile.windows -t gas-price-windows-builder .

# 完整版本（包含打包工具）
docker build -f Dockerfile.windows-full -t gas-price-windows-full .
```

首次构建需要 10-15 分钟，会下载和安装：
- Ubuntu 基础镜像
- Rust 工具链
- MinGW 交叉编译工具
- Node.js
- 其他依赖

### 3. 运行构建

```bash
# 简单构建
docker run --rm -v $(pwd):/app gas-price-windows-builder

# 完整构建
docker run --rm -v $(pwd):/app gas-price-windows-full
```

构建时间：15-30 分钟（取决于机器性能）

### 4. 查看构建产物

```bash
# 可执行文件
ls -lh target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe

# 如果使用完整构建
ls -lh gas-price-windows-v0.1.0.zip
```

---

## 构建选项

### 只构建可执行文件

```bash
docker run --rm \
    -v $(pwd):/app \
    gas-price-windows-builder \
    cargo build --release --target x86_64-pc-windows-gnu --bin gas-price-tauri
```

### 构建并运行测试

```bash
docker run --rm \
    -v $(pwd):/app \
    gas-price-windows-builder \
    cargo test --target x86_64-pc-windows-gnu
```

### 清理构建缓存

```bash
docker run --rm \
    -v $(pwd):/app \
    gas-price-windows-builder \
    cargo clean
```

---

## 传输到 Windows

### 方法 1: 使用 ZIP 包

```bash
# 1. 构建 ZIP 包
./build_windows_full.sh

# 2. 传输到 Windows（选择一种方式）
# - 通过网络共享
# - 通过 U 盘
# - 通过云存储（Dropbox、Google Drive 等）
# - 通过邮件（如果文件不大）

# 3. 在 Windows 上解压并运行
```

### 方法 2: 使用 SCP（如果有 Windows SSH 服务器）

```bash
scp gas-price-windows-v0.1.0.zip user@windows-pc:/path/to/destination/
```

### 方法 3: 使用 AirDrop（如果是 Mac 和 Windows 在同一网络）

直接通过 AirDrop 发送 ZIP 文件

---

## 在 Windows 上运行

### 1. 解压文件

解压 `gas-price-windows-v0.1.0.zip` 到任意文件夹

### 2. 检查 WebView2

Windows 10/11 通常已预装 WebView2。如果没有：

1. 访问: https://developer.microsoft.com/microsoft-edge/webview2/
2. 下载并安装 "Evergreen Standalone Installer"

### 3. 运行应用

双击 `gas-price-tauri.exe`

首次运行会：
- 创建数据库：`C:\Users\你的用户名\.gas_price\data\gas_prices.db`
- 启动后端服务器（端口 8080）
- 打开应用窗口

---

## 故障排除

### 问题 1: Docker 构建失败

**错误**: "Cannot connect to the Docker daemon"

**解决**:
1. 确保 Docker Desktop 正在运行
2. 重启 Docker Desktop
3. 检查 Docker 设置中的资源分配

### 问题 2: 构建时间过长

**优化**:
1. 增加 Docker 的 CPU 和内存分配
   - Docker Desktop > Settings > Resources
   - 建议: 4 CPU, 8GB RAM

2. 使用构建缓存
   - Docker 会自动缓存已构建的层
   - 第二次构建会快很多

### 问题 3: 构建产物无法在 Windows 上运行

**检查**:
1. 确保 Windows 已安装 WebView2
2. 检查防火墙设置（允许端口 8080）
3. 以管理员身份运行
4. 查看 Windows 事件查看器中的错误日志

### 问题 4: 缺少 DLL 文件

**解决**:
1. 安装 Visual C++ Redistributable
   - 访问: https://aka.ms/vs/17/release/vc_redist.x64.exe
2. 或将所需的 DLL 文件复制到应用目录

### 问题 5: 端口 8080 被占用

**解决**:
1. 在 Windows 上检查端口占用：
   ```cmd
   netstat -ano | findstr :8080
   ```
2. 停止占用端口的进程
3. 或修改应用配置使用其他端口

---

## 高级配置

### 自定义构建参数

编辑 `Dockerfile.windows` 或 `Dockerfile.windows-full`：

```dockerfile
# 添加环境变量
ENV RUST_BACKTRACE=1

# 修改构建命令
CMD ["cargo", "build", "--release", "--target", "x86_64-pc-windows-gnu", "--features", "custom-feature"]
```

### 使用本地缓存加速构建

```bash
# 创建缓存卷
docker volume create cargo-cache
docker volume create cargo-git

# 使用缓存构建
docker run --rm \
    -v $(pwd):/app \
    -v cargo-cache:/root/.cargo/registry \
    -v cargo-git:/root/.cargo/git \
    gas-price-windows-builder
```

### 多阶段构建（减小镜像大小）

创建 `Dockerfile.windows-optimized`:

```dockerfile
# 构建阶段
FROM ubuntu:22.04 as builder
# ... 安装依赖和构建 ...

# 运行阶段（更小）
FROM ubuntu:22.04
COPY --from=builder /app/target/x86_64-pc-windows-gnu/release/gas-price-tauri.exe /app/
```

---

## 性能对比

| 方法 | 首次构建 | 后续构建 | 镜像大小 | 难度 |
|------|---------|---------|---------|------|
| 简单 Docker | 20-30分钟 | 5-10分钟 | ~2GB | ⭐ |
| 完整 Docker | 25-35分钟 | 5-10分钟 | ~3GB | ⭐⭐ |
| GitHub Actions | 15-20分钟 | 15-20分钟 | N/A | ⭐ |
| 本地 Windows | 10-15分钟 | 2-5分钟 | N/A | ⭐⭐⭐ |

---

## 清理

### 删除 Docker 镜像

```bash
# 查看镜像
docker images | grep gas-price

# 删除镜像
docker rmi gas-price-windows-builder
docker rmi gas-price-windows-full
```

### 清理构建缓存

```bash
# 清理 Docker 构建缓存
docker builder prune

# 清理 Cargo 构建缓存
rm -rf target/x86_64-pc-windows-gnu
```

---

## 检查清单

构建前确保：

- [ ] Docker Desktop 已安装并运行
- [ ] 有足够的磁盘空间（至少 10GB）
- [ ] 网络连接正常（需要下载依赖）
- [ ] 所有代码已提交（避免丢失更改）

构建后检查：

- [ ] 可执行文件存在
- [ ] 文件大小合理（通常 10-50MB）
- [ ] 包含所有必要的静态文件
- [ ] README 文件已创建

---

## 下一步

1. **测试**: 在 Windows 虚拟机或实体机上测试
2. **优化**: 根据测试结果优化应用
3. **文档**: 编写 Windows 用户使用文档
4. **分发**: 创建下载链接或安装程序

---

## 相关资源

- [Docker 官方文档](https://docs.docker.com/)
- [Rust 交叉编译指南](https://rust-lang.github.io/rustup/cross-compilation.html)
- [MinGW-w64 文档](https://www.mingw-w64.org/)
- [Tauri 构建指南](https://tauri.app/v1/guides/building/)

---

**开始构建**: 运行 `./build_windows_full.sh` 🚀
