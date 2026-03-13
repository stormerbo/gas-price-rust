# 节假日管理系统实现计划

## 概述

实现一个可维护的节假日和油价调整日期管理系统，支持：
- 从外部数据源（GitHub）自动同步节假日数据
- 基于节假日自动计算油价调整日期
- 提供管理界面手动触发同步和查看数据

## 技术方案

### 数据源

使用 `NateScarlet/holiday-cn` (https://github.com/NateScarlet/holiday-cn)
- 优点：自动每日更新、数据格式标准（JSON）、维护活跃（1.2k stars）
- 数据地址：`https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json`

### 数据结构

#### 1. 数据库表

```sql
-- 节假日表
CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,      -- YYYY-MM-DD
    name TEXT NOT NULL,              -- 节假日名称（元旦、春节等）
    is_off_day INTEGER NOT NULL,    -- 是否休息日 (1=休息, 0=上班)
    year INTEGER NOT NULL,           -- 年份
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);

-- 调价规则配置表
CREATE TABLE IF NOT EXISTS adjustment_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- 单例表
    workdays_interval INTEGER NOT NULL DEFAULT 10,  -- 每隔N个工作日调价
    first_adjustment_2025 TEXT,  -- 2025年第一次调价日期
    first_adjustment_2026 TEXT,  -- 2026年第一次调价日期
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 插入默认配置
INSERT OR IGNORE INTO adjustment_settings (id, workdays_interval, first_adjustment_2025, first_adjustment_2026)
VALUES (1, 10, '2025-01-02', '2026-01-06');
```

#### 2. Rust 数据模型

```rust
// src/domain/models.rs 新增

#[derive(Debug, Serialize, Deserialize)]
pub struct Holiday {
    pub id: Option<u64>,
    pub date: String,
    pub name: String,
    pub is_off_day: bool,
    pub year: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdjustmentSettings {
    pub workdays_interval: i32,
    pub first_adjustment_2025: Option<String>,
    pub first_adjustment_2026: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdjustmentDate {
    pub date: String,
    pub sequence: i32, // 第几次调价
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub synced_years: Vec<i32>,
    pub total_records: usize,
    pub message: String,
}
```

### 后端API实现

#### 1. 数据同步（爬虫）

```rust
// src/infrastructure/holiday_sync.rs (新文件)

use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Deserialize)]
struct HolidayData {
    name: String,
    date: String,
    #[serde(default)]
    isOffDay: bool,
}

pub async fn sync_holidays_from_github(
    pool: &SqlitePool,
    years: Vec<i32>,
) -> Result<SyncResponse, ApiError> {
    let client = reqwest::Client::builder()
        .user_agent("gas-price-app/1.0")
        .build()?;

    let mut total = 0;
    let mut synced_years = Vec::new();

    for year in years {
        let url = format!(
            "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{}.json",
            year
        );

        let response = client.get(&url).send().await?;
        if !response.status().is_success() {
            continue;
        }

        let holidays: HashMap<String, HolidayData> = response.json().await?;

        // 开始事务
        let mut tx = pool.begin().await?;

        for (date_str, data) in holidays {
            sqlx::query(
                r#"
                INSERT OR REPLACE INTO holidays (date, name, is_off_day, year)
                VALUES (?, ?, ?, ?)
                "#,
            )
            .bind(&date_str)
            .bind(&data.name)
            .bind(data.isOffDay)
            .bind(year)
            .execute(&mut *tx)
            .await?;

            total += 1;
        }

        tx.commit().await?;
        synced_years.push(year);
    }

    Ok(SyncResponse {
        synced_years,
        total_records: total,
        message: format!("成功同步{}个年份，共{}条记录", synced_years.len(), total),
    })
}
```

#### 2. 工作日计算

```rust
// src/infrastructure/workday_calculator.rs (新文件)

use chrono::{Datelike, NaiveDate, Weekday};

pub struct WorkdayCalculator {
    holidays: HashSet<String>, // 日期字符串集合
}

impl WorkdayCalculator {
    pub async fn new(pool: &SqlitePool, year: i32) -> Result<Self, ApiError> {
        let rows = sqlx::query(
            "SELECT date FROM holidays WHERE year = ? AND is_off_day = 1"
        )
        .bind(year)
        .fetch_all(pool)
        .await?;

        let mut holidays = HashSet::new();
        for row in rows {
            let date: String = row.try_get("date")?;
            holidays.insert(date);
        }

        Ok(Self { holidays })
    }

    pub fn is_workday(&self, date: &NaiveDate) -> bool {
        // 检查是否周末
        if date.weekday() == Weekday::Sat || date.weekday() == Weekday::Sun {
            return false;
        }

        // 检查是否节假日
        let date_str = date.format("%Y-%m-%d").to_string();
        !self.holidays.contains(&date_str)
    }

    pub fn add_workdays(&self, start: NaiveDate, workdays: i32) -> NaiveDate {
        let mut current = start;
        let mut remaining = workdays;

        while remaining > 0 {
            current = current.succ_opt().expect("日期溢出");
            if self.is_workday(&current) {
                remaining -= 1;
            }
        }

        current
    }

    pub async fn generate_adjustment_dates(
        pool: &SqlitePool,
        year: i32,
        first_date: &str,
        interval: i32,
    ) -> Result<Vec<AdjustmentDate>, ApiError> {
        let calculator = Self::new(pool, year).await?;
        let start = NaiveDate::parse_from_str(first_date, "%Y-%m-%d")
            .map_err(|e| bad_request(&format!("日期格式错误: {}", e)))?;

        let mut dates = Vec::new();
        let mut current = start;
        let mut sequence = 1;

        // 生成25个调价日期（覆盖全年）
        while current.year() == year && sequence <= 25 {
            dates.push(AdjustmentDate {
                date: current.format("%Y-%m-%d").to_string(),
                sequence,
            });

            current = calculator.add_workdays(current, interval);
            sequence += 1;
        }

        Ok(dates)
    }
}
```

#### 3. API 处理器

```rust
// src/api/handlers.rs 新增

/// GET /api/v1/holidays?year=2025
pub async fn get_holidays(
    query: web::Query<HashMap<String, String>>,
    data: web::Data<AppState>,
) -> Result<HttpResponse, ApiError> {
    let year = query
        .get("year")
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or_else(|| chrono::Local::now().year());

    let rows = sqlx::query_as::<_, Holiday>(
        "SELECT id, date, name, is_off_day, year FROM holidays WHERE year = ? ORDER BY date"
    )
    .bind(year)
    .fetch_all(&data.db)
    .await?;

    Ok(HttpResponse::Ok().json(rows))
}

/// POST /api/v1/holidays/sync
pub async fn sync_holidays(
    data: web::Data<AppState>,
) -> Result<HttpResponse, ApiError> {
    let current_year = chrono::Local::now().year();
    let years = vec![current_year - 1, current_year, current_year + 1];

    let response = holiday_sync::sync_holidays_from_github(&data.db, years).await?;

    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/v1/holidays/adjustment-dates?year=2025
pub async fn get_adjustment_dates(
    query: web::Query<HashMap<String, String>>,
    data: web::Data<AppState>,
) -> Result<HttpResponse, ApiError> {
    let year = query
        .get("year")
        .and_then(|s| s.parse::<i32>().ok())
        .ok_or_else(|| bad_request("year参数必须提供"))?;

    // 获取配置
    let settings = sqlx::query_as::<_, AdjustmentSettings>(
        "SELECT workdays_interval, first_adjustment_2025, first_adjustment_2026 FROM adjustment_settings WHERE id = 1"
    )
    .fetch_one(&data.db)
    .await?;

    let first_date = match year {
        2025 => settings.first_adjustment_2025,
        2026 => settings.first_adjustment_2026,
        _ => None,
    }
    .ok_or_else(|| bad_request(&format!("未配置{}年的首次调价日期", year)))?;

    let dates = WorkdayCalculator::generate_adjustment_dates(
        &data.db,
        year,
        &first_date,
        settings.workdays_interval,
    )
    .await?;

    Ok(HttpResponse::Ok().json(dates))
}

/// GET /api/v1/holidays/next-adjustment
pub async fn get_next_adjustment(
    data: web::Data<AppState>,
) -> Result<HttpResponse, ApiError> {
    let today = chrono::Local::now().naive_local().date();
    let year = today.year();

    let dates = get_adjustment_dates_internal(&data.db, year).await?;

    let next = dates
        .into_iter()
        .find(|d| {
            NaiveDate::parse_from_str(&d.date, "%Y-%m-%d")
                .map(|date| date > today)
                .unwrap_or(false)
        })
        .ok_or_else(|| not_found("未找到下次调价日期"))?;

    Ok(HttpResponse::Ok().json(next))
}
```

### 前端实现

#### 1. API 封装

```javascript
// frontend/src/api/index.js 新增

export async function fetchHolidays(year) {
  const response = await fetch(`${API_BASE}/holidays?year=${year}`);
  if (!response.ok) throw new Error('获取节假日失败');
  return response.json();
}

export async function syncHolidays() {
  const response = await fetch(`${API_BASE}/holidays/sync`, { method: 'POST' });
  if (!response.ok) throw new Error('同步节假日失败');
  return response.json();
}

export async function fetchAdjustmentDates(year) {
  const response = await fetch(`${API_BASE}/holidays/adjustment-dates?year=${year}`);
  if (!response.ok) throw new Error('获取调价日期失败');
  return response.json();
}

export async function fetchNextAdjustment() {
  const response = await fetch(`${API_BASE}/holidays/next-adjustment`);
  if (!response.ok) throw new Error('获取下次调价日期失败');
  return response.json();
}
```

#### 2. 系统设置页面

```jsx
// frontend/src/pages/Settings.jsx (新文件)

import React, { useState } from 'react';
import { Button, Table, message, Spin } from 'antd';
import { syncHolidays, fetchHolidays, fetchAdjustmentDates } from '../api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [adjustmentDates, setAdjustmentDates] = useState([]);

  const handleSync = async () => {
    setLoading(true);
    try {
      const result = await syncHolidays();
      message.success(result.message);
      
      // 同步成功后刷新数据
      const year = new Date().getFullYear();
      const [holidayData, adjustmentData] = await Promise.all([
        fetchHolidays(year),
        fetchAdjustmentDates(year),
      ]);
      setHolidays(holidayData);
      setAdjustmentDates(adjustmentData);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1>系统设置</h1>

      <section className="card">
        <h2>节假日管理</h2>
        <p>从 GitHub 同步最新的中国法定节假日数据</p>
        <Button 
          type="primary" 
          onClick={handleSync} 
          loading={loading}
        >
          同步节假日数据
        </Button>

        <Table
          dataSource={holidays}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date' },
            { title: '节假日名称', dataIndex: 'name', key: 'name' },
            { title: '是否休息', dataIndex: 'is_off_day', key: 'is_off_day', render: (v) => v ? '是' : '否' },
          ]}
          style={{ marginTop: 20 }}
        />
      </section>

      <section className="card">
        <h2>油价调整日期</h2>
        <p>基于节假日自动计算的调价窗口</p>

        <Table
          dataSource={adjustmentDates}
          columns={[
            { title: '序号', dataIndex: 'sequence', key: 'sequence' },
            { title: '调价日期', dataIndex: 'date', key: 'date' },
          ]}
        />
      </section>
    </div>
  );
}
```

#### 3. 更新日历页面使用后端API

```javascript
// frontend/src/pages/Calendar.jsx 修改

import { fetchAdjustmentDates } from '../api';

// 在组件中加载调价日期
useEffect(() => {
  async function loadAdjustmentDates() {
    try {
      const dates = await fetchAdjustmentDates(currentDate.year());
      const dateSet = new Set(dates.map(d => d.date));
      setAdjustmentDates(dateSet);
    } catch (err) {
      console.error('加载调价日期失败:', err);
    }
  }
  loadAdjustmentDates();
}, [currentDate.year()]);
```

## 实现步骤

### 阶段1：数据库和后端基础 (2-3小时)
1. 创建数据库迁移（`holidays` 和 `adjustment_settings` 表）
2. 实现节假日同步爬虫（`holiday_sync.rs`）
3. 实现工作日计算器（`workday_calculator.rs`）
4. 添加数据模型（`Holiday`, `AdjustmentSettings`）

### 阶段2：后端API (1-2小时)
1. 实现 API 处理器（`get_holidays`, `sync_holidays`, etc.）
2. 添加路由配置
3. 测试 API 端点

### 阶段3：前端集成 (2-3小时)
1. 创建系统设置页面（`Settings.jsx`）
2. 添加 API 封装函数
3. 更新日历页面使用后端数据
4. 添加导航链接

### 阶段4：测试和优化 (1-2小时)
1. 端到端测试
2. 错误处理优化
3. 用户体验优化
4. 文档更新

## 优势

✅ **可维护性**：数据源自动更新，无需手动维护
✅ **灵活性**：支持配置调价规则，适应政策变化
✅ **可分发性**：打包后用户可自行同步数据
✅ **准确性**：基于官方数据源，工作日计算准确
✅ **扩展性**：易于添加其他国家或地区的节假日

## 注意事项

1. **网络依赖**：首次使用需要联网同步数据
2. **数据源可靠性**：依赖 GitHub，需考虑网络不通的降级方案
3. **跨年处理**：需要确保跨年时自动加载下一年数据
4. **调价规则变更**：如果国家改变调价规则（如改为15个工作日），需要更新配置

## 后续优化

- [ ] 支持手动编辑节假日数据
- [ ] 添加数据备份/恢复功能
- [ ] 支持多个数据源（备用源）
- [ ] 定时自动同步节假日数据
- [ ] 添加数据校验和错误报告
