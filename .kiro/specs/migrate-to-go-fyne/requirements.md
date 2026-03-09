# 需求文档：迁移到 Go+Fyne 技术栈

## 介绍

本文档定义了将中国汽油价格管理系统从 Rust+Tauri 技术栈迁移到 Go+Fyne 技术栈的需求。迁移的主要驱动因素是 Rust+Tauri 在 Windows 平台上的构建复杂度和时间成本过高，而 Go+Fyne 提供了更快速的跨平台构建能力。

新的 Go+Fyne 项目将在独立的目录中创建，保留现有的 Rust+Tauri 项目文件不变。新项目将采用商业级别的代码结构，遵循 Go 语言最佳实践和清晰的分层架构。

迁移策略采用并行开发模式：在新目录下创建完整的 Go+Fyne 项目，同时保留现有的 Rust+Tauri 项目文件不变。这样可以方便对比、测试和逐步迁移，降低迁移风险。

## 术语表

- **Migration_System**: 负责执行迁移过程的系统
- **Go_Application**: 使用 Go 语言和 Fyne 框架重新实现的应用程序
- **Legacy_Application**: 当前基于 Rust+Tauri 的应用程序
- **Go_Project_Directory**: Go+Fyne 项目的根目录（gas-price-go）
- **Rust_Project_Directory**: Rust+Tauri 项目的根目录（当前项目根目录）
- **Database**: SQLite 数据库，存储油价历史记录
- **Crawler**: 网络爬虫模块，从 qiyoujiage.com 抓取油价数据
- **GUI**: 图形用户界面，使用 Fyne 框架实现
- **Backend_Server**: HTTP 服务器，提供 RESTful API
- **Price_Record**: 油价记录，包含省份、油品类型、价格、生效日期等信息
- **Fuel_Type**: 油品类型（92号汽油、95号汽油、98号汽油、0号柴油）
- **Province**: 中国省级行政区（31个省/直辖市/自治区）

## 需求

### 需求 1：项目目录结构和并存策略

**用户故事：** 作为开发者，我希望 Go+Fyne 项目在独立目录中创建，同时保留 Rust+Tauri 项目不变，以便两个项目可以并存、对比和逐步迁移。

#### 验收标准

1. THE Migration_System SHALL 在项目根目录下创建名为 `gas-price-go` 的新目录作为 Go_Project_Directory
2. THE Migration_System SHALL 保留 Rust_Project_Directory 中的所有现有文件不变（包括 src/、tauri.conf.json、Cargo.toml 等）
3. THE Go_Project_Directory SHALL 包含完整的 Go 项目结构（go.mod、main.go、cmd/、internal/、pkg/ 等）
4. THE Go_Project_Directory SHALL 包含独立的 README.md 文档说明 Go 项目的构建和运行方法
5. THE Migration_System SHALL 在项目根目录的 README.md 中添加说明，解释两个项目的关系和目录结构
6. THE Go_Application SHALL 与 Legacy_Application 共享相同的数据库文件路径（~/.gas_price/data/gas_prices.db）
7. THE Go_Application SHALL 与 Legacy_Application 共享相同的数据目录（~/.gas_price/）
8. THE Go_Application SHALL 能够读取和写入 Legacy_Application 创建的数据库文件
9. THE Migration_System SHALL 确保两个应用不会同时修改数据库导致冲突（通过文档说明使用注意事项）
10. WHERE 需要独立配置，THE Go_Application SHALL 使用独立的配置文件（gas-price-go/config.yaml）而非共享配置

### 需求 2：保持核心业务功能

**用户故事：** 作为应用用户，我希望迁移后的应用保留所有现有功能，以便继续使用熟悉的功能。

#### 验收标准

1. THE Go_Application SHALL 支持查询历史油价记录
2. THE Go_Application SHALL 支持按省份筛选油价数据
3. THE Go_Application SHALL 支持按油品类型筛选油价数据
4. THE Go_Application SHALL 支持按日期范围筛选油价数据
5. THE Go_Application SHALL 支持分页浏览油价记录
6. THE Go_Application SHALL 支持创建新的油价记录
7. THE Go_Application SHALL 支持更新现有油价记录
8. THE Go_Application SHALL 支持删除油价记录
9. THE Go_Application SHALL 支持手动触发油价爬取
10. THE Go_Application SHALL 支持自动定时爬取油价数据

