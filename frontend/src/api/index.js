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

export async function deleteRecord(id) {
  const base = await getApiBase();
  const resp = await fetch(`${base}/${id}`, { method: 'DELETE' });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || '删除失败');
  }

  return true;
}

export async function updateRecord(id, payload) {
  const base = await getApiBase();
  const resp = await fetch(`${base}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.message || '调价失败');
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
