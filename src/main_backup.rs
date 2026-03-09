use actix_files::Files;
use actix_web::http::StatusCode;
use actix_web::{
    App, HttpResponse, HttpServer, Responder, ResponseError, delete, get, post, put, web,
};
use chrono::{Datelike, Local, NaiveDate};
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use std::collections::HashSet;
use std::env;
use std::fmt::{Display, Formatter};
use std::fs;
use std::time::Duration;

const CRAWL_SOURCE_NAME: &str = "qiyoujiage.com";
const CRAWL_BASE_URL: &str = "http://www.qiyoujiage.com";
const CRAWL_USER_AGENT: &str = "gas-price-crawler/1.0 (+https://local)";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
enum FuelType {
    #[serde(rename = "GASOLINE_92")]
    Gasoline92,
    #[serde(rename = "GASOLINE_95")]
    Gasoline95,
    #[serde(rename = "GASOLINE_98")]
    Gasoline98,
    #[serde(rename = "DIESEL_0")]
    Diesel0,
}

impl FuelType {
    fn to_str(&self) -> &'static str {
        match self {
            FuelType::Gasoline92 => "GASOLINE_92",
            FuelType::Gasoline95 => "GASOLINE_95",
            FuelType::Gasoline98 => "GASOLINE_98",
            FuelType::Diesel0 => "DIESEL_0",
        }
    }

    fn from_str(s: &str) -> Option<Self> {
        match s {
            "GASOLINE_92" => Some(FuelType::Gasoline92),
            "GASOLINE_95" => Some(FuelType::Gasoline95),
            "GASOLINE_98" => Some(FuelType::Gasoline98),
            "DIESEL_0" => Some(FuelType::Diesel0),
            _ => None,
        }
    }
}

#[derive(Debug, Clone)]
struct GasPriceRecord {
    #[allow(dead_code)]
    id: u64,
    province: String,
    fuel_type: FuelType,
    effective_date: NaiveDate,
    price_per_liter: f64,
    price_change: Option<f64>,  // 相比上次的价格变化（正数为上涨，负数为下跌）
    remark: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GasPriceUpsertRequest {
    province: String,
    fuel_type: FuelType,
    effective_date: String,
    price_per_liter: f64,
    price_change: Option<f64>,
    remark: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GasPriceResponse {
    id: u64,
    province: String,
    fuel_type: FuelType,
    effective_date: String,
    price_per_liter: f64,
    price_change: Option<f64>,
    remark: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HistoryQuery {
    province: Option<String>,
    #[serde(rename = "fuelType")]
    fuel_type: Option<FuelType>,
    #[serde(rename = "startDate")]
    start_date: Option<String>,
    #[serde(rename = "endDate")]
    end_date: Option<String>,
    page: Option<usize>,
    size: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CrawlRequest {
    province: Option<String>,
    effective_date: Option<String>,
    dry_run: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CrawlResponse {
    source: String,
    province_filter: Option<String>,
    effective_date: String,
    dry_run: bool,
    fetched_provinces: Vec<String>,
    fetched_records: usize,
    created: usize,
    updated: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PageResponse<T> {
    content: Vec<T>,
    page: usize,
    size: usize,
    total_elements: usize,
    total_pages: usize,
}

#[derive(Debug, Clone)]
struct CrawlItem {
    province: String,
    fuel_type: FuelType,
    price_per_liter: f64,
    effective_date: Option<NaiveDate>,  // 从网页解析的调整日期
    source_url: String,
}

struct AppState {
    db: SqlitePool,
}

#[derive(Debug)]
struct ApiError {
    status: StatusCode,
    message: String,
}

#[derive(Serialize)]
struct ErrorBody {
    message: String,
}

impl Display for ApiError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        self.status
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status).json(ErrorBody {
            message: self.message.clone(),
        })
    }
}

fn bad_request(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::BAD_REQUEST,
        message: msg.to_string(),
    }
}

fn not_found(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::NOT_FOUND,
        message: msg.to_string(),
    }
}

fn conflict(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::CONFLICT,
        message: msg.to_string(),
    }
}

