# 端口配置说明

## 端口分配

### 开发环境

| 服务 | 端口 | 说明 |
|-----|------|------|
| **前端开发服务器** | 3000 | Vite dev server |
| **后端 API 服务** | 8080 | Rust/Actix Web |

### 生产环境（Tauri 桌面应用）

| 服务 | 端口 | 说明 |
|-----|------|------|
| **内置后端** | 动态分配 | 8080-8090 自动选择可用端口 |

## 代理配置

### 开发环境代理

前端开发服务器（3000端口）配置了代理，自动将 `/api` 请求转发到后端（8080端口）。

**配置文件：** `frontend/vite.config.js`

```javascript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### 请求流程

```
浏览器 (http://localhost:3000)
    ↓
    GET http://localhost:3000/api/v1/holidays
    ↓
Vite 代理转发
    ↓
    GET http://localhost:8080/api/v1/holidays
    ↓
后端 API 响应
```

## 启动顺序

### 方式 1：自动启动（推荐）

```bash
pnpm start
```

自动启动前端和后端，无需手动管理端口。

### 方式 2：分别启动

```bash
# 终端 1：启动后端（必须先启动）
cargo run --bin gas-price-web
# 等待看到 "Starting HTTP server at 127.0.0.1:8080"

# 终端 2：启动前端
cd frontend && pnpm run dev
# 等待看到 "Local: http://localhost:3000"
```

**注意：必须先启动后端，否则前端 API 请求会失败。**

## API 端点完整路径

### 前端调用（开发环境）

```javascript
// 前端代码中使用相对路径
fetch('/api/v1/holidays?year=2026')
// 实际请求：http://localhost:3000/api/v1/holidays?year=2026
// 代理转发到：http://localhost:8080/api/v1/holidays?year=2026
```

### 直接调用后端（测试）

```bash
# 直接访问后端 API
curl http://localhost:8080/api/v1/holidays?year=2026
```

## 常见问题

### Q: 前端显示 "502 Bad Gateway"

**原因：** 后端未启动或端口不是 8080

**解决方案：**
1. 检查后端是否运行：
   ```bash
   lsof -i :8080
   ```
2. 启动后端：
   ```bash
   cargo run --bin gas-price-web
   ```

### Q: 前端显示 "Failed to fetch"

**原因：** 网络请求失败，可能是：
- 后端崩溃
- 端口被占用
- 防火墙阻止

**解决方案：**
1. 查看后端日志
2. 检查端口占用：
   ```bash
   lsof -i :8080
   ```
3. 重启后端

### Q: 生产环境（构建后）如何访问？

**答：** 生产环境下，前端静态文件由后端直接提供：

```bash
# 1. 构建前端
pnpm run build

# 2. 启动后端（会自动提供静态文件）
cargo run --bin gas-price-web --release

# 3. 访问
http://localhost:8080
```

后端会自动提供 `static/` 目录下的静态文件，无需前端开发服务器。

### Q: 如何修改端口？

**前端端口：**

编辑 `frontend/vite.config.js`：
```javascript
server: {
  port: 3000, // 修改为其他端口
}
```

**后端端口：**

设置环境变量：
```bash
WEB_PORT=9000 cargo run --bin gas-price-web
```

或在 `.env` 文件中：
```
WEB_PORT=9000
```

## Tauri 桌面应用

桌面应用使用内置后端，端口自动分配（8080-8090）。

前端代码会自动检测 Tauri 环境并使用正确的端口：

```javascript
// frontend/src/api/base.js
if (isTauri) {
  // Tauri 环境：使用动态端口
  const port = await resolveTauriPort();
  cachedApiBase = `http://127.0.0.1:${port}/api/v1/gas-prices`;
} else {
  // Web 环境：使用相对路径（依赖代理）
  cachedApiBase = '/api/v1/gas-prices';
}
```

## 网络架构图

### 开发环境

```
┌─────────────────────────────────────────────┐
│ 浏览器 (http://localhost:3000)              │
└────────────────┬────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  Vite Dev      │  Port: 3000
         │  Server        │  (前端开发服务器)
         └───────┬────────┘
                 │
         /api/* 代理转发
                 │
         ┌───────▼────────┐
         │  Rust Backend  │  Port: 8080
         │  (Actix Web)   │  (API 服务)
         └────────────────┘
```

### 生产环境（Web 部署）

```
┌─────────────────────────────────────────────┐
│ 浏览器 (http://server:8080)                 │
└────────────────┬────────────────────────────┘
                 │
         ┌───────▼────────────────────┐
         │  Rust Backend              │  Port: 8080
         │  ├─ 静态文件服务          │
         │  └─ API 端点              │
         └────────────────────────────┘
```

### 生产环境（Tauri 桌面应用）

```
┌─────────────────────────────────────────────┐
│ Tauri Window (file://...)                   │
└────────────────┬────────────────────────────┘
                 │
         ┌───────▼────────────────────┐
         │  内置 Rust Backend         │  Port: 动态
         │  (127.0.0.1:8080-8090)    │  (自动选择)
         └────────────────────────────┘
```

## 安全说明

- 开发环境：仅监听 `localhost`/`127.0.0.1`，不对外暴露
- 生产环境：可通过 `WEB_HOST` 配置监听地址
- 桌面应用：仅监听 `127.0.0.1`，完全本地运行

## 测试清单

启动后检查以下内容确认配置正确：

- [ ] 后端日志显示：`Starting HTTP server at 127.0.0.1:8080`
- [ ] 前端日志显示：`Local: http://localhost:3000`
- [ ] 浏览器访问 `http://localhost:3000` 可以打开应用
- [ ] 浏览器控制台无 CORS 错误
- [ ] 点击"系统设置" → "同步节假日数据" 可以成功调用 API
- [ ] 网络请求显示 `http://localhost:3000/api/v1/holidays/sync` (200 OK)
