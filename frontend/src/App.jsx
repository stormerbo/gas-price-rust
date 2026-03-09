import React from 'react';
import { Layout, Menu } from 'antd';
import { HomeOutlined, EnvironmentOutlined, BarChartOutlined } from '@ant-design/icons';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import ChartPage from './pages/ChartPage';

const { Header, Content } = Layout;

function AppContent() {
  const location = useLocation();
  
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">首页</Link> },
    { key: '/map', icon: <EnvironmentOutlined />, label: <Link to="/map">油价地图</Link> },
    { key: '/chart', icon: <BarChartOutlined />, label: <Link to="/chart">油价图表</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 40 }}>
          <span style={{ fontSize: 24, marginRight: 8 }}>⛽</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>中国汽油价格管理</span>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, border: 'none' }}
        />
      </Header>
      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/chart" element={<ChartPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
