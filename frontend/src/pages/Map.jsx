import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Typography } from 'antd';
import LocalPrices from '../components/LocalPrices.jsx';
import { FUEL_TYPE_NAMES, FUEL_TYPES, PROVINCES } from '../constants.js';
import { fetchHistory } from '../api/index.js';
import { showToast } from '../utils.js';

const { Title } = Typography;

const provinceNameMapping = {
  北京: '北京',
  北京市: '北京',
  天津: '天津',
  天津市: '天津',
  上海: '上海',
  上海市: '上海',
  重庆: '重庆',
  重庆市: '重庆',
  河北: '河北',
  河北省: '河北',
  山西: '山西',
  山西省: '山西',
  辽宁: '辽宁',
  辽宁省: '辽宁',
  吉林: '吉林',
  吉林省: '吉林',
  黑龙江: '黑龙江',
  黑龙江省: '黑龙江',
  江苏: '江苏',
  江苏省: '江苏',
  浙江: '浙江',
  浙江省: '浙江',
  安徽: '安徽',
  安徽省: '安徽',
  福建: '福建',
  福建省: '福建',
  江西: '江西',
  江西省: '江西',
  山东: '山东',
  山东省: '山东',
  河南: '河南',
  河南省: '河南',
  湖北: '湖北',
  湖北省: '湖北',
  湖南: '湖南',
  湖南省: '湖南',
  广东: '广东',
  广东省: '广东',
  海南: '海南',
  海南省: '海南',
  四川: '四川',
  四川省: '四川',
  贵州: '贵州',
  贵州省: '贵州',
  云南: '云南',
  云南省: '云南',
  陕西: '陕西',
  陕西省: '陕西',
  甘肃: '甘肃',
  甘肃省: '甘肃',
  青海: '青海',
  青海省: '青海',
  内蒙古: '内蒙古',
  内蒙古自治区: '内蒙古',
  广西: '广西',
  广西壮族自治区: '广西',
  西藏: '西藏',
  西藏自治区: '西藏',
  宁夏: '宁夏',
  宁夏回族自治区: '宁夏',
  新疆: '新疆',
  新疆维吾尔自治区: '新疆',
  台湾: null,
  台湾省: null,
  香港: null,
  香港特别行政区: null,
  澳门: null,
  澳门特别行政区: null,
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadProvincePrices() {
  const today = new Date();
  const endDate = formatDate(today);
  const startDate = formatDate(
    new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
  );

  const result = {};

  await Promise.all(
    PROVINCES.map(async (province) => {
      const query = new URLSearchParams({
        province,
        startDate,
        endDate,
        page: '0',
        size: '200',
      });
      try {
        const data = await fetchHistory(query);
        const latestMap = new Map();
        const sorted = [...(data.content || [])].sort(
          (a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)
        );
        sorted.forEach((record) => {
          if (!latestMap.has(record.fuelType)) {
            latestMap.set(record.fuelType, record);
          }
        });
        result[province] = latestMap;
      } catch (_) {
        result[province] = new Map();
      }
    })
  );

  return result;
}

export default function MapPage() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [provincePrices, setProvincePrices] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadProvincePrices();
        if (mounted) setProvincePrices(data);
      } catch (err) {
        showToast(err.message || '加载地图数据失败', 'error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const mapData = useMemo(() => {
    return Object.entries(provincePrices).map(([province, map]) => {
      const record = map.get('GASOLINE_92');
      return {
        name: province,
        value: record ? record.pricePerLiter : null,
      };
    });
  }, [provincePrices]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const setup = async () => {
      const response = await fetch(
        'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
      );
      const geoJson = await response.json();
      echarts.registerMap('china', geoJson);

      chart.setOption({
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const dbName = provinceNameMapping[params.name];
            if (!dbName) return `<strong>${params.name}</strong><br/>暂无油价数据`;
            const map = provincePrices[dbName];
            if (!map || map.size === 0) {
              return `<strong>${params.name}</strong><br/>暂无油价数据`;
            }
            const lines = FUEL_TYPES.map((fuel) => {
              const record = map.get(fuel);
              const price = record ? record.pricePerLiter.toFixed(3) : '-';
              return `${FUEL_TYPE_NAMES[fuel]}: ${price}`;
            });
            return `<strong>${params.name}</strong><br/>${lines.join('<br/>')}`;
          },
        },
        visualMap: {
          min: 6,
          max: 10,
          left: 'left',
          top: 'bottom',
          text: ['高', '低'],
          inRange: {
            color: ['#dbeafe', '#2563eb'],
          },
        },
        series: [
          {
            name: '92号汽油',
            type: 'map',
            map: 'china',
            data: mapData,
            emphasis: { label: { show: false } },
          },
        ],
      });
    };

    setup();

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [mapData, provincePrices]);

  return (
    <>
      <header className="hero card reveal">
        <Title level={1}>中国油价地图</Title>
        <p>点击地图上的省份查看该地区的油价信息</p>
      </header>

      <LocalPrices />

      <div className="map-container card reveal delay-2">
        <div className="map-wrapper">
          <div id="china-map" ref={chartRef} style={{ width: '100%', height: 700 }}></div>
        </div>
        <div className="map-legend">
          <h3>使用说明</h3>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-icon">🖱️</span>
              <span>点击省份查看油价</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">🔍</span>
              <span>鼠标悬停查看省名</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon">📊</span>
              <span>颜色深浅表示价格高低</span>
            </div>
          </div>
        </div>
      </div>

      <p id="toast" className="toast"></p>
    </>
  );
}