fn upstream_error(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::BAD_GATEWAY,
        message: msg.to_string(),
    }
}

fn parse_date(value: &str, field: &str) -> Result<NaiveDate, ApiError> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| bad_request(&format!("{} 格式错误，应为 yyyy-MM-dd", field)))
}

fn normalize_text(value: &str) -> String {
    value.trim().to_lowercase()
}

fn get_database_path() -> Result<String, String> {
    // 优先使用环境变量
    if let Ok(db_url) = env::var("DATABASE_URL") {
        return Ok(db_url);
    }

    // 获取用户主目录（跨平台）
    let home_dir = dirs::home_dir()
        .ok_or_else(|| "无法获取用户主目录".to_string())?;

    // 构建数据目录路径：~/.gas_price/data
    let data_dir = home_dir.join(".gas_price").join("data");

    // 创建目录（如果不存在）
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("创建数据目录失败: {}", e))?;

    // 构建数据库文件路径
    let db_file = data_dir.join("gas_prices.db");
    let db_path = db_file.to_str()
        .ok_or_else(|| "数据库路径包含无效字符".to_string())?
        .to_string();

    // 返回完整的文件路径（不带 sqlite: 前缀，让 sqlx 自己处理）
    Ok(format!("sqlite://{}?mode=rwc", db_path))
}

async fn init_database(database_url: &str) -> Result<SqlitePool, ApiError> {
    let pool = SqlitePool::connect(database_url)
        .await
        .map_err(|e| ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("数据库连接失败: {}", e),
        })?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gas_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            province TEXT NOT NULL,
            fuel_type TEXT NOT NULL,
            effective_date TEXT NOT NULL,
            price_per_liter REAL NOT NULL,
            price_change REAL,
            remark TEXT,
            UNIQUE(province, fuel_type, effective_date)
        )
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("创建表失败: {}", e),
    })?;

    Ok(pool)
}

async fn seed_database(pool: &SqlitePool) -> Result<bool, ApiError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM gas_prices")
        .fetch_one(pool)
        .await
        .map_err(|e| ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("查询数据失败: {}", e),
        })?;

    // 返回是否为首次启动（数据库为空）
    Ok(count == 0)
}

fn parse_price(value: &str) -> Option<f64> {
    let normalized: String = value
        .chars()
        .filter(|ch| ch.is_ascii_digit() || *ch == '.')
        .collect();

    if normalized.is_empty() {
        return None;
    }

    normalized.parse::<f64>().ok()
}

fn parse_adjustment_date(html: &str) -> Option<NaiveDate> {
    // 匹配格式：油价2月24日24时调整 或 油价2月24日调整
    let re = Regex::new(r"油价(\d+)月(\d+)日").ok()?;
    
    if let Some(caps) = re.captures(html) {
        let month: u32 = caps.get(1)?.as_str().parse().ok()?;
        let day: u32 = caps.get(2)?.as_str().parse().ok()?;
        let current_year = Local::now().year();
        
        return NaiveDate::from_ymd_opt(current_year, month, day);
    }
    
    None
}

fn detect_fuel_type(label: &str) -> Option<FuelType> {
    if label.contains("92") {
        Some(FuelType::Gasoline92)
    } else if label.contains("95") {
        Some(FuelType::Gasoline95)
    } else if label.contains("98") {
        Some(FuelType::Gasoline98)
    } else if label.contains("柴油") || label.contains("0#") || label.contains("0号") {
        Some(FuelType::Diesel0)
    } else {
        None
    }
}

