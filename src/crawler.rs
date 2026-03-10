// 爬虫模块
use crate::database::{get_latest_price, get_today_record, insert_price_record, update_price_record};
use crate::error::{bad_request, internal_error, ApiError};
use crate::models::{CrawlItem, CrawlResponse, FuelType};
use chrono::{Datelike, Local, NaiveDate};
use regex::Regex;
use reqwest::Client;
use sqlx::SqlitePool;
use std::env;
use std::time::Duration;

const BASE_URL: &str = "https://www.qiyoujiage.com";

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
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| internal_error(&format!("创建HTTP客户端失败: {}", e)))
}

/// 获取省份列表（直接从硬编码常量生成 URL）
pub async fn parse_province_links(_client: &Client) -> Result<Vec<(String, String)>, ApiError> {
    let links = PROVINCES
        .iter()
        .map(|(name, slug)| {
            (
                name.to_string(),
                format!("{}/{}.shtml", BASE_URL, slug),
            )
        })
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
        let year = if month > now.month() { now.year() - 1 } else { now.year() };

        NaiveDate::from_ymd_opt(year, month, day)
    } else {
        None
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
    let re = Regex::new(r"<dt>[^<]*?(92#汽油|95#汽油|98#汽油|0#柴油)</dt>\s*<dd>([\d.]+)</dd>").unwrap();

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
            "0#柴油"  => FuelType::Diesel0,
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

        // 服务启动时立即执行一次爬取，从网站解析实际调整日期
        println!("[crawler] starting initial crawl on service startup...");
        let effective_date = match client.get(BASE_URL).send().await {
            Ok(resp) => match resp.text().await {
                Ok(text) => parse_adjustment_date(&text).unwrap_or_else(|| {
                    println!("[crawler] failed to parse adjustment date, using today");
                    Local::now().date_naive()
                }),
                Err(_) => Local::now().date_naive(),
            },
            Err(_) => Local::now().date_naive(),
        };
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
            
            // 执行爬取，从网站解析实际调整日期
            let effective_date = match client.get(BASE_URL).send().await {
                Ok(resp) => match resp.text().await {
                    Ok(text) => parse_adjustment_date(&text).unwrap_or_else(|| Local::now().date_naive()),
                    Err(_) => Local::now().date_naive(),
                },
                Err(_) => Local::now().date_naive(),
            };
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
                    eprintln!("[crawler] failed at {}: {}", Local::now().format("%Y-%m-%d %H:%M:%S"), err);
                }
            }
        }
    });
}
