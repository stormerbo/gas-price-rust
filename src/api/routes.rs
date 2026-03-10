use actix_web::web;

use crate::api::handlers;

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