fn validate_payload(payload: GasPriceUpsertRequest, id: i64) -> Result<GasPriceRecord, ApiError> {
    if payload.province.trim().is_empty() {
        return Err(bad_request("province 不能为空"));
    }

    if payload.price_per_liter <= 0.0 {
        return Err(bad_request("pricePerLiter 必须大于 0"));
    }

    let date = parse_date(&payload.effective_date, "effectiveDate")?;

    Ok(GasPriceRecord {
        id: id as u64,
        province: payload.province.trim().to_string(),
        fuel_type: payload.fuel_type,
        effective_date: date,
        price_per_liter: payload.price_per_liter,
        price_change: payload.price_change,
        remark: payload
            .remark
            .map(|r| r.trim().to_string())
            .filter(|r| !r.is_empty()),
    })
}

fn build_http_client() -> Result<reqwest::Client, ApiError> {
    reqwest::Client::builder()
        .user_agent(CRAWL_USER_AGENT)
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|_| upstream_error("构建爬虫客户端失败"))
}

async fn fetch_html(client: &reqwest::Client, url: &str) -> Result<String, ApiError> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|_| upstream_error(&format!("请求上游失败: {}", url)))?;

    if !response.status().is_success() {
        return Err(upstream_error(&format!(
            "上游返回异常状态({}): {}",
            response.status(),
            url
        )));
    }

    response
        .text()
        .await
        .map_err(|_| upstream_error(&format!("读取上游响应失败: {}", url)))
}

fn parse_province_links(home_html: &str) -> Vec<(String, String)> {
    let document = Html::parse_document(home_html);
    let area_selector = Selector::parse("#Area a").expect("invalid selector");

    let mut seen = HashSet::new();
    let mut result = Vec::new();

    for link in document.select(&area_selector) {
        let province = link.text().collect::<String>().trim().to_string();
        let Some(href) = link.value().attr("href") else {
            continue;
        };

        if province.is_empty()
            || province.contains("查询")
            || province.contains("加油站")
            || province.contains("深圳")  // 深圳是广东省的城市，不单独爬取
            || !href.ends_with(".shtml")
        {
            continue;
        }

        let absolute = if href.starts_with("http") {
            href.to_string()
        } else {
            format!("{}{}", CRAWL_BASE_URL, href)
        };

        let dedup_key = format!("{}|{}", province, absolute);
        if seen.insert(dedup_key) {
            result.push((province, absolute));
        }
    }

    result
}

fn parse_province_page(province: &str, source_url: &str, html: &str) -> Vec<CrawlItem> {
    let document = Html::parse_document(html);
    let dl_selector = Selector::parse("#youjia dl").expect("invalid selector");
    let dt_selector = Selector::parse("dt").expect("invalid selector");
    let dd_selector = Selector::parse("dd").expect("invalid selector");

    // 解析调整日期
    let adjustment_date = parse_adjustment_date(html);

    let mut records = Vec::new();

    for dl in document.select(&dl_selector) {
        let dt_text = dl
            .select(&dt_selector)
            .next()
            .map(|t| t.text().collect::<String>())
            .unwrap_or_default();

        let dd_text = dl
            .select(&dd_selector)
            .next()
            .map(|d| d.text().collect::<String>())
            .unwrap_or_default();

        let Some(fuel_type) = detect_fuel_type(&dt_text) else {
            continue;
        };

        let Some(price) = parse_price(&dd_text) else {
            continue;
        };

        if price <= 0.0 {
            continue;
        }

        records.push(CrawlItem {
            province: province.to_string(),
            fuel_type,
            price_per_liter: price,
            effective_date: adjustment_date,
            source_url: source_url.to_string(),
        });
    }

    records
}

