# 桌面应用故障排除指南

## 常见错误及解决方案

### 错误 0: Windows - 找不到 WebView2Loader.dll

**症状**: Windows 上启动应用时弹出错误对话框：
```
由于找不到 WebView2Loader.dll，无法继续执行代码。重新安装程序可能会解决此问题。
```

**原因**: 系统缺少 Microsoft Edge WebView2 运行时

**解决方案**:

**方法 1：重新构建应用（推荐）**
```bash
# 使用修复脚本重新构建
./rebuild_windows.sh

# 或手动构建
cargo tauri build
```

新的安装包会在安装时自动下载并安装 WebView2。

**方法 2：手动安装 WebView2**
1. 下载 WebView2 运行时：https://go.microsoft.com/fwlink/p/?LinkId=2124703
2. 运行安装程序
3. 重新启动应用

**详细文档**: 查看 [docs/WINDOWS_WEBVIEW2_FIX.md](docs/WINDOWS_WEBVIEW2_FIX.md)

---

### 错误 1: "The string did not match the expected pattern"

**症状**: 桌面应用启动后，页面显示红色错误提示框

**原因**: Content Security Policy (CSP) 配置不正确，阻止了应用访问本地 API 服务器

**解决方案**: ✅ 已修复 - 已在 `tauri.conf.json` 中修复 CSP 配置，添加了以下权限：
- `http://localhost:8080` - 本地 API 服务器
- `http://127.0.0.1:8080` - 本地 API 服务器（备用地址）
- `https://www.qiyoujiage.com` - 爬虫数据源
- `'unsafe-eval'` - 允许 ECharts 等库使用动态代码执行
- `blob:` - 允许 blob URL（用于某些图表功能）

**验证修复**:
```bash
# 重新构建应用
cargo tauri build

# 或在开发模式运行
cargo tauri dev
```

---

### 错误 2: `spawn_local` called from outside of a `task::LocalSet`

**症状**: 终端显示 panic 错误，提示 spawn_local 在错误的上下文中被调用

**原因**: 使用了 `actix_web::rt::spawn` 在 Tauri 环境中启动异步任务，但 Tauri 使用不同的运行时

**解决方案**: ✅ 已修复 - 将 `src/crawler.rs` 中的 `actix_web::rt::spawn` 改为 `tokio::spawn`

**验证修复**:
```bash
# 重新编译
cargo build --bin gas-price-tauri --release
```

---

### 错误 3: Asset `api/v1/gas-prices/history` not found

**症状**: 终端显示多个 "Asset not found" 错误，API 请求被当作静态文件处理

**原因**: Tauri 窗口在后端 HTTP 服务器完全启动之前就尝试加载页面

**解决方案**: ✅ 已修复 - 在 `src/tauri_main.rs` 中添加了服务器启动等待机制：
- 使用 AtomicBool 标记服务器就绪状态
- Tauri 窗口在服务器就绪后才开始加载
- 最多等待 5 秒，避免无限等待

**验证修复**:
```bash
# 运行应用，应该看到以下日志：
# ⏳ Waiting for backend server to start...
# ✅ Backend server is ready!
# 🎨 Starting Tauri application...
```

---

### 错误 4: Address already in use (os error 48)

**症状**: 应用启动失败，提示 "Failed to bind backend server: Address already in use"

**原因**: 端口 8080 已被其他进程占用（通常是之前运行的 Web 服务器或桌面应用实例）

**解决方案**:

1. **使用自动化脚本（推荐）**:
```bash
# 自动检测并停止占用端口的进程
./run_tauri_app.sh

# 或停止所有相关进程
./stop_all.sh
```

2. **手动查找并停止进程**:
```bash
# 查找占用端口 8080 的进程
lsof -i :8080

# 停止进程（替换 PID 为实际的进程 ID）
kill <PID>

# 如果进程无法停止，使用强制停止
kill -9 <PID>
```

3. **停止所有 gas-price 进程**:
```bash
pkill -f gas-price
```

