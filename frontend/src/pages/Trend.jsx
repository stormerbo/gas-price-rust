import React, { useEffect, useRef, useState } from 'react';
import { Select, Typography, Spin, Empty } from 'antd';
import * as echarts from 'echarts';
import LocalPrices from '../components/LocalPrices.jsx';
import { PROVINCES, FUEL_TYPES, FUEL_TYPE_NAMES } from '../constants.js';
import { fetchHistory } from '../api/index.js';
import { showToast } from '../utils.js';

const { Title } = Typography;

async function fetchPriceHistory(province, fuelType) {
  const allRecords = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 10) {
    const query = new URLSearchParams({
      province,
      fuelType,
      page: String(page),
      size: '200',
    });
    const data = await fetchHistory(query);
    allRecords.push(...(data.content || []));
    totalPages = data.totalPages;
    page += 1;
  }

  return allRecords.sort((a, b) => 
    new Date(a.effectiveDate) - new Date(b.effectiveDate)
  );
}

export default function TrendPage() {
  const [province, setProvince] = useState('北京');
  const [fuelType, setFuelType] = useState('GASOLINE_92');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchPriceHistory(province, fuelType)
      .then((data) => {
        if (mounted) {
          setRecords(data);
        }
      })
      .catch((err) => {
        showToast(err.message || '加载失败', 'error');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [province, fuelType]);

  useEffect(() => {
    if (!chartRef.current || records.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const dates = records.map((r) => r.effectiveDate);
    const prices = records.map((r) => r.pricePerLiter);
    const changes = records.map((r) => r.priceChange || 0);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.2 || 0.5;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        borderWidth: 0,
        textStyle: { color: '#f8fafc', fontSize: 13 },
        formatter: (params) => {
          const point = params[0];
          const idx = point.dataIndex;
          const change = changes[idx];
          const changeText = change > 0 
            ? `<span style="color:#ef4444">↑ +${change.toFixed(3)}</span>`
            : change < 0
            ? `<span style="color:#22c55e">↓ ${change.toFixed(3)}</span>`
            : '<span style="color:#9ca3af">持平</span>';
          return `
            <div style="font-weight:600;margin-bottom:6px">${point.name}</div>
            <div>${FUEL_TYPE_NAMES[fuelType]}: ¥${point.value.toFixed(3)}</div>
            <div>涨跌: ${changeText}</div>
          `;
        },
      },
      grid: {
        left: 60,
        right: 30,
        top: 40,
        bottom: 50,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#64748b', fontSize: 11, rotate: 45 },
      },
      yAxis: {
        type: 'value',
        min: Math.floor((minPrice - padding) * 100) / 100,
        max: Math.ceil((maxPrice + padding) * 100) / 100,
        axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '¥{value}' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      },
      series: [
        {
          name: FUEL_TYPE_NAMES[fuelType],
          type: 'line',
          data: prices,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            color: '#0071e3',
            width: 3,
          },
          itemStyle: {
            color: (params) => {
              const change = changes[params.dataIndex];
              if (change > 0) return '#ef4444';
              if (change < 0) return '#22c55e';
              return '#0071e3';
            },
            borderWidth: 2,
            borderColor: '#fff',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 113, 227, 0.25)' },
              { offset: 1, color: 'rgba(0, 113, 227, 0.02)' },
            ]),
          },
          markPoint: {
            data: [
              { type: 'max', name: '最高' },
              { type: 'min', name: '最低' },
            ],
            symbol: 'pin',
            symbolSize: 50,
            label: { fontSize: 11, formatter: '¥{c}' },
          },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [records, fuelType]);

  return (
    <>
      <header className="hero card reveal">
        <Title level={1}>油价趋势</Title>
        <p>查看单个省份的历史油价走势变化。</p>
      </header>

      <LocalPrices />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>价格走势</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <Select
              value={province}
              onChange={setProvince}
              showSearch={false}
              style={{ width: 140 }}
              options={PROVINCES.map((p) => ({ value: p, label: p }))}
            />
            <Select
              value={fuelType}
              onChange={setFuelType}
              showSearch={false}
              style={{ width: 140 }}
              options={FUEL_TYPES.map((f) => ({ value: f, label: FUEL_TYPE_NAMES[f] }))}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spin size="large" />
          </div>
        ) : records.length === 0 ? (
          <Empty description="暂无数据" style={{ padding: 80 }} />
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: 450 }} />
        )}
      </section>

      <p id="toast" className="toast"></p>
    </>
  );
}
