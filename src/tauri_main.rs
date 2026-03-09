// Tauri 桌面应用主入口
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use actix_files::Files;
use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use gas_price_lib::{
    AppState, configure_routes, get_database_path, init_database, seed_database, start_auto_crawler,
};
use std::sync::Arc;
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};
use tokio::sync::Mutex;

// 显示错误对话框
fn show_error_dialog(title: &str, message: &str) {
    use std::process::Command;
    
    // 使用 osascript 显示 macOS 原生对话框
    let script = format!(
        r#"display dialog "{}" with title "{}" buttons {{"确定"}} default button "确定" with icon stop"#,
        message.replace("\"", "\\\"").replace("\n", "\\n"),
        title.replace("\"", "\\\"")
    );
    
    let _ = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output();
}

// Tauri 命令：获取数据库路径
#[tauri::command]
async fn get_db_path() -> Result<String, String> {
    get_database_path().map_err(|e| e.to_string())
}

// Tauri 命令：触发手动爬取
#[tauri::command]
async fn trigger_crawl(_state: tauri::State<'_, Arc<Mutex<AppState>>>) -> Result<String, String> {
    // 这里可以调用爬虫逻辑
    Ok("爬取任务已触发".to_string())
}

// Tauri 命令：获取应用版本
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn main() {
    // 初始化 Tokio 运行时
    let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

    // 在运行时中初始化数据库
    let pool = runtime.block_on(async {
        let database_url = match get_database_path() {
            Ok(path) => {
                println!("✅ 数据库路径: {}", path);
                path
            }
            Err(e) => {
                eprintln!("❌ 获取数据库路径失败:");
                eprintln!("{}", e);
                eprintln!("\n💡 可能的解决方案:");
                eprintln!("1. 检查用户主目录是否可访问");
                eprintln!("2. 检查磁盘空间是否充足");
                eprintln!("3. 检查文件系统权限");
                
                // 显示错误对话框
                show_error_dialog(
                    "数据库初始化失败",
                    &format!("无法创建数据库目录:\n\n{}\n\n请检查文件系统权限和磁盘空间。", e)
                );
                
                std::process::exit(1);
            }
        };

        match init_database(&database_url).await {
            Ok(pool) => {
                println!("✅ 数据库连接成功");
                pool
            }
            Err(e) => {
                eprintln!("❌ 数据库初始化失败:");
                eprintln!("{}", e.message);
                eprintln!("\n💡 可能的解决方案:");
                eprintln!("1. 删除旧的数据库文件: {}", database_url);
                eprintln!("2. 检查文件权限");
                eprintln!("3. 检查磁盘空间");
                
                // 显示错误对话框
                show_error_dialog(
                    "数据库初始化失败",
                    &format!("无法初始化数据库:\n\n{}\n\n数据库位置: {}\n\n请尝试删除旧的数据库文件或检查权限。", 
                        e.message, database_url)
                );
                
                std::process::exit(1);
            }
        }
    });

    // 检查数据库状态
    runtime.block_on(async {
        if let Err(e) = seed_database(&pool).await {
            eprintln!("⚠️  数据库检查失败: {}", e.message);
            eprintln!("应用将继续运行，但可能缺少初始数据");
        } else {
            println!("✅ 数据库状态正常");
        }
    });

    let app_state = Arc::new(Mutex::new(AppState {
        db: pool.clone(),
    }));

    // 在后台启动 HTTP 服务器
    let pool_clone = pool.clone();
    let server_ready = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let server_ready_clone = server_ready.clone();
    let server_port = Arc::new(std::sync::atomic::AtomicU16::new(8080));
    let server_port_clone = server_port.clone();
    
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            println!("🚀 Starting backend HTTP server...");
            
            let state = web::Data::new(AppState { db: pool_clone.clone() });
            start_auto_crawler(pool_clone);

            // 确定 static 目录路径
            let static_path = if cfg!(debug_assertions) {
                // 开发模式：使用项目根目录的 static
                "./static".to_string()
            } else {
                // 生产模式：使用打包后的资源目录
                std::env::current_exe()
                    .ok()
                    .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
                    .and_then(|p| p.parent().map(|p| p.join("Resources/static")))
                    .and_then(|p| p.to_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| "./static".to_string())
            };

            println!("📁 Static files path: {}", static_path);

            // 尝试绑定端口，如果失败则尝试其他端口
            let mut port = 8080;
            let server = loop {
                match HttpServer::new({
                    let static_path = static_path.clone();
                    let state = state.clone();
                    move || {
                        let cors = Cors::default()
                            .allow_any_origin()
                            .allow_any_method()
                            .allow_any_header()
                            .max_age(3600);
                        
                        App::new()
                            .wrap(cors)
                            .app_data(state.clone())
                            .configure(configure_routes)
                            .service(Files::new("/", static_path.clone()).index_file("index.html"))
                    }
                })
                .bind(("127.0.0.1", port)) {
                    Ok(server) => {
                        println!("✅ Backend server bound to port {}", port);
                        server_port_clone.store(port, std::sync::atomic::Ordering::SeqCst);
                        server_ready_clone.store(true, std::sync::atomic::Ordering::SeqCst);
                        break server;
                    }
                    Err(e) => {
                        if port < 8090 {
                            println!("⚠️  Port {} unavailable, trying {}...", port, port + 1);
                            port += 1;
                        } else {
                            eprintln!("❌ Failed to bind server after trying ports 8080-8090: {}", e);
                            return;
                        }
                    }
                }
            };

            if let Err(e) = server.run().await {
                eprintln!("❌ Backend server error: {}", e);
            }
        });
    });

    // 等待服务器启动（最多等待10秒）
    println!("⏳ Waiting for backend server to start...");
    for i in 0..100 {
        if server_ready.load(std::sync::atomic::Ordering::SeqCst) {
            let port = server_port.load(std::sync::atomic::Ordering::SeqCst);
            println!("✅ Backend server is ready on port {}!", port);
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
        if i == 99 {
            eprintln!("❌ Backend server startup timeout!");
            eprintln!("   The application may not work correctly.");
            eprintln!("   Please check if port 8080-8090 are available.");
            // 不要退出，让用户看到错误信息
        }
    }

    // 创建系统托盘菜单
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let show = CustomMenuItem::new("show".to_string(), "显示窗口");
    let hide = CustomMenuItem::new("hide".to_string(), "隐藏窗口");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    println!("🎨 Starting Tauri application...");

    // 构建 Tauri 应用
    tauri::Builder::default()
        .manage(app_state)
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { .. } => {
                // 点击关闭按钮时直接退出应用
                std::process::exit(0);
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_db_path,
            trigger_crawl,
            get_app_version
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
