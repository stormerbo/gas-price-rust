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

impl FuelType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FuelType::Gasoline92 => "GASOLINE_92",
            FuelType::Gasoline95 => "GASOLINE_95",
            FuelType::Gasoline98 => "GASOLINE_98",
            FuelType::Diesel0 => "DIESEL_0",
        }
    }
}
