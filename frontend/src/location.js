import { PROVINCES, PROVINCE_EN_TO_CN } from './constants.js';

const CACHE_KEY = 'user_province_cache';
const CACHE_EXPIRY_KEY = 'user_province_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

function getProvinceFromCache() {
  try {
    const cachedProvince = localStorage.getItem(CACHE_KEY);
    const expiryTime = localStorage.getItem(CACHE_EXPIRY_KEY);

    if (cachedProvince && expiryTime) {
      const now = Date.now();
      if (now < Number(expiryTime)) {
        return cachedProvince;
      }

      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
    }
  } catch (_) {
    // ignore cache errors
  }
  return null;
}

function saveProvinceToCache(province) {
  try {
    const expiryTime = Date.now() + CACHE_DURATION;
    localStorage.setItem(CACHE_KEY, province);
    localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
  } catch (_) {
    // ignore cache errors
  }
}

export function clearProvinceCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
}

export async function getProvinceByIP() {
  try {
    const response = await fetch('http://ip-api.com/json/?lang=zh-CN&fields=status,regionName');
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'success' || !data.regionName) {
      return null;
    }

    let detectedProvince = data.regionName;
    if (PROVINCE_EN_TO_CN[detectedProvince]) {
      detectedProvince = PROVINCE_EN_TO_CN[detectedProvince];
    } else {
      detectedProvince = detectedProvince
        .replace(/省$/, '')
        .replace(/市$/, '')
        .replace(/自治区$/, '')
        .replace(/特别行政区$/, '')
        .replace(/壮族|回族|维吾尔|藏族|蒙古/g, '');
    }

    if (PROVINCES.includes(detectedProvince)) {
      return detectedProvince;
    }

    return null;
  } catch (_) {
    return null;
  }
}

export async function getUserProvince(defaultProvince = '北京') {
  const cachedProvince = getProvinceFromCache();
  if (cachedProvince) return cachedProvince;

  const province = await getProvinceByIP();
  if (province) {
    saveProvinceToCache(province);
    return province;
  }

  return defaultProvince;
}

export async function refreshProvince(defaultProvince = '北京') {
  clearProvinceCache();
  return getUserProvince(defaultProvince);
}
