# 应用图标

## 需要的图标文件

请准备以下尺寸的图标文件：

1. **32x32.png** - Windows 小图标
2. **128x128.png** - macOS/Linux 图标
3. **128x128@2x.png** - macOS Retina 图标
4. **icon.icns** - macOS 应用图标
5. **icon.ico** - Windows 应用图标
6. **icon.png** - 系统托盘图标（建议 512x512 或更大）

## 快速生成图标

### 方法1: 使用 Tauri CLI（推荐）

```bash
# 安装 Tauri CLI
cargo install tauri-cli

# 从一张高分辨率图片生成所有需要的图标
# 建议使用 1024x1024 或更大的 PNG 图片
cargo tauri icon path/to/your/icon.png
```

这个命令会自动生成所有需要的图标格式。

### 方法2: 在线工具

使用以下在线工具生成图标：

- [App Icon Generator](https://appicon.co/)
- [Icon Generator](https://icon.kitchen/)
- [Favicon Generator](https://realfavicongenerator.net/)

### 方法3: 手动创建

使用图像编辑软件（如 Photoshop、GIMP、Sketch）创建不同尺寸的图标。

## 图标设计建议

1. **简洁明了**: 使用简单的图形，避免过多细节
2. **高对比度**: 确保在浅色和深色背景下都清晰可见
3. **居中对齐**: 图标主体应该居中
4. **留白空间**: 边缘留出适当的空白
5. **矢量优先**: 如果可能，从矢量图开始设计

## 推荐的图标主题

对于油价管理应用，可以考虑以下元素：

- ⛽ 加油站图标
- 📊 图表/数据图标
- 💰 价格标签图标
- 🗺️ 地图图标
- 🚗 汽车图标

## 临时占位图标

在开发阶段，可以使用 emoji 或简单的几何图形作为占位符。

## 注意事项

- 所有图标应该使用相同的设计风格
- 确保图标在不同尺寸下都清晰可辨
- 测试图标在不同操作系统和主题下的显示效果
- 图标文件应该是透明背景的 PNG 格式（除了 .ico 和 .icns）
