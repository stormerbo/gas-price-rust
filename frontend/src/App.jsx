import React, { useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import HomePage from './pages/Home.jsx';
import MapPage from './pages/Map.jsx';
import ChartPage from './pages/Chart.jsx';

const NAV_ITEMS = [
  { key: 'home', label: '首页' },
  { key: 'map', label: '油价地图' },
  { key: 'chart', label: '油价图表' },
];

export default function App() {
  const [active, setActive] = useState('home');

  const content = useMemo(() => {
    if (active === 'map') return <MapPage />;
    if (active === 'chart') return <ChartPage />;
    return <HomePage />;
  }, [active]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0f62fe',
          borderRadius: 10,
          fontFamily: '"SF Pro Display", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <div className="bg-shape bg-shape-a"></div>
      <div className="bg-shape bg-shape-b"></div>

      <nav className="main-nav">
        <div className="nav-container">
          <div className="nav-links">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-link ${active === item.key ? 'active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="layout">{content}</main>
    </ConfigProvider>
  );
}
