# Rust 后端代码结构说明

## 目录结构

```
src/
├── main.rs                # Web 服务器入口
├── tauri_main.rs          # Tauri 桌面应用入口
├── lib.rs                 # 共享模块与对外导出
├── api/
│   ├── handlers.rs        # HTTP 处理器（API 端点实现）
│   └── routes.rs          # 路由与服务注册
├── domain/
│   └── models.rs          # 领域模型定义（结构体、枚举）
├── infrastructure/
│   ├── db.rs              # 数据库操作（初始化、查询、写入）
│   └── crawler.rs         # 爬虫逻辑（爬取、解析、定时任务）
├── common/
│   └── error.rs           # 统一错误定义与转换
└── README.md              # 本文档
```

## 模块说明

### main.rs
Web 服务器入口文件，负责：
- 初始化数据库连接
- 配置应用状态（AppState）
- 启动自动爬虫
- 配置 HTTP 服务器和路由

### tauri_main.rs
桌面应用入口文件，负责：
- 初始化数据库
- 启动内置 HTTP 服务
- Tauri 窗口与托盘管理

### lib.rs
对外导出共享能力，提供：
- `configure_routes()` 路由注册入口
- `start_auto_crawler()` 自动爬虫启动
- `get_database_path()` / `init_database()` / `seed_database()` / `AppState`

### api/handlers.rs
HTTP 处理器模块，包含：
- `history()`: GET /api/v1/gas-prices/history - 查询历史记录
- `create()`: POST /api/v1/gas-prices - 创建记录
- `update()`: PUT /api/v1/gas-prices/{id} - 更新记录
- `remove()`: DELETE /api/v1/gas-prices/{id} - 删除记录
- `crawl()`: POST /api/v1/gas-prices/crawl - 触发爬取
- `parse_date()`: 日期解析辅助函数

### api/routes.rs
路由注册模块，负责将 handlers 挂载到 Actix scope。

### domain/models.rs
领域模型定义，包含：
- `FuelType`: 油品类型枚举（92号、95号、98号、0号柴油）
- `GasPriceRecord`: 油价记录结构体
- `HistoryQuery`: 历史查询请求参数
- `PagedResponse<T>`: 分页响应结构
- `CreateRequest/UpdateRequest`: 创建/更新请求
- `CrawlRequest/CrawlResponse`: 爬取请求/响应
- `CrawlItem`: 爬取的数据项

### common/error.rs
错误处理模块，包含：
- `ApiError`: 统一的 API 错误类型
- 错误构造函数：`bad_request()`, `not_found()`, `internal_error()`
- 错误转换实现：`From<sqlx::Error>`, `From<reqwest::Error>`
- `ResponseError` trait 实现

### infrastructure/db.rs
数据库操作模块，包含：
- `get_database_path()`: 获取数据库文件路径
- `init_database()`: 初始化数据库连接和表结构
- `seed_database()`: 检查是否为首次运行
- `load_latest_prices()`: 批量查询最新油价
- `load_records_on_date()`: 查询指定日期已有记录
- `insert_price_record()`: 插入新记录
- `update_price_record()`: 更新现有记录
- `row_to_record()`: 数据库行转换为结构体

### infrastructure/crawler.rs
爬虫模块，包含：
- `build_http_client()`: 构建 HTTP 客户端
- `parse_province_links()`: 解析省份链接列表
- `parse_adjustment_date()`: 解析油价调整日期
- `parse_province_prices()`: 解析单个省份的油价
- `apply_crawl_items()`: 将爬取数据应用到数据库
- `run_crawl_job()`: 执行完整的爬取任务
- `start_auto_crawler()`: 启动自动爬虫（定时任务）
- `env_bool()`: 环境变量读取辅助函数
- `env_u64()`: 数字型环境变量读取辅助函数

## 模块依赖关系

```
main.rs
  ├── lib.rs
  │   ├── api/routes.rs
  │   │   └── api/handlers.rs
  │   ├── infrastructure/db.rs
  │   ├── infrastructure/crawler.rs
  │   └── common/error.rs
  └── domain/models.rs
```

## 编译和运行

```bash
# 检查代码
cargo check

# 编译
cargo build --release

# 运行
cargo run
```

## 环境变量

- `AUTO_CRAWLER_ENABLED`: 是否启用自动爬虫（默认: true）
- `AUTO_CRAWLER_INTERVAL_MINUTES`: 自动爬虫执行间隔（分钟，默认: 720）

## 数据库位置

- macOS/Linux: `~/.gas_price/data/gas_prices.db`
- Windows: `C:\Users\<用户名>\.gas_price\data\gas_prices.db`
