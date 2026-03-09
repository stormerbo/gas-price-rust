import React, { useState, useEffect } from 'react';
import { Card, Select, Spin, message, Statistic, Row, Col } from 'antd';
import { gasPriceAPI } from '../services/api';

const FUEL_TYPES = [
  { label: '92号汽油', value: 'GASOLINE_92' },
  { label: '95号汽油', value: 'GASOLINE_95' },
  { label: '98号汽油', value: 'GASOLINE_98' },
  { label: '0号柴油', value: 'DIESEL_0' },
];

const FUEL_TYPE_MAP = {
  GASOLINE_92: '92号汽油',
  GASOLINE_95: '95号汽油',
  GASOLINE_98: '98号汽油',
  DIESEL_0: '0号柴油',
};

export default function MapPage() {
  const [loading, setLoading] = useState(false);
  const [fuelType, setFuelType] = useState('GASOLINE_92');
  const [priceData, setPriceData] = useState([]);
  const [stats, setStats] = useState({ max: 0, min: 0, avg: 0 });

  const fetchPriceData = async (type) => {
    setLoading(true);
    try {
      const response = await gasPriceAPI.getHistory({
        fuelType: type,
        page: 0,
        size: 100,
      });
      
      const data = response.data.content;
      setPriceData(data);

      if (data.length > 0) {
        const prices = data.map(d => d.pricePerLiter);
        setStats({
          max: Math.max(...prices),
          min: Math.min(...prices),
          avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        });
      }
    } catch (error) {
      message.error('加载数据失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceData(fuelType);
  }, [fuelType]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Card
        title="全国油价分析"
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
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="最高价"
                  value={stats.max}
                  precision={3}
                  prefix="¥"
                  suffix="元/升"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="最低价"
                  value={stats.min}
                  precision={3}
                  prefix="¥"
                  suffix="元/升"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="平均价"
                  value={stats.avg}
                  precision={3}
                  prefix="¥"
                  suffix="元/升"
                />
              </Card>
            </Col>
          </Row>

          <Card title={`${FUEL_TYPE_MAP[fuelType]}各省份价格`}>
            <Row gutter={[16, 16]}>
              {priceData.map(item => (
                <Col key={item.id} xs={12} sm={8} md={6} lg={4}>
                  <Card size="small">
                    <Statistic
                      title={item.province}
                      value={item.pricePerLiter}
                      precision={3}
                      prefix="¥"
                      valueStyle={{ fontSize: 16 }}
                    />
                    <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                      {item.effectiveDate}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Spin>
      </Card>
    </div>
  );
}
