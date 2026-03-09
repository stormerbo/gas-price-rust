# 设计文档：Go+Fyne 迁移项目

## 概述

本设计文档描述了将中国汽油价格管理系统从 Rust+Tauri 技术栈迁移到 Go+Fyne 技术栈的技术实现方案。新项目将在独立目录 `gas-price-go` 中创建，采用商业级别的 Go 项目结构，实现清晰的分层架构和依赖注入模式。

### 设计目标

1. **快速构建**：Windows 平台构建时间 < 2 分钟
2. **跨平台支持**：Windows/macOS/Linux 统一代码库
3. **数据兼容**：与现有 Rust 版本共享相同的 SQLite 数据库
4. **功能完整**：保留所有现有功能（爬虫、API、GUI）
5. **代码质量**：商业级别项目结构，易于维护和扩展

### 技术栈选择

- **语言**：Go 1.21+
- **GUI 框架**：Fyne v2.4+
- **数据库**：SQLite 3（使用 mattn/go-sqlite3）
- **HTTP 框架**：标准库 net/http + gorilla/mux
- **HTML 解析**：PuerkitoBio/goquery
- **依赖注入**：uber-go/dig
- **日志**：uber-go/zap
- **配置管理**：环境变量 + 默认值

## 架构

### 分层架构

项目采用经典的三层架构模式：

```
┌─────────────────────────────────────────┐
│         表现层 (Presentation)            │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Fyne GUI    │    │  HTTP API    │  │
│  └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│        业务逻辑层 (Business Logic)       │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ Price Service│    │Crawler Service│ │
│  └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────┘
                  │
┌─────────────────────────────────────────┐
│       数据访问层 (Data Access)           │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ Repository   │    │  Database    │  │
│  └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────┘
```

### 目录结构

```
gas-price-go/
├── cmd/
│   └── app/
│       └── main.go              # 应用入口
├── internal/
│   ├── app/
│   │   └── container.go         # 依赖注入容器
│   ├── domain/
│   │   └── models.go            # 领域模型
│   ├── repository/
│   │   ├── interface.go         # 仓储接口
│   │   └── sqlite.go            # SQLite 实现
│   ├── service/
│   │   ├── price.go             # 油价服务
│   │   └── crawler.go           # 爬虫服务
│   ├── api/
│   │   ├── server.go            # HTTP 服务器
│   │   └── handlers.go          # API 处理器
│   └── gui/
│       ├── app.go               # GUI 应用
│       ├── main_window.go       # 主窗口
│       └── components/          # UI 组件
├── pkg/
│   ├── config/
│   │   └── config.go            # 配置管理
│   └── logger/
│       └── logger.go            # 日志工具
├── static/                      # 静态文件（HTML/CSS/JS）
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### 依赖注入架构

使用 uber-go/dig 实现依赖注入，确保组件之间的松耦合：

```go
// 依赖关系图
Config
  ↓
Logger
  ↓
Database
  ↓
Repository
  ↓
Services (PriceService, CrawlerService)
  ↓
Handlers (API, GUI)
```

### 并发模型

1. **HTTP 服务器**：使用 Go 标准库的 goroutine 池处理请求
2. **爬虫调度**：独立 goroutine 运行定时任务
3. **GUI 事件**：Fyne 框架的事件循环
4. **数据库访问**：使用连接池，支持并发读写

## 组件和接口

### 1. 配置管理 (pkg/config)

```go
package config

type Config struct {
    DatabaseURL         string
    ServerPort          int
    AutoCrawlerEnabled  bool
    LogLevel            string
}

func Load() (*Config, error)
```

**职责**：
- 从环境变量读取配置
- 提供默认值
- 验证配置有效性

**默认值**：
- `DATABASE_URL`: `~/.gas_price/data/gas_prices.db`
- `SERVER_PORT`: `8080`（占用则尝试 8081-8090）
- `AUTO_CRAWLER_ENABLED`: `true`
- `LOG_LEVEL`: `info`

### 2. 日志工具 (pkg/logger)

```go
package logger