### 需求 2：保持核心业务功能

**用户故事：** 作为应用用户，我希望迁移后的应用保留所有现有功能，以便继续使用熟悉的功能。

#### 验收标准

1. THE Go_Application SHALL 支持查询历史油价记录
2. THE Go_Application SHALL 支持按省份筛选油价数据
3. THE Go_Application SHALL 支持按油品类型筛选油价数据
4. THE Go_Application SHALL 支持按日期范围筛选油价数据
5. THE Go_Application SHALL 支持分页浏览油价记录
6. THE Go_Application SHALL 支持创建新的油价记录
7. THE Go_Application SHALL 支持更新现有油价记录
8. THE Go_Application SHALL 支持删除油价记录
9. THE Go_Application SHALL 支持手动触发油价爬取
10. THE Go_Application SHALL 支持自动定时爬取油价数据

### 需求 3：数据库兼容性

**用户故事：** 作为应用用户，我希望迁移后能继续使用现有的数据库文件，以便保留历史数据。

#### 验收标准

1. THE Go_Application SHALL 使用与 Legacy_Application 相同的数据库路径（~/.gas_price/data/gas_prices.db）
2. THE Go_Application SHALL 兼容现有的数据库表结构（gas_prices 表）
3. THE Go_Application SHALL 支持读取 Legacy_Application 创建的所有数据记录
4. WHEN 数据库文件不存在时，THE Go_Application SHALL 自动创建数据库和表结构
5. THE Go_Application SHALL 保持与 Legacy_Application 相同的字段定义（id, province, fuel_type, price_per_liter, effective_date, price_change, created_at, updated_at）

### 需求 3：数据库兼容性

**用户故事：** 作为应用用户，我希望迁移后能继续使用现有的数据库文件，以便保留历史数据。

#### 验收标准

1. THE Go_Application SHALL 使用与 Legacy_Application 相同的数据库路径（~/.gas_price/data/gas_prices.db）
2. THE Go_Application SHALL 兼容现有的数据库表结构（gas_prices 表）
3. THE Go_Application SHALL 支持读取 Legacy_Application 创建的所有数据记录
4. WHEN 数据库文件不存在时，THE Go_Application SHALL 自动创建数据库和表结构
5. THE Go_Application SHALL 保持与 Legacy_Application 相同的字段定义（id, province, fuel_type, price_per_liter, effective_date, price_change, created_at, updated_at）

### 需求 4：爬虫功能迁移

**用户故事：** 作为系统管理员，我希望爬虫功能正常工作，以便自动更新油价数据。

#### 验收标准

1. THE Crawler SHALL 从 https://www.qiyoujiage.com 抓取油价数据
2. THE Crawler SHALL 解析所有 31 个省级行政区的油价信息
3. THE Crawler SHALL 解析 4 种油品类型的价格（92号汽油、95号汽油、98号汽油、0号柴油）
4. THE Crawler SHALL 自动解析油价调整日期并作为生效日期
5. WHEN 油价发生变化时，THE Crawler SHALL 计算并记录价格涨跌幅度
6. WHEN 油价未发生变化时（差值小于 0.001），THE Crawler SHALL 跳过记录创建
7. WHEN 当天已有记录时，THE Crawler SHALL 更新现有记录而非创建新记录
8. THE Crawler SHALL 支持按省份过滤爬取范围
9. THE Crawler SHALL 支持指定生效日期
10. THE Crawler SHALL 支持试运行模式（dry-run）

### 需求 4：爬虫功能迁移

**用户故事：** 作为系统管理员，我希望爬虫功能正常工作，以便自动更新油价数据。

#### 验收标准

1. THE Crawler SHALL 从 https://www.qiyoujiage.com 抓取油价数据
2. THE Crawler SHALL 解析所有 31 个省级行政区的油价信息
3. THE Crawler SHALL 解析 4 种油品类型的价格（92号汽油、95号汽油、98号汽油、0号柴油）
4. THE Crawler SHALL 自动解析油价调整日期并作为生效日期
5. WHEN 油价发生变化时，THE Crawler SHALL 计算并记录价格涨跌幅度
6. WHEN 油价未发生变化时（差值小于 0.001），THE Crawler SHALL 跳过记录创建
7. WHEN 当天已有记录时，THE Crawler SHALL 更新现有记录而非创建新记录
8. THE Crawler SHALL 支持按省份过滤爬取范围
9. THE Crawler SHALL 支持指定生效日期
10. THE Crawler SHALL 支持试运行模式（dry-run）

