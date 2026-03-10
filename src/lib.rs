pub mod models;
pub mod error;
pub mod database;
pub mod crawler;
pub mod handlers;

use actix_web::web;

pub use database::{AppState, get_database_path, init_database, seed_database};
pub use crawler::start_auto_crawler;

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