func New(level string) (*zap.Logger, error)
```

**职责**：
- 提供结构化日志
- 支持日志级别控制
- 同时输出到控制台和文件

### 3. 领域模型 (internal/domain)

```go
package domain

type FuelType string

const (
    Gasoline92 FuelType = "GASOLINE_92"
    Gasoline95 FuelType = "GASOLINE_95"
    Gasoline98 FuelType = "GASOLINE_98"
    Diesel0    FuelType = "DIESEL_0"
)

type GasPriceRecord struct {
    ID             int64
    Province       string
    FuelType       FuelType
    PricePerLiter  float64
    EffectiveDate  time.Time
    PriceChange    *float64
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

type HistoryQuery struct {
    Province      *string
    FuelType      *FuelType
    StartDate     *time.Time
    EndDate       *time.Time
    Page          int
    Size          int
}

type PagedResponse struct {
    Content       []GasPriceRecord
    Page          int
    Size          int
    TotalElements int
    TotalPages    int
}

type CrawlRequest struct {
    Province      *string
    EffectiveDate *time.Time
    DryRun        bool
}

type CrawlResponse struct {
    FetchedProvinces []string
    FetchedRecords   int
    Created          int
    Updated          int
}
```

### 4. 仓储层 (internal/repository)

```go
package repository

type Repository interface {
    // 查询操作
    FindByID(ctx context.Context, id int64) (*domain.GasPriceRecord, error)
    FindAll(ctx context.Context, query domain.HistoryQuery) (*domain.PagedResponse, error)
    GetLatestPrice(ctx context.Context, province string, fuelType domain.FuelType) (*float64, error)
    GetTodayRecord(ctx context.Context, province string, fuelType domain.FuelType, date time.Time) (*int64, error)
    
    // 写入操作
    Create(ctx context.Context, record *domain.GasPriceRecord) (int64, error)
    Update(ctx context.Context, id int64, record *domain.GasPriceRecord) error
    Delete(ctx context.Context, id int64) error
    
    // 批量操作
    BatchCreate(ctx context.Context, records []*domain.GasPriceRecord) error
    
    // 数据库管理
    InitSchema(ctx context.Context) error
    Close() error
}
```

**SQLite 实现**：
- 使用 `database/sql` + `mattn/go-sqlite3`
- 连接池配置：MaxOpenConns=10, MaxIdleConns=5
- 自动创建数据库目录和表结构
- 使用预编译语句防止 SQL 注入

### 5. 油价服务 (internal/service/price.go)

```go
package service

type PriceService interface {
    GetHistory(ctx context.Context, query domain.HistoryQuery) (*domain.PagedResponse, error)
    CreateRecord(ctx context.Context, record *domain.GasPriceRecord) (int64, error)
    UpdateRecord(ctx context.Context, id int64, record *domain.GasPriceRecord) error
    DeleteRecord(ctx context.Context, id int64) error
}
```

**职责**：
- 业务逻辑验证（日期格式、价格范围等）
- 调用仓储层进行数据操作
- 错误处理和日志记录

### 6. 爬虫服务 (internal/service/crawler.go)

```go
package service

type CrawlerService interface {
    // 执行爬取任务
    Crawl(ctx context.Context, req domain.CrawlRequest) (*domain.CrawlResponse, error)
    
    // 启动自动调度
    StartScheduler(ctx context.Context)
}

type ProvinceLink struct {
    Province string
    URL      string
}

type CrawlItem struct {
    Province      string
    FuelType      domain.FuelType
    PricePerLiter float64
    EffectiveDate time.Time
}
```

**职责**：
- 从 qiyoujiage.com 抓取油价数据
- 解析 HTML 提取省份链接和油价表格
- 解析油价调整日期
- 计算价格变化
- 去重和更新逻辑
- 定时调度（启动时立即执行，之后每天 8:00）

**爬取流程**：
1. 访问首页获取 31 个省份链接
2. 并发访问各省份页面（限制并发数为 5）
3. 解析油价表格（92#、95#、98#、0#柴油）
4. 解析调整日期（正则匹配"油价X月X日调整"）
5. 查询最新价格计算涨跌幅
6. 如果价格变化 < 0.001，跳过
7. 如果当天已有记录，更新；否则创建

### 7. HTTP API (internal/api)

```go
package api

type Server struct {
    router        *mux.Router
    priceService  service.PriceService
    crawlerService service.CrawlerService
    logger        *zap.Logger
}

func NewServer(
    priceService service.PriceService,
    crawlerService service.CrawlerService,
    logger *zap.Logger,
) *Server

func (s *Server) Start(port int) error
```

**路由定义**：
- `GET /api/v1/gas-prices/history` - 查询历史记录
- `POST /api/v1/gas-prices` - 创建记录
- `PUT /api/v1/gas-prices/{id}` - 更新记录
- `DELETE /api/v1/gas-prices/{id}` - 删除记录
- `POST /api/v1/gas-prices/crawl` - 触发爬取
- `GET /` - 静态文件服务

**中间件**：
- CORS 支持
- 请求日志
- 错误恢复
- 响应时间统计

### 8. GUI 应用 (internal/gui)

```go
package gui

type App struct {
    fyneApp       fyne.App
    mainWindow    fyne.Window
    priceService  service.PriceService
    crawlerService service.CrawlerService
    logger        *zap.Logger
}

func NewApp(
    priceService service.PriceService,
    crawlerService service.CrawlerService,
    logger *zap.Logger,
) *App

func (a *App) Run()
```

**主窗口布局**：
```
┌─────────────────────────────────────────────┐
│  中国汽油价格管理系统                        │
├─────────────────────────────────────────────┤
│  [筛选区域]                                  │
│  省份: [下拉框]  油品: [下拉框]              │
│  开始日期: [日期选择]  结束日期: [日期选择]  │
│  [查询] [重置] [爬取数据] [新增记录]         │
├─────────────────────────────────────────────┤
│  [数据表格]                                  │
│  省份 | 油品 | 价格 | 涨跌 | 生效日期        │
│  ...                                        │
├─────────────────────────────────────────────┤
│  [上一页] 第 1/10 页 [下一页]               │
└─────────────────────────────────────────────┘
```

**功能组件**：
- 筛选表单（省份、油品、日期范围）
- 数据表格（支持排序）
- 分页控件
- 爬取进度对话框
- 新增/编辑记录对话框
- 系统托盘图标和菜单

## 数据模型

### 数据库表结构

```sql
CREATE TABLE IF NOT EXISTS gas_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    price_per_liter REAL NOT NULL,
    effective_date TEXT NOT NULL,
    price_change REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_province_fuel_date 
ON gas_prices(province, fuel_type, effective_date DESC);
```

**字段说明**：
- `id`: 主键，自增
- `province`: 省份名称（如"北京"、"上海"）
- `fuel_type`: 油品类型（GASOLINE_92/GASOLINE_95/GASOLINE_98/DIESEL_0）
- `price_per_liter`: 每升价格（元）
- `effective_date`: 生效日期（YYYY-MM-DD 格式）
- `price_change`: 价格变化（元，正数为涨价，负数为降价）
- `created_at`: 创建时间
- `updated_at`: 更新时间

**索引设计**：
- 复合索引 `(province, fuel_type, effective_date DESC)` 优化常见查询

### 数据兼容性

与 Rust 版本完全兼容：
- 相同的数据库路径：`~/.gas_price/data/gas_prices.db`
- 相同的表结构和字段定义
- 相同的数据类型和约束
- 相同的日期时间格式

### 数据验证规则

1. **省份名称**：非空，长度 2-10 字符
2. **油品类型**：必须是四种类型之一
3. **价格**：大于 0，小于 100（元/升）
4. **生效日期**：YYYY-MM-DD 格式，不能是未来日期
5. **价格变化**：可选，范围 -10 到 +10（元/升）


## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：筛选结果正确性

*对于任意*油价记录集合和筛选条件（省份、油品类型、日期范围），筛选后的结果应该只包含满足所有指定条件的记录。

**验证需求：2.2, 2.3, 2.4**

### 属性 2：分页结果一致性

*对于任意*油价记录集合、页码和页大小，返回的记录数应该等于 min(页大小, 剩余记录数)，且总记录数应该等于所有页的记录数之和。

**验证需求：2.5**

### 属性 3：创建后可查询

*对于任意*有效的油价记录，创建成功后，使用返回的 ID 查询应该能够获取到相同的记录（省份、油品类型、价格、生效日期相同）。

**验证需求：2.6**

### 属性 4：更新后反映新值

*对于任意*存在的油价记录和有效的更新数据，更新成功后，查询该记录应该返回更新后的值。

**验证需求：2.7**

### 属性 5：删除后不可查询

*对于任意*存在的油价记录，删除成功后，查询该记录应该返回"不存在"错误。

**验证需求：2.8**

### 属性 6：价格变化计算正确性

*对于任意*两个油价值（旧价格和新价格），计算的价格变化应该等于新价格减去旧价格。

**验证需求：4.5**

### 属性 7：价格未变化时跳过

*对于任意*油价记录，如果新价格与旧价格的差值绝对值小于 0.001，则不应该创建新记录。

**验证需求：4.6**

### 属性 8：省份过滤爬取正确性

*对于任意*省份筛选条件，爬取结果中的所有记录应该只包含指定省份的数据。

**验证需求：4.8**

### 属性 9：API 响应格式兼容性

*对于任意*API 请求，Go 应用返回的 JSON 响应结构（字段名称、数据类型、嵌套结构）应该与 Rust 应用返回的响应结构相同。

**验证需求：6.7**

### 属性 10：无效参数错误处理

*对于任意*无效的 API 请求参数（空值、格式错误、超出范围），服务器应该返回 400 状态码和描述性错误信息。

**验证需求：10.6**

### 属性 11：配置默认值

*对于任意*未设置的环境变量，应用应该使用预定义的默认值（DATABASE_URL、SERVER_PORT、AUTO_CRAWLER_ENABLED 等）。

**验证需求：11.4**

### 属性 12：跨平台数据库路径一致性

*对于任意*支持的操作系统平台（Windows、macOS、Linux），数据库路径应该遵循相同的规则：用户主目录/.gas_price/data/gas_prices.db。

**验证需求：9.5**

### 属性 13：数据序列化 Round-trip

*对于任意*有效的油价记录数据结构，序列化为 JSON 后再反序列化应该得到等价的数据结构（所有字段值相同）。

**验证需求：13.5**

## 错误处理

### 错误分类

1. **数据库错误**
   - 连接失败
   - 查询失败
   - 约束违反
   - 磁盘空间不足

2. **网络错误**
   - 连接超时
   - DNS 解析失败
   - HTTP 错误状态码
   - 证书验证失败

3. **解析错误**
   - HTML 结构变化
   - 数据格式不匹配
   - 日期解析失败
   - 价格解析失败

4. **验证错误**
   - 参数缺失
   - 参数格式错误
   - 参数超出范围
   - 业务规则违反

5. **系统错误**
   - 文件系统权限不足
   - 内存不足
   - 端口被占用
   - 依赖服务不可用

### 错误处理策略

#### 数据库错误处理

```go
// 初始化失败：显示错误对话框，提供解决建议
if err := initDatabase(); err != nil {
    dialog.ShowError(
        fmt.Errorf("数据库初始化失败: %v\n\n请检查：\n1. 磁盘空间是否充足\n2. 目录权限是否正确\n3. 数据库文件是否被占用", err),
        mainWindow,
    )
    return
}

// 查询失败：记录日志，返回错误给调用者
records, err := repo.FindAll(ctx, query)
if err != nil {
    logger.Error("查询失败", zap.Error(err), zap.Any("query", query))
    return nil, fmt.Errorf("查询油价记录失败: %w", err)
}
```

#### 网络错误处理

```go
// 爬虫网络请求失败：记录日志，继续处理其他省份
for _, link := range provinceLinks {
    prices, err := crawler.FetchProvince(ctx, link)
    if err != nil {
        logger.Warn("抓取省份失败",
            zap.String("province", link.Province),
            zap.Error(err),
        )
        continue // 不中断整个爬取流程
    }
    allPrices = append(allPrices, prices...)
}
```

#### 解析错误处理

```go
// HTML 解析失败：记录详细信息，返回空结果
prices, err := parseTable(html)
if err != nil {
    logger.Error("解析油价表格失败",
        zap.String("province", province),
        zap.String("url", url),
        zap.Error(err),
        zap.String("html_snippet", html[:min(len(html), 200)]),
    )
    return []Price{}, nil // 返回空结果而非错误
}
```

#### API 验证错误处理

```go
// 参数验证失败：返回 400 错误和详细信息
func (h *Handler) CreateRecord(w http.ResponseWriter, r *http.Request) {
    var req CreateRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        respondError(w, http.StatusBadRequest, "请求体格式错误: "+err.Error())
        return
    }
    
    if err := validateCreateRequest(&req); err != nil {
        respondError(w, http.StatusBadRequest, err.Error())
        return
    }
    
    // 继续处理...
}
```

### 错误恢复机制

1. **数据库连接池**：自动重连，最多重试 3 次
2. **HTTP 请求**：超时 30 秒，最多重试 2 次
3. **爬虫调度**：失败不影响下次调度
4. **API 服务器**：panic 恢复中间件，记录堆栈信息
5. **GUI 应用**：错误对话框，不崩溃退出

### 日志记录

使用 uber-go/zap 提供结构化日志：

```go
// 日志级别
// DEBUG: 详细的调试信息
// INFO: 一般信息（启动、配置、爬取结果）
// WARN: 警告信息（网络失败、解析失败）
// ERROR: 错误信息（数据库失败、严重错误）

