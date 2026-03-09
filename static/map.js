import { API_BASE } from './js/constants.js';

const toast = document.getElementById("toast");
const provinceDataSection = document.getElementById("province-data");
const provinceNameEl = document.getElementById("province-name");

let myChart = null;
let allProvincePrices = {};
let userProvince = "北京"; // 默认省份

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
 * 获取用户所在省份（带默认值和缓存）
 */
async function getUserProvince(defaultProvince = '北京') {
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

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? "#8c1c13" : "#0f1720";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

// 省份名称映射：ECharts地图名称 -> 数据库名称
const provinceNameMapping = {
  // 直辖市
  "北京": "北京",
  "北京市": "北京",
  "天津": "天津",
  "天津市": "天津",
  "上海": "上海",
  "上海市": "上海",
  "重庆": "重庆",
  "重庆市": "重庆",
  // 省份（带省字和不带省字都支持）
  "河北": "河北",
  "河北省": "河北",
  "山西": "山西",
  "山西省": "山西",
  "辽宁": "辽宁",
  "辽宁省": "辽宁",
  "吉林": "吉林",
  "吉林省": "吉林",
  "黑龙江": "黑龙江",
  "黑龙江省": "黑龙江",
  "江苏": "江苏",
  "江苏省": "江苏",
  "浙江": "浙江",
  "浙江省": "浙江",
  "安徽": "安徽",
  "安徽省": "安徽",
  "福建": "福建",
  "福建省": "福建",
  "江西": "江西",
  "江西省": "江西",
  "山东": "山东",
  "山东省": "山东",
  "河南": "河南",
  "河南省": "河南",
  "湖北": "湖北",
  "湖北省": "湖北",
  "湖南": "湖南",
  "湖南省": "湖南",
  "广东": "广东",
  "广东省": "广东",
  "海南": "海南",
  "海南省": "海南",
  "四川": "四川",
  "四川省": "四川",
  "贵州": "贵州",
  "贵州省": "贵州",
  "云南": "云南",
  "云南省": "云南",
  "陕西": "陕西",
  "陕西省": "陕西",
  "甘肃": "甘肃",
  "甘肃省": "甘肃",
  "青海": "青海",
  "青海省": "青海",
  "台湾": null,
  "台湾省": null,
  // 自治区
  "内蒙古": "内蒙古",
  "内蒙古自治区": "内蒙古",
  "广西": "广西",
  "广西壮族自治区": "广西",
  "西藏": "西藏",
  "西藏自治区": "西藏",
  "宁夏": "宁夏",
  "宁夏回族自治区": "宁夏",
  "新疆": "新疆",
  "新疆维吾尔自治区": "新疆",
  // 特别行政区
  "香港": null,
  "香港特别行政区": null,
  "澳门": null,
  "澳门特别行政区": null,
};

// 反向映射：数据库名称 -> ECharts地图名称（用于地图数据）
const reverseProvinceMapping = {
  "北京": "北京市",
  "天津": "天津市",
  "上海": "上海市",
  "重庆": "重庆市",
  "河北": "河北省",
  "山西": "山西省",
  "辽宁": "辽宁省",
  "吉林": "吉林省",
  "黑龙江": "黑龙江省",
  "江苏": "江苏省",
  "浙江": "浙江省",
  "安徽": "安徽省",
  "福建": "福建省",
  "江西": "江西省",
  "山东": "山东省",
  "河南": "河南省",
  "湖北": "湖北省",
  "湖南": "湖南省",
  "广东": "广东省",
  "海南": "海南省",
  "四川": "四川省",
  "贵州": "贵州省",
  "云南": "云南省",
  "陕西": "陕西省",
  "甘肃": "甘肃省",
  "青海": "青海省",
  "内蒙古": "内蒙古自治区",
  "广西": "广西壮族自治区",
  "西藏": "西藏自治区",
  "宁夏": "宁夏回族自治区",
  "新疆": "新疆维吾尔自治区",
};

async function initMap() {
  const chartDom = document.getElementById("china-map");
  myChart = echarts.init(chartDom);

  try {
    const response = await fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json");
    const geoJson = await response.json();
    
    echarts.registerMap("china", geoJson);

    // 先加载所有省份的油价数据
    await loadAllProvincePrices();
    
    console.log("加载的省份油价数据:", allProvincePrices);

    const mapData = getMapData();
    console.log("地图数据:", mapData);

    const option = {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          const echartsName = params.name; // ECharts 地图上的名称
          const dbName = provinceNameMapping[echartsName]; // 转换为数据库名称
          
          console.log("悬浮省份:", echartsName, "-> 数据库名称:", dbName);
          
          if (dbName === null) {
            return `<strong>${echartsName}</strong><br/>暂无油价数据`;
          }
          
          const priceData = allProvincePrices[dbName];
          
          if (!priceData) {
            return `<strong>${echartsName}</strong><br/>暂无油价数据`;
          }
          
          // 构建所有油品的价格信息
          let html = `<div style="padding: 4px 0;"><strong style="font-size: 15px;">${echartsName}</strong></div>`;
          html += '<div style="margin-top: 8px;">';
          
          const fuelTypes = [
            { key: 'GASOLINE_92', label: '92号汽油', color: '#3b82f6' },
            { key: 'GASOLINE_95', label: '95号汽油', color: '#8b5cf6' },
            { key: 'GASOLINE_98', label: '98号汽油', color: '#ec4899' },
            { key: 'DIESEL_0', label: '0号柴油', color: '#10b981' },
          ];
          
          fuelTypes.forEach(fuel => {
            if (priceData[fuel.key]) {
              const price = Number(priceData[fuel.key].pricePerLiter).toFixed(2);
              html += `<div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0;">`;
              html += `<span style="color: #6b7280; font-size: 13px;">${fuel.label}:</span>`;
              html += `<span style="color: ${fuel.color}; font-weight: bold; font-size: 14px; margin-left: 12px;">${price} 元/升</span>`;
              html += `</div>`;
            }
          });
          
          html += '</div>';
          return html;
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: {
          color: "#1f2937",
          fontSize: 14,
        },
        padding: 12,
        extraCssText: "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); min-width: 200px;",
      },
      visualMap: {
        min: 7.0,
        max: 9.5,
        text: ["高", "低"],
        realtime: false,
        calculable: true,
        inRange: {
          color: ["#dbeafe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"],
        },
        textStyle: {
          color: "#6b7280",
          fontSize: 13,
        },
        left: "left",
        bottom: "bottom",
        itemWidth: 20,
        itemHeight: 140,
      },
      series: [
        {
          name: "油价",
          type: "map",
          map: "china",
          roam: true,
          scaleLimit: {
            min: 1,
            max: 3,
          },
          emphasis: {
            label: {
              show: true,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: "bold",
            },
            itemStyle: {
              areaColor: "#3b82f6",
              borderColor: "#1e40af",
              borderWidth: 2,
              shadowBlur: 10,
              shadowColor: "rgba(59, 130, 246, 0.5)",
            },
          },
          select: {
            label: {
              show: true,
              color: "#ffffff",
            },
            itemStyle: {
              areaColor: "#2563eb",
            },
          },
          itemStyle: {
            areaColor: "#e0f2fe",
            borderColor: "#ffffff",
            borderWidth: 1.5,
          },
          label: {
            show: true,
            fontSize: 11,
            color: "#6b7280",
          },
          data: mapData,
        },
      ],
    };

    myChart.setOption(option);

    myChart.on("click", function (params) {
      if (params.componentType === "series" && params.seriesType === "map") {
        loadProvinceData(params.name);
      }
    });

    window.addEventListener("resize", function () {
      myChart.resize();
    });
  } catch (error) {
    console.error("加载地图失败:", error);
    showToast("地图加载失败，请刷新页面重试", true);
  }
}

