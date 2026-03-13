import React, { useState, useEffect } from 'react';
import { Typography, Button, Spin, Empty, List, Tag, Input, Space } from 'antd';
import { EnvironmentOutlined, AimOutlined } from '@ant-design/icons';
import LocalPrices from '../components/LocalPrices.jsx';
import { showToast } from '../utils.js';

const { Title } = Typography;
const { Search } = Input;

const API_BASE = import.meta.env.DEV ? 'http://localhost:8080' : '';

function wgs84ToGcj02(lng, lat) {
  const PI = 3.1415926535897932384626;
  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
    return { lng, lat };
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  const magic = Math.sin(radLat);
  const sqrtMagic = Math.sqrt(1 - ee * magic * magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (sqrtMagic * sqrtMagic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);

  return { lng: lng + dLng, lat: lat + dLat };
}

async function getGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[GPS] 浏览器不支持地理定位');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const wgs84 = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const gcj02 = wgs84ToGcj02(wgs84.lng, wgs84.lat);
        const loc = {
          lat: gcj02.lat,
          lng: gcj02.lng,
          accuracy: position.coords.accuracy
        };
        console.log('✅ [GPS] 原始坐标(WGS84):', wgs84);
        console.log('✅ [GPS] 转换后(GCJ02):', gcj02);
        resolve(loc);
      },
      (error) => {
        const errorMessages = {
          1: '用户拒绝了位置权限',
          2: 'GPS信号不可用',
          3: 'GPS定位超时'
        };
        console.warn('❌ [GPS] 定位失败:', errorMessages[error.code] || error.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

async function getLocationByIP() {
  try {
    console.log('🌐 [IP] 尝试IP定位...');
    const response = await fetch('http://ip-api.com/json/?fields=status,city,lat,lon');
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === 'success') {
      const wgs84 = { lat: data.lat, lng: data.lon };
      const gcj02 = wgs84ToGcj02(wgs84.lng, wgs84.lat);
      console.log('✅ [IP] 原始坐标(WGS84):', wgs84);
      console.log('✅ [IP] 转换后(GCJ02):', gcj02);
      return { lat: gcj02.lat, lng: gcj02.lng, city: data.city };
    }
    return null;
  } catch {
    return null;
  }
}

async function reverseGeocode(lng, lat) {
  try {
    const response = await fetch(`${API_BASE}/api/v1/gas-prices/amap/reverse-geocode?location=${lng},${lat}`);
    if (!response.ok) return null;
    const data = await response.json();
    console.log('🗺️ [高德] 逆地理编码结果:', data);
    return data;
  } catch (error) {
    console.warn('❌ [高德] 逆地理编码失败:', error);
    return null;
  }
}

export default function StationsPage() {
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [cityName, setCityName] = useState('');
  const [detailedAddress, setDetailedAddress] = useState(null);
  const [locationSource, setLocationSource] = useState(null);

  useEffect(() => {
    autoDetectLocation();
  }, []);

  const autoDetectLocation = async () => {
    setLoading(true);
    setLocationError(null);
    setDetailedAddress(null);
    setLocationSource(null);
    
    console.log('🔍 [定位] 开始自动定位...');
    
    let loc = await getGPSLocation();
    let source = 'GPS';
    
    if (!loc) {
      loc = await getLocationByIP();
      source = 'IP';
    }
    
    if (loc) {
      setLocation({ lat: loc.lat, lng: loc.lng });
      setLocationSource(source);
      
      const geocodeResult = await reverseGeocode(loc.lng, loc.lat);
      if (geocodeResult?.regeocode) {
        const { formatted_address, addressComponent } = geocodeResult.regeocode;
        setDetailedAddress({
          full: formatted_address,
          province: addressComponent.province,
          city: addressComponent.city,
          district: addressComponent.district,
          township: addressComponent.township,
          street: addressComponent.streetNumber?.street,
          number: addressComponent.streetNumber?.number
        });
        setCityName(addressComponent.city?.replace(/市$/, '') || loc.city || '当前位置');
        console.log('📍 [定位] 详细地址:', formatted_address);
      } else {
        setCityName(loc.city || '当前位置');
      }
      
      await searchNearbyStations({ lat: loc.lat, lng: loc.lng });
    } else {
      setLocationError('自动定位失败，请手动搜索城市');
      setLoading(false);
    }
  };

  const searchNearbyStations = async (loc) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/gas-prices/amap/nearby?location=${loc.lng},${loc.lat}&keywords=加油站&radius=5000&limit=20`
      );
      const data = await response.json();

      if (data.status === '1' && data.pois) {
        const formattedStations = data.pois.map((poi) => ({
          id: poi.id,
          name: poi.name,
          address: poi.address,
          distance: poi.distance,
          tel: poi.tel,
          location: poi.location,
          type: poi.type,
        }));
        setStations(formattedStations);
      } else {
        setStations([]);
        if (data.info) {
          showToast(data.info, 'error');
        }
      }
    } catch {
      showToast('搜索加油站失败，请检查后端是否配置了 AMAP_KEY', 'error');
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySearch = async (value) => {
    if (!value.trim()) return;
    
    setLoading(true);
    setLocationError(null);
    setCityName(value);
    
    try {
      const geoResponse = await fetch(
        `${API_BASE}/api/v1/gas-prices/amap/geocode?address=${encodeURIComponent(value)}`
      );
      const geoData = await geoResponse.json();
      
      if (geoData.status === '1' && geoData.geocodes && geoData.geocodes.length > 0) {
        const [lng, lat] = geoData.geocodes[0].location.split(',');
        setLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        await searchNearbyStations({ lat: parseFloat(lat), lng: parseFloat(lng) });
      } else {
        setLocationError(`未找到"${value}"的位置信息`);
        setLoading(false);
      }
    } catch {
      showToast('搜索失败，请检查网络', 'error');
      setLoading(false);
    }
  };

  const openInMap = (station) => {
    const [lng, lat] = station.location.split(',');
    const url = `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(station.name)}`;
    window.open(url, '_blank');
  };

  const formatDistance = (meters) => {
    const m = parseInt(meters, 10);
    if (m >= 1000) {
      return `${(m / 1000).toFixed(1)}公里`;
    }
    return `${m}米`;
  };

  return (
    <>
      <header className="hero card reveal">
        <Title level={1}>加油站推荐</Title>
        <p>查找附近的加油站，规划加油路线。</p>
      </header>

      <LocalPrices />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>{cityName ? `${cityName}附近加油站` : '附近加油站'}</h2>
          <Space>
            <Search
              placeholder="搜索城市，如：深圳"
              onSearch={handleCitySearch}
              style={{ width: 200 }}
              enterButton
            />
            <Button onClick={autoDetectLocation} loading={loading} icon={<AimOutlined />}>
              重新定位
            </Button>
          </Space>
        </div>

        {detailedAddress && (
          <div style={{ 
            padding: '12px 16px', 
            marginBottom: 16, 
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.08), rgba(0, 113, 227, 0.03))', 
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <EnvironmentOutlined style={{ fontSize: 20, color: 'var(--color-brand)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                {detailedAddress.full}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {locationSource === 'GPS' ? (
                  <span style={{ color: '#22c55e' }}>📍 GPS精准定位</span>
                ) : (
                  <span style={{ color: '#f59e0b' }}>🌐 IP定位（精度较低）</span>
                )}
                {location && ` · 坐标: ${location.lng.toFixed(4)}, ${location.lat.toFixed(4)}`}
              </div>
            </div>
          </div>
        )}

        {locationError && (
          <div style={{ 
            padding: 16, 
            marginBottom: 16, 
            background: 'rgba(255, 59, 48, 0.1)', 
            borderRadius: 8,
            color: '#ff3b30'
          }}>
            {locationError}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        )}

        {!loading && !location && !locationError && (
          <Empty
            description="正在自动定位..."
            style={{ padding: 60 }}
          />
        )}

        {!loading && location && stations.length === 0 && (
          <Empty description="附近没有找到加油站" style={{ padding: 60 }} />
        )}

        {!loading && stations.length > 0 && (
          <List
            itemLayout="horizontal"
            dataSource={stations}
            renderItem={(station) => (
              <List.Item
                actions={[
                  <Button type="link" onClick={() => openInMap(station)} key="nav">
                    导航
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{station.name}</span>
                      {station.distance && <Tag color="blue">{formatDistance(station.distance)}</Tag>}
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ color: '#666' }}>{station.address}</div>
                      {station.tel && (
                        <div style={{ color: '#999', fontSize: 12 }}>
                          电话: {station.tel}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}


      </section>

      <p id="toast" className="toast"></p>
    </>
  );
}
