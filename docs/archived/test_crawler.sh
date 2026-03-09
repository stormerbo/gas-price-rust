#!/bin/bash

echo "=== Testing Crawler Functionality ==="
echo ""

# 启动服务（后台运行）
echo "Starting service..."
cargo run --release > /tmp/gas-price.log 2>&1 &
SERVICE_PID=$!
echo "Service PID: $SERVICE_PID"

# 等待服务启动
echo "Waiting for service to start..."
sleep 5

# 检查服务是否启动成功
if ps -p $SERVICE_PID > /dev/null; then
    echo "✓ Service started successfully"
else
    echo "✗ Service failed to start"
    cat /tmp/gas-price.log
    exit 1
fi

# 等待初始爬取完成
echo ""
echo "Waiting for initial crawl to complete..."
sleep 10

# 显示日志
echo ""
echo "=== Service Log ==="
cat /tmp/gas-price.log

# 测试API
echo ""
echo "=== Testing API ==="
curl -s http://127.0.0.1:8080/api/v1/gas-prices/history?page=0&size=5 | python3 -m json.tool | head -30

# 停止服务
echo ""
echo "Stopping service..."
kill $SERVICE_PID
wait $SERVICE_PID 2>/dev/null

echo ""
echo "=== Test Complete ==="