async function loadAllProvincePrices() {
  const today = new Date();
  const endDate = formatDate(today);
  const startDate = formatDate(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()));

  try {
    // 由于 size 限制为 200，我们需要分页加载所有数据
    let allRecords = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const query = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
        page: String(page),
        size: "200",
      });

      const resp = await fetch(`${API_BASE}/history?${query.toString()}`);
      const data = await resp.json();

      if (resp.ok && data.content && data.content.length > 0) {
        allRecords = allRecords.concat(data.content);
        console.log(`加载第 ${page + 1} 页，本页 ${data.content.length} 条，累计 ${allRecords.length} 条`);
        
        // 检查是否还有更多数据
        hasMore = (page + 1) < data.totalPages;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log("总共加载数据条数:", allRecords.length);

    // 处理数据，获取每个省份每种油品的最新价格
    allRecords.forEach((record) => {
      if (!allProvincePrices[record.province]) {
        allProvincePrices[record.province] = {};
      }
      
      const currentDate = new Date(record.effectiveDate);
      const existingRecord = allProvincePrices[record.province][record.fuelType];
      
      if (!existingRecord || new Date(existingRecord.effectiveDate) < currentDate) {
        allProvincePrices[record.province][record.fuelType] = record;
      }
    });
    
    console.log("处理后的省份数据:", Object.keys(allProvincePrices));
  } catch (error) {
    console.error("加载油价数据失败:", error);
  }
}

