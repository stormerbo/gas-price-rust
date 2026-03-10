# 中国汽油价格管理系统

一个基于 Rust + Actix Web 的油价管理系统，支持按不同省份查询历史油价，并提供前端管理页面。

**🎉 现已支持打包为桌面应用！**

## 🔄 项目版本说明

当前仓库为 **Rust + Tauri** 版本，提供成熟稳定的桌面应用与 Web 服务实现。

## ✨ 特性

- 🌐 Web 应用模式：传统的浏览器访问
- 🖥️ 桌面应用模式：原生桌面应用（macOS、Windows、Linux）
- 📊 可视化图表：油价地图、直方图分析
- 🤖 自动爬取：定时更新全国油价数据
- 💾 本地存储：SQLite 数据库，数据安全可靠
- 🎨 Apple 设计风格：现代化的用户界面

## 🚀 快速开始

### 桌面应用（开发）

```bash
# 终端 1：启动前端开发服务器
npm install
npm run dev

# 终端 2：启动 Tauri 桌面应用
npm run tauri:dev
```

### Web 应用

```bash
# 构建前端并启动 Web 服务器
npm install
npm run build
cargo run --bin gas-price-web
```

访问: http://127.0.0.1:8080

### 构建桌面应用

```bash
# 安装依赖并构建生产版本
npm install
npm run tauri:build
```
```

构建产物位置：
- **macOS**: `target/release/bundle/macos/` 和 `target/release/bundle/dmg/`
- **Windows**: `target/release/bundle/msi/`
- **Linux**: `target/release/bundle/deb/` 和 `target/release/bundle/appimage/`

## 🛠️ 技术栈

### 后端
- **语言**: Rust
- **Web 框架**: Actix-Web 4.x
- **桌面框架**: Tauri 1.8
- **数据库**: SQLite (sqlx)
- **HTTP 客户端**: reqwest
- **HTML 解析**: scraper

### 前端
- **语言**: React
- **UI**: Ant Design
- **图表库**: Chart.js 4.4.1、ECharts 5.4.3
- **样式**: 原生 CSS (Apple Design 风格)
- **地图**: 高德地图 API

## 📦 数据持久化

- 使用 SQLite3 数据库存储所有油价记录
- 首次启动时自动创建表结构并触发初始爬取
- 数据库文件位置：`~/.gas_price/data/gas_prices.db`（跨平台兼容）
  - macOS/Linux: `/Users/username/.gas_price/data/gas_prices.db`
  - Windows: `C:\Users\username\.gas_price\data\gas_prices.db`
- 可通过 `DATABASE_URL` 环境变量自定义数据库位置

## 首次启动

首次运行时，系统会：
1. 自动创建数据库文件和表结构
2. 立即触发一次全国油价爬取（31 个省级行政区）
3. 启动定时自动爬虫（默认每 12 小时运行一次）

后续启动时，会跳过初始爬取，直接使用现有数据。

注：深圳作为广东省的城市，不单独爬取，使用广东省的油价数据。

## 智能爬取逻辑

系统在爬取油价时会自动判断：

1. **自动解析调整日期**：从网页中提取油价调整日期（如"油价2月24日24时调整"），作为记录的生效日期
2. 查找该省份和油品类型的最新历史记录
3. 比较新爬取的价格与最新记录的价格
4. **计算涨跌幅度**：自动计算并记录相比上次的价格变化（正数为上涨，负数为下跌）
5. **只有当价格发生变化时才创建新记录**（差值大于 0.001）
6. 如果是首次爬取该省份和油品，则正常创建记录（涨跌记录为 NULL 或 0）
7. 如果当天已有记录，则更新该记录

这样可以：
- 准确记录油价调整的实际生效日期
- 避免油价未变化时产生重复数据
- 自动追踪每次油价调整的涨跌情况
- 保持数据库整洁且信息完整

## API

### 1. 新增油价

`POST /api/v1/gas-prices`

```json
{
  "province": "北京",
  "fuelType": "GASOLINE_92",
  "effectiveDate": "2025-01-01",
  "pricePerLiter": 8.130,
  "remark": "春节前调价"
}
```

### 2. 更新油价

`PUT /api/v1/gas-prices/{id}`

### 3. 删除油价

`DELETE /api/v1/gas-prices/{id}`

### 4. 历史查询

`GET /api/v1/gas-prices/history`

可选参数：

- `province`：省份关键字，留空查询全部省份
- `fuelType`：`GASOLINE_92` / `GASOLINE_95` / `GASOLINE_98` / `DIESEL_0`
- `startDate`：`yyyy-MM-dd`
- `endDate`：`yyyy-MM-dd`
- `page`：默认 `0`
- `size`：默认 `20`，范围 `1~200`

示例：

```bash
curl "http://127.0.0.1:8080/api/v1/gas-prices/history?province=北京&startDate=2024-01-01&endDate=2024-12-31"
```

### 5. 触发油价爬取

`POST /api/v1/gas-prices/crawl`

请求体（全部可选）：

```json
{
  "province": "北京",
  "effectiveDate": "2026-02-25",
  "dryRun": false
}
```

- `province`：留空则抓取全部省份
- `effectiveDate`：写入生效日期，默认当天
- `dryRun`：`true` 时只抓取不落库

示例：

```bash
curl -X POST "http://127.0.0.1:8080/api/v1/gas-prices/crawl" \
  -H "Content-Type: application/json" \
  -d '{"province":"北京"}'
