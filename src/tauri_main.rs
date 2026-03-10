// Tauri 桌面应用主入口
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use actix_cors::Cors;
use actix_files::Files;
use actix_web::{web, App, HttpServer};
use gas_price_lib::{
    configure_routes, get_database_path, init_database, seed_database, start_auto_crawler, AppState,
};
use std::sync::{
    atomic::{AtomicBool, AtomicU16, Ordering},
    Arc,
};
use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};

struct ServerState {
    port: AtomicU16,
    ready: AtomicBool,
}

impl ServerState {
    fn new() -> Self {
        Self {
            port: AtomicU16::new(0),
            ready: AtomicBool::new(false),
        }
    }
}

// 显示错误信息并退出
fn fatal_error(title: &str, message: &str) -> ! {
    eprintln!("❌ {}: {}", title, message);
    std::process::exit(1);
}

// Tauri 命令：获取数据库路径
#[tauri::command]
async fn get_db_path() -> Result<String, String> {
    get_database_path().map_err(|e| e.to_string())
}

// Tauri 命令：获取应用版本
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// Tauri 命令：获取后端服务端口
#[tauri::command]
fn get_server_port(state: tauri::State<'_, Arc<ServerState>>) -> Result<u16, String> {
    if state.ready.load(Ordering::SeqCst) {
        Ok(state.port.load(Ordering::SeqCst))
    } else {
        Err("backend server not ready".to_string())
    }
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
                eprintln!("❌ 获取数据库路径失败: {}", e);
                fatal_error("数据库初始化失败", &format!("无法创建数据库目录: {}", e));
            }
        };

        match init_database(&database_url).await {
            Ok(pool) => {
                println!("✅ 数据库连接成功");
                pool
            }
            Err(e) => {
                fatal_error(
                    "数据库初始化失败",
                    &format!("无法初始化数据库: {} (路径: {})", e.message, database_url),
                );
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

    // 在后台启动 HTTP 服务器
    let pool_clone = pool.clone();
    let server_state = Arc::new(ServerState::new());
    let server_state_clone = server_state.clone();

    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            println!("🚀 Starting backend HTTP server...");

            let state = web::Data::new(AppState {
                db: pool_clone.clone(),
            });
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

            // 尝试绑定端口，开发模式固定 8080，生产模式尝试 8080-8090
            let port_range = if cfg!(debug_assertions) {
                8080..=8080
            } else {
                8080..=8090
            };
            let mut server = None;

            for port in port_range {
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
                .bind(("127.0.0.1", port))
                {
                    Ok(bound_server) => {
                        println!("✅ Backend server bound to port {}", port);
                        server_state_clone.port.store(port, Ordering::SeqCst);
                        server_state_clone.ready.store(true, Ordering::SeqCst);
                        server = Some(bound_server);
                        break;
                    }
                    Err(e) => {
                        eprintln!("⚠️  Port {} unavailable: {}", port, e);
                    }
                }
            }

            let server = match server {
                Some(server) => server,
                None => {
                    eprintln!("❌ Failed to bind backend server");
                    return;
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
        if server_state.ready.load(Ordering::SeqCst) {
            let port = server_state.port.load(Ordering::SeqCst);
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
        .manage(server_state)
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
            get_app_version,
            get_server_port
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