async fn crawl_remote_prices(
    client: &reqwest::Client,
    province_filter: Option<&str>,
) -> Result<Vec<CrawlItem>, ApiError> {
    let home_html = fetch_html(client, &format!("{}/", CRAWL_BASE_URL)).await?;
    let links = parse_province_links(&home_html);

    if links.is_empty() {
        return Err(upstream_error("未在上游站点解析到省份列表"));
    }

    let selected_links: Vec<(String, String)> = if let Some(filter) = province_filter {
        let wanted = normalize_text(filter);
        let matched: Vec<(String, String)> = links
            .into_iter()
            .filter(|(province, _)| {
                let normalized = normalize_text(province);
                normalized == wanted || normalized.contains(&wanted) || wanted.contains(&normalized)
            })
            .collect();

        if matched.is_empty() {
            return Err(bad_request("未匹配到可抓取的省份，请检查 province 参数"));
        }

        matched
    } else {
        links
    };

    let mut all_items = Vec::new();

    for (province, url) in selected_links {
        let page_html = fetch_html(client, &url).await?;
        let mut items = parse_province_page(&province, &url, &page_html);
        all_items.append(&mut items);
    }

    if all_items.is_empty() {
        return Err(upstream_error("未从上游解析到有效油价数据"));
    }

    Ok(all_items)
}

async fn apply_crawl_items(
    pool: &SqlitePool,
    items: &[CrawlItem],
    province_filter: Option<String>,
    fallback_date: NaiveDate,
    dry_run: bool,
) -> Result<CrawlResponse, ApiError> {
    let mut created = 0usize;
    let mut updated = 0usize;

    let mut provinces = HashSet::new();

    for item in items {
        provinces.insert(item.province.clone());

        // 使用解析的调整日期，如果没有则使用fallback日期
        let effective_date = item.effective_date.unwrap_or(fallback_date);
        let effective_date_str = effective_date.to_string();

        // 查找该省份和油品类型的最新记录
        let latest_record: Option<(f64, String)> = sqlx::query_as(
            "SELECT price_per_liter, effective_date FROM gas_prices 
             WHERE LOWER(province) = LOWER(?) AND fuel_type = ? 
             ORDER BY effective_date DESC LIMIT 1"
        )
        .bind(&item.province)
        .bind(item.fuel_type.to_str())
        .fetch_optional(pool)
        .await
        .map_err(|e| ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("查询最新记录失败: {}", e),
        })?;

        // 检查是否存在当天的记录
        let same_day_record: Option<(i64,)> = sqlx::query_as(
            "SELECT id FROM gas_prices 
             WHERE LOWER(province) = LOWER(?) AND fuel_type = ? AND effective_date = ?"
        )
        .bind(&item.province)
        .bind(item.fuel_type.to_str())
        .bind(&effective_date_str)
        .fetch_optional(pool)
        .await
        .map_err(|e| ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("查询当天记录失败: {}", e),
        })?;

        // 计算价格变化
        let price_change = latest_record.as_ref().map(|(latest_price, _)| {
            item.price_per_liter - latest_price
        });

        let remark = format!(
            "自动爬取自 {} {}",
            CRAWL_SOURCE_NAME, item.source_url
        );

        if let Some((id,)) = same_day_record {
            // 当天已有记录，更新它
            updated += 1;
            if !dry_run {
                sqlx::query(
                    "UPDATE gas_prices SET price_per_liter = ?, price_change = ?, remark = ? WHERE id = ?"
                )
                .bind(item.price_per_liter)
                .bind(price_change)
                .bind(&remark)
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| ApiError {
                    status: StatusCode::INTERNAL_SERVER_ERROR,
                    message: format!("更新记录失败: {}", e),
                })?;
            }
        } else {
            // 检查价格是否发生变化
            let price_changed = match &latest_record {
                Some((latest_price, _)) => (latest_price - item.price_per_liter).abs() > 0.001,
                None => true, // 没有历史记录，视为新数据
            };

            // 只有价格变化时才创建新记录
            if price_changed {
                created += 1;
                if !dry_run {
                    sqlx::query(
                        "INSERT INTO gas_prices (province, fuel_type, effective_date, price_per_liter, price_change, remark) 
                         VALUES (?, ?, ?, ?, ?, ?)"
                    )
                    .bind(&item.province)
                    .bind(item.fuel_type.to_str())
                    .bind(&effective_date_str)
                    .bind(item.price_per_liter)
                    .bind(price_change)
                    .bind(&remark)
                    .execute(pool)
                    .await
                    .map_err(|e| ApiError {
                        status: StatusCode::INTERNAL_SERVER_ERROR,
                        message: format!("插入记录失败: {}", e),
                    })?;
                }
            }
        }
    }

    let mut provinces_vec: Vec<String> = provinces.into_iter().collect();
    provinces_vec.sort();

    Ok(CrawlResponse {
        source: CRAWL_SOURCE_NAME.to_string(),
        province_filter,
        effective_date: fallback_date.to_string(),
        dry_run,
        fetched_provinces: provinces_vec,
        fetched_records: items.len(),
        created,
        updated,
    })
}

