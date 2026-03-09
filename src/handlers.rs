// API处理器模块
use crate::crawler::{build_http_client, parse_adjustment_date, run_crawl_job};
use crate::database::{row_to_record, AppState};
use crate::error::{bad_request, not_found, ApiError};
use crate::models::*;
use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use chrono::{Local, NaiveDate};
use sqlx::Row;

/// 解析日期字符串
fn parse_date(s: &str, field_name: &str) -> Result<NaiveDate, ApiError> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .map_err(|_| bad_request(&format!("{} 格式错误，应为 YYYY-MM-DD", field_name)))
}

/// 查询油价历史记录
#[get("/history")]
pub async fn history(
    data: web::Data<AppState>,
    query: web::Query<HistoryQuery>,
) -> Result<impl Responder, ApiError> {
    let mut sql = String::from("SELECT * FROM gas_prices WHERE 1=1");
    let mut count_sql = String::from("SELECT COUNT(*) as count FROM gas_prices WHERE 1=1");

    if let Some(ref province) = query.province {
        if !province.trim().is_empty() {
            sql.push_str(&format!(" AND province = '{}'", province));
            count_sql.push_str(&format!(" AND province = '{}'", province));
        }
    }

    if let Some(ref fuel_type) = query.fuel_type {
        let fuel_str = fuel_type.as_str();
        sql.push_str(&format!(" AND fuel_type = '{}'", fuel_str));
        count_sql.push_str(&format!(" AND fuel_type = '{}'", fuel_str));
    }

    if let Some(ref start_date) = query.start_date {
        if !start_date.trim().is_empty() {
            parse_date(start_date, "startDate")?;
            sql.push_str(&format!(" AND effective_date >= '{}'", start_date));
            count_sql.push_str(&format!(" AND effective_date >= '{}'", start_date));
        }
    }

    if let Some(ref end_date) = query.end_date {
        if !end_date.trim().is_empty() {
            parse_date(end_date, "endDate")?;
            sql.push_str(&format!(" AND effective_date <= '{}'", end_date));
            count_sql.push_str(&format!(" AND effective_date <= '{}'", end_date));
        }
    }

    let total: i64 = sqlx::query(&count_sql)
        .fetch_one(&data.db)
        .await?
        .try_get("count")?;

    let total_elements = total as usize;
    let total_pages = (total_elements + query.size - 1) / query.size;

    sql.push_str(" ORDER BY effective_date DESC, id DESC");
    sql.push_str(&format!(" LIMIT {} OFFSET {}", query.size, query.page * query.size));

    let rows = sqlx::query(&sql).fetch_all(&data.db).await?;

    let content: Vec<GasPriceRecord> = rows
        .iter()
        .filter_map(|row| row_to_record(row).ok())
        .collect();

    Ok(HttpResponse::Ok().json(PagedResponse {
        content,
        page: query.page,
        size: query.size,
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
pub async fn remove(data: web::Data<AppState>, id: web::Path<u64>) -> Result<impl Responder, ApiError> {
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

    let effective_date = match payload.effective_date.as_deref() {
        Some(date) if !date.trim().is_empty() => {
            // 尝试解析用户提供的日期
            parse_date(date, "effectiveDate")?
        }
        _ => {
            // 尝试从网站解析调整日期
            let client = build_http_client()?;
            let resp = client.get("https://www.qiyoujiage.com").send().await?;
            let html = resp.text().await?;
            
            parse_adjustment_date(&html).unwrap_or_else(|| Local::now().date_naive())
        }
    };

    let dry_run = payload.dry_run.unwrap_or(false);
    let client = build_http_client()?;

    let result = run_crawl_job(&data.db, &client, province_filter, effective_date, dry_run).await?;

    Ok(HttpResponse::Ok().json(result))
}
