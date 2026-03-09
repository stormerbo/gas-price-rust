// 省份缓存模块 - 避免重复调用IP定位API

const CACHE_KEY = 'user_province_cache';
const CACHE_EXPIRY_KEY = 'user_province_cache_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 省份英文到中文的映射
const PROVINCE_EN_TO_CN = {
  "Beijing": "北京",
  "Tianjin": "天津",
  "Shanghai": "上海",
  "Chongqing": "重庆",
  "Hebei": "河北",
  "Shanxi": "山西",
  "Liaoning": "辽宁",
  "Jilin": "吉林",
  "Heilongjiang": "黑龙江",
  "Jiangsu": "江苏",
  "Zhejiang": "浙江",
  "Anhui": "安徽",
  "Fujian": "福建",
  "Jiangxi": "江西",
  "Shandong": "山东",
  "Henan": "河南",
  "Hubei": "湖北",
  "Hunan": "湖南",
  "Guangdong": "广东",
  "Hainan": "海南",
  "Sichuan": "四川",
  "Guizhou": "贵州",
  "Yunnan": "云南",
  "Shaanxi": "陕西",
  "Gansu": "甘肃",
  "Qinghai": "青海",
  "Inner Mongolia": "内蒙古",
  "Guangxi": "广西",
  "Tibet": "西藏",
  "Ningxia": "宁夏",
  "Xinjiang": "新疆"
};

const PROVINCES = [
  "北京", "天津", "上海", "重庆",
  "河北", "山西", "辽宁", "吉林", "黑龙江",
  "江苏", "浙江", "安徽", "福建", "江西", "山东",
  "河南", "湖北", "湖南", "广东", "海南",
  "四川", "贵州", "云南", "陕西", "甘肃", "青海",
  "内蒙古", "广西", "西藏", "宁夏", "新疆"
];

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
async function getProvinceByIP() {
  try {
    // 使用 ip-api.com 替代 ipapi.co，更稳定且免费额度更高
    const response = await fetch('http://ip-api.com/json/?lang=zh-CN&fields=status,regionName');
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
 * 获取用户所在省份（带缓存）
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
  const result = province || defaultProvince;
  
  // 保存到缓存
  saveProvinceToCache(result);
  
  console.log('最终使用的省份:', result);
  return result;
}

/**
 * 清除省份缓存（用于测试或手动刷新）
 */
export function clearProvinceCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
  console.log('✓ 省份缓存已清除');
}