async fn run_crawl_job(
    pool: &SqlitePool,
    client: &reqwest::Client,
    province_filter: Option<String>,
    effective_date: NaiveDate,
    dry_run: bool,
) -> Result<CrawlResponse, ApiError> {
    let items = crawl_remote_prices(client, province_filter.as_deref()).await?;
    apply_crawl_items(pool, &items, province_filter, effective_date, dry_run).await
}

fn env_bool(name: &str, default: bool) -> bool {
    match env::var(name) {
        Ok(value) => {
            let normalized = value.trim().to_lowercase();
            matches!(normalized.as_str(), "1" | "true" | "yes" | "on")
        }
        Err(_) => default,
    }
}


fn start_auto_crawler(pool: SqlitePool) {
    let enabled = env_bool("AUTO_CRAWLER_ENABLED", true);

    if !enabled {
        println!("[crawler] auto crawler disabled");
        return;
    }

    actix_web::rt::spawn(async move {
        let client = match build_http_client() {
            Ok(client) => client,
            Err(err) => {
                eprintln!("[crawler] init failed: {}", err);
                return;
            }
        };

        // 服务启动时立即执行一次爬取
        println!("[crawler] starting initial crawl on service startup...");
        let today = Local::now().date_naive();
        match run_crawl_job(&pool, &client, None, today, false).await {
            Ok(summary) => {
                println!(
                    "[crawler] initial crawl success at {}: provinces={}, records={}, created={}, updated={}",
                    Local::now().format("%Y-%m-%d %H:%M:%S"),
                    summary.fetched_provinces.len(),
                    summary.fetched_records,
                    summary.created,
                    summary.updated
                );
            }
            Err(err) => {
                eprintln!("[crawler] initial crawl failed at {}: {}", Local::now().format("%Y-%m-%d %H:%M:%S"), err);
            }
        }

        loop {
            // 计算距离下一个上午8点的时间
            let now = Local::now();
            let today_8am = now
                .date_naive()
                .and_hms_opt(8, 0, 0)
                .unwrap()
                .and_local_timezone(Local)
                .unwrap();
            
            let next_8am = if now < today_8am {
                today_8am
            } else {
                (now.date_naive() + chrono::Days::new(1))
                    .and_hms_opt(8, 0, 0)
                    .unwrap()
                    .and_local_timezone(Local)
                    .unwrap()
            };
            
            let duration_until_8am = (next_8am - now).to_std().unwrap_or(Duration::from_secs(0));
            
            println!(
                "[crawler] next scheduled crawl at: {} (in {} hours)",
                next_8am.format("%Y-%m-%d %H:%M:%S"),
                duration_until_8am.as_secs() / 3600
            );
            
            // 等待到上午8点
            actix_web::rt::time::sleep(duration_until_8am).await;
            
            // 执行爬取
            let today = Local::now().date_naive();
            match run_crawl_job(&pool, &client, None, today, false).await {
                Ok(summary) => {
                    println!(
                        "[crawler] success at {}: provinces={}, records={}, created={}, updated={}",
                        Local::now().format("%Y-%m-%d %H:%M:%S"),
                        summary.fetched_provinces.len(),
                        summary.fetched_records,
                        summary.created,
                        summary.updated
                    );
                }
                Err(err) => {
                    eprintln!("[crawler] failed at {}: {}", Local::now().format("%Y-%m-%d %H:%M:%S"), err);
                }
            }
        }
    });
}

