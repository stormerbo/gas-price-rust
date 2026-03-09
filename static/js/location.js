// 位置定位模块
import { PROVINCES, PROVINCE_EN_TO_CN } from './constants.js';
import { universalFetch } from './tauriFetch.js';

const CACHE_KEY = 'user_province_cache';
const CACHE_EXPIRY_KEY = 'user_province_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

/**
 * 从缓存中获取省份
 */
function getProvinceFromCache() {
  try {
    const cachedProvince = localStorage.getItem(CACHE_KEY);
    const expiryTime = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (cachedProvince && expiryTime) {
      const now = Date.now();
      if (now < parseInt(expiryTime)) {
        console.log('✓ 从缓存获取省份:', cachedProvince);
        return cachedProvince;
      } else {
        console.log('✗ 缓存已过期');
        // 清除过期缓存
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_EXPIRY_KEY);
      }
    }
  } catch (error) {
    console.error('读取缓存失败:', error);
  }
  return null;
}

/**
 * 将省份保存到缓存
 */
function saveProvinceToCache(province) {
  try {
    const expiryTime = Date.now() + CACHE_DURATION;
    localStorage.setItem(CACHE_KEY, province);
    localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
    console.log('✓ 省份已缓存:', province);
  } catch (error) {
    console.error('保存缓存失败:', error);
  }
}

/**
 * 通过IP获取用户所在省份
 */
export async function getProvinceByIP() {
  try {
    // 使用 ip-api.com 替代 ipapi.co，更稳定且免费额度更高
    const response = await universalFetch('http://ip-api.com/json/?lang=zh-CN&fields=status,regionName');
    
    // 检查响应状态
    if (!response.ok) {
      console.warn('⚠️ IP定位API返回错误状态:', response.status);
      if (response.status === 429) {
        console.warn('⚠️ IP定位API速率限制，请稍后再试');
      }
      return null;
    }
    
    const data = await response.json();
    
    console.log('IP定位API返回数据:', data);
    
    // ip-api.com 返回格式: {status: "success", regionName: "Beijing"}
    if (data.status !== 'success' || !data.regionName) {
      return null;
    }
    
    console.log('原始省份名称:', data.regionName);
    
    let detectedProvince = data.regionName;
    
    // 先尝试英文到中文的映射
    if (PROVINCE_EN_TO_CN[detectedProvince]) {
      detectedProvince = PROVINCE_EN_TO_CN[detectedProvince];
      console.log('英文转中文后:', detectedProvince);
    } else {
      // 如果不是英文，尝试处理中文省份名称
      detectedProvince = detectedProvince
        .replace(/省$/, '')
        .replace(/市$/, '')
        .replace(/自治区$/, '')
        .replace(/特别行政区$/, '')
        .replace(/壮族|回族|维吾尔|藏族|蒙古/g, '');
      console.log('中文处理后:', detectedProvince);
    }
    
    // 检查是否在省份列表中
    if (PROVINCES.includes(detectedProvince)) {
      console.log('✓ 成功定位到省份:', detectedProvince);
      return detectedProvince;
    }
    
    console.log('✗ 省份不在列表中');
    return null;
  } catch (error) {
    console.error('IP定位失败:', error);
    return null;
  }
}

/**
 * 获取用户所在省份（带默认值和缓存）
 */
export async function getUserProvince(defaultProvince = '北京') {
  // 先尝试从缓存获取
  const cachedProvince = getProvinceFromCache();
  if (cachedProvince) {
    return cachedProvince;
  }
  
  // 缓存不存在或已过期，调用API
  console.log('缓存未命中，调用IP定位API...');
  const province = await getProvinceByIP();
  
  // 只有成功获取到省份时才缓存，失败时不缓存默认值
  if (province) {
    saveProvinceToCache(province);
    console.log('最终使用的省份:', province);
    return province;
  } else {
    console.log('IP定位失败，使用默认省份（不缓存）:', defaultProvince);
    return defaultProvince;
  }
}

/**
 * 清除省份缓存（用于测试或手动刷新）
 */
export function clearProvinceCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
  console.log('✓ 省份缓存已清除');
}

/**
 * 手动刷新省份（清除缓存并重新获取）
 */
export async function refreshProvince(defaultProvince = '北京') {
  clearProvinceCache();
  return await getUserProvince(defaultProvince);
}