### 需求 5：自动爬取调度

**用户故事：** 作为系统管理员，我希望应用能自动定时爬取油价，以便保持数据最新。

#### 验收标准

1. WHEN Go_Application 启动时，THE Go_Application SHALL 立即执行一次油价爬取
2. THE Go_Application SHALL 每天上午 8:00 自动执行油价爬取
3. THE Go_Application SHALL 记录每次爬取的结果（成功/失败、抓取省份数、记录数、新增数、更新数）
4. WHERE 环境变量 AUTO_CRAWLER_ENABLED 设置为 false，THE Go_Application SHALL 禁用自动爬取
5. WHEN 爬取失败时，THE Go_Application SHALL 记录错误日志但不影响应用运行

### 需求 5：自动爬取调度

**用户故事：** 作为系统管理员，我希望应用能自动定时爬取油价，以便保持数据最新。

#### 验收标准

1. WHEN Go_Application 启动时，THE Go_Application SHALL 立即执行一次油价爬取
2. THE Go_Application SHALL 每天上午 8:00 自动执行油价爬取
3. THE Go_Application SHALL 记录每次爬取的结果（成功/失败、抓取省份数、记录数、新增数、更新数）
4. WHERE 环境变量 AUTO_CRAWLER_ENABLED 设置为 false，THE Go_Application SHALL 禁用自动爬取
5. WHEN 爬取失败时，THE Go_Application SHALL 记录错误日志但不影响应用运行

### 需求 6：RESTful API 兼容性

**用户故事：** 作为 API 用户，我希望 API 接口保持不变，以便现有的集成继续工作。

#### 验收标准

1. THE Backend_Server SHALL 提供 GET /api/v1/gas-prices/history 接口用于查询历史记录
2. THE Backend_Server SHALL 提供 POST /api/v1/gas-prices 接口用于创建记录
3. THE Backend_Server SHALL 提供 PUT /api/v1/gas-prices/{id} 接口用于更新记录
4. THE Backend_Server SHALL 提供 DELETE /api/v1/gas-prices/{id} 接口用于删除记录
5. THE Backend_Server SHALL 提供 POST /api/v1/gas-prices/crawl 接口用于触发爬取
6. THE Backend_Server SHALL 支持 CORS 跨域请求
7. THE Backend_Server SHALL 返回与 Legacy_Application 相同的 JSON 响应格式
8. THE Backend_Server SHALL 使用相同的查询参数名称（province, fuelType, startDate, endDate, page, size）
9. THE Backend_Server SHALL 在端口 8080 启动，如果占用则尝试 8081-8090
10. THE Backend_Server SHALL 提供静态文件服务（HTML、CSS、JavaScript）

### 需求 6：RESTful API 兼容性

**用户故事：** 作为 API 用户，我希望 API 接口保持不变，以便现有的集成继续工作。

#### 验收标准

1. THE Backend_Server SHALL 提供 GET /api/v1/gas-prices/history 接口用于查询历史记录
2. THE Backend_Server SHALL 提供 POST /api/v1/gas-prices 接口用于创建记录
3. THE Backend_Server SHALL 提供 PUT /api/v1/gas-prices/{id} 接口用于更新记录
4. THE Backend_Server SHALL 提供 DELETE /api/v1/gas-prices/{id} 接口用于删除记录
5. THE Backend_Server SHALL 提供 POST /api/v1/gas-prices/crawl 接口用于触发爬取
6. THE Backend_Server SHALL 支持 CORS 跨域请求
7. THE Backend_Server SHALL 返回与 Legacy_Application 相同的 JSON 响应格式
8. THE Backend_Server SHALL 使用相同的查询参数名称（province, fuelType, startDate, endDate, page, size）
9. THE Backend_Server SHALL 在端口 8080 启动，如果占用则尝试 8081-8090
10. THE Backend_Server SHALL 提供静态文件服务（HTML、CSS、JavaScript）