#[get("/history")]
async fn history(
    data: web::Data<AppState>,
    query: web::Query<HistoryQuery>,
) -> Result<impl Responder, ApiError> {
    let start_date = query
        .start_date
        .as_deref()
        .map(|v| parse_date(v, "startDate"))
        .transpose()?;

    let end_date = query
        .end_date
        .as_deref()
        .map(|v| parse_date(v, "endDate"))
        .transpose()?;

    if let (Some(start), Some(end)) = (start_date, end_date) {
        if start > end {
            return Err(bad_request("startDate 不能晚于 endDate"));
        }
    }

    let page = query.page.unwrap_or(0);
    let size = query.size.unwrap_or(20);

    if size == 0 || size > 200 {
        return Err(bad_request("size 必须在 1 到 200 之间"));
    }

    let province_keyword = query
        .province
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let fuel_type_str = query.fuel_type.as_ref().map(|f| f.to_str());

    // 构建查询条件
    let mut where_clauses = Vec::new();
    let mut count_query = "SELECT COUNT(*) FROM gas_prices".to_string();
    let mut select_query = "SELECT id, province, fuel_type, effective_date, price_per_liter, price_change, remark FROM gas_prices".to_string();

    if province_keyword.is_some() {
        where_clauses.push("LOWER(province) LIKE LOWER(?)");
    }
    if fuel_type_str.is_some() {
        where_clauses.push("fuel_type = ?");
    }
    if start_date.is_some() {
        where_clauses.push("effective_date >= ?");
    }
    if end_date.is_some() {
        where_clauses.push("effective_date <= ?");
    }

    if !where_clauses.is_empty() {
        let where_clause = format!(" WHERE {}", where_clauses.join(" AND "));
        count_query.push_str(&where_clause);
        select_query.push_str(&where_clause);
    }

    select_query.push_str(" ORDER BY effective_date DESC, id ASC LIMIT ? OFFSET ?");

    // 查询总数
    let mut count_q = sqlx::query_scalar::<_, i64>(&count_query);
    if let Some(keyword) = province_keyword {
        count_q = count_q.bind(format!("%{}%", keyword));
    }
    if let Some(ft) = fuel_type_str {
        count_q = count_q.bind(ft);
    }
    if let Some(start) = start_date {
        count_q = count_q.bind(start.to_string());
    }
    if let Some(end) = end_date {
        count_q = count_q.bind(end.to_string());
    }

    let total_elements = count_q.fetch_one(&data.db).await.map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("查询总数失败: {}", e),
    })? as usize;

    let total_pages = if total_elements == 0 {
        0
    } else {
        total_elements.div_ceil(size)
    };

    // 查询数据
    let mut select_q = sqlx::query(&select_query);
    if let Some(keyword) = province_keyword {
        select_q = select_q.bind(format!("%{}%", keyword));
    }
    if let Some(ft) = fuel_type_str {
        select_q = select_q.bind(ft);
    }
    if let Some(start) = start_date {
        select_q = select_q.bind(start.to_string());
    }
    if let Some(end) = end_date {
        select_q = select_q.bind(end.to_string());
    }
    select_q = select_q.bind(size as i64).bind((page * size) as i64);

    let rows = select_q.fetch_all(&data.db).await.map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("查询数据失败: {}", e),
    })?;

    let content: Vec<GasPriceResponse> = rows
        .iter()
        .map(|row| {
            let fuel_type_str: String = row.get("fuel_type");
            let fuel_type = FuelType::from_str(&fuel_type_str).unwrap_or(FuelType::Gasoline92);
            
            GasPriceResponse {
                id: row.get::<i64, _>("id") as u64,
                province: row.get("province"),
                fuel_type,
                effective_date: row.get("effective_date"),
                price_per_liter: row.get("price_per_liter"),
                price_change: row.get("price_change"),
                remark: row.get("remark"),
            }
        })
        .collect();

    Ok(HttpResponse::Ok().json(PageResponse {
        content,
        page,
        size,
        total_elements,
        total_pages,
    }))
}

