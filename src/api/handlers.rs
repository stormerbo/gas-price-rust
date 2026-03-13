// API处理器模块
use crate::common::error::{bad_request, not_found, ApiError};
use crate::domain::models::*;
use crate::domain::oil_price::{calculate_next, get_future_adjustment_dates, get_latest_known_adjustment_date, is_workday};
use crate::infrastructure::crawler::{
    base_url, build_http_client, parse_adjustment_date, run_crawl_job,
};
use crate::infrastructure::db::{row_to_record, AppState};
use crate::infrastructure::holiday_sync;
use crate::infrastructure::workday_calculator::WorkdayCalculator;
use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use chrono::{Datelike, Local, NaiveDate};
use sqlx::{QueryBuilder, Sqlite};
use std::collections::HashMap;

/// 解析日期字符串
fn parse_date(s: &str, field_name: &str) -> Result<NaiveDate, ApiError> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .map_err(|_| bad_request(&format!("{} 格式错误，应为 YYYY-MM-DD", field_name)))
}

fn normalized_str(value: &Option<String>) -> Option<&str> {
    value.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty())
}

fn sanitize_size(size: usize) -> usize {
    size.clamp(1, 200)
}

fn apply_history_filters<'a>(
    builder: &mut QueryBuilder<'a, Sqlite>,
    query: &'a HistoryQuery,
) -> Result<(), ApiError> {
    if let Some(province) = normalized_str(&query.province) {
        builder.push(" AND province = ").push_bind(province);
    }

    if let Some(ref fuel_type) = query.fuel_type {
        builder
            .push(" AND fuel_type = ")
            .push_bind(fuel_type.as_str());
    }

    if let Some(start_date) = normalized_str(&query.start_date) {
        parse_date(start_date, "startDate")?;
        builder
            .push(" AND effective_date >= ")
            .push_bind(start_date);
    }

    if let Some(end_date) = normalized_str(&query.end_date) {
        parse_date(end_date, "endDate")?;
        builder.push(" AND effective_date <= ").push_bind(end_date);
    }

    Ok(())
}

/// 查询油价历史记录
#[get("/history")]
pub async fn history(
    data: web::Data<AppState>,
    query: web::Query<HistoryQuery>,
) -> Result<impl Responder, ApiError> {
    let size = sanitize_size(query.size);

    let mut count_builder =
        QueryBuilder::<Sqlite>::new("SELECT COUNT(*) as count FROM gas_prices WHERE 1=1");
    apply_history_filters(&mut count_builder, &query)?;

    let total: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&data.db)
        .await?;
    let total_elements = total as usize;
    let total_pages = if total_elements == 0 {
        0
    } else {
        (total_elements + size - 1) / size
    };

    let mut data_builder = QueryBuilder::<Sqlite>::new(
        "SELECT id, province, fuel_type, price_per_liter, effective_date, price_change \
         FROM gas_prices WHERE 1=1",
    );
    apply_history_filters(&mut data_builder, &query)?;

    data_builder.push(" ORDER BY ");
    let sort_col = match query.sort_by.as_deref() {
        Some("pricePerLiter") => "price_per_liter",
        Some("priceChange") => "price_change",
        _ => "effective_date",
    };
    let sort_dir = match query.sort_dir.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };
    // 主排序列 + 次排序保证稳定
    if sort_col == "effective_date" {
        data_builder
            .push(sort_col)
            .push(" ")
            .push(sort_dir)
            .push(", id DESC");
    } else {
        data_builder
            .push(sort_col)
            .push(" ")
            .push(sort_dir)
            .push(", effective_date DESC, id DESC");
    }
    data_builder
        .push(" LIMIT ")
        .push_bind(size as i64)
        .push(" OFFSET ")
        .push_bind((query.page * size) as i64);

    let rows = data_builder.build().fetch_all(&data.db).await?;

    let mut content = Vec::with_capacity(rows.len());
    for row in rows {
        content.push(row_to_record(&row)?);
    }

    Ok(HttpResponse::Ok().json(PagedResponse {
        content,
        page: query.page,
        size,
        total_elements,
        total_pages,
    }))
}