4. **修改端口号**（如果需要同时运行多个实例）:
   - 编辑 `src/tauri_main.rs` 和 `src/main.rs`
   - 将 `.bind(("127.0.0.1", 8080))` 改为其他端口，如 8081
   - 同时更新 `tauri.conf.json` 中的 `devPath` 和 CSP 配置

**预防措施**:
- 使用 `./run_tauri_app.sh` 启动应用（会自动检查端口）
- 退出应用时使用托盘菜单的"退出"选项，而不是强制关闭终端
- 定期运行 `./stop_all.sh` 清理残留进程

---

### 错误 5: CORS 错误 - Origin not allowed by Access-Control-Allow-Origin

**症状**: 控制台显示 CORS 错误，API 请求被阻止

**原因**: 
1. Tauri 使用 `tauri://localhost` 协议加载页面
2. 前端向 `http://localhost:8080` 发送 API 请求
3. 跨域请求被浏览器阻止

**解决方案**: ✅ 已修复 - 在后端添加了 CORS 中间件

验证 CORS 配置：
```bash
curl -H "Origin: tauri://localhost" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://127.0.0.1:8080/api/v1/gas-prices/history -v 2>&1 | grep -i "access-control"
```

应该看到：
```
< access-control-allow-origin: *
< access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
```

---

### 错误 6: 外部 API 访问被阻止（ipapi.co、地图数据等）

**症状**: 
- 控制台显示 "Origin tauri://localhost is not allowed by Access-Control-Allow-Origin"
- 本地油价组件无法加载
- 地图数据加载失败

**原因**: Tauri 的 HTTP allowlist 未配置，阻止了对外部 API 的访问

**解决方案**: ✅ 已修复 - 在 `tauri.conf.json` 中添加了 HTTP allowlist：

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "all": true,
        "request": true,
        "scope": [
          "http://localhost:8080/**",
          "http://127.0.0.1:8080/**",
          "https://ipapi.co/**",
          "https://geo.datav.aliyun.com/**",
          "https://www.qiyoujiage.com/**",
          "https://cdn.jsdelivr.net/**"
        ]
      }
    }
  }
}
```

**验证修复**:
```bash
# 运行测试脚本
./test_tauri_fix.sh

# 或手动测试
./stop_all.sh
cargo run --bin gas-price-tauri
```

在应用中检查：
1. 打开开发者工具（Cmd+Option+I）
2. 查看 Console - 应该没有 CORS 错误
3. 首页的"当前位置油价"组件应该正常显示
4. Network 标签中的请求应该都是 200 状态

---

### 错误 7: 无法连接到后端服务器

**症状**: 页面加载但无法获取数据，控制台显示网络错误

**可能原因**:
1. 后端服务器未启动
2. 端口 8080 被占用
3. 防火墙阻止连接

**解决方案**:

1. 检查后端服务器是否运行：
```bash
# 查看进程
ps aux | grep gas-price

# 测试端口
curl http://127.0.0.1:8080/api/v1/gas-prices/history?page=0&size=1
```

2. 检查端口占用：
```bash
lsof -i :8080
```

3. 如果端口被占用，修改 `src/tauri_main.rs` 和 `src/main.rs` 中的端口号

---

### 错误 8: 数据库错误

**症状**: 应用启动但无法查询数据

**可能原因**:
1. 数据库文件不存在
2. 数据库权限问题
3. 数据库文件损坏

**解决方案**:

1. 检查数据库位置：
```bash
# macOS/Linux
ls -la ~/.gas_price/data/gas_prices.db

# Windows
dir %USERPROFILE%\.gas_price\data\gas_prices.db
```

2. 删除并重新创建数据库：
```bash
rm -rf ~/.gas_price/data/gas_prices.db
# 重新启动应用，会自动创建新数据库
```

3. 手动触发爬虫获取数据：
```bash
curl -X POST http://127.0.0.1:8080/api/v1/gas-prices/crawl \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

---

### 错误 9: 地图无法显示

**症状**: 地图页面空白或显示错误

**可能原因**:
1. ECharts 库加载失败
2. 地图数据加载失败
3. CSP 阻止了外部资源

