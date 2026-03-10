// 主入口文件 - Web服务器模式
use actix_cors::Cors;
use actix_files::Files;
use actix_web::{web, App, HttpServer};
use gas_price_lib::{
    configure_routes, get_database_path, init_database, seed_database, start_auto_crawler, AppState,
};
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 启动中国汽油价格管理系统 (Web服务器模式)");
    println!("💡 提示: 如需桌面应用，请使用 'cargo run --bin gas-price'");

    let database_url = get_database_path().expect("Failed to determine database path");

    let pool = init_database(&database_url)
        .await
        .expect("Failed to initialize database");

    seed_database(&pool)
        .await
        .expect("Failed to check database status");

    println!("✅ 数据库初始化完成: {}", database_url);

    let state = web::Data::new(AppState { db: pool.clone() });

    start_auto_crawler(pool);

    let host = env::var("WEB_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let env_port = env::var("WEB_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok());
    let port_range = if let Some(port) = env_port {
        port..=port
    } else {
        8080..=8090
    };

    for port in port_range {
        match HttpServer::new({
            let state = state.clone();
            move || {
                // 配置 CORS
                let cors = Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
                    .max_age(3600);
                App::new()
                    .wrap(cors)
                    .app_data(state.clone())
                    .configure(configure_routes)
                    .service(Files::new("/", "./static").index_file("index.html"))
            }
        })
        .bind((host.as_str(), port))
        {
            Ok(server) => {
                println!("🌐 服务器启动在: http://{}:{}", host, port);
                println!("📊 访问首页: http://{}:{}", host, port);
                println!("🗺️  油价地图: http://{}:{}/map.html", host, port);
                println!("📈 油价图表: http://{}:{}/chart.html", host, port);
                return server.run().await;
            }
            Err(e) => {
                eprintln!("⚠️  端口 {} 不可用: {}", port, e);
            }
        }
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::AddrInUse,
        "no available port",
    ))
}
