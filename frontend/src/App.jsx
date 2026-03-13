import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/Home.jsx';
import MapPage from './pages/Map.jsx';
import ChartPage from './pages/Chart.jsx';
import TrendPage from './pages/Trend.jsx';
import ComparePage from './pages/Compare.jsx';
import CalendarPage from './pages/Calendar.jsx';
import StationsPage from './pages/Stations.jsx';
import SettingsPage from './pages/Settings.jsx';

const NAV_ITEMS = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'map', label: '油价地图', icon: '🗺️' },
  { key: 'chart', label: '油价图表', icon: '📊' },
  { key: 'trend', label: '油价趋势', icon: '📈' },
  { key: 'compare', label: '省份对比', icon: '⚖️' },
  { key: 'calendar', label: '油价日历', icon: '📅' },
  { key: 'stations', label: '加油站', icon: '⛽' },
  { key: 'settings', label: '系统设置', icon: '⚙️' },
];

function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [active, setActive] = useState('home');
  const [theme, setTheme] = useState(getInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleNavClick = (key) => {
    if (key === active) return;
    setIsTransitioning(true);
    setMenuOpen(false);
    
    setTimeout(() => {
      setActive(key);
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  const content = useMemo(() => {
    if (active === 'map') return <MapPage />;
    if (active === 'chart') return <ChartPage />;
    if (active === 'trend') return <TrendPage />;
    if (active === 'compare') return <ComparePage />;
    if (active === 'calendar') return <CalendarPage />;
    if (active === 'stations') return <StationsPage />;
    if (active === 'settings') return <SettingsPage />;
    return <HomePage />;
  }, [active]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: theme === 'dark' ? '#0a84ff' : '#0f62fe',
          borderRadius: 10,
          fontFamily: '"SF Pro Display", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <div className="bg-shape bg-shape-a"></div>
      <div className="bg-shape bg-shape-b"></div>

      <nav className="main-nav">
        <div className="nav-container">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="菜单"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-link ripple ${active === item.key ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>

      <main 
        ref={contentRef}
        className={`layout ${isTransitioning ? 'page-exit-active' : 'page-enter-active'}`}
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(-10px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {content}
      </main>

      <a
        href="#"
        className="scroll-to-top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        title="回到顶部"
      >
        ↑
      </a>
    </ConfigProvider>
  );
}
