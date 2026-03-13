use actix_web::web;

use crate::api::handlers;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/gas-prices")
            .service(handlers::history)
            .service(handlers::create)
            .service(handlers::update)
            .service(handlers::remove)
            .service(handlers::crawl)
            .service(handlers::amap_nearby)
            .service(handlers::amap_geocode)
            .service(handlers::amap_reverse_geocode)
            .service(handlers::get_next_adjustment)
            .service(handlers::get_adjustment_calendar),
    )
    .service(
        web::scope("/api/v1")
            .service(handlers::get_holidays)
            .service(handlers::sync_holidays)
            .service(handlers::get_adjustment_dates)
            .service(handlers::get_next_adjustment_v2)
            .service(handlers::get_adjustment_settings)
            .service(handlers::update_adjustment_settings),
    );
}
