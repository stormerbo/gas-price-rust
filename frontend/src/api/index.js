import { getApiBase } from './base.js';

export async function fetchHistory(query) {
  const base = await getApiBase();
  const resp = await fetch(`${base}/history?${query.toString()}`);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.message || '查询失败');
  }

  return data;
}

export async function triggerCrawl() {
  const base = await getApiBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  try {
    const resp = await fetch(`${base}/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.message || '爬取失败');
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProvinceHistory(province, startDate, endDate) {
  const query = new URLSearchParams({
    province,
    startDate,
    endDate,
    page: '0',
    size: '200',
  });
  return fetchHistory(query);
}

export async function fetchHolidays(year) {
  const base = await getApiBase();
  const url = `${base.replace('/gas-prices', '')}/holidays${year ? `?year=${year}` : ''}`;
  const resp = await fetch(url);
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || '获取节假日失败');
  }
  
  return data;
}

export async function syncHolidays() {
  const base = await getApiBase();
  const url = `${base.replace('/gas-prices', '')}/holidays/sync`;
  const resp = await fetch(url, { method: 'POST' });
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || '同步节假日失败');
  }
  
  return data;
}

export async function fetchAdjustmentDates(year) {
  const base = await getApiBase();
  const url = `${base.replace('/gas-prices', '')}/holidays/adjustment-dates?year=${year}`;
  const resp = await fetch(url);
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || '获取调价日期失败');
  }
  
  return data;
}

export async function fetchAdjustmentSettings() {
  const base = await getApiBase();
  const url = `${base.replace('/gas-prices', '')}/holidays/settings`;
  const resp = await fetch(url);
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || '获取配置失败');
  }
  
  return data;
}

export async function updateAdjustmentSettings(settings) {
  const base = await getApiBase();
  const url = `${base.replace('/gas-prices', '')}/holidays/settings`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || '更新配置失败');
  }
  
  return data;
}
