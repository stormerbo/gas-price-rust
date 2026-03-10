import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Select, Typography } from 'antd';
import Chart from 'chart.js/auto';
import LocalPrices from '../components/LocalPrices.jsx';
import { FUEL_TYPE_NAMES, FUEL_TYPES } from '../constants.js';
import { fetchHistory } from '../api/index.js';
import { showToast } from '../utils.js';

const { Title } = Typography;

async function fetchLatestPrices(fuelType) {
  let allRecords = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const query = new URLSearchParams({
      fuelType,
      page: String(page),
      size: '200',
    });
    const data = await fetchHistory(query);
    allRecords = allRecords.concat(data.content || []);
    totalPages = data.totalPages;
    page += 1;
    if (page >= 5) break;
  }

  const provinceMap = new Map();
  allRecords.forEach((record) => {
    const existing = provinceMap.get(record.province);
    if (!existing || record.effectiveDate > existing.effectiveDate) {
      provinceMap.set(record.province, record);
    }
  });

  return Array.from(provinceMap.values()).sort((a, b) =>
    a.province.localeCompare(b.province, 'zh-CN')
  );
}

export default function ChartPage() {
  const [fuelType, setFuelType] = useState('GASOLINE_92');
  const [prices, setPrices] = useState([]);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const latest = await fetchLatestPrices(fuelType);
        if (mounted) setPrices(latest);
      } catch (err) {
        showToast(err.message || '查询失败', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fuelType]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = prices.map((p) => p.province);
    const data = prices.map((p) => p.pricePerLiter);
    const avgPrice = data.length
      ? data.reduce((sum, p) => sum + p, 0) / data.length
      : 0;

    const ctx = chartRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 113, 227, 0.85)');
    gradient.addColorStop(1, 'rgba(0, 113, 227, 0.65)');

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `${FUEL_TYPE_NAMES[fuelType]} 价格 (元/升)`,
            data,
            backgroundColor: gradient,
            borderRadius: 6,
          },
          {
            label: '平均价',
            data: labels.map(() => avgPrice),
            type: 'line',
            borderColor: '#ff7a45',
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#64748b', maxRotation: 70, minRotation: 45 },
          },
          y: {
            ticks: { color: '#64748b' },
          },
        },
      },
    });
  }, [prices, fuelType]);

  const stats = useMemo(() => {
    if (!prices.length) {
      return {
        maxPrice: '-',
        maxProvince: '-',
        minPrice: '-',
        minProvince: '-',
        avgPrice: '-',
        count: 0,
      };
    }
    const priceValues = prices.map((p) => p.pricePerLiter);
    const maxPrice = Math.max(...priceValues);
    const minPrice = Math.min(...priceValues);
    const avgPrice = priceValues.reduce((sum, p) => sum + p, 0) / prices.length;
    const maxProvince = prices.find((p) => p.pricePerLiter === maxPrice)?.province || '-';
    const minProvince = prices.find((p) => p.pricePerLiter === minPrice)?.province || '-';

    return {
      maxPrice: `¥${maxPrice.toFixed(3)}`,
      maxProvince,
      minPrice: `¥${minPrice.toFixed(3)}`,
      minProvince,
      avgPrice: `¥${avgPrice.toFixed(3)}`,
      count: prices.length,
    };
  }, [prices]);

  return (
    <>
      <header className="hero card reveal">
        <Title level={1}>全国油价分析</Title>
        <p>各省份最新油价对比分析</p>
      </header>

      <LocalPrices clickable activeType={fuelType} onCardClick={setFuelType} />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>价格分布</h2>
          <Select
            value={fuelType}
            onChange={setFuelType}
            options={FUEL_TYPES.map((f) => ({ value: f, label: FUEL_TYPE_NAMES[f] }))}
            style={{ width: 180 }}
          />
        </div>
        <div className="chart-container" style={{ height: 380 }}>
          <canvas ref={chartRef} />
        </div>
      </section>

      <section className="card reveal delay-3">
        <h2>统计信息</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">最高价</div>
            <div className="stat-value">{stats.maxPrice}</div>
            <div className="stat-detail">{stats.maxProvince}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">最低价</div>
            <div className="stat-value">{stats.minPrice}</div>
            <div className="stat-detail">{stats.minProvince}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">平均价</div>
            <div className="stat-value">{stats.avgPrice}</div>
            <div className="stat-detail">{stats.count} 个省份</div>
          </div>
        </div>
      </section>

      <p id="toast" className="toast"></p>
    </>
  );
}
