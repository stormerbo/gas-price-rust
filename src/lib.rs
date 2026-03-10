pub mod api;
pub mod common;
pub mod domain;
pub mod infrastructure;

pub use api::routes::configure_routes;
pub use infrastructure::crawler::start_auto_crawler;
pub use infrastructure::db::{get_database_path, init_database, seed_database, AppState};