// 日志输出
// 1. 控制台：彩色输出，便于开发调试
// 2. 文件：~/.gas_price/logs/app.log，按天轮转，保留 7 天

// 日志格式
{
    "level": "info",
    "ts": "2024-01-15T08:00:00.123Z",
    "caller": "crawler/service.go:45",
    "msg": "爬取完成",
    "provinces": 31,
    "records": 124,
    "created": 10,
    "updated": 5,
    "duration_ms": 45678
}
```

## 测试策略

### 双重测试方法

本项目采用单元测试和基于属性的测试相结合的方法，确保全面的代码覆盖和正确性验证。

#### 单元测试

单元测试专注于：
- **具体示例**：验证特定输入的预期输出
- **边界情况**：空值、零值、极端值
- **错误条件**：无效输入、资源不可用
- **集成点**：组件之间的交互

**测试框架**：Go 标准库 `testing` + `testify/assert`

**示例**：
```go
func TestCreateRecord_ValidInput(t *testing.T) {
    // 测试创建有效记录
    repo := setupTestRepo(t)
    record := &domain.GasPriceRecord{
        Province:      "北京",
        FuelType:      domain.Gasoline92,
        PricePerLiter: 7.85,
        EffectiveDate: time.Now(),
    }
    
    id, err := repo.Create(context.Background(), record)
    assert.NoError(t, err)
    assert.Greater(t, id, int64(0))
}

