// 库文件 - 导出共享模块
pub mod models;
pub mod error;
pub mod database;
pub mod crawler;
pub mod handlers;

use actix_web::web;

pub use database::{AppState, get_database_path, init_database, seed_database};
pub use crawler::start_auto_crawler;
pub use handlers::{history, create, update, remove, crawl};

// 配置API路由
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/gas-prices")
            .service(history)
            .service(create)
            .service(update)
            .service(remove)
            .service(crawl),
    );
}