### 需求 7：图形用户界面

**用户故事：** 作为桌面应用用户，我希望有一个原生的图形界面，以便方便地管理油价数据。

#### 验收标准

1. THE GUI SHALL 使用 Fyne 框架实现跨平台原生界面
2. THE GUI SHALL 提供主窗口显示油价数据列表
3. THE GUI SHALL 支持按省份、油品类型、日期范围筛选数据
4. THE GUI SHALL 支持分页浏览数据
5. THE GUI SHALL 提供按钮触发手动爬取
6. THE GUI SHALL 显示爬取进度和结果
7. THE GUI SHALL 支持创建、编辑、删除油价记录
8. THE GUI SHALL 显示油价涨跌趋势（可选：图表可视化）
9. THE GUI SHALL 提供系统托盘图标和菜单
10. WHEN 用户点击关闭按钮时，THE GUI SHALL 最小化到系统托盘而非退出应用

### 需求 7：图形用户界面

**用户故事：** 作为桌面应用用户，我希望有一个原生的图形界面，以便方便地管理油价数据。

#### 验收标准

1. THE GUI SHALL 使用 Fyne 框架实现跨平台原生界面
2. THE GUI SHALL 提供主窗口显示油价数据列表
3. THE GUI SHALL 支持按省份、油品类型、日期范围筛选数据
4. THE GUI SHALL 支持分页浏览数据
5. THE GUI SHALL 提供按钮触发手动爬取
6. THE GUI SHALL 显示爬取进度和结果
7. THE GUI SHALL 支持创建、编辑、删除油价记录
8. THE GUI SHALL 显示油价涨跌趋势（可选：图表可视化）
9. THE GUI SHALL 提供系统托盘图标和菜单
10. WHEN 用户点击关闭按钮时，THE GUI SHALL 最小化到系统托盘而非退出应用

### 需求 8：快速 Windows 构建

**用户故事：** 作为开发者，我希望能快速构建 Windows 应用，以便提高开发效率。

#### 验收标准

1. THE Migration_System SHALL 使用 Go 语言实现，以便利用 Go 的快速编译能力
2. THE Go_Application SHALL 支持通过 `go build` 命令直接构建 Windows 可执行文件
3. THE Go_Application SHALL 在 Windows 上的构建时间不超过 2 分钟
4. THE Go_Application SHALL 不依赖 WebView2 或其他复杂的系统组件
5. THE Go_Application SHALL 生成单一可执行文件（或最小依赖包）
6. THE Go_Application SHALL 支持交叉编译（从 macOS/Linux 构建 Windows 版本）

### 需求 8：快速 Windows 构建

**用户故事：** 作为开发者，我希望能快速构建 Windows 应用，以便提高开发效率。

#### 验收标准

1. THE Migration_System SHALL 使用 Go 语言实现，以便利用 Go 的快速编译能力
2. THE Go_Application SHALL 支持通过 `go build` 命令直接构建 Windows 可执行文件
3. THE Go_Application SHALL 在 Windows 上的构建时间不超过 2 分钟
4. THE Go_Application SHALL 不依赖 WebView2 或其他复杂的系统组件
5. THE Go_Application SHALL 生成单一可执行文件（或最小依赖包）
6. THE Go_Application SHALL 支持交叉编译（从 macOS/Linux 构建 Windows 版本）

### 需求 9：跨平台支持

**用户故事：** 作为多平台用户，我希望应用能在 Windows、macOS 和 Linux 上运行，以便在不同系统上使用。

#### 验收标准

1. THE Go_Application SHALL 在 Windows 10/11 上运行
2. THE Go_Application SHALL 在 macOS 10.15+ 上运行
3. THE Go_Application SHALL 在主流 Linux 发行版上运行（Ubuntu、Fedora、Debian）
4. THE Go_Application SHALL 在所有平台上提供一致的用户体验
5. THE Go_Application SHALL 在所有平台上使用相同的数据库路径规则（~/.gas_price/data/）

### 需求 9：跨平台支持

**用户故事：** 作为多平台用户，我希望应用能在 Windows、macOS 和 Linux 上运行，以便在不同系统上使用。

#### 验收标准