func TestCreateRecord_EmptyProvince(t *testing.T) {
    // 测试边界情况：省份为空
    repo := setupTestRepo(t)
    record := &domain.GasPriceRecord{
        Province:      "",
        FuelType:      domain.Gasoline92,
        PricePerLiter: 7.85,
    }
    
    _, err := repo.Create(context.Background(), record)
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "省份不能为空")
}
```

#### 基于属性的测试

基于属性的测试验证通用属性，使用随机生成的输入进行大量测试。

**测试框架**：`leanovate/gopter`

**配置**：
- 每个属性测试最少 100 次迭代
- 使用种子确保可重现性
- 失败时自动缩小到最小反例

**标签格式**：
```go
// Feature: migrate-to-go-fyne, Property 1: 筛选结果正确性
```

**示例**：
```go
func TestProperty_FilterCorrectness(t *testing.T) {
    // Feature: migrate-to-go-fyne, Property 1: 筛选结果正确性
    properties := gopter.NewProperties(nil)
    
    properties.Property("筛选结果只包含满足条件的记录", prop.ForAll(
        func(records []domain.GasPriceRecord, province string, fuelType domain.FuelType) bool {
            // 执行筛选
            filtered := filterRecords(records, province, fuelType)
            
            // 验证所有结果都满足条件
            for _, r := range filtered {
                if r.Province != province || r.FuelType != fuelType {
                    return false
                }
            }
            return true
        },
        genRecords(),
        genProvince(),
        genFuelType(),
    ))
    
    properties.TestingRun(t, gopter.ConsoleReporter(false))
}

