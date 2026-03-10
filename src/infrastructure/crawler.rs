// 爬虫模块
use crate::common::error::{bad_request, internal_error, ApiError};
use crate::domain::models::{CrawlItem, CrawlResponse, FuelType};
use crate::infrastructure::db::{
    insert_price_record, load_latest_prices, load_records_on_date, update_price_record,
};
use chrono::{Datelike, Local, NaiveDate};
use regex::Regex;
use reqwest::Client;
use sqlx::SqlitePool;
use std::env;
use std::time::Duration;

const BASE_URL: &str = "http://www.qiyoujiage.com";

pub fn base_url() -> &'static str {
    BASE_URL
}

// 省份名称与 URL slug 的映射（主页无省份链接列表，硬编码）
const PROVINCES: &[(&str, &str)] = &[
    ("北京", "beijing"),
    ("天津", "tianjin"),
    ("河北", "hebei"),
    ("山西", "shanxi"),
    ("内蒙古", "neimenggu"),
    ("辽宁", "liaoning"),
    ("吉林", "jilin"),
    ("黑龙江", "heilongjiang"),
    ("上海", "shanghai"),
    ("江苏", "jiangsu"),
    ("浙江", "zhejiang"),
    ("安徽", "anhui"),
    ("福建", "fujian"),
    ("江西", "jiangxi"),
    ("山东", "shandong"),
    ("河南", "henan"),
    ("湖北", "hubei"),
    ("湖南", "hunan"),
    ("广东", "guangdong"),
    ("广西", "guangxi"),
    ("海南", "hainan"),
    ("重庆", "chongqing"),
    ("四川", "sichuan"),
    ("贵州", "guizhou"),
    ("云南", "yunnan"),
    ("西藏", "xizang"),
    ("陕西", "shanxi-3"),
    ("甘肃", "gansu"),
    ("青海", "qinghai"),
    ("宁夏", "ningxia"),
    ("新疆", "xinjiang"),
];

/// 构建HTTP客户端
pub fn build_http_client() -> Result<Client, ApiError> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .default_headers({
            let mut headers = reqwest::header::HeaderMap::new();
            headers.insert("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8".parse().unwrap());
            headers.insert("Accept-Language", "zh-CN,zh;q=0.9".parse().unwrap());
            headers
        })
        .build()
        .map_err(|e| internal_error(&format!("创建HTTP客户端失败: {}", e)))
}

/// 获取省份列表（直接从硬编码常量生成 URL）
pub async fn parse_province_links(_client: &Client) -> Result<Vec<(String, String)>, ApiError> {
    let links = PROVINCES
        .iter()
        .map(|(name, slug)| (name.to_string(), format!("{}/{}.shtml", BASE_URL, slug)))
        .collect();
    Ok(links)
}

/// 解析油价调整日期（从 HTML 中提取，格式如"3月9日24时调整"）
pub fn parse_adjustment_date(html: &str) -> Option<NaiveDate> {
    // 匹配 "3月9日24时调整" 或 "3月9日调整"
    let re = Regex::new(r"(\d{1,2})月(\d{1,2})日(?:\d+时)?调整").ok()?;

    if let Some(caps) = re.captures(html) {
        let month: u32 = caps.get(1)?.as_str().parse().ok()?;
        let day: u32 = caps.get(2)?.as_str().parse().ok()?;

        let now = Local::now();
        let year = if month > now.month() {
            now.year() - 1
        } else {
            now.year()
        };

        NaiveDate::from_ymd_opt(year, month, day)
    } else {
        None
    }
}

/// 从网站获取实际调整日期，失败则回退到当天
async fn fetch_effective_date(client: &Client) -> NaiveDate {
    match client.get(BASE_URL).send().await {
        Ok(resp) => match resp.text().await {
            Ok(text) => parse_adjustment_date(&text).unwrap_or_else(|| Local::now().date_naive()),
            Err(_) => Local::now().date_naive(),
        },
        Err(_) => Local::now().date_naive(),
    }
}

/// 解析单个省份的油价（解析 HTML 中的 <dt>/<dd> 结构）
pub async fn parse_province_prices(
    client: &Client,
    province: &str,
    url: &str,
    effective_date: NaiveDate,
) -> Result<Vec<CrawlItem>, ApiError> {
    let resp = client.get(url).send().await?;
    let html = resp.text().await?;

    // 匹配 <dt>广东92#汽油</dt>\n<dd>7.66</dd>
    let re =
        Regex::new(r"<dt>[^<]*?(92#汽油|95#汽油|98#汽油|0#柴油)</dt>\s*<dd>([\d.]+)</dd>").unwrap();

    let mut items = Vec::new();
    for caps in re.captures_iter(&html) {
        let fuel_label = &caps[1];
        let price: f64 = match caps[2].parse() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let fuel_type = match fuel_label {
            "92#汽油" => FuelType::Gasoline92,
            "95#汽油" => FuelType::Gasoline95,
            "98#汽油" => FuelType::Gasoline98,
            "0#柴油" => FuelType::Diesel0,
            _ => continue,
        };
        items.push(CrawlItem {
            province: province.to_string(),
            fuel_type,
            price_per_liter: price,
            effective_date,
        });
    }

    Ok(items)
}

