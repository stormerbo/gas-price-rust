# 项目文档

## 📚 主要文档

### [README.md](../README.md)
项目主文档，包含：
- 快速开始指南
- API 文档
- 功能特性说明
- 技术栈介绍

### [ARCHITECTURE.md](../ARCHITECTURE.md)
技术架构文档，包含：
- 系统架构设计
- 模块划分
- 数据流程
- 技术选型说明

### [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
故障排除指南，包含：
- 常见问题及解决方案
- 错误信息说明
- 调试技巧

### [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
项目结构文档，包含：
- 完整目录结构
- 文件说明
- 开发工作流
- 构建产物位置

## 🚀 快速启动脚本

### `run_tauri_app.sh`
启动桌面应用（推荐）
```bash
./run_tauri_app.sh
```

### `run_web.sh`
启动 Web 应用
```bash
./run_web.sh
```

### `build_desktop.sh`
构建桌面应用生产版本
```bash
./build_desktop.sh
```

### `stop_all.sh`
停止所有运行中的服务
```bash
./stop_all.sh
```

## 📦 归档文档

以下文档已归档到 `docs/archived/` 目录，供参考：

- **BUILD_WINDOWS.md** - Windows 构建指南
- **DESKTOP_APP_GUIDE.md** - 桌面应用详细指南
- **DOCKER_BUILD_GUIDE.md** - Docker 构建指南
- **MACOS_ICON_FIX.md** - macOS 图标问题修复
- **README_TAURI.md** - Tauri 详细说明

## 🔧 开发指南

### 前端开发
前端代码位于 `static/` 目录：
- `static/js/` - JavaScript 模块
- `static/css/` - 样式文件
- `static/*.html` - 页面文件

### 后端开发
后端代码位于 `src/` 目录：
- `src/main.rs` - 主入口
- `src/models/` - 数据模型
- `src/handlers/` - API 处理器
- `src/crawler/` - 爬虫模块

### 桌面应用开发
桌面应用配置位于 `src-tauri/` 目录：
- `src-tauri/tauri.conf.json` - Tauri 配置
- `src-tauri/Cargo.toml` - Rust 依赖
- `icons/` - 应用图标

## 📝 开发流程

1. **启动开发环境**
   ```bash
   # Web 模式
   ./run_web.sh
   
   # 桌面应用模式
   ./run_tauri_app.sh
   ```

2. **修改代码**
   - 前端：修改 `static/` 下的文件，刷新浏览器即可
   - 后端：修改 `src/` 下的文件，需要重启服务

3. **测试**
   ```bash
   cargo test
   ```

4. **构建生产版本**
   ```bash
   ./build_desktop.sh
   ```

## 🐛 遇到问题？

1. 查看 [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. 检查日志输出
3. 确认端口 8080 未被占用
4. 确认数据库文件权限正常

## 📞 获取帮助

- 查看项目 README
- 阅读故障排除文档
- 检查归档文档中的专题指南
