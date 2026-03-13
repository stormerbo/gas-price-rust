// 数据模型定义
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FuelType {
    #[serde(rename = "GASOLINE_92")]
    Gasoline92,
    #[serde(rename = "GASOLINE_95")]
    Gasoline95,
    #[serde(rename = "GASOLINE_98")]
    Gasoline98,
    #[serde(rename = "DIESEL_0")]
    Diesel0,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GasPriceRecord {
    pub id: u64,
    pub province: String,
    pub fuel_type: FuelType,
    pub price_per_liter: f64,
    pub effective_date: String,
    pub price_change: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryQuery {
    pub province: Option<String>,
    pub fuel_type: Option<FuelType>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    #[serde(default)]
    pub page: usize,
    #[serde(default = "default_size")]
    pub size: usize,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}

fn default_size() -> usize {
    20
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PagedResponse<T> {
    pub content: Vec<T>,
    pub page: usize,
    pub size: usize,
    pub total_elements: usize,
    pub total_pages: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequest {
    pub province: String,
    pub fuel_type: FuelType,
    pub price_per_liter: f64,
    pub effective_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRequest {
    pub province: String,
    pub fuel_type: FuelType,
    pub price_per_liter: f64,
    pub effective_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlRequest {
    pub province: Option<String>,
    pub effective_date: Option<String>,
    pub dry_run: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CrawlResponse {
    pub fetched_provinces: Vec<String>,
    pub fetched_records: usize,
    pub created: usize,
    pub updated: usize,
}

#[derive(Debug, Clone)]
pub struct CrawlItem {
    pub province: String,
    pub fuel_type: FuelType,
    pub price_per_liter: f64,
    pub effective_date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct AmapNearbyQuery {
    pub location: String,
    pub keywords: Option<String>,
    pub radius: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct AmapGeocodeQuery {
    pub address: String,
}

impl FuelType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FuelType::Gasoline92 => "GASOLINE_92",
            FuelType::Gasoline95 => "GASOLINE_95",
            FuelType::Gasoline98 => "GASOLINE_98",
            FuelType::Diesel0 => "DIESEL_0",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "GASOLINE_92" => Some(FuelType::Gasoline92),
            "GASOLINE_95" => Some(FuelType::Gasoline95),
            "GASOLINE_98" => Some(FuelType::Gasoline98),
            "DIESEL_0" => Some(FuelType::Diesel0),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NextAdjustmentResponse {
    pub next_date: String,
    pub days_until: i64,
    pub is_adjustment_day: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustmentCalendarItem {
    pub date: String,
    pub round: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Holiday {
    pub id: Option<i64>,
    pub date: String,
    pub name: String,
    pub is_off_day: bool,
    pub year: i32,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AdjustmentSettings {
    pub workdays_interval: i32,
    pub first_adjustment_2025: Option<String>,
    pub first_adjustment_2026: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustmentDate {
    pub date: String,
    pub sequence: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResponse {
    pub synced_years: Vec<i32>,
    pub total_records: usize,
    pub message: String,
}
