// API 调用模块
import { getApiBase } from './constants.js';

/**
 * 获取油价历史记录
 */
export async function fetchHistory(query) {
  const base = await getApiBase();
  const resp = await fetch(`${base}/history?${query.toString()}`);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.message || "查询失败");
  }

  return data;
}

/**
 * 删除油价记录
 */
export async function deleteRecord(id) {
  const base = await getApiBase();
  const resp = await fetch(`${base}/${id}`, { method: "DELETE" });
  
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || "删除失败");
  }
  
  return true;
}

/**
 * 更新油价记录
 */
export async function updateRecord(id, payload) {
  const base = await getApiBase();
  const resp = await fetch(`${base}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || "调价失败");
  }

  return data;
}

/**
 * 获取指定省份和油品类型的最新油价
 */
export async function fetchLatestPrice(province, fuelType) {
  const base = await getApiBase();
  const resp = await fetch(
    `${base}/history?province=${encodeURIComponent(province)}&fuelType=${fuelType}&page=0&size=1`
  );
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || "查询失败");
  }
  
  return data.content[0] || null;
}

/**
 * 触发爬虫爬取最新油价
 */
export async function triggerCrawl() {
  const base = await getApiBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000); // 2分钟超时

  try {
    const resp = await fetch(`${base}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "爬取失败");
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
