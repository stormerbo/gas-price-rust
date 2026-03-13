use crate::common::error::{bad_request, ApiError};
use crate::domain::models::AdjustmentDate;
use chrono::{Datelike, NaiveDate, Weekday};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;

pub struct WorkdayCalculator {
    holiday_map: HashMap<String, bool>,
}

impl WorkdayCalculator {
    pub async fn new(pool: &SqlitePool, year: i32) -> Result<Self, ApiError> {
        let rows = sqlx::query("SELECT date, is_off_day FROM holidays WHERE year = ?")
            .bind(year)
            .fetch_all(pool)
            .await?;

        let mut holiday_map = HashMap::new();
        for row in rows {
            let date: String = row.try_get("date")?;
            let is_off_day: bool = row.try_get("is_off_day")?;
            holiday_map.insert(date, is_off_day);
        }

        Ok(Self { holiday_map })
    }

    pub fn is_workday(&self, date: &NaiveDate) -> bool {
        let date_str = date.format("%Y-%m-%d").to_string();
        
        if let Some(&is_off_day) = self.holiday_map.get(&date_str) {
            return !is_off_day;
        }
        
        !(date.weekday() == Weekday::Sat || date.weekday() == Weekday::Sun)
    }

    pub fn add_workdays(&self, start: NaiveDate, workdays: i32) -> NaiveDate {
        let mut current = start;
        let mut remaining = workdays;

        while remaining > 0 {
            current = current
                .succ_opt()
                .expect("日期计算溢出，请检查输入参数");
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
