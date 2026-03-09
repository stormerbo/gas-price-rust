// 数据库操作模块
use crate::error::{internal_error, ApiError};
use crate::models::{CrawlItem, FuelType, GasPriceRecord};
use sqlx::{Row, SqlitePool};

/// 应用状态（共享数据库连接池）
pub struct AppState {
    pub db: SqlitePool,
}

/// 获取数据库路径
pub fn get_database_path() -> Result<String, String> {
    let home_dir = dirs::home_dir().ok_or("无法获取用户主目录")?;
    let data_dir = home_dir.join(".gas_price").join("data");
    
    // 尝试创建目录，提供更详细的错误信息
    if let Err(e) = std::fs::create_dir_all(&data_dir) {
        return Err(format!(
            "创建数据目录失败: {}\n目录路径: {}\n请检查文件系统权限",
            e,
            data_dir.display()
        ));
    }
    
    let db_path = data_dir.join("gas_prices.db");
    
    // 验证目录是否可写
    let test_file = data_dir.join(".write_test");
    if let Err(e) = std::fs::write(&test_file, "test") {
        return Err(format!(
            "数据目录不可写: {}\n目录路径: {}\n请检查文件系统权限",
            e,
            data_dir.display()
        ));
    }
    let _ = std::fs::remove_file(&test_file);
    
    // 返回 SQLite URL 格式，而不是纯文件路径
    Ok(format!("sqlite://{}?mode=rwc", db_path.to_string_lossy()))
}

/// 初始化数据库
pub async fn init_database(database_url: &str) -> Result<SqlitePool, ApiError> {
    let pool = SqlitePool::connect(database_url)
        .await
        .map_err(|e| ApiError {
            status: actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("数据库连接失败: {}", e),
        })?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS gas_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            province TEXT NOT NULL,
            fuel_type TEXT NOT NULL,
            price_per_liter REAL NOT NULL,
            effective_date TEXT NOT NULL,
            price_change REAL,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        )
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| internal_error(&format!("创建表失败: {}", e)))?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_province_fuel_date 
        ON gas_prices(province, fuel_type, effective_date DESC)
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| internal_error(&format!("创建索引失败: {}", e)))?;

    Ok(pool)
}

/// 初始化数据库表（检查是否为首次运行）
pub async fn seed_database(pool: &SqlitePool) -> Result<bool, ApiError> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM gas_prices")
        .fetch_one(pool)
        .await?;

    Ok(count == 0)
}

/// 查询最新的油价记录（用于计算价格变化）
pub async fn get_latest_price(
    pool: &SqlitePool,
    province: &str,
    fuel_type: &str,
) -> Result<Option<f64>, ApiError> {
    let result = sqlx::query(
        r#"
        SELECT price_per_liter 
        FROM gas_prices 
        WHERE province = ? AND fuel_type = ?
        ORDER BY effective_date DESC, id DESC
        LIMIT 1
        "#,
    )
    .bind(province)
    .bind(fuel_type)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|row| row.get::<f64, _>("price_per_liter")))
}

/// 检查当天是否已有记录
pub async fn get_today_record(
    pool: &SqlitePool,
    province: &str,
    fuel_type: &str,
    effective_date: &str,
) -> Result<Option<u64>, ApiError> {
    let result = sqlx::query(
        r#"
        SELECT id 
        FROM gas_prices 
        WHERE province = ? AND fuel_type = ? AND effective_date = ?
        LIMIT 1
        "#,
    )
    .bind(province)
    .bind(fuel_type)
    .bind(effective_date)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|row| row.get::<i64, _>("id") as u64))
}

/// 插入新的油价记录
pub async fn insert_price_record(
    pool: &SqlitePool,
    item: &CrawlItem,
    price_change: Option<f64>,
) -> Result<(), ApiError> {
    sqlx::query(
        r#"
        INSERT INTO gas_prices (province, fuel_type, price_per_liter, effective_date, price_change)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&item.province)
    .bind(item.fuel_type.as_str())
    .bind(item.price_per_liter)
    .bind(item.effective_date.to_string())
    .bind(price_change)
    .execute(pool)
    .await?;

    Ok(())
}

/// 更新现有的油价记录
pub async fn update_price_record(
    pool: &SqlitePool,
    id: u64,
    item: &CrawlItem,
    price_change: Option<f64>,
) -> Result<(), ApiError> {
    sqlx::query(
        r#"
        UPDATE gas_prices 
        SET price_per_liter = ?, price_change = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
        "#,
    )
    .bind(item.price_per_liter)
    .bind(price_change)
    .bind(id as i64)
    .execute(pool)
    .await?;

    Ok(())
}

/// 将数据库行转换为GasPriceRecord
pub fn row_to_record(row: &sqlx::sqlite::SqliteRow) -> Result<GasPriceRecord, sqlx::Error> {
    let fuel_type_str: String = row.try_get("fuel_type")?;
    let fuel_type = match fuel_type_str.as_str() {
        "GASOLINE_92" => FuelType::Gasoline92,
        "GASOLINE_95" => FuelType::Gasoline95,
        "GASOLINE_98" => FuelType::Gasoline98,
        "DIESEL_0" => FuelType::Diesel0,
        _ => FuelType::Gasoline92,
    };

    Ok(GasPriceRecord {
        id: row.try_get::<i64, _>("id")? as u64,
        province: row.try_get("province")?,
        fuel_type,
        price_per_liter: row.try_get("price_per_liter")?,
        effective_date: row.try_get("effective_date")?,
        price_change: row.try_get("price_change")?,
    })
}