/// 创建油价记录
#[post("")]
pub async fn create(
    data: web::Data<AppState>,
    payload: web::Json<CreateRequest>,
) -> Result<impl Responder, ApiError> {
    parse_date(&payload.effective_date, "effectiveDate")?;

    let result = sqlx::query(
        r#"
        INSERT INTO gas_prices (province, fuel_type, price_per_liter, effective_date)
        VALUES (?, ?, ?, ?)
        "#,
    )
    .bind(&payload.province)
    .bind(payload.fuel_type.as_str())
    .bind(payload.price_per_liter)
    .bind(&payload.effective_date)
    .execute(&data.db)
    .await?;

    let id = result.last_insert_rowid() as u64;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "id": id,
        "message": "创建成功"
    })))
}

/// 更新油价记录
#[put("/{id}")]
pub async fn update(
    data: web::Data<AppState>,
    id: web::Path<u64>,
    payload: web::Json<UpdateRequest>,
) -> Result<impl Responder, ApiError> {
    parse_date(&payload.effective_date, "effectiveDate")?;

    let result = sqlx::query(
        r#"
        UPDATE gas_prices 
        SET province = ?, fuel_type = ?, price_per_liter = ?, effective_date = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
        "#,
    )
    .bind(&payload.province)
    .bind(payload.fuel_type.as_str())
    .bind(payload.price_per_liter)
    .bind(&payload.effective_date)
    .bind(*id as i64)
    .execute(&data.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(not_found(&format!("油价记录不存在: {}", id)));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "更新成功"
    })))
}

/// 删除油价记录
#[delete("/{id}")]
pub async fn remove(
    data: web::Data<AppState>,
    id: web::Path<u64>,
) -> Result<impl Responder, ApiError> {
    let result = sqlx::query("DELETE FROM gas_prices WHERE id = ?")
        .bind(*id as i64)
        .execute(&data.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(not_found(&format!("油价记录不存在: {}", id)));
    }

    Ok(HttpResponse::NoContent().finish())
}

/// 爬取油价数据
#[post("/crawl")]
pub async fn crawl(
    data: web::Data<AppState>,
    payload: web::Json<CrawlRequest>,
) -> Result<impl Responder, ApiError> {
    let province_filter = payload
        .province
        .as_ref()
        .map(|p| p.trim().to_string())
        .filter(|p| !p.is_empty());

    let client = build_http_client()?;

    let effective_date = match payload.effective_date.as_deref() {
        Some(date) if !date.trim().is_empty() => {
            parse_date(date, "effectiveDate")?
        }
        _ => {
            let resp = client.get(base_url()).send().await?;
            let html = resp.text().await?;
            parse_adjustment_date(&html).unwrap_or_else(|| Local::now().date_naive())
        }
    };
    let dry_run = payload.dry_run.unwrap_or(false);

    let result = run_crawl_job(&data.db, &client, province_filter, effective_date, dry_run).await?;

    Ok(HttpResponse::Ok().json(result))
}

/// 高德地图 POI 搜索代理
#[get("/amap/nearby")]
pub async fn amap_nearby(
    query: web::Query<AmapNearbyQuery>,
) -> Result<impl Responder, ApiError> {
    let amap_key = std::env::var("AMAP_KEY")
        .map_err(|_| bad_request("未配置 AMAP_KEY 环境变量"))?;

    let client = build_http_client()?;
    let url = format!(
        "https://restapi.amap.com/v3/place/around?key={}&location={}&keywords={}&radius={}&offset={}&output=json",
        amap_key,
        query.location,
        urlencoding::encode(&query.keywords.as_deref().unwrap_or("加油站")),
        query.radius.unwrap_or(5000),
        query.limit.unwrap_or(20)
    );

    let resp = client.get(&url).send().await?;
    let body = resp.text().await?;

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(body))
}

#[get("/amap/geocode")]
pub async fn amap_geocode(
    query: web::Query<AmapGeocodeQuery>,
) -> Result<impl Responder, ApiError> {
    let amap_key = std::env::var("AMAP_KEY")
        .map_err(|_| bad_request("未配置 AMAP_KEY 环境变量"))?;

    let client = build_http_client()?;
    let url = format!(
        "https://restapi.amap.com/v3/geocode/geo?key={}&address={}&output=json",
        amap_key,
        urlencoding::encode(&query.address)
    );

    let resp = client.get(&url).send().await?;
    let body = resp.text().await?;

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(body))
}