#[post("")]
async fn create(
    data: web::Data<AppState>,
    payload: web::Json<GasPriceUpsertRequest>,
) -> Result<impl Responder, ApiError> {
    let entity = validate_payload(payload.into_inner(), 0)?;

    // 检查是否重复
    let existing: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM gas_prices WHERE LOWER(province) = LOWER(?) AND fuel_type = ? AND effective_date = ?"
    )
    .bind(&entity.province)
    .bind(entity.fuel_type.to_str())
    .bind(entity.effective_date.to_string())
    .fetch_optional(&data.db)
    .await
    .map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("查询重复记录失败: {}", e),
    })?;

    if existing.is_some() {
        return Err(conflict("重复油价记录：同省份、油品、生效日期只能有一条"));
    }

    let result = sqlx::query(
        "INSERT INTO gas_prices (province, fuel_type, effective_date, price_per_liter, price_change, remark) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&entity.province)
    .bind(entity.fuel_type.to_str())
    .bind(entity.effective_date.to_string())
    .bind(entity.price_per_liter)
    .bind(entity.price_change)
    .bind(&entity.remark)
    .execute(&data.db)
    .await
    .map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("插入记录失败: {}", e),
    })?;

    let response = GasPriceResponse {
        id: result.last_insert_rowid() as u64,
        province: entity.province,
        fuel_type: entity.fuel_type,
        effective_date: entity.effective_date.to_string(),
        price_per_liter: entity.price_per_liter,
        price_change: entity.price_change,
        remark: entity.remark,
    };

    Ok(HttpResponse::Created().json(response))
}

#[put("/{id}")]
async fn update(
    data: web::Data<AppState>,
    path: web::Path<u64>,
    payload: web::Json<GasPriceUpsertRequest>,
) -> Result<impl Responder, ApiError> {
    let id = path.into_inner() as i64;
    let entity = validate_payload(payload.into_inner(), id)?;

    // 检查记录是否存在
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM gas_prices WHERE id = ?")
        .bind(id)
        .fetch_optional(&data.db)
        .await
        .map_err(|e| ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("查询记录失败: {}", e),
        })?;

    if exists.is_none() {
        return Err(not_found(&format!("油价记录不存在: {}", id)));
    }

    // 检查是否与其他记录重复
    let duplicate: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM gas_prices WHERE LOWER(province) = LOWER(?) AND fuel_type = ? AND effective_date = ? AND id != ?"
    )
    .bind(&entity.province)
    .bind(entity.fuel_type.to_str())
    .bind(entity.effective_date.to_string())
    .bind(id)
    .fetch_optional(&data.db)
    .await
    .map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("查询重复记录失败: {}", e),
    })?;

    if duplicate.is_some() {
        return Err(conflict("重复油价记录：同省份、油品、生效日期只能有一条"));
    }

    sqlx::query(
        "UPDATE gas_prices SET province = ?, fuel_type = ?, effective_date = ?, price_per_liter = ?, price_change = ?, remark = ? WHERE id = ?"
    )
    .bind(&entity.province)
    .bind(entity.fuel_type.to_str())
    .bind(entity.effective_date.to_string())
    .bind(entity.price_per_liter)
    .bind(entity.price_change)
    .bind(&entity.remark)
    .bind(id)
    .execute(&data.db)
    .await
    .map_err(|e| ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: format!("更新记录失败: {}", e),
    })?;

    let response = GasPriceResponse {
        id: id as u64,
        province: entity.province,
        fuel_type: entity.fuel_type,
        effective_date: entity.effective_date.to_string(),
        price_per_liter: entity.price_per_liter,
        price_change: entity.price_change,
        remark: entity.remark,
    };

    Ok(HttpResponse::Ok().json(response))
}

