# 桌面应用构建指南

## 项目改造说明

本项目已改造为支持两种运行模式：

1. **Web服务器模式**（原有模式）：传统的Web应用
2. **桌面应用模式**（新增）：使用Tauri打包的原生桌面应用

## 技术栈

- **后端**: Rust + Actix-Web
- **前端**: JavaScript + HTML + CSS
- **桌面框架**: Tauri 1.8
- **数据库**: SQLite

## 运行方式

### 1. Web服务器模式（开发/生产）

```bash
# 开发模式
cargo run

# 生产模式
cargo build --release
./target/release/gas-price
```

访问: http://127.0.0.1:8080

### 2. 桌面应用模式

#### 开发模式
```bash
# 运行桌面应用（开发）
cargo run --bin gas-price-tauri

# 或使用 Tauri CLI（推荐）
cargo install tauri-cli
cargo tauri dev
```

#### 构建桌面应用
```bash
# 构建生产版本
cargo tauri build

# 构建产物位置：
# - macOS: target/release/bundle/macos/
# - Windows: target/release/bundle/msi/
# - Linux: target/release/bundle/deb/ 或 appimage/
```

## 桌面应用特性

### 功能特性
- ✅ 原生窗口（可调整大小、最小化、最大化）
- ✅ 系统托盘图标（点击显示/隐藏窗口）
- ✅ 关闭按钮隐藏窗口（不退出应用）
- ✅ 托盘菜单（显示、隐藏、退出）
- ✅ 内置HTTP服务器（无需外部服务器）
- ✅ 自动启动爬虫任务
- ✅ 本地数据库存储
- ✅ 跨平台支持（macOS、Windows、Linux）

### 窗口配置
- 默认尺寸: 1400x900
- 最小尺寸: 1000x700
- 启动位置: 屏幕居中
- 可调整大小: 是

### 系统托盘
- 左键点击: 显示/聚焦窗口
- 右键菜单:
  - 显示窗口
  - 隐藏窗口
  - 退出应用

## 项目结构

```
gas-price/
├── src/
│   ├── main.rs              # Web服务器入口
│   ├── tauri_main.rs        # Tauri桌面应用入口
│   ├── lib.rs               # 共享库
│   ├── models.rs            # 数据模型
│   ├── error.rs             # 错误处理
│   ├── database.rs          # 数据库操作
│   ├── crawler.rs           # 爬虫逻辑
│   └── handlers.rs          # API处理器
├── static/                  # 前端静态文件
├── icons/                   # 应用图标
├── tauri.conf.json         # Tauri配置文件
├── build.rs                # 构建脚本
├── Cargo.toml              # Rust依赖配置
└── README_TAURI.md         # 本文档
```

## 配置说明

### tauri.conf.json

主要配置项：

```json
{
  "build": {
    "devPath": "http://localhost:8080",  // 开发服务器地址
    "distDir": "../static"                // 静态文件目录
  },
  "package": {
    "productName": "中国汽油价格管理",    // 应用名称
    "version": "0.1.0"                    // 版本号
  },
  "tauri": {
    "bundle": {
      "identifier": "com.gasprice.app",  // 应用标识符
      "icon": ["icons/..."]               // 图标路径
    },
    "windows": [{
      "title": "中国汽油价格管理",
      "width": 1400,
      "height": 900
    }]
  }
}
```

### Cargo.toml

新增依赖：

```toml
[dependencies]
tauri = { version = "1.8", features = ["notification", "dialog", "fs-all", ...] }

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]

[[bin]]
name = "gas-price-tauri"
path = "src/tauri_main.rs"
```

## 图标准备

需要准备以下尺寸的图标：

```bash
icons/
├── 32x32.png           # Windows小图标
├── 128x128.png         # macOS/Linux图标
├── 128x128@2x.png      # macOS Retina图标
├── icon.icns           # macOS应用图标
├── icon.ico            # Windows应用图标
└── icon.png            # 系统托盘图标
```

### 生成图标

可以使用在线工具或命令行工具生成：

```bash
# 使用 Tauri 图标生成器
cargo tauri icon path/to/your/icon.png
```

## Tauri 命令（前端调用）

在前端JavaScript中可以调用以下命令：

```javascript
// 获取数据库路径
const dbPath = await window.__TAURI__.invoke('get_db_path');

// 触发爬取
const result = await window.__TAURI__.invoke('trigger_crawl');

// 获取应用版本
const version = await window.__TAURI__.invoke('get_app_version');
```

## 安全配置

CSP（内容安全策略）配置在 `tauri.conf.json` 中：

```json
{
  "security": {
    "csp": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; ..."
  }
}
```

根据需要调整允许的外部资源。

## 开发建议

### 1. 开发流程

```bash
# 1. 启动后端服务器（终端1）
cargo run

# 2. 启动Tauri开发模式（终端2）
cargo tauri dev
```

### 2. 调试

- 使用浏览器开发者工具（F12）
- 查看Rust日志输出
- 使用 `console.log` 调试前端

### 3. 热重载

- 前端文件修改会自动刷新
- Rust代码修改需要重启

## 打包发布

### macOS

```bash
cargo tauri build

# 生成文件：
# - target/release/bundle/macos/中国汽油价格管理.app
# - target/release/bundle/dmg/中国汽油价格管理_0.1.0_x64.dmg
```

### Windows

```bash
cargo tauri build

# 生成文件：
# - target/release/bundle/msi/中国汽油价格管理_0.1.0_x64_en-US.msi
```

### Linux

```bash
cargo tauri build

# 生成文件：
# - target/release/bundle/deb/gas-price_0.1.0_amd64.deb
# - target/release/bundle/appimage/gas-price_0.1.0_amd64.AppImage
```

## 常见问题

### 1. 图标不显示

确保图标文件存在且路径正确：
```bash
ls -la icons/
```

### 2. 窗口无法打开

检查后端服务器是否正常启动：
```bash
curl http://127.0.0.1:8080
```

### 3. 数据库路径问题

桌面应用的数据库路径：
- macOS: `~/Library/Application Support/com.gasprice.app/`
- Windows: `C:\Users\<用户名>\AppData\Roaming\com.gasprice.app\`
- Linux: `~/.local/share/com.gasprice.app/`

### 4. 构建失败

确保安装了必要的依赖：

**macOS:**
```bash
xcode-select --install
```

**Windows:**
需要安装 Visual Studio Build Tools

**Linux:**
```bash
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## 性能优化

### 1. 减小应用体积

```bash
# 使用 strip 减小二进制大小
cargo tauri build --release
strip target/release/gas-price-tauri
```

### 2. 启动优化

- 延迟加载非关键资源
- 使用异步初始化
- 缓存静态资源

## 更新机制

可以集成 Tauri 的自动更新功能：

```toml
[dependencies]
tauri = { version = "1.8", features = ["updater"] }
```

配置更新服务器：
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": ["https://your-update-server.com/{{target}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Tauri 官方文档](https://tauri.app/)
- [Tauri API 文档](https://tauri.app/v1/api/js/)
- [Rust 官方文档](https://doc.rust-lang.org/)
