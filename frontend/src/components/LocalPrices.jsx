import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FUEL_TYPE_NAMES, FUEL_TYPES } from '../constants.js';
import { fetchHistory } from '../api/index.js';
import { getUserProvince, refreshProvince } from '../location.js';
import { showToast } from '../utils.js';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLatestRecords(records) {
  const latestMap = new Map();
  const sorted = [...records].sort(
    (a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)
  );

  sorted.forEach((record) => {
    if (!latestMap.has(record.fuelType)) {
      latestMap.set(record.fuelType, record);
    }
  });

  return latestMap;
}

function getLatestEffectiveDate(records) {
  if (!records.length) return null;
  const sorted = [...records].sort(
    (a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)
  );
  return sorted[0].effectiveDate;
}

export default function LocalPrices({
  clickable = false,
  activeType,
  onCardClick,
}) {
  const [province, setProvince] = useState('北京');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [updateTime, setUpdateTime] = useState('加载中...');

  const latestMap = useMemo(() => getLatestRecords(records), [records]);

  const loadPrices = useCallback(
    async (targetProvince) => {
      setLoading(true);
      try {
        const today = new Date();
        const endDate = formatDate(today);
        const startDate = formatDate(
          new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        );

        const query = new URLSearchParams({
          province: targetProvince,
          startDate,
          endDate,
          page: '0',
          size: '200',
        });

        const data = await fetchHistory(query);
        const content = data.content || [];
        setRecords(content);
        const latestDate = getLatestEffectiveDate(content);
        setUpdateTime(latestDate || '-');
      } catch (err) {
        showToast(err.message || '查询失败', 'error');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const detected = await getUserProvince('北京');
      if (!mounted) return;
      setProvince(detected);
      await loadPrices(detected);
    })();

    return () => {
      mounted = false;
    };
  }, [loadPrices]);

  const handleRefresh = async () => {
    const detected = await refreshProvince('北京');
    setProvince(detected);
    await loadPrices(detected);
  };

  return (
    <section className="card reveal delay-1" style={{ display: 'block' }}>
      <div className="local-prices-header">
        <h2 id="local-province-name">{province}油价</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span id="local-update-time" className="update-time">
            {loading ? '加载中...' : `生效日期: ${updateTime}`}
          </span>
          <button
            id="refresh-location-btn"
            className="btn location-btn"
            title="重新定位"
            onClick={handleRefresh}
          >
            📍
          </button>
        </div>
      </div>
      <div className="local-prices-grid">
        {FUEL_TYPES.map((fuelType) => {
          const record = latestMap.get(fuelType);
          const price = record ? `¥${Number(record.pricePerLiter).toFixed(3)}` : '-';
          const change = record ? record.priceChange || 0 : 0;
          const changeClass = change > 0 ? 'up' : change < 0 ? 'down' : '';
          const changeText =
            change > 0
              ? `+${change.toFixed(3)}`
              : change < 0
              ? change.toFixed(3)
              : '';
          const isActive = activeType === fuelType ? 'active' : '';
          const clickableClass = clickable ? 'clickable' : '';

          return (
            <div
              key={fuelType}
              className={`price-card ${clickableClass} ${isActive}`}
              data-fuel={fuelType}
              style={clickable ? { cursor: 'pointer' } : undefined}
              onClick={() => clickable && onCardClick && onCardClick(fuelType)}
            >
              <div className="price-card-label">{FUEL_TYPE_NAMES[fuelType]}</div>
              <div className="price-card-value">{price}</div>
              <div className="price-card-unit">元/升</div>
              {changeText ? (
                <div className={`price-card-change ${changeClass}`}>
                  {changeText}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
