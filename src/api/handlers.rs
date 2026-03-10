// API处理器模块
use crate::common::error::{bad_request, not_found, ApiError};
use crate::domain::models::*;
use crate::infrastructure::crawler::{build_http_client, parse_adjustment_date, run_crawl_job};
use crate::infrastructure::db::{row_to_record, AppState};
use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use chrono::{Local, NaiveDate};
use sqlx::{QueryBuilder, Sqlite};

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
            // 尝试解析用户提供的日期
            parse_date(date, "effectiveDate")?
        }
        _ => {
            // 尝试从网站解析调整日期
            let resp = client.get("https://www.qiyoujiage.com").send().await?;
            let html = resp.text().await?;
            parse_adjustment_date(&html).unwrap_or_else(|| Local::now().date_naive())
        }
    };
    let dry_run = payload.dry_run.unwrap_or(false);

    let result = run_crawl_job(&data.db, &client, province_filter, effective_date, dry_run).await?;

    Ok(HttpResponse::Ok().json(result))
}
