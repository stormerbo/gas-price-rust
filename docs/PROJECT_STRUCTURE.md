# 项目结构

## 📁 目录结构

```
gas-price/
├── 📄 README.md                    # 项目主文档（快速开始、API、功能说明）
├── 📄 ARCHITECTURE.md              # 技术架构文档
├── 📄 TROUBLESHOOTING.md           # 故障排除指南
│
├── 🚀 run_tauri_app.sh             # 启动桌面应用
├── 🚀 run_web.sh                   # 启动 Web 应用
├── 🚀 build_desktop.sh             # 构建桌面应用
├── 🚀 stop_all.sh                  # 停止所有服务
│
├── 📂 docs/                        # 文档目录
│   ├── README.md                   # 文档索引
│   ├── CLEANUP_SUMMARY.md          # 清理总结
│   ├── PROJECT_STRUCTURE.md        # 本文件
│   └── archived/                   # 归档文档
│       ├── README.md               # 归档说明
│       ├── *.md                    # 专题文档
│       └── *.sh                    # 专用脚本
│
├── 📂 src/                         # Rust 后端源码
│   ├── main.rs                     # 主入口
│   ├── models/                     # 数据模型
│   ├── handlers/                   # API 处理器
│   ├── crawler/                    # 爬虫模块
│   └── db/                         # 数据库操作
│
├── 📂 src-tauri/                   # Tauri 桌面应用配置
│   ├── tauri.conf.json             # Tauri 配置文件
│   ├── Cargo.toml                  # Rust 依赖
│   ├── src/                        # Tauri 源码
│   └── icons/                      # 应用图标
│
├── 📂 static/                      # 前端静态资源
│   ├── index.html                  # 主页面
│   ├── chart.html                  # 图表页面
│   ├── map.html                    # 地图页面
│   ├── js/                         # JavaScript 模块
│   │   ├── location.js             # 位置定位
│   │   ├── locationCache.js        # 缓存管理
│   │   ├── constants.js            # 常量定义
│   │   └── tauriFetch.js           # Tauri HTTP 封装
│   └── css/                        # 样式文件
│
├── 📂 icons/                       # 应用图标资源
│   ├── icon.icns                   # macOS 图标
│   ├── icon.ico                    # Windows 图标
│   └── *.png                       # 各尺寸 PNG 图标
│
├── 📂 .github/                     # GitHub 配置
├── 📂 .vscode/                     # VS Code 配置
├── 📄 Cargo.toml                   # Rust 项目配置
├── 📄 Cargo.lock                   # Rust 依赖锁定
└── 📄 .gitignore                   # Git 忽略规则
```

## 🎯 核心文件说明

### 根目录文档

| 文件 | 说明 | 适用人群 |
|------|------|----------|
| README.md | 项目主文档，包含快速开始、API、功能特性 | 所有用户 |
| ARCHITECTURE.md | 技术架构、模块设计、数据流程 | 开发者 |
| TROUBLESHOOTING.md | 常见问题、错误排查、调试技巧 | 所有用户 |

### 启动脚本

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| run_tauri_app.sh | 启动桌面应用（开发模式） | 日常开发、测试 |
| run_web.sh | 启动 Web 应用 | Web 模式开发 |
| build_desktop.sh | 构建生产版本 | 发布应用 |
| stop_all.sh | 停止所有服务 | 清理环境 |

### 源码目录

| 目录 | 内容 | 技术栈 |
|------|------|--------|
| src/ | 后端源码 | Rust + Actix-Web |
| src-tauri/ | 桌面应用配置 | Tauri |
| static/ | 前端资源 | HTML + CSS + JavaScript |

## 📚 文档查找指南

### 我想...

- **快速开始使用** → 查看 [README.md](../README.md)
- **了解技术架构** → 查看 [ARCHITECTURE.md](../ARCHITECTURE.md)
- **解决问题** → 查看 [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
- **在 Windows 上构建** → 查看 [docs/archived/BUILD_WINDOWS.md](archived/BUILD_WINDOWS.md)
- **使用 Docker 构建** → 查看 [docs/archived/DOCKER_BUILD_GUIDE.md](archived/DOCKER_BUILD_GUIDE.md)
- **修复 macOS 图标** → 查看 [docs/archived/MACOS_ICON_FIX.md](archived/MACOS_ICON_FIX.md)
- **深入了解 Tauri** → 查看 [docs/archived/README_TAURI.md](archived/README_TAURI.md)

## 🔄 开发工作流

```
1. 启动开发环境
   └─> ./run_tauri_app.sh  或  ./run_web.sh

2. 修改代码
   ├─> 前端: static/
   └─> 后端: src/

3. 测试
   └─> cargo test

4. 构建发布
   └─> ./build_desktop.sh
```

## 📦 构建产物位置

```
src-tauri/target/release/bundle/
├── macos/          # macOS .app 文件
├── dmg/            # macOS .dmg 安装包
├── msi/            # Windows .msi 安装包
├── deb/            # Linux .deb 包
└── appimage/       # Linux AppImage
```

## 🗄️ 数据存储位置

```
~/.gas_price/
└── data/
    └── gas_prices.db    # SQLite 数据库
```

- macOS/Linux: `/Users/username/.gas_price/data/`
- Windows: `C:\Users\username\.gas_price\data\`

## 🎨 图标资源

```
icons/
├── icon.icns           # macOS (1024x1024)
├── icon.ico            # Windows (多尺寸)
├── 32x32.png
├── 128x128.png
└── 128x128@2x.png
```

## 📝 配置文件

| 文件 | 用途 |
|------|------|
| Cargo.toml | Rust 项目依赖和配置 |
| src-tauri/tauri.conf.json | Tauri 应用配置 |
| src-tauri/Cargo.toml | Tauri 依赖 |

## 🔗 相关链接

- [文档索引](README.md)
- [归档文档](archived/README.md)
- [项目主页](../README.md)