**解决方案**:

1. 检查网络连接（需要访问 cdn.jsdelivr.net 和 geo.datav.aliyun.com）

2. 打开浏览器开发者工具（在 Tauri 窗口中按 `Cmd+Option+I` 或 `F12`）查看错误信息

3. 确认 CSP 配置包含：
```json
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net"
"connect-src 'self' ... https://geo.datav.aliyun.com"
```

---

### 错误 10: 系统托盘图标不显示

**症状**: 应用运行但托盘中没有图标

**可能原因**:
1. 图标文件缺失
2. 图标路径配置错误
3. 系统不支持托盘图标

**解决方案**:

1. 检查图标文件：
```bash
ls -la icons/icon.png
```

2. 如果图标缺失，重新生成：
```bash
python3 generate_icon.py
cargo tauri icon icons/icon.png
```

3. 在 macOS 上，确保"显示菜单栏图标"选项已启用

---

### 错误 11: 窗口无法打开或立即关闭

**症状**: 应用启动后窗口闪现即消失

**可能原因**:
1. 后端服务器启动失败
2. 数据库初始化失败
3. 端口冲突

**解决方案**:

1. 从终端运行应用查看错误信息：
```bash
./target/release/gas-price-tauri
```

2. 检查日志输出，查找错误信息

3. 确保没有其他实例在运行：
```bash
pkill -f gas-price-tauri
```

---

## 调试技巧

### 1. 启用详细日志

在 `src/tauri_main.rs` 中添加日志输出：
```rust
println!("🔍 调试信息: {}", some_variable);
eprintln!("❌ 错误信息: {}", error);
```

### 2. 使用浏览器开发者工具

在 Tauri 窗口中：
- macOS: `Cmd + Option + I`
- Windows/Linux: `F12`

查看：
- Console: JavaScript 错误和日志
- Network: API 请求和响应
- Application: LocalStorage 和缓存

### 3. 测试 Web 模式

如果桌面应用有问题，先测试 Web 模式：
```bash
cargo run --bin gas-price
# 访问 http://127.0.0.1:8080
```

如果 Web 模式正常，问题可能在 Tauri 配置中。

### 4. 检查 CSP 违规

在开发者工具的 Console 中查找 CSP 违规警告：
```
Refused to load ... because it violates the following Content Security Policy directive
```

根据警告信息调整 `tauri.conf.json` 中的 CSP 配置。

---

## 性能问题

### 应用启动慢

**优化方案**:
1. 使用 release 模式构建：`cargo tauri build --release`
2. 启用 LTO（在 Cargo.toml 中配置）
3. 减少初始化时的数据库查询

### 内存占用高

**优化方案**:
1. 限制数据库查询结果数量
2. 使用分页加载数据
3. 及时清理不需要的缓存

### 界面卡顿

**优化方案**:
1. 使用 Web Workers 处理大量数据
2. 优化 ECharts 配置，减少渲染节点
3. 使用虚拟滚动处理长列表

---

## 平台特定问题

### macOS

**问题**: 应用无法打开，提示"已损坏"
**解决**: 
```bash
xattr -cr "target/release/bundle/macos/中国汽油价格管理.app"
```

**问题**: 托盘图标显示异常
**解决**: 使用 `iconAsTemplate: true` 并提供黑白图标

### Windows

**问题**: 缺少 WebView2
**解决**: 安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

**问题**: 防火墙阻止连接
**解决**: 添加应用到防火墙白名单

### Linux

**问题**: 缺少系统依赖
**解决**: 
```bash
sudo apt install libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev
```

---

## 获取帮助

如果以上方案都无法解决问题：

1. 查看完整错误日志
2. 检查 [Tauri 官方文档](https://tauri.app/)
3. 搜索 [Tauri GitHub Issues](https://github.com/tauri-apps/tauri/issues)
4. 在项目仓库提交 Issue，包含：
   - 操作系统和版本
   - 完整错误信息
   - 复现步骤
   - 相关日志

---

**最后更新**: 2026-02-26
