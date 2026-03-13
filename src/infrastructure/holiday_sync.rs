use crate::common::error::ApiError;
use crate::domain::models::SyncResponse;
use reqwest::Client;
use serde::Deserialize;
use sqlx::SqlitePool;

#[derive(Debug, Deserialize)]
struct HolidayResponse {
    #[allow(dead_code)]
    year: i32,
    days: Vec<HolidayDay>,
}

#[derive(Debug, Deserialize)]
struct HolidayDay {
    name: String,
    date: String,
    #[serde(rename = "isOffDay")]
    is_off_day: bool,
}

pub async fn sync_holidays_from_github(
    pool: &SqlitePool,
    years: Vec<i32>,
) -> Result<SyncResponse, ApiError> {
    let client = Client::builder()
        .user_agent("gas-price-app/1.0")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| ApiError {
            status: actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("创建HTTP客户端失败: {}", e),
        })?;

    let mut total = 0;
    let mut synced_years = Vec::new();

    for year in years {
        let url = format!(
            "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{}.json",
            year
        );

        let response = match client.get(&url).send().await {
            Ok(resp) => resp,
            Err(e) => {
                eprintln!("获取{}年数据失败: {}", year, e);
                continue;
            }
        };

        if !response.status().is_success() {
            eprintln!("{}年数据不存在或无法访问", year);
            continue;
        }

        let holiday_response: HolidayResponse = match response.json().await {
            Ok(data) => data,
            Err(e) => {
                eprintln!("解析{}年数据失败: {}", year, e);
                continue;
            }
        };

        let mut tx = pool.begin().await.map_err(|e| ApiError {
            status: actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("开始事务失败: {}", e),
        })?;

        for day in holiday_response.days {
            match sqlx::query(
                r#"
                INSERT OR REPLACE INTO holidays (date, name, is_off_day, year)
                VALUES (?, ?, ?, ?)
                "#,
            )
            .bind(&day.date)
            .bind(&day.name)
            .bind(day.is_off_day)
            .bind(year)
            .execute(&mut *tx)
            .await
            {
                Ok(_) => total += 1,
                Err(e) => eprintln!("插入节假日记录失败 {}: {}", day.date, e),
            }
        }

        tx.commit().await.map_err(|e| ApiError {
            status: actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("提交事务失败: {}", e),
        })?;

        synced_years.push(year);
    }

    if synced_years.is_empty() {
        return Err(ApiError {
            status: actix_web::http::StatusCode::BAD_GATEWAY,
            message: "未能成功同步任何年份的数据，请检查网络连接".to_string(),
        });
    }

    Ok(SyncResponse {
        synced_years: synced_years.clone(),
        total_records: total,
        message: format!(
            "成功同步{}个年份（{}），共{}条记录",
            synced_years.len(),
            synced_years
                .iter()
                .map(|y| y.to_string())
                .collect::<Vec<_>>()
                .join(", "),
            total
        ),
    })
}
