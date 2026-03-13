import { PROVINCES, PROVINCE_EN_TO_CN } from './constants.js';

const CACHE_KEY = 'user_province_cache';
const CACHE_EXPIRY_KEY = 'user_province_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const GPS_CACHE_KEY = 'user_gps_location';
const GPS_CACHE_EXPIRY_KEY = 'user_gps_location_expiry';
const GPS_CACHE_DURATION = 30 * 60 * 1000;

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
    console.log('🌐 [IP定位] 调用 ip-api.com...');
    const response = await fetch('http://ip-api.com/json/?lang=zh-CN&fields=status,regionName');
    if (!response.ok) return null;

    const data = await response.json();
    console.log('🌐 [IP定位] API返回:', data);
    
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
  console.log('🔍 [定位] 开始检测用户省份...');
  
  const cachedProvince = getProvinceFromCache();
  if (cachedProvince) {
    console.log('✅ [定位] 使用缓存省份:', cachedProvince);
    return cachedProvince;
  }

  console.log('📡 [定位] 尝试GPS定位...');
  const gpsLocation = await getGPSLocation();
  if (gpsLocation) {
    console.log('✅ [GPS] 定位成功!', {
      经度: gpsLocation.lng,
      纬度: gpsLocation.lat,
      精度: `${Math.round(gpsLocation.accuracy)}米`
    });
    
    console.log('🗺️  [定位] 调用高德逆地理编码API...');
    const geocodeResult = await reverseGeocode(gpsLocation.lng, gpsLocation.lat);
    if (geocodeResult?.regeocode?.addressComponent?.province) {
      let province = geocodeResult.regeocode.addressComponent.province;
      console.log('📍 [高德API] 返回省份:', province);
      
      province = province
        .replace(/省$/, '')
        .replace(/市$/, '')
        .replace(/自治区$/, '')
        .replace(/特别行政区$/, '')
        .replace(/壮族|回族|维吾尔|藏族|蒙古/g, '');
      
      if (PROVINCES.includes(province)) {
        console.log('✅ [定位] 最终省份 (GPS):', province);
        saveProvinceToCache(province);
        return province;
      }
    }
    console.warn('⚠️ [定位] GPS定位成功但省份解析失败，尝试IP定位...');
  } else {
    console.warn('❌ [GPS] 定位失败，降级到IP定位...');
  }

  console.log('🌐 [定位] 使用IP地址定位...');
  const province = await getProvinceByIP();
  if (province) {
    console.log('✅ [定位] 最终省份 (IP):', province);
    saveProvinceToCache(province);
    return province;
  }

  console.warn('⚠️ [定位] 所有定位方式失败，使用默认省份:', defaultProvince);
  return defaultProvince;
}

export async function refreshProvince(defaultProvince = '北京') {
  clearProvinceCache();
  return getUserProvince(defaultProvince);
}

export async function getGPSLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const cachedLocation = localStorage.getItem(GPS_CACHE_KEY);
    const expiryTime = localStorage.getItem(GPS_CACHE_EXPIRY_KEY);
    
    if (cachedLocation && expiryTime && Date.now() < Number(expiryTime)) {
      try {
        resolve(JSON.parse(cachedLocation));
        return;
      } catch {
        localStorage.removeItem(GPS_CACHE_KEY);
        localStorage.removeItem(GPS_CACHE_EXPIRY_KEY);
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        console.log('📡 [GPS] 浏览器返回坐标:', {
          纬度: location.lat,
          经度: location.lng,
          精度: `${Math.round(location.accuracy)}米`,
          时间: new Date().toLocaleTimeString()
        });
        
        try {
          localStorage.setItem(GPS_CACHE_KEY, JSON.stringify(location));
          localStorage.setItem(GPS_CACHE_EXPIRY_KEY, (Date.now() + GPS_CACHE_DURATION).toString());
        } catch {}
        
        resolve(location);
      },
      (error) => {
        const errorMessages = {
          1: '用户拒绝了位置权限',
          2: 'GPS信号不可用（可能在室内）',
          3: 'GPS定位超时（10秒）'
        };
        console.warn(`❌ [GPS] 定位失败 (错误码${error.code}):`, errorMessages[error.code] || error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: GPS_CACHE_DURATION
      }
    );
  });
}

export async function reverseGeocode(lng, lat) {
  try {
    const response = await fetch(
      `/api/v1/gas-prices/amap/reverse-geocode?location=${lng},${lat}`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('逆地理编码失败:', error);
    return null;
  }
}
