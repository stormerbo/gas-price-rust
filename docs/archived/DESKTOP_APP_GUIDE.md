# 桌面应用改造完成指南

## 🎉 改造完成！

你的项目已成功改造为支持桌面应用打包。现在可以将应用打包为 macOS、Windows 和 Linux 的原生桌面应用。

## 📋 改造内容总结

### 新增文件

1. **Tauri 配置**
   - `tauri.conf.json` - Tauri 主配置文件
   - `build.rs` - 构建脚本
   - `.taurignore` - 打包时忽略的文件

2. **代码文件**
   - `src/lib.rs` - 共享库，导出公共模块
   - `src/tauri_main.rs` - Tauri 桌面应用入口

3. **文档**
   - `README_TAURI.md` - 详细的 Tauri 使用文档
   - `DESKTOP_APP_GUIDE.md` - 本文档
   - `icons/README.md` - 图标准备指南

4. **脚本**
   - `run_desktop.sh` - 快速启动桌面应用（开发模式）
   - `build_desktop.sh` - 快速构建桌面应用
   - `package.json` - npm 脚本配置

5. **目录**
   - `icons/` - 应用图标目录

### 修改文件

1. **Cargo.toml**
   - 添加 Tauri 依赖
   - 配置 features
   - 添加 lib 和 bin 配置

2. **src/main.rs**
   - 添加启动提示信息
   - 保持原有 Web 服务器功能

3. **README.md**
   - 添加桌面应用说明
   - 更新快速开始指南

## 🚀 快速开始

### 第一步：准备图标（可选）

```bash
# 如果有图标文件（建议 1024x1024 PNG）
cargo install tauri-cli
cargo tauri icon path/to/your/icon.png

# 或者先跳过，使用默认图标
```

### 第二步：开发模式运行

```bash
# 方式1: 使用脚本（推荐）
./run_desktop.sh

# 方式2: 手动运行
cargo install tauri-cli
cargo tauri dev
```

### 第三步：构建生产版本

```bash
# 方式1: 使用脚本（推荐）
./build_desktop.sh

# 方式2: 手动构建
cargo tauri build
```

## 📦 构建产物

构建完成后，可执行文件位于：

### macOS
```
target/release/bundle/macos/中国汽油价格管理.app
target/release/bundle/dmg/中国汽油价格管理_0.1.0_x64.dmg
```

### Windows
```
target/release/bundle/msi/中国汽油价格管理_0.1.0_x64_en-US.msi
```

### Linux
```
target/release/bundle/deb/gas-price_0.1.0_amd64.deb
target/release/bundle/appimage/gas-price_0.1.0_amd64.AppImage
```

## 🎯 两种运行模式

### 1. Web 服务器模式（原有模式）

```bash
cargo run
# 访问 http://127.0.0.1:8080
```

适用场景：
- 开发调试
- 服务器部署
- 多用户访问

### 2. 桌面应用模式（新增模式）

```bash
cargo run --bin gas-price-tauri
# 或
cargo tauri dev
```

适用场景：
- 个人使用
- 离线使用
- 原生体验

## 🔧 系统要求

### macOS
- macOS 10.13 或更高版本
- Xcode Command Line Tools

```bash
xcode-select --install
```

### Windows
- Windows 7 或更高版本
- Visual Studio Build Tools
- WebView2 Runtime（Windows 10/11 自带）

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

## 🎨 桌面应用特性

### 窗口管理
- 默认尺寸：1400x900
- 最小尺寸：1000x700
- 可调整大小、最大化、最小化
- 启动时居中显示

### 系统托盘
- 左键点击：显示/聚焦窗口
- 右键菜单：
  - 显示窗口
  - 隐藏窗口
  - 退出应用

### 窗口行为
- 点击关闭按钮：隐藏窗口（不退出）
- 从托盘菜单选择"退出"：完全退出应用

### 内置功能
- HTTP 服务器自动启动（127.0.0.1:8080）
- 数据库自动初始化
- 爬虫任务自动启动
- 无需外部依赖

## 🐛 常见问题

### 1. 图标不显示
确保图标文件存在：
```bash
ls -la icons/
```

或使用 Tauri CLI 生成：
```bash
cargo tauri icon path/to/icon.png
```

### 2. 构建失败
检查系统依赖是否安装完整（见上方"系统要求"）

### 3. 窗口无法打开
检查后端服务器是否正常启动：
```bash
curl http://127.0.0.1:8080
```

### 4. 数据库路径
桌面应用的数据库路径与 Web 模式相同：
- macOS/Linux: `~/.gas_price/data/gas_prices.db`
- Windows: `C:\Users\<用户名>\.gas_price\data\gas_prices.db`

## 📚 进阶功能

### 自定义窗口配置
编辑 `tauri.conf.json` 中的 `windows` 配置：
```json
{
  "tauri": {
    "windows": [{
      "title": "你的应用名称",
      "width": 1600,
      "height": 1000,
      "minWidth": 1200,
      "minHeight": 800
    }]
  }
}
```

### 添加 Tauri 命令
在 `src/tauri_main.rs` 中添加新命令：
```rust
#[tauri::command]
fn your_command() -> String {
    "Hello from Tauri!".to_string()
}

// 在 invoke_handler 中注册
.invoke_handler(tauri::generate_handler![
    your_command,
    // ... 其他命令
])
```

在前端调用：
```javascript
const result = await window.__TAURI__.invoke('your_command');
```

### 配置自动更新
参考 `README_TAURI.md` 中的"更新机制"章节

## 🎓 学习资源

- [Tauri 官方文档](https://tauri.app/)
- [Tauri API 文档](https://tauri.app/v1/api/js/)
- [Tauri 示例](https://github.com/tauri-apps/tauri/tree/dev/examples)
- [Rust 官方文档](https://doc.rust-lang.org/)

## 📝 下一步

1. ✅ 准备应用图标
2. ✅ 测试开发模式
3. ✅ 构建生产版本
4. ✅ 测试安装包
5. ✅ 分发应用

## 🤝 需要帮助？

- 查看 `README_TAURI.md` 获取详细文档
- 查看 Tauri 官方文档
- 提交 Issue 到项目仓库

## 🎉 恭喜！

你的应用现在可以作为原生桌面应用运行了！享受更好的用户体验吧！
