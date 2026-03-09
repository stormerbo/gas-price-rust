// 主入口文件 - Web服务器模式
use actix_files::Files;
use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use gas_price_lib::{
    AppState, configure_routes, get_database_path, init_database, seed_database, start_auto_crawler,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 启动中国汽油价格管理系统 (Web服务器模式)");
    println!("💡 提示: 如需桌面应用，请使用 'cargo run --bin gas-price-tauri'");
    
    let database_url = get_database_path()
        .expect("Failed to determine database path");
    
    let pool = init_database(&database_url)
        .await
        .expect("Failed to initialize database");

    seed_database(&pool)
        .await
        .expect("Failed to check database status");

    println!("✅ 数据库初始化完成: {}", database_url);

    let state = web::Data::new(AppState {
        db: pool.clone(),
    });

    start_auto_crawler(pool);

    println!("🌐 服务器启动在: http://127.0.0.1:8080");
    println!("📊 访问首页: http://127.0.0.1:8080");
    println!("🗺️  油价地图: http://127.0.0.1:8080/map.html");
    println!("📈 油价图表: http://127.0.0.1:8080/chart.html");

    HttpServer::new(move || {
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
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
