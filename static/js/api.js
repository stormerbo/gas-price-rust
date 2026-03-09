// API 调用模块
import { API_BASE } from './constants.js';

/**
 * 获取油价历史记录
 */
export async function fetchHistory(query) {
  const resp = await fetch(`${API_BASE}/history?${query.toString()}`);
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
  const resp = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  
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
  const resp = await fetch(`${API_BASE}/${id}`, {
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
  const resp = await fetch(
    `${API_BASE}/history?province=${encodeURIComponent(province)}&fuelType=${fuelType}&page=0&size=1`
  );
  const data = await resp.json();
  
  if (!resp.ok) {
    throw new Error(data.message || "查询失败");
  }
  
  return data.content[0] || null;
}

/**
 * 获取指定省份所有油品类型的最新油价
 */
export async function fetchLatestPricesByProvince(province, fuelTypes) {
  const promises = fuelTypes.map(fuelType => fetchLatestPrice(province, fuelType));
  return Promise.all(promises);
}