```

## 前端功能

- 按省份查询历史油价
- 条件筛选（油品、时间区间）
- 分页浏览
- 列表内删除记录
- 列表内快速调价（更新）
- 手动触发油价爬虫并入库（支持试运行）

## 自动爬取

服务启动后默认启用自动爬取任务（默认每 12 小时抓取一次）。

可通过环境变量控制：

- `AUTO_CRAWLER_ENABLED`：是否启用自动爬虫，默认 `true`
- `AUTO_CRAWLER_INTERVAL_MINUTES`：执行间隔（分钟），默认 `720`
- `AUTO_CRAWLER_DAILY_8AM_ENABLED`：是否启用每日 8 点自动爬取，默认 `true`
- `WEB_HOST`：Web 服务绑定地址，默认 `127.0.0.1`
- `WEB_PORT`：Web 服务绑定端口，默认 `8080`（未设置时自动尝试 8080-8090）

示例：

```bash
AUTO_CRAWLER_ENABLED=true AUTO_CRAWLER_INTERVAL_MINUTES=360 cargo run
```

## 测试

```bash
cargo test
```

## 数据管理

查看数据库位置：
```bash
# macOS/Linux
ls -la ~/.gas_price/data/gas_prices.db

# Windows (PowerShell)
ls $env:USERPROFILE\.gas_price\data\gas_prices.db
```

删除特定日期的数据：

```bash
# 查询特定日期的数据
curl "http://127.0.0.1:8080/api/v1/gas-prices/history?startDate=2026-02-26&endDate=2026-02-26"

# 根据返回的ID删除记录
curl -X DELETE "http://127.0.0.1:8080/api/v1/gas-prices/{id}"
```

或者直接操作数据库：

```bash
# macOS/Linux
sqlite3 ~/.gas_price/data/gas_prices.db "DELETE FROM gas_prices WHERE effective_date = '2026-02-26'"

# Windows (PowerShell)
sqlite3 $env:USERPROFILE\.gas_price\data\gas_prices.db "DELETE FROM gas_prices WHERE effective_date = '2026-02-26'"
```

重置所有数据（删除数据库文件）：
```bash
# macOS/Linux
rm ~/.gas_price/data/gas_prices.db

# Windows (PowerShell)
Remove-Item $env:USERPROFILE\.gas_price\data\gas_prices.db
```


## 🎯 桌面应用特性

- ✅ 原生窗口体验（可调整大小、最小化、最大化）
- ✅ 系统托盘图标（点击显示/隐藏窗口）
- ✅ 关闭按钮隐藏窗口（不退出应用）
- ✅ 内置 HTTP 服务器（无需外部服务器）
- ✅ 自动启动爬虫任务
- ✅ 跨平台支持（macOS、Windows、Linux）

## 🖼️ 应用图标

在构建桌面应用前，需要准备应用图标：

```bash
# 方法1: 使用 Tauri CLI 自动生成（推荐）
cargo tauri icon path/to/your/icon.png

# 方法2: 手动放置图标文件到 icons/ 目录
# 详见 icons/README.md
```

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📚 相关链接

- [Tauri 官方文档](https://tauri.app/)
- [Rust 官方文档](https://doc.rust-lang.org/)
- [Actix Web 文档](https://actix.rs/)
