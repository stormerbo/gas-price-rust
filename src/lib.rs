pub mod crawler;
pub mod database;
pub mod error;
pub mod handlers;
pub mod models;

use actix_web::web;

pub use crawler::start_auto_crawler;
pub use database::{get_database_path, init_database, seed_database, AppState};

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/gas-prices")
            .service(handlers::history)
            .service(handlers::create)
            .service(handlers::update)
            .service(handlers::remove)
            .service(handlers::crawl),
    );
}
