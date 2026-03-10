# 前端代码结构说明

## 目录结构

```
static/js/
├── main.js                 # 主入口文件
├── constants.js            # 常量定义（省份列表、油品类型等）
├── utils.js                # 工具函数（日期处理、格式化等）
├── api.js                  # API调用封装
├── location.js             # 位置定位服务
├── tauriFetch.js            # Tauri 环境下的 fetch 适配
├── ui/
│   ├── provinceSelect.js   # 省份选择器UI
│   ├── datePicker.js       # 日期选择器UI
│   └── historyTable.js     # 历史记录表格UI
├── components/
│   └── localPricesWidget.js # 本地油价组件
└── README.md               # 本文档
```

## 模块说明

### main.js
应用的主入口文件，负责初始化各个模块。

### constants.js
定义应用中使用的常量：
- `getApiBase()`: 动态获取 API 基础路径（Tauri 环境自动探测端口）
- `PROVINCES`: 省份列表
- `PROVINCE_EN_TO_CN`: 英文省份名到中文的映射
- `FUEL_TYPE_NAMES`: 油品类型名称映射
- `FUEL_TYPES`: 油品类型列表

### utils.js
通用工具函数：
- `showToast()`: 显示提示消息
- `mapFuelType()`: 映射油品类型
- `formatPriceChange()`: 格式化价格变动
- `buildQuery()`: 构建查询参数
- 日期相关工具函数

### api.js
API调用封装：
- `fetchHistory()`: 获取油价历史记录
- `deleteRecord()`: 删除记录
- `updateRecord()`: 更新记录
- `fetchLatestPrice()`: 获取最新油价

### location.js
位置定位服务：
- `getProvinceByIP()`: 通过IP获取省份
- `getUserProvince()`: 获取用户省份（带默认值）

### ui/provinceSelect.js
省份选择器UI组件：
- `populateProvinceSelect()`: 填充省份选择器
- `initProvinceSelects()`: 初始化省份选择器

### ui/datePicker.js
日期选择器UI组件：
- `initDatePickers()`: 初始化日期选择器
- 包含完整的日历UI和交互逻辑

### components/localPricesWidget.js
本地油价组件：
- `initLocalPricesWidget()`: 初始化并渲染本地油价卡片

### ui/historyTable.js
历史记录表格UI组件：
- `initHistoryTable()`: 初始化历史记录表格
- 包含搜索、分页、删除、调价等功能

## 使用方式

在HTML中引入主入口文件：

```html
<script type="module" src="/js/main.js"></script>
```

## 优势

1. **模块化**: 代码按功能拆分，易于维护和扩展
2. **可复用**: 各模块独立，可在其他页面复用
3. **清晰的职责**: 每个模块职责单一明确
4. **易于测试**: 模块化的代码更容易进行单元测试
5. **ES6模块**: 使用现代JavaScript模块系统