func TestProperty_CreateThenQuery(t *testing.T) {
    // Feature: migrate-to-go-fyne, Property 3: 创建后可查询
    properties := gopter.NewProperties(nil)
    
    properties.Property("创建后可以查询到相同记录", prop.ForAll(
        func(record domain.GasPriceRecord) bool {
            repo := setupTestRepo(t)
            
            // 创建记录
            id, err := repo.Create(context.Background(), &record)
            if err != nil {
                return false
            }
            
            // 查询记录
            queried, err := repo.FindByID(context.Background(), id)
            if err != nil {
                return false
            }
            
            // 验证字段相同
            return queried.Province == record.Province &&
                   queried.FuelType == record.FuelType &&
                   math.Abs(queried.PricePerLiter-record.PricePerLiter) < 0.001 &&
                   queried.EffectiveDate.Equal(record.EffectiveDate)
        },
        genValidRecord(),
    ))
    
    properties.TestingRun(t, gopter.ConsoleReporter(false))
}

func TestProperty_SerializationRoundTrip(t *testing.T) {
    // Feature: migrate-to-go-fyne, Property 13: 数据序列化 Round-trip
    properties := gopter.NewProperties(nil)
    
    properties.Property("序列化后反序列化得到等价结构", prop.ForAll(
        func(record domain.GasPriceRecord) bool {
            // 序列化
            data, err := json.Marshal(record)
            if err != nil {
                return false
            }
            
            // 反序列化
            var decoded domain.GasPriceRecord
            if err := json.Unmarshal(data, &decoded); err != nil {
                return false
            }
            
            // 验证等价性
            return recordsEqual(record, decoded)
        },
        genValidRecord(),
    ))
    
    properties.TestingRun(t, gopter.ConsoleReporter(false))
}
```

### 测试数据生成器

```go
// 生成有效的油价记录
func genValidRecord() gopter.Gen {
    return gopter.CombineGens(
        gen.AnyString().SuchThat(func(s string) bool { return len(s) >= 2 && len(s) <= 10 }),
        gen.OneConstOf(domain.Gasoline92, domain.Gasoline95, domain.Gasoline98, domain.Diesel0),
        gen.Float64Range(5.0, 10.0),
        gen.TimeRange(time.Now().AddDate(-1, 0, 0), time.Now()),
    ).Map(func(vals []interface{}) domain.GasPriceRecord {
        return domain.GasPriceRecord{
            Province:      vals[0].(string),
            FuelType:      vals[1].(domain.FuelType),
            PricePerLiter: vals[2].(float64),
            EffectiveDate: vals[3].(time.Time),
        }
    })
}
```

### 测试覆盖目标

- **仓储层**：90% 覆盖率（数据库操作关键）
- **服务层**：80% 覆盖率（业务逻辑核心）
- **API 层**：75% 覆盖率（HTTP 处理）
- **爬虫层**：70% 覆盖率（外部依赖多）
- **整体**：70% 以上

### 测试执行

```bash
# 运行所有测试
make test