#[get("/amap/reverse-geocode")]
pub async fn amap_reverse_geocode(
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<impl Responder, ApiError> {
    let amap_key = std::env::var("AMAP_KEY")
        .map_err(|_| bad_request("未配置 AMAP_KEY 环境变量"))?;

    let location = query.get("location")
        .ok_or_else(|| bad_request("缺少 location 参数"))?;

    let client = build_http_client()?;
    let url = format!(
        "https://restapi.amap.com/v3/geocode/regeo?key={}&location={}&output=json",
        amap_key,
        location
    );

    let resp = client.get(&url).send().await?;
    let body = resp.text().await?;

    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(body))
}

/// 获取下次油价调整日期
#[get("/next-adjustment")]
pub async fn get_next_adjustment() -> impl Responder {
    let next_date = calculate_next();
    let today = Local::now().date_naive();
    let days_until = (next_date - today).num_days();
    let is_adjustment_day = is_workday(next_date);

    HttpResponse::Ok().json(NextAdjustmentResponse {
        next_date: next_date.format("%Y-%m-%d").to_string(),
        days_until,
        is_adjustment_day,
    })
}

/// 获取未来调价日历
#[get("/adjustment-calendar")]
pub async fn get_adjustment_calendar() -> impl Responder {
    let latest = get_latest_known_adjustment_date();
    let future_dates = get_future_adjustment_dates(latest, 12);

    let calendar: Vec<AdjustmentCalendarItem> = future_dates
        .iter()
        .enumerate()
        .map(|(i, date)| AdjustmentCalendarItem {
            date: date.format("%Y-%m-%d").to_string(),
            round: (i + 1) as u32,
        })
        .collect();

    HttpResponse::Ok().json(serde_json::json!({
        "latestKnownDate": latest.format("%Y-%m-%d").to_string(),
        "calendar": calendar
    }))
}

#[get("/holidays")]
pub async fn get_holidays(
    query: web::Query<HashMap<String, String>>,
    data: web::Data<AppState>,
) -> Result<impl Responder, ApiError> {
    let year = query
        .get("year")
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or_else(|| Local::now().year());

    let rows = sqlx::query_as::<_, Holiday>(
        "SELECT id, date, name, is_off_day, year FROM holidays WHERE year = ? ORDER BY date",
    )
    .bind(year)
    .fetch_all(&data.db)
    .await?;

    Ok(HttpResponse::Ok().json(rows))
}

#[post("/holidays/sync")]
pub async fn sync_holidays(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let current_year = Local::now().year();
    let years = vec![current_year - 1, current_year, current_year + 1];

    let response = holiday_sync::sync_holidays_from_github(&data.db, years).await?;

    Ok(HttpResponse::Ok().json(response))
}

#[get("/holidays/adjustment-dates")]
pub async fn get_adjustment_dates(
    query: web::Query<HashMap<String, String>>,
    data: web::Data<AppState>,
) -> Result<impl Responder, ApiError> {
    let year = query
        .get("year")
        .and_then(|s| s.parse::<i32>().ok())
        .ok_or_else(|| bad_request("year参数必须提供"))?;

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

#[get("/holidays/next-adjustment")]
pub async fn get_next_adjustment_v2(data: web::Data<AppState>) -> Result<impl Responder, ApiError> {
    let today = Local::now().naive_local().date();
    let year = today.year();

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

#[get("/holidays/settings")]
pub async fn get_adjustment_settings(
    data: web::Data<AppState>,
) -> Result<impl Responder, ApiError> {
    let settings = sqlx::query_as::<_, AdjustmentSettings>(
        "SELECT workdays_interval, first_adjustment_2025, first_adjustment_2026 FROM adjustment_settings WHERE id = 1"
    )
    .fetch_one(&data.db)
    .await?;

    Ok(HttpResponse::Ok().json(settings))
}

#[put("/holidays/settings")]
pub async fn update_adjustment_settings(
    data: web::Data<AppState>,
    payload: web::Json<AdjustmentSettings>,
) -> Result<impl Responder, ApiError> {
    sqlx::query(
        r#"
        UPDATE adjustment_settings 
        SET workdays_interval = ?, first_adjustment_2025 = ?, first_adjustment_2026 = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = 1
        "#,
    )
    .bind(payload.workdays_interval)
    .bind(&payload.first_adjustment_2025)
    .bind(&payload.first_adjustment_2026)
    .execute(&data.db)
    .await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "配置已更新"
    })))
}