1. THE Go_Application SHALL 在 Windows 10/11 上运行
2. THE Go_Application SHALL 在 macOS 10.15+ 上运行
3. THE Go_Application SHALL 在主流 Linux 发行版上运行（Ubuntu、Fedora、Debian）
4. THE Go_Application SHALL 在所有平台上提供一致的用户体验
5. THE Go_Application SHALL 在所有平台上使用相同的数据库路径规则（~/.gas_price/data/）

### 需求 10：错误处理和日志

**用户故事：** 作为系统管理员，我希望应用能提供清晰的错误信息和日志，以便排查问题。

#### 验收标准

1. WHEN 数据库初始化失败时，THE Go_Application SHALL 显示错误对话框并提供解决建议
2. WHEN 网络请求失败时，THE Go_Application SHALL 记录错误日志并继续运行
3. WHEN 爬虫解析失败时，THE Go_Application SHALL 记录失败的省份和原因
4. THE Go_Application SHALL 将日志输出到标准输出和日志文件
5. THE Go_Application SHALL 记录每次爬取的详细信息（时间、省份、记录数、耗时）
6. WHEN API 请求参数无效时，THE Backend_Server SHALL 返回 400 错误和详细错误信息
7. WHEN 数据库操作失败时，THE Backend_Server SHALL 返回 500 错误和错误描述

### 需求 10：错误处理和日志

**用户故事：** 作为系统管理员，我希望应用能提供清晰的错误信息和日志，以便排查问题。

#### 验收标准

1. WHEN 数据库初始化失败时，THE Go_Application SHALL 显示错误对话框并提供解决建议
2. WHEN 网络请求失败时，THE Go_Application SHALL 记录错误日志并继续运行
3. WHEN 爬虫解析失败时，THE Go_Application SHALL 记录失败的省份和原因
4. THE Go_Application SHALL 将日志输出到标准输出和日志文件
5. THE Go_Application SHALL 记录每次爬取的详细信息（时间、省份、记录数、耗时）
6. WHEN API 请求参数无效时，THE Backend_Server SHALL 返回 400 错误和详细错误信息
7. WHEN 数据库操作失败时，THE Backend_Server SHALL 返回 500 错误和错误描述

### 需求 11：配置管理

**用户故事：** 作为系统管理员，我希望能通过配置文件或环境变量调整应用行为，以便适应不同的部署环境。

#### 验收标准

1. THE Go_Application SHALL 支持通过环境变量 DATABASE_URL 自定义数据库路径
2. THE Go_Application SHALL 支持通过环境变量 AUTO_CRAWLER_ENABLED 控制自动爬取开关
3. THE Go_Application SHALL 支持通过环境变量 SERVER_PORT 自定义 HTTP 服务器端口
4. WHERE 环境变量未设置，THE Go_Application SHALL 使用默认配置值
5. THE Go_Application SHALL 在启动时打印当前配置信息

### 需求 11：配置管理

**用户故事：** 作为系统管理员，我希望能通过配置文件或环境变量调整应用行为，以便适应不同的部署环境。

#### 验收标准

1. THE Go_Application SHALL 支持通过环境变量 DATABASE_URL 自定义数据库路径
2. THE Go_Application SHALL 支持通过环境变量 AUTO_CRAWLER_ENABLED 控制自动爬取开关
3. THE Go_Application SHALL 支持通过环境变量 SERVER_PORT 自定义 HTTP 服务器端口
4. WHERE 环境变量未设置，THE Go_Application SHALL 使用默认配置值
5. THE Go_Application SHALL 在启动时打印当前配置信息

### 需求 12：性能要求

**用户故事：** 作为应用用户，我希望应用响应迅速，以便高效地完成工作。

#### 验收标准

1. WHEN 查询历史记录时，THE Backend_Server SHALL 在 500ms 内返回结果（数据量 < 10000 条）
2. WHEN 执行全国油价爬取时，THE Crawler SHALL 在 5 分钟内完成（31 个省份）
3. THE Go_Application SHALL 在启动后 3 秒内显示主窗口
4. THE GUI SHALL 在用户操作后 100ms 内响应（按钮点击、输入等）
5. THE Go_Application SHALL 的内存占用不超过 200MB（正常运行状态）

### 需求 12：性能要求

**用户故事：** 作为应用用户，我希望应用响应迅速，以便高效地完成工作。

