fn main() {
    // 只在构建 Tauri 应用时运行
    #[cfg(feature = "custom-protocol")]
    tauri_build::build()
}
