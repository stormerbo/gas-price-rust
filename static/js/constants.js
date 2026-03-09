// 常量定义

// 检测环境并设置正确的 API 基础 URL
const isTauri = window.__TAURI__ !== undefined;
export const API_BASE = isTauri 
  ? "http://127.0.0.1:8080/api/v1/gas-prices"  // Tauri 环境使用完整 URL
  : "/api/v1/gas-prices";  // 浏览器环境使用相对路径

console.log('🔧 API_BASE:', API_BASE, '环境:', isTauri ? 'Tauri' : '浏览器');

export const PROVINCES = [
  "北京",
  "天津",
  "上海",
  "重庆",
  "河北",
  "山西",
  "辽宁",
  "吉林",
  "黑龙江",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "海南",
  "四川",
  "贵州",
  "云南",
  "陕西",
  "甘肃",
  "青海",
  "内蒙古",
  "广西",
  "西藏",
  "宁夏",
  "新疆",
];

// 英文省份名称到中文的映射
export const PROVINCE_EN_TO_CN = {
  'Beijing': '北京',
  'Tianjin': '天津',
  'Shanghai': '上海',
  'Chongqing': '重庆',
  'Hebei': '河北',
  'Shanxi': '山西',
  'Liaoning': '辽宁',
  'Jilin': '吉林',
  'Heilongjiang': '黑龙江',
  'Jiangsu': '江苏',
  'Zhejiang': '浙江',
  'Anhui': '安徽',
  'Fujian': '福建',
  'Jiangxi': '江西',
  'Shandong': '山东',
  'Henan': '河南',
  'Hubei': '湖北',
  'Hunan': '湖南',
  'Guangdong': '广东',
  'Hainan': '海南',
  'Sichuan': '四川',
  'Guizhou': '贵州',
  'Yunnan': '云南',
  'Shaanxi': '陕西',
  'Gansu': '甘肃',
  'Qinghai': '青海',
  'Inner Mongolia': '内蒙古',
  'Nei Mongol': '内蒙古',
  'Guangxi': '广西',
  'Tibet': '西藏',
  'Xizang': '西藏',
  'Ningxia': '宁夏',
  'Xinjiang': '新疆',
};

export const FUEL_TYPE_NAMES = {
  GASOLINE_92: "92号汽油",
  GASOLINE_95: "95号汽油",
  GASOLINE_98: "98号汽油",
  DIESEL_0: "0号柴油",
};

export const FUEL_TYPES = ['GASOLINE_92', 'GASOLINE_95', 'GASOLINE_98', 'DIESEL_0'];