/// 应用爬取的数据到数据库
pub async fn apply_crawl_items(
    pool: &SqlitePool,
    items: Vec<CrawlItem>,
    dry_run: bool,
) -> Result<(usize, usize), ApiError> {
    let mut created = 0;
    let mut updated = 0;

    if items.is_empty() {
        return Ok((created, updated));
    }

    let latest_prices = load_latest_prices(pool).await?;
    let effective_date = items[0].effective_date.to_string();
    let existing_records = load_records_on_date(pool, &effective_date).await?;

    let mut tx = if dry_run {
        None
    } else {
        Some(pool.begin().await?)
    };

    for item in items {
        let key = (item.province.clone(), item.fuel_type.as_str().to_string());
        let latest_price = latest_prices.get(&key).copied();

        // 计算价格变化
        let price_change = latest_price.map(|old_price| item.price_per_liter - old_price);

        // 如果价格没有变化（差值小于0.001），跳过
        if let Some(change) = price_change {
            if change.abs() < 0.001 {
                continue;
            }
        }

        let existing_id = existing_records.get(&key).copied();

        if dry_run {
            if existing_id.is_some() {
                updated += 1;
            } else {
                created += 1;
            }
            continue;
        }

        if let Some(id) = existing_id {
            let tx = tx.as_mut().unwrap();
            update_price_record(tx.as_mut(), id, &item, price_change).await?;
            updated += 1;
        } else {
            let tx = tx.as_mut().unwrap();
            insert_price_record(tx.as_mut(), &item, price_change).await?;
            created += 1;
        }
    }

    if let Some(tx) = tx {
        tx.commit().await?;
    }

    Ok((created, updated))
}

/// 执行爬取任务
pub async fn run_crawl_job(
    pool: &SqlitePool,
    client: &Client,
    province_filter: Option<String>,
    effective_date: NaiveDate,
    dry_run: bool,
) -> Result<CrawlResponse, ApiError> {
    let province_links = parse_province_links(client).await?;

    let filtered_links: Vec<_> = if let Some(ref filter) = province_filter {
        province_links
            .into_iter()
            .filter(|(p, _)| p.contains(filter))
            .collect()
    } else {
        province_links
    };

    if filtered_links.is_empty() {
        return Err(bad_request("未找到匹配的省份"));
    }

    let mut all_items = Vec::new();
    let mut fetched_provinces = Vec::new();

    for (province, url) in &filtered_links {
        match parse_province_prices(client, province, url, effective_date).await {
            Ok(items) => {
                fetched_provinces.push(province.clone());
                all_items.extend(items);
            }
            Err(e) => {
                eprintln!("解析 {} 失败: {}", province, e);
            }
        }
    }

    let fetched_records = all_items.len();
    let (created, updated) = apply_crawl_items(pool, all_items, dry_run).await?;

    Ok(CrawlResponse {
        fetched_provinces,
        fetched_records,
        created,
        updated,
    })
}

/// 环境变量读取辅助函数
pub fn env_bool(name: &str, default: bool) -> bool {
    env::var(name)
        .ok()
        .and_then(|v| v.trim().parse::<bool>().ok())
        .unwrap_or(default)
}

pub fn env_u64(name: &str, default: u64) -> u64 {
    env::var(name)
        .ok()
        .and_then(|v| v.trim().parse::<u64>().ok())
        .unwrap_or(default)
}

/// 启动自动爬虫
pub fn start_auto_crawler(pool: SqlitePool) {
    let enabled = env_bool("AUTO_CRAWLER_ENABLED", true);
    let interval_minutes = env_u64("AUTO_CRAWLER_INTERVAL_MINUTES", 720);

    if !enabled {
        println!("[crawler] auto crawler disabled");
        return;
    }

    if interval_minutes == 0 {
        println!("[crawler] invalid interval, auto crawler disabled");
        return;
    }

    // 使用 tokio::spawn 而不是 actix_web::rt::spawn
    tokio::spawn(async move {
        let client = match build_http_client() {
            Ok(client) => client,
            Err(err) => {
                eprintln!("[crawler] init failed: {}", err);
                return;
            }
        };

        // 服务启动时立即执行一次爬取，从网站解析实际调整日期
        println!("[crawler] starting initial crawl on service startup...");
        let effective_date = fetch_effective_date(&client).await;
        println!("[crawler] effective date: {}", effective_date);
        match run_crawl_job(&pool, &client, None, effective_date, false).await {
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
                eprintln!(
                    "[crawler] initial crawl failed at {}: {}",
                    Local::now().format("%Y-%m-%d %H:%M:%S"),
                    err
                );
            }
        }

        loop {
            println!(
                "[crawler] next scheduled crawl in {} minutes",
                interval_minutes
            );

            tokio::time::sleep(Duration::from_secs(interval_minutes * 60)).await;

            let effective_date = fetch_effective_date(&client).await;
            match run_crawl_job(&pool, &client, None, effective_date, false).await {
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
                    eprintln!(
                        "[crawler] failed at {}: {}",
                        Local::now().format("%Y-%m-%d %H:%M:%S"),
                        err
                    );
                }
            }
        }
    });
}