# 运行单元测试
go test ./... -v

# 运行基于属性的测试
go test ./... -v -tags=property

# 生成覆盖率报告
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# 运行特定包的测试
go test ./internal/repository -v
```

### 集成测试

除了单元测试和属性测试，还需要集成测试验证：

1. **数据库集成**：使用真实 SQLite 数据库
2. **HTTP 集成**：启动测试服务器，发送真实请求
3. **爬虫集成**：使用模拟 HTTP 服务器返回测试 HTML
4. **端到端测试**：完整的用户场景流程

```go
func TestIntegration_CrawlAndQuery(t *testing.T) {
    // 设置测试环境
    db := setupTestDatabase(t)
    mockServer := setupMockHTMLServer(t)
    defer mockServer.Close()
    
    // 执行爬取
    crawler := service.NewCrawlerService(db, mockServer.URL)
    result, err := crawler.Crawl(context.Background(), domain.CrawlRequest{})
    assert.NoError(t, err)
    assert.Greater(t, result.Created, 0)
    
    // 查询验证
    priceService := service.NewPriceService(db)
    records, err := priceService.GetHistory(context.Background(), domain.HistoryQuery{
        Page: 0,
        Size: 10,
    })
    assert.NoError(t, err)
    assert.Greater(t, len(records.Content), 0)
}
```

## 实施计划

### 阶段 1：项目脚手架（1-2 天）

1. 创建 `gas-price-go` 目录结构
2. 初始化 Go 模块（go.mod）
3. 配置依赖注入容器
4. 实现配置管理和日志工具
5. 编写项目 README 和 Makefile

### 阶段 2：数据访问层（2-3 天）

1. 定义领域模型
2. 实现仓储接口
3. 实现 SQLite 仓储
4. 编写数据库迁移逻辑
5. 编写单元测试和属性测试

### 阶段 3：业务逻辑层（3-4 天）

1. 实现油价服务
2. 实现爬虫服务（HTML 解析、日期解析）
3. 实现爬虫调度器
4. 编写单元测试和属性测试
5. 集成测试

### 阶段 4：HTTP API 层（2-3 天）

1. 实现 HTTP 服务器
2. 实现 API 处理器
3. 实现中间件（CORS、日志、错误恢复）
4. 静态文件服务
5. API 集成测试

### 阶段 5：GUI 应用（3-4 天）

1. 实现主窗口布局
2. 实现数据表格组件
3. 实现筛选表单
4. 实现爬取进度对话框
5. 实现系统托盘
6. GUI 手动测试

### 阶段 6：集成和测试（2-3 天）

1. 端到端测试
2. 跨平台测试（Windows、macOS、Linux）
3. 性能测试
4. 数据兼容性测试
5. 修复 bug

### 阶段 7：文档和发布（1-2 天）

1. 完善 README 文档
2. 编写构建说明
3. 编写用户指南
4. 创建发布包
5. 更新根目录 README

**总计：14-21 天**

## 技术风险和缓解措施

### 风险 1：Fyne GUI 性能

**描述**：Fyne 在大数据量表格渲染时可能性能不佳

**缓解措施**：
- 使用虚拟滚动技术
- 限制单页显示记录数（最多 100 条）
- 实现懒加载和分页

### 风险 2：网站结构变化

**描述**：qiyoujiage.com 网站结构变化导致爬虫失败

**缓解措施**：
- 使用多个 CSS 选择器作为备选
- 详细的错误日志记录
- 提供手动数据导入功能
- 定期监控爬虫成功率

### 风险 3：数据库并发

**描述**：GUI 和 API 同时访问数据库可能导致锁竞争

**缓解措施**：
- SQLite 使用 WAL 模式提高并发性
- 合理配置连接池
- 读操作使用共享锁
- 写操作快速提交

### 风险 4：跨平台兼容性

**描述**：不同操作系统的文件路径、权限、GUI 渲染差异

**缓解措施**：
- 使用 Go 标准库的跨平台 API
- 在三个平台上进行测试
- 使用 Fyne 的跨平台抽象
- 文档说明平台特定问题

### 风险 5：构建时间

**描述**：Fyne 应用构建时间可能超过预期

**缓解措施**：
- 使用 Go 模块缓存
- 增量编译
- 优化依赖项
- 使用构建缓存

## 部署和分发

### 构建命令

```bash
# Windows
GOOS=windows GOARCH=amd64 go build -o gas-price-go.exe ./cmd/app

# macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o gas-price-go-intel ./cmd/app

# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o gas-price-go-arm ./cmd/app

# Linux
GOOS=linux GOARCH=amd64 go build -o gas-price-go ./cmd/app
```

### 打包

- **Windows**：使用 NSIS 或 Inno Setup 创建安装程序
- **macOS**：创建 .app 包和 .dmg 镜像
- **Linux**：创建 .deb 和 .rpm 包

### 依赖

运行时依赖：
- 无（静态链接，除了系统库）

开发依赖：
- Go 1.21+
- GCC（用于 CGO，SQLite 驱动需要）
- Fyne 开发工具

### 安装说明

用户只需：
1. 下载对应平台的可执行文件
2. 双击运行（首次运行会自动创建数据库）
3. 可选：配置环境变量自定义行为

## 维护和扩展

### 代码组织原则

1. **单一职责**：每个包、类型、函数只做一件事
2. **依赖倒置**：高层模块不依赖低层模块，都依赖抽象
3. **接口隔离**：接口应该小而专注
4. **开闭原则**：对扩展开放，对修改关闭

### 扩展点

1. **新增油品类型**：在 `domain.FuelType` 枚举中添加
2. **新增数据源**：实现 `CrawlerService` 接口
3. **新增存储后端**：实现 `Repository` 接口
4. **新增 API 端点**：在 `api.Server` 中添加路由
5. **新增 GUI 功能**：在 `gui` 包中添加组件

### 性能优化建议

1. **数据库索引**：根据查询模式添加索引
2. **缓存**：对频繁查询的数据使用内存缓存
3. **批量操作**：爬虫数据批量插入
4. **并发控制**：爬虫使用 worker pool 限制并发
5. **连接池**：合理配置数据库连接池大小

### 监控和诊断

1. **日志分析**：定期检查错误日志
2. **性能指标**：记录 API 响应时间、爬虫耗时
3. **资源使用**：监控内存和 CPU 使用
4. **爬虫成功率**：统计爬取成功/失败比例

## 总结

本设计文档描述了将中国汽油价格管理系统从 Rust+Tauri 迁移到 Go+Fyne 的完整技术方案。新项目采用商业级别的分层架构，使用依赖注入模式，确保代码的可维护性和可扩展性。

关键设计决策：
- 使用 Go 语言实现快速构建（< 2 分钟）
- 使用 Fyne 框架实现跨平台原生 GUI
- 保持与 Rust 版本的数据库和 API 兼容性
- 采用双重测试策略（单元测试 + 属性测试）
- 清晰的错误处理和日志记录

预期收益：
- Windows 构建时间从 10+ 分钟降低到 < 2 分钟
- 跨平台支持更简单（无需 WebView2）
- 代码结构更清晰，易于维护
- 完整的测试覆盖，确保质量
