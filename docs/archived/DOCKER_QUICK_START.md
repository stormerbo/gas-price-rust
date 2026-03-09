# 🚀 Docker 构建 Windows 版本 - 快速开始

## 3 步完成构建

### 1️⃣ 安装 Docker（如果还没有）

```bash
brew install --cask docker
```

启动 Docker Desktop（菜单栏会显示 Docker 图标）

### 2️⃣ 运行构建脚本

```bash
./build_windows_full.sh
```

### 3️⃣ 获取构建产物

构建完成后，你会得到：
```
gas-price-windows-v0.1.0.zip
```

---

## 构建时间

- **首次构建**: 25-35 分钟
- **后续构建**: 5-10 分钟

---

## 构建产物

### ZIP 包内容
```
gas-price-windows-v0.1.0.zip
├── gas-price-tauri.exe      # 主程序
├── static/                   # 静态文件
│   ├── index.html
│   ├── map.html
│   ├── chart.html
│   └── js/
├── icons/                    # 图标
└── README.txt               # 使用说明
```

---

## 传输到 Windows

选择一种方式：
- 📧 邮件发送（如果文件不大）
- ☁️ 云存储（Dropbox、Google Drive）
- 💾 U 盘
- 🌐 网络共享

---

## 在 Windows 上运行

1. 解压 ZIP 文件
2. 双击 `gas-price-tauri.exe`
3. 完成！

---

## 故障排除

### Docker 未运行
```bash
# 启动 Docker Desktop
open -a Docker
```

### 构建失败
```bash
# 查看详细日志
docker logs <container-id>

# 清理并重试
docker system prune -a
./build_windows_full.sh
```

### Windows 上无法运行
1. 安装 WebView2: https://developer.microsoft.com/microsoft-edge/webview2/
2. 以管理员身份运行
3. 检查防火墙设置

---

## 命令参考

```bash
# 简单构建（只生成 .exe）
./build_windows_docker.sh

# 完整构建（生成 ZIP 包）
./build_windows_full.sh

# 手动构建
docker build -f Dockerfile.windows-full -t gas-price-windows-full .
docker run --rm -v $(pwd):/app gas-price-windows-full

# 清理
docker rmi gas-price-windows-full
rm -rf target/x86_64-pc-windows-gnu
```

---

## 需要帮助？

查看详细文档：
- **DOCKER_BUILD_GUIDE.md** - 完整构建指南
- **BUILD_WINDOWS.md** - 所有构建方案对比

---

**立即开始**: `./build_windows_full.sh` 🎉