#[delete("/{id}")]
async fn remove(
    data: web::Data<AppState>,
    path: web::Path<u64>,
) -> Result<impl Responder, ApiError> {
    let id = path.into_inner() as i64;

    let result = sqlx::query("DELETE FROM gas_prices WHERE id = ?")
        .bind(id)
        .execute(&data.db)
        .await
        .map_err(|e| ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("删除记录失败: {}", e),
        })?;

    if result.rows_affected() == 0 {
        return Err(not_found(&format!("油价记录不存在: {}", id)));
    }

    Ok(HttpResponse::NoContent().finish())
}

#[post("/crawl")]
async fn crawl(
    data: web::Data<AppState>,
    payload: web::Json<CrawlRequest>,
) -> Result<impl Responder, ApiError> {
    let province_filter = payload
        .province
        .as_ref()
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty());

    let effective_date = match payload.effective_date.as_deref() {
        Some(date) if !date.trim().is_empty() => parse_date(date, "effectiveDate")?,
        _ => Local::now().date_naive(),
    };

    let dry_run = payload.dry_run.unwrap_or(false);
    let client = build_http_client()?;

    let result = run_crawl_job(&data.db, &client, province_filter, effective_date, dry_run).await?;

    Ok(HttpResponse::Ok().json(result))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let database_url = get_database_path()
        .expect("Failed to determine database path");
    
    let pool = init_database(&database_url)
        .await
        .expect("Failed to initialize database");

    seed_database(&pool)
        .await
        .expect("Failed to check database status");

    println!("Database initialized at: {}", database_url);

    let state = web::Data::new(AppState {
        db: pool.clone(),
    });

    start_auto_crawler(pool);

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .service(
                web::scope("/api/v1/gas-prices")
                    .service(history)
                    .service(create)
                    .service(update)
                    .service(remove)
                    .service(crawl),
            )
            .service(Files::new("/", "./static").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_province_page_extracts_prices() {
        let html = r#"
        <div id="youjia">
          <dl><dt>北京92#汽油</dt><dd>7.08</dd></dl>
          <dl><dt>北京95#汽油</dt><dd>7.53</dd></dl>
          <dl><dt>北京98#汽油</dt><dd>9.03</dd></dl>
          <dl><dt>北京0#柴油</dt><dd>6.76</dd></dl>
        </div>
        "#;

        let items = parse_province_page("北京", "http://example.com/beijing.shtml", html);
        assert_eq!(items.len(), 4);
        assert!(items.iter().any(|r| r.fuel_type == FuelType::Gasoline92));
        assert!(items.iter().any(|r| r.fuel_type == FuelType::Diesel0));
    }

    #[test]
    fn parse_province_links_extracts_area_links() {
        let html = r#"
        <div id="Area">
          <a href="/beijing.shtml">北京</a>
          <a href="/shanghai.shtml">上海</a>
          <a href="/guoneiyoujia.shtml">国内汽油价格查询</a>
        </div>
        "#;

        let links = parse_province_links(html);
        assert_eq!(links.len(), 2);
        assert_eq!(links[0].0, "北京");
        assert_eq!(links[1].0, "上海");
    }

    #[test]
    fn parse_province_links_filters_shenzhen() {
        let html = r#"
        <div id="Area">
          <a href="/beijing.shtml">北京</a>
          <a href="/guangdong.shtml">广东</a>
          <a href="/shenzhen.shtml">深圳</a>
          <a href="/shanghai.shtml">上海</a>
        </div>
        "#;

        let links = parse_province_links(html);
        assert_eq!(links.len(), 3);
        assert!(links.iter().any(|(p, _)| p == "北京"));
        assert!(links.iter().any(|(p, _)| p == "广东"));
        assert!(links.iter().any(|(p, _)| p == "上海"));
        assert!(!links.iter().any(|(p, _)| p == "深圳"));
    }
}
