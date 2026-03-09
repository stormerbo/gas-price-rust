// 错误处理模块
use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub message: String,
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.status, self.message)
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status).json(serde_json::json!({
            "message": self.message
        }))
    }

    fn status_code(&self) -> StatusCode {
        self.status
    }
}

pub fn bad_request(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::BAD_REQUEST,
        message: msg.to_string(),
    }
}

pub fn not_found(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::NOT_FOUND,
        message: msg.to_string(),
    }
}

pub fn internal_error(msg: &str) -> ApiError {
    ApiError {
        status: StatusCode::INTERNAL_SERVER_ERROR,
        message: msg.to_string(),
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(err: sqlx::Error) -> Self {
        ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("数据库错误: {}", err),
        }
    }
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        ApiError {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("HTTP请求失败: {}", err),
        }
    }
}
