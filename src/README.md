# Rust 后端代码结构说明

## 目录结构

```
src/
├── main.rs           # 主入口文件，应用启动和配置
├── models.rs         # 数据模型定义（结构体、枚举）
├── error.rs          # 错误处理（ApiError定义和转换）
├── database.rs       # 数据库操作（初始化、CRUD）
├── crawler.rs        # 爬虫逻辑（爬取、解析、定时任务）
├── handlers.rs       # HTTP处理器（API端点实现）
├── main_backup.rs    # 原始main.rs备份
└── README.md         # 本文档
```

## 模块说明

### main.rs
应用的主入口文件，负责：
- 初始化数据库连接
- 配置应用状态（AppState）
- 启动自动爬虫
- 配置HTTP服务器和路由

### models.rs
数据模型定义，包含：
- `FuelType`: 油品类型枚举（92号、95号、98号、0号柴油）
- `GasPriceRecord`: 油价记录结构体
- `HistoryQuery`: 历史查询请求参数
- `PagedResponse<T>`: 分页响应结构
- `CreateRequest/UpdateRequest`: 创建/更新请求
- `CrawlRequest/CrawlResponse`: 爬取请求/响应
- `CrawlItem`: 爬取的数据项

### error.rs
错误处理模块，包含：
- `ApiError`: 统一的API错误类型
- 错误构造函数：`bad_request()`, `not_found()`, `internal_error()`
- 错误转换实现：`From<sqlx::Error>`, `From<reqwest::Error>`
- `ResponseError` trait实现

### database.rs
数据库操作模块，包含：
- `get_database_path()`: 获取数据库文件路径
- `init_database()`: 初始化数据库连接和表结构
- `seed_database()`: 检查是否为首次运行
- `get_latest_price()`: 查询最新油价
- `get_today_record()`: 检查当天是否已有记录
- `insert_price_record()`: 插入新记录
- `update_price_record()`: 更新现有记录
- `row_to_record()`: 数据库行转换为结构体

### crawler.rs
爬虫模块，包含：
- `build_http_client()`: 构建HTTP客户端
- `parse_province_links()`: 解析省份链接列表
- `parse_adjustment_date()`: 解析油价调整日期
- `parse_province_prices()`: 解析单个省份的油价
- `apply_crawl_items()`: 将爬取数据应用到数据库
- `run_crawl_job()`: 执行完整的爬取任务
- `start_auto_crawler()`: 启动自动爬虫（定时任务）
- `env_bool()`: 环境变量读取辅助函数

### handlers.rs
HTTP处理器模块，包含：
- `history()`: GET /api/v1/gas-prices/history - 查询历史记录
- `create()`: POST /api/v1/gas-prices - 创建记录
- `update()`: PUT /api/v1/gas-prices/{id} - 更新记录
- `remove()`: DELETE /api/v1/gas-prices/{id} - 删除记录
- `crawl()`: POST /api/v1/gas-prices/crawl - 触发爬取
- `parse_date()`: 日期解析辅助函数

## 模块依赖关系

```
main.rs
  ├── models.rs (数据模型)
  ├── error.rs (错误处理)
  ├── database.rs
  │   ├── models.rs
  │   └── error.rs
  ├── crawler.rs
  │   ├── models.rs
  │   ├── error.rs
  │   └── database.rs
  └── handlers.rs
      ├── models.rs
      ├── error.rs
      ├── database.rs
      └── crawler.rs
```

## 优势

1. **模块化**: 代码按功能拆分，职责清晰
2. **可维护性**: 每个模块独立，易于查找和修改
3. **可测试性**: 模块化的代码更容易进行单元测试
4. **可扩展性**: 新功能可以独立添加新模块
5. **代码复用**: 各模块可以在不同场景下复用
6. **清晰的依赖**: 模块间依赖关系明确

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

## 数据库位置

- macOS/Linux: `~/.gas_price/data/gas_prices.db`
- Windows: `C:\Users\<用户名>\.gas_price\data\gas_prices.db`
