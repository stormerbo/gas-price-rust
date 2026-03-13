# 节假日管理系统 - 快速启动指南

## 🚀 5分钟快速上手

### 步骤 1：启动应用

```bash
# 方式1：一键启动（推荐）
pnpm start

# 方式2：分别启动（手动控制）
# 终端1：先启动后端（必须先启动！）
cargo run --bin gas-price-web
# 等待显示 "Starting HTTP server at 127.0.0.1:8080"

# 终端2：再启动前端
cd frontend && pnpm run dev
# 等待显示 "Local: http://localhost:3000"
```

**重要：**
- ✅ 前端：http://localhost:3000（开发服务器）
- ✅ 后端：http://localhost:8080（API 服务）
- ✅ 前端已配置代理，自动转发 `/api` 请求到后端
- ⚠️ 必须先启动后端，否则 API 调用会失败

### 步骤 2：同步节假日数据（首次使用）

1. 打开浏览器访问：`http://localhost:3000`
2. 点击导航栏右侧的 **"⚙️ 系统设置"**
3. 在 **"节假日管理"** 标签页
4. 点击蓝色按钮 **"同步节假日数据"**
5. 等待3-5秒，看到成功提示："成功同步3个年份..."

### 步骤 3：查看调价日期

1. 点击 **"调价规则配置"** 标签页
2. 页面下方会显示当年的所有调价日期（25次）
3. 如需修改规则，编辑配置后点击 **"保存配置"**

### 步骤 4：在日历中查看

1. 点击导航栏的 **"📅 油价日历"**
2. 调价日期会显示 **橙色圆点** 标记
3. 已调价的显示"↑涨"或"↓跌"
4. 未来调价的显示"待调价"

## ✅ 验证是否成功

### 检查节假日数据

进入系统设置，节假日列表应该显示：
- 2025年：约 100+ 条记录
- 2026年：约 100+ 条记录
- 2027年：约 100+ 条记录

### 检查调价日期

调价规则配置页面下方应该显示：
- 第1次：2026-01-06
- 第2次：2026-01-20
- 第3次：2026-02-03
- 第4次：2026-02-24（春节后，跳过假期）
- 第5次：2026-03-09
- ...共约25次

## 📖 API 测试

### 测试节假日同步

```bash
curl -X POST http://localhost:8080/api/v1/holidays/sync
```

预期响应：
```json
{
  "syncedYears": [2025, 2026, 2027],
  "totalRecords": 450,
  "message": "成功同步3个年份（2025, 2026, 2027），共450条记录"
}
```

### 查询2026年节假日

```bash
curl http://localhost:8080/api/v1/holidays?year=2026
```

### 获取2026年调价日期

```bash
curl http://localhost:8080/api/v1/holidays/adjustment-dates?year=2026
```

### 获取下次调价日期

```bash
curl http://localhost:8080/api/v1/holidays/next-adjustment
```

## 🔧 常见问题排查

### 问题0：前端显示 "502 Bad Gateway" 或 "Failed to fetch"

**原因**：后端未启动或端口错误

**解决方案**：
1. 检查后端是否运行：`lsof -i :8080`
2. 如果没有输出，启动后端：`cargo run --bin gas-price-web`
3. 确认后端日志显示：`Starting HTTP server at 127.0.0.1:8080`
4. 刷新前端页面

### 问题1：同步失败 "未能成功同步任何年份"

**原因**：无法访问 GitHub

**解决方案**：
1. 检查后端是否运行（见问题0）
2. 检查网络连接
3. 尝试访问：https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/2026.json
4. 如果无法访问，配置代理或使用 VPN
5. 重试同步

### 问题2：调价日期不显示

**原因**：未同步节假日数据

**解决方案**：
1. 先同步节假日数据
2. 刷新页面
3. 查看浏览器控制台是否有错误

### 问题3：日历上没有橙色圆点

**原因**：前端缓存或数据未加载

**解决方案**：
1. 硬刷新页面（Cmd+Shift+R / Ctrl+Shift+F5）
2. 检查网络请求是否成功
3. 打开开发者工具查看控制台错误

## 📂 数据库位置

节假日数据存储在本地 SQLite：

```bash
# macOS/Linux
~/.gas_price/data/gas_prices.db

# Windows
C:\Users\<用户名>\.gas_price\data\gas_prices.db
```

### 查看数据库内容

```bash
# 安装 sqlite3
# macOS: brew install sqlite3
# Ubuntu: apt install sqlite3

# 查看节假日数据
sqlite3 ~/.gas_price/data/gas_prices.db "SELECT * FROM holidays LIMIT 10;"

# 查看配置
sqlite3 ~/.gas_price/data/gas_prices.db "SELECT * FROM adjustment_settings;"
```

## 🎯 功能速查表

| 功能 | 入口 | 操作 |
|-----|------|------|
| 同步节假日 | 系统设置 → 节假日管理 | 点击"同步节假日数据" |
| 查看节假日 | 系统设置 → 节假日管理 | 表格自动显示 |
| 配置规则 | 系统设置 → 调价规则配置 | 修改表单后保存 |
| 查看调价日期 | 系统设置 → 调价规则配置 | 页面下方表格 |
| 日历标记 | 油价日历 | 自动显示橙色圆点 |

## 🔄 年度更新流程

**每年1月初：**

1. 打开应用 → 系统设置
2. 点击"同步节假日数据"
3. 系统自动获取新一年的节假日
4. 调价日期自动重新计算
5. 验证前3个日期与发改委公告是否一致

**预计耗时：1分钟**

## 💡 提示

1. **首次使用必须同步**：应用不包含预置节假日数据
2. **建议每月同步一次**：确保数据最新
3. **配置会立即生效**：保存配置后调价日期立即重新计算
4. **数据本地存储**：同步一次后可离线使用
5. **支持多年查询**：系统会同步前后3年数据

## 📞 获取帮助

- 详细文档：`HOLIDAY_SYSTEM_GUIDE.md`
- 实现计划：`IMPLEMENTATION_PLAN_HOLIDAYS.md`
- 代码位置：
  - 后端：`src/infrastructure/holiday_sync.rs`
  - 前端：`frontend/src/pages/Settings.jsx`