#### 验收标准

1. WHEN 查询历史记录时，THE Backend_Server SHALL 在 500ms 内返回结果（数据量 < 10000 条）
2. WHEN 执行全国油价爬取时，THE Crawler SHALL 在 5 分钟内完成（31 个省份）
3. THE Go_Application SHALL 在启动后 3 秒内显示主窗口
4. THE GUI SHALL 在用户操作后 100ms 内响应（按钮点击、输入等）
5. THE Go_Application SHALL 的内存占用不超过 200MB（正常运行状态）

### 需求 13：数据迁移工具（可选）

**用户故事：** 作为开发者，我希望有工具验证数据迁移的正确性，以便确保数据完整性。

#### 验收标准

1. WHERE 需要验证数据迁移，THE Migration_System SHALL 提供数据校验脚本
2. THE 数据校验脚本 SHALL 比对 Legacy_Application 和 Go_Application 的数据库记录数
3. THE 数据校验脚本 SHALL 验证关键字段的数据一致性（province, fuel_type, price_per_liter, effective_date）
4. WHEN 发现数据不一致时，THE 数据校验脚本 SHALL 输出详细的差异报告

### 需求 13：测试覆盖

**用户故事：** 作为开发者，我希望有完善的测试覆盖，以便确保代码质量和功能正确性。

#### 验收标准

1. THE Go_Application SHALL 包含数据库操作的单元测试
2. THE Go_Application SHALL 包含爬虫解析逻辑的单元测试
3. THE Go_Application SHALL 包含 API 接口的集成测试
4. THE Go_Application SHALL 包含日期解析和价格计算的单元测试
5. FOR ALL 爬虫解析函数，解析后格式化再解析 SHALL 返回等价的数据结构（round-trip property）
6. THE 测试覆盖率 SHALL 达到 70% 以上（核心业务逻辑）

### 需求 14：文档更新

**用户故事：** 作为新用户或开发者，我希望有清晰的文档，以便快速上手和理解项目。

#### 验收标准

1. THE Migration_System SHALL 更新 README.md 文档，说明新的技术栈和构建方法
2. THE Migration_System SHALL 提供 Go 项目的依赖安装说明
3. THE Migration_System SHALL 提供 Windows、macOS、Linux 的构建和运行说明
4. THE Migration_System SHALL 更新 API 文档（如有变化）
5. THE Migration_System SHALL 提供从 Rust 版本迁移的指南
6. THE Migration_System SHALL 说明 Go 版本和 Fyne 版本的依赖关系

### 需求 15：向后兼容性

**用户故事：** 作为现有用户，我希望升级到新版本后无需手动迁移数据，以便平滑过渡。

#### 验收标准

1. THE Go_Application SHALL 自动检测并使用现有的数据库文件
2. WHEN 检测到旧版本数据库时，THE Go_Application SHALL 自动执行必要的模式升级（如需要）
3. THE Go_Application SHALL 保留所有历史数据记录
4. THE Go_Application SHALL 在首次启动时显示迁移成功提示
5. IF 数据库模式升级失败，THEN THE Go_Application SHALL 创建数据库备份并显示错误信息

### 需求 16：商业级别项目结构

**用户故事：** 作为开发者和维护者，我希望新项目采用商业级别的代码结构，以便于长期维护和团队协作。

#### 验收标准

1. THE Go_Application SHALL 在独立目录 `gas-price-go` 中创建，不影响现有 Rust+Tauri 项目
2. THE Go_Application SHALL 采用标准的 Go 项目布局（cmd/, internal/, pkg/, api/ 等）
3. THE Go_Application SHALL 实现清晰的分层架构（表现层、业务逻辑层、数据访问层）
4. THE Go_Application SHALL 使用依赖注入模式管理组件依赖关系
5. THE Go_Application SHALL 将业务逻辑与 UI 代码分离
6. THE Go_Application SHALL 提供清晰的包结构和模块划分
7. THE Go_Application SHALL 包含 go.mod 和 go.sum 文件管理依赖
8. THE Go_Application SHALL 提供 Makefile 或构建脚本简化常见操作
9. THE Go_Application SHALL 遵循 Go 语言命名规范和代码风格指南
10. THE Go_Application SHALL 包含适当的代码注释和文档字符串
