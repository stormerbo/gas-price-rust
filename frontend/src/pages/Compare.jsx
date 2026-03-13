import React, { useEffect, useRef, useState } from 'react';
import { Select, Typography, Spin, Empty, Tag } from 'antd';
import * as echarts from 'echarts';
import LocalPrices from '../components/LocalPrices.jsx';
import { PROVINCES, FUEL_TYPES, FUEL_TYPE_NAMES } from '../constants.js';
import { fetchHistory } from '../api/index.js';
import { showToast } from '../utils.js';

const { Title } = Typography;

const COLORS = ['#0071e3', '#ff6b6b', '#51cf66', '#fcc419', '#845ef7', '#20c997'];

async function fetchProvinceData(province, fuelType) {
  const allRecords = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 5) {
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

export default function ComparePage() {
  const [provinces, setProvinces] = useState(['北京', '上海']);
  const [fuelType, setFuelType] = useState('GASOLINE_92');
  const [loading, setLoading] = useState(false);
  const [dataMap, setDataMap] = useState({});
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (provinces.length === 0) {
      setDataMap({});
      return;
    }

    let mounted = true;
    setLoading(true);

    Promise.all(provinces.map((p) => fetchProvinceData(p, fuelType)))
      .then((results) => {
        if (mounted) {
          const map = {};
          provinces.forEach((p, i) => {
            map[p] = results[i];
          });
          setDataMap(map);
        }
      })
      .catch((err) => {
        showToast(err.message || '加载失败', 'error');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [provinces, fuelType]);

  useEffect(() => {
    if (!chartRef.current || Object.keys(dataMap).length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const allDates = new Set();
    Object.values(dataMap).forEach((records) => {
      records.forEach((r) => allDates.add(r.effectiveDate));
    });
    const dates = Array.from(allDates).sort();

    const series = provinces.map((p, idx) => {
      const records = dataMap[p] || [];
      const priceMap = {};
      records.forEach((r) => {
        priceMap[r.effectiveDate] = r.pricePerLiter;
      });

      return {
        name: p,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: dates.map((d) => priceMap[d] ?? null),
        connectNulls: true,
        lineStyle: { width: 2.5, color: COLORS[idx % COLORS.length] },
        itemStyle: { color: COLORS[idx % COLORS.length] },
      };
    });

    const allPrices = Object.values(dataMap).flatMap((r) => r.map((x) => x.pricePerLiter));
    const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
    const maxPrice = allPrices.length ? Math.max(...allPrices) : 10;
    const padding = (maxPrice - minPrice) * 0.15 || 0.5;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        borderWidth: 0,
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        data: provinces,
        top: 10,
        textStyle: { color: '#64748b' },
      },
      grid: {
        left: 60,
        right: 30,
        top: 50,
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
      series,
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [dataMap, provinces]);

  const stats = React.useMemo(() => {
    const latestPrices = provinces.map((p) => {
      const records = dataMap[p] || [];
      if (records.length === 0) return null;
      return { province: p, price: records[records.length - 1].pricePerLiter };
    }).filter(Boolean);

    if (latestPrices.length === 0) return null;

    const prices = latestPrices.map((x) => x.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const maxProvince = latestPrices.find((x) => x.price === max)?.province;
    const minProvince = latestPrices.find((x) => x.price === min)?.province;

    return { max, min, diff: max - min, maxProvince, minProvince };
  }, [dataMap, provinces]);

  return (
    <>
      <header className="hero card reveal">
        <Title level={1}>省份对比</Title>
        <p>选择多个省份，对比同一油品的价格差异。</p>
      </header>

      <LocalPrices />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>价格对比</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Select
              mode="multiple"
              value={provinces}
              onChange={(val) => setProvinces(val.slice(0, 6))}
              showSearch={false}
              style={{ minWidth: 200, maxWidth: 400 }}
              placeholder="选择省份（最多6个）"
              maxTagCount={3}
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

        {stats && (
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">最高价</div>
              <div className="stat-value" style={{ color: '#ef4444' }}>
                ¥{stats.max.toFixed(3)}
              </div>
              <Tag color="red">{stats.maxProvince}</Tag>
            </div>
            <div className="stat-card">
              <div className="stat-label">最低价</div>
              <div className="stat-value" style={{ color: '#22c55e' }}>
                ¥{stats.min.toFixed(3)}
              </div>
              <Tag color="green">{stats.minProvince}</Tag>
            </div>
            <div className="stat-card">
              <div className="stat-label">价格差</div>
              <div className="stat-value">¥{stats.diff.toFixed(3)}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Spin size="large" />
          </div>
        ) : provinces.length === 0 ? (
          <Empty description="请选择省份" style={{ padding: 80 }} />
        ) : Object.keys(dataMap).length === 0 ? (
          <Empty description="暂无数据" style={{ padding: 80 }} />
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: 450 }} />
        )}
      </section>

      <p id="toast" className="toast"></p>
    </>
  );
}