function getMapData() {
  const mapData = [];
  
  // 遍历所有数据库中的省份数据
  Object.keys(allProvincePrices).forEach((dbName) => {
    const echartsName = reverseProvinceMapping[dbName]; // 转换为 ECharts 名称
    
    if (!echartsName) {
      console.warn("未找到省份映射:", dbName);
      return;
    }
    
    const provincePrices = allProvincePrices[dbName];
    let price92 = 0;
    
    if (provincePrices && provincePrices.GASOLINE_92) {
      price92 = Number(provincePrices.GASOLINE_92.pricePerLiter);
    }
    
    mapData.push({
      name: echartsName,
      value: price92,
    });
  });
  
  console.log("生成的地图数据:", mapData);
  return mapData;
}

async function loadProvinceData(echartsProvinceName) {
  try {
    console.log("=== 开始加载省份数据 ===");
    console.log("1. 点击的省份 (ECharts名称):", echartsProvinceName);
    
    // 检查映射表中是否存在该省份
    if (!(echartsProvinceName in provinceNameMapping)) {
      console.warn("⚠️ 省份不在映射表中:", echartsProvinceName);
      showToast(`暂不支持查询 ${echartsProvinceName} 的油价数据`, false);
      return;
    }
    
    // 转换为数据库名称
    const dbProvinceName = provinceNameMapping[echartsProvinceName];
    
    console.log("2. 映射后的数据库名称:", dbProvinceName);
    
    // 如果映射值为 null，说明该地区没有数据
    if (dbProvinceName === null) {
      console.log("ℹ️ 该地区暂无油价数据");
      showToast(`${echartsProvinceName} 暂无油价数据`, false);
      return;
    }
    
    console.log("3. 准备查询数据库，省份名:", dbProvinceName);
    
    const today = new Date();
    const endDate = formatDate(today);
    const startDate = formatDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));

    const query = new URLSearchParams({
      province: dbProvinceName,
      startDate: startDate,
      endDate: endDate,
      page: "0",
      size: "50",
    });

    console.log("4. API 请求 URL:", `${API_BASE}/history?${query.toString()}`);

    const resp = await fetch(`${API_BASE}/history?${query.toString()}`);
    const data = await resp.json();

    console.log("5. API 响应状态:", resp.ok);
    console.log("6. API 返回数据:", data);

    if (!resp.ok) {
      throw new Error(data.message || "查询失败");
    }

    console.log("7. 开始显示数据，记录数:", data.content ? data.content.length : 0);
    displayProvinceData(dbProvinceName, data.content);
    console.log("=== 加载完成 ===");
  } catch (err) {
    console.error("❌ 加载省份数据失败:", err);
    showToast(err.message, true);
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayProvinceData(provinceName, records) {
  provinceNameEl.textContent = `${provinceName} 当前油价`;
  
  // 显示更新时间
  const updateTimeEl = document.getElementById("update-time");
  if (records.length > 0) {
    const latestDate = records.reduce((latest, record) => {
      const recordDate = new Date(record.effectiveDate);
      return recordDate > latest ? recordDate : latest;
    }, new Date(records[0].effectiveDate));
    
    updateTimeEl.textContent = `更新于 ${formatDate(latestDate)}`;
  } else {
    updateTimeEl.textContent = "";
  }
  
  provinceDataSection.style.display = "block";

  const latestPrices = {
    GASOLINE_92: null,
    GASOLINE_95: null,
    GASOLINE_98: null,
    DIESEL_0: null,
  };

  const sortedRecords = [...records].sort((a, b) => {
    return new Date(b.effectiveDate) - new Date(a.effectiveDate);
  });

  sortedRecords.forEach((record) => {
    if (latestPrices[record.fuelType] === null) {
      latestPrices[record.fuelType] = record.pricePerLiter;
    }
  });

  // 使用和首页一样的格式：¥7.100
  document.getElementById("price-92").textContent = latestPrices.GASOLINE_92
    ? `¥${Number(latestPrices.GASOLINE_92).toFixed(3)}`
    : "-";
  document.getElementById("price-95").textContent = latestPrices.GASOLINE_95
    ? `¥${Number(latestPrices.GASOLINE_95).toFixed(3)}`
    : "-";
  document.getElementById("price-98").textContent = latestPrices.GASOLINE_98
    ? `¥${Number(latestPrices.GASOLINE_98).toFixed(3)}`
    : "-";
  document.getElementById("price-0").textContent = latestPrices.DIESEL_0
    ? `¥${Number(latestPrices.DIESEL_0).toFixed(3)}`
    : "-";

  provinceDataSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

window.addEventListener("DOMContentLoaded", async () => {
  // 先获取用户所在省份
  userProvince = await getUserProvince("北京");
  console.log("用户所在省份:", userProvince);
  
  // 初始化地图
  await initMap();
  
  // 页面加载后自动显示用户所在省份的油价数据
  setTimeout(() => {
    const echartsName = reverseProvinceMapping[userProvince] || "北京市";
    loadProvinceData(echartsName);
  }, 1000);
});
