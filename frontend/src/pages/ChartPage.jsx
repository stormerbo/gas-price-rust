import React, { useState, useEffect } from 'react';
import { Card, Select, Spin, message, Empty } from 'antd';
import { Column } from '@ant-design/plots';
import { gasPriceAPI } from '../services/api';

const FUEL_TYPES = [
  { label: '92号汽油', value: 'GASOLINE_92' },
  { label: '95号汽油', value: 'GASOLINE_95' },
  { label: '98号汽油', value: 'GASOLINE_98' },
  { label: '0号柴油', value: 'DIESEL_0' },
];

const FUEL_TYPE_MAP = {
  GASOLINE_92: '92号',
  GASOLINE_95: '95号',
  GASOLINE_98: '98号',
  DIESEL_0: '0号',
};

export default function ChartPage() {
  const [loading, setLoading] = useState(false);
  const [fuelType, setFuelType] = useState('GASOLINE_92');
  const [chartData, setChartData] = useState([]);

  const fetchChartData = async (type) => {
    setLoading(true);
    try {
      const response = await gasPriceAPI.getHistory({
        fuelType: type,
        page: 0,
        size: 50,
      });
      
      const data = response.data.content.map(item => ({
        province: item.province,
        price: item.pricePerLiter,
      }));
      
      setChartData(data);
    } catch (error) {
      message.error('加载数据失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData(fuelType);
  }, [fuelType]);

  const config = {
    data: chartData,
    xField: 'province',
    yField: 'price',
    label: {
      position: 'top',
      style: {
        fill: '#000000',
        opacity: 0.6,
      },
      formatter: (v) => `¥${v.price.toFixed(2)}`,
    },
    xAxis: {
      label: {
        autoRotate: true,
      },
    },
    meta: {
      province: {
        alias: '省份',
      },
      price: {
        alias: '价格(元/升)',
      },
    },
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Card
        title="油价直方图"
        extra={
          <Select
            value={fuelType}
            onChange={setFuelType}
            style={{ width: 150 }}
          >
            {FUEL_TYPES.map(f => (
              <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>
            ))}
          </Select>
        }
      >
        <Spin spinning={loading}>
          {chartData.length > 0 ? (
            <Column {...config} height={500} />
          ) : (
            <Empty description="暂无数据" />
          )}
        </Spin>
      </Card>
    </div>
  );
}
