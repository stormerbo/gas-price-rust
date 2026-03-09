// 爬虫模块
use crate::database::{get_latest_price, get_today_record, insert_price_record, update_price_record};
use crate::error::{bad_request, internal_error, ApiError};
use crate::models::{CrawlItem, CrawlResponse, FuelType};
use chrono::{Datelike, Local, NaiveDate};
use regex::Regex;
use reqwest::Client;
use scraper::{Html, Selector};
use sqlx::SqlitePool;
use std::env;
use std::time::Duration;

const BASE_URL: &str = "https://www.qiyoujiage.com";

/// 构建HTTP客户端
pub fn build_http_client() -> Result<Client, ApiError> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .danger_accept_invalid_certs(true) // 接受无效证书（目标网站证书有问题）
        .build()
        .map_err(|e| internal_error(&format!("创建HTTP客户端失败: {}", e)))
}

/// 解析省份链接
pub async fn parse_province_links(client: &Client) -> Result<Vec<(String, String)>, ApiError> {
    let resp = client.get(BASE_URL).send().await?;
    let html = resp.text().await?;
    let document = Html::parse_document(&html);

    // 尝试多个选择器
    let selectors = vec![
        "div.list_main a",
        "a[href*='.shtml']",
        "body a",
    ];

    let mut links = Vec::new();
    
    for selector_str in selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            for element in document.select(&selector) {
                if let Some(href) = element.value().attr("href") {
                    let province = element.text().collect::<String>().trim().to_string();
                    
                    // 过滤无效链接
                    if province.is_empty() 
                        || province.contains("查询") 
                        || province.contains("国内")
                        || province.contains("加油站")
                        || province.len() > 10 {
                        continue;
                    }
                    
                    // 过滤深圳
                    if province.contains("深圳") {
                        continue;
                    }
                    
                    // 只保留省份链接（包含.shtml的）
                    if !href.contains(".shtml") {
                        continue;
                    }
                    
                    let url = if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("{}{}", BASE_URL, href)
                    };
                    
                    // 避免重复
                    if !links.iter().any(|(p, _)| p == &province) {
                        links.push((province, url));
                    }
                }
            }
            
            // 如果找到了足够的链接，就停止尝试其他选择器
            if links.len() >= 30 {
                break;
            }
        }
    }

    if links.is_empty() {
        return Err(bad_request("未找到省份链接"));
    }

    Ok(links)
}

/// 解析油价调整日期
pub fn parse_adjustment_date(text: &str) -> Option<NaiveDate> {
    let re = Regex::new(r"油价(\d{1,2})月(\d{1,2})日调整").ok()?;
    
    if let Some(caps) = re.captures(text) {
        let month: u32 = caps.get(1)?.as_str().parse().ok()?;
        let day: u32 = caps.get(2)?.as_str().parse().ok()?;
        
        let now = Local::now();
        let current_year = now.year();
        let current_month = now.month();
        
        // 如果月份大于当前月份，说明是去年的日期
        let year = if month > current_month {
            current_year - 1
        } else {
            current_year
        };
        
        NaiveDate::from_ymd_opt(year, month, day)
    } else {
        None
    }
}

/// 解析单个省份的油价
pub async fn parse_province_prices(
    client: &Client,
    province: &str,
    url: &str,
    effective_date: NaiveDate,
) -> Result<Vec<CrawlItem>, ApiError> {
    let resp = client.get(url).send().await?;
    let html = resp.text().await?;
    let document = Html::parse_document(&html);

    let mut items = Vec::new();
    let selector = Selector::parse("div.news_main table tbody tr").unwrap();

    for (idx, row) in document.select(&selector).enumerate() {
        if idx == 0 {
            continue; // 跳过表头
        }

        let cells: Vec<String> = row
            .select(&Selector::parse("td").unwrap())
            .map(|cell| cell.text().collect::<String>().trim().to_string())
            .collect();

        if cells.len() < 2 {
            continue;
        }

        let fuel_name = &cells[0];
        let price_str = &cells[1];

        let fuel_type = match fuel_name.as_str() {
            name if name.contains("92") => FuelType::Gasoline92,
            name if name.contains("95") => FuelType::Gasoline95,
            name if name.contains("98") => FuelType::Gasoline98,
            name if name.contains("0") && name.contains("柴") => FuelType::Diesel0,
            _ => continue,
        };

        if let Ok(price) = price_str.parse::<f64>() {
            items.push(CrawlItem {
                province: province.to_string(),
                fuel_type,
                price_per_liter: price,
                effective_date,
            });
        }
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

    for item in items {
        let latest_price = get_latest_price(
            pool,
            &item.province,
            item.fuel_type.as_str(),
        )
        .await?;

        // 计算价格变化
        let price_change = latest_price.map(|old_price| item.price_per_liter - old_price);

        // 如果价格没有变化（差值小于0.001），跳过
        if let Some(change) = price_change {
            if change.abs() < 0.001 {
                continue;
            }
        }

        if dry_run {
            created += 1;
            continue;
        }

        // 检查当天是否已有记录
        let existing_id = get_today_record(
            pool,
            &item.province,
            item.fuel_type.as_str(),
            &item.effective_date.to_string(),
        )
        .await?;

        if let Some(id) = existing_id {
            update_price_record(pool, id, &item, price_change).await?;
            updated += 1;
        } else {
            insert_price_record(pool, &item, price_change).await?;
            created += 1;
        }
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

/// 启动自动爬虫
pub fn start_auto_crawler(pool: SqlitePool) {
    let enabled = env_bool("AUTO_CRAWLER_ENABLED", true);

    if !enabled {
        println!("[crawler] auto crawler disabled");
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
