import { API_BASE } from './js/constants.js';

const toast = document.getElementById("toast");
const canvas = document.getElementById("priceChart");

let chartInstance = null;
let userProvince = "北京"; // 默认省份
let currentFuelType = "GASOLINE_92"; // 当前选中的油品类型

const FUEL_TYPE_NAMES = {
  GASOLINE_92: "92号汽油",
  GASOLINE_95: "95号汽油",
  GASOLINE_98: "98号汽油",
  DIESEL_0: "0号柴油",
};

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

/**
 * 加载本地油价
 */
async function loadLocalPrices(province) {
  try {
    const today = new Date();
    const endDate = formatDate(today);
    const startDate = formatDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));

    const query = new URLSearchParams({
      province: province,
      startDate: startDate,
      endDate: endDate,
      page: "0",
      size: "50",
    });

    const resp = await fetch(`${API_BASE}/history?${query.toString()}`);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "查询失败");
    }

    displayLocalPrices(province, data.content);
  } catch (err) {
    console.error("加载本地油价失败:", err);
  }
}

/**
 * 显示本地油价
 */
function displayLocalPrices(province, records) {
  const section = document.getElementById("local-prices-section");
  const provinceNameEl = document.getElementById("local-province-name");
  const updateTimeEl = document.getElementById("local-update-time");
  const gridEl = document.getElementById("local-prices-grid");

  provinceNameEl.textContent = `${province} 当前油价`;

  if (records.length === 0) {
    section.style.display = "none";
    return;
  }

  // 获取最新的油价数据
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
      latestPrices[record.fuelType] = record;
    }
  });

  // 显示更新时间
  if (sortedRecords.length > 0) {
    const latestDate = new Date(sortedRecords[0].effectiveDate);
    updateTimeEl.textContent = `更新于 ${formatDate(latestDate)}`;
  }

  // 生成油价卡片
  const fuelTypes = [
    { key: 'GASOLINE_92', label: '92号汽油' },
    { key: 'GASOLINE_95', label: '95号汽油' },
    { key: 'GASOLINE_98', label: '98号汽油' },
    { key: 'DIESEL_0', label: '0号柴油' },
  ];

  gridEl.innerHTML = fuelTypes.map(fuel => {
    const record = latestPrices[fuel.key];
    const price = record ? `¥${Number(record.pricePerLiter).toFixed(3)}` : '-';
    const change = record && record.priceChange ? record.priceChange : 0;
    const changeClass = change > 0 ? 'up' : (change < 0 ? 'down' : '');
    const changeText = change > 0 ? `+${change.toFixed(3)}` : (change < 0 ? change.toFixed(3) : '');
    const isActive = fuel.key === currentFuelType ? 'active' : '';

    return `
      <div class="price-card clickable ${isActive}" data-fuel="${fuel.key}" style="cursor: pointer;">
        <div class="price-card-label">${fuel.label}</div>
        <div class="price-card-value">${price}</div>
        <div class="price-card-unit">元/升</div>
        ${changeText ? `<div class="price-card-change ${changeClass}">${changeText}</div>` : ''}
      </div>
    `;
  }).join('');

  // 为每个卡片添加点击事件
  const cards = gridEl.querySelectorAll('.price-card');
  cards.forEach(card => {
    card.addEventListener('click', async function() {
      const fuelType = this.getAttribute('data-fuel');
      
      // 移除所有卡片的active类
      cards.forEach(c => c.classList.remove('active'));
      
      // 给当前卡片添加active类
      this.classList.add('active');
      
      // 更新当前选中的油品类型
      currentFuelType = fuelType;
      
      // 更新图表
      await updateChart(fuelType);
    });
  });

  section.style.display = "block";
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchLatestPrices(fuelType) {
  // 获取所有省份的最新油价（分页获取）
  let allRecords = [];
  let page = 0;
  let totalPages = 1;
  
  // 循环获取所有页的数据
  while (page < totalPages) {
    const resp = await fetch(`${API_BASE}/history?fuelType=${fuelType}&page=${page}&size=200`);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "查询失败");
    }

    allRecords = allRecords.concat(data.content);
    totalPages = data.totalPages;
    page++;
    
    // 安全限制：最多获取5页（1000条记录）
    if (page >= 5) break;
  }

  // 按省份分组，取每个省份的最新记录
  const provinceMap = new Map();
  
  for (const record of allRecords) {
    const existing = provinceMap.get(record.province);
    if (!existing || record.effectiveDate > existing.effectiveDate) {
      provinceMap.set(record.province, record);
    }
  }

  // 转换为数组并按省份名称排序
  const latestPrices = Array.from(provinceMap.values());
  latestPrices.sort((a, b) => a.province.localeCompare(b.province, "zh-CN"));

  return latestPrices;
}

function updateStatistics(prices) {
  if (prices.length === 0) {
    document.getElementById("max-price").textContent = "-";
    document.getElementById("max-province").textContent = "-";
    document.getElementById("min-price").textContent = "-";
    document.getElementById("min-province").textContent = "-";
    document.getElementById("avg-price").textContent = "-";
    document.getElementById("price-range").textContent = "-";
    document.getElementById("province-count").textContent = "0";
    return;
  }

  const priceValues = prices.map((p) => p.pricePerLiter);
  const maxPrice = Math.max(...priceValues);
  const minPrice = Math.min(...priceValues);
  const avgPrice = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;
  const priceRange = maxPrice - minPrice;

  const maxProvince = prices.find((p) => p.pricePerLiter === maxPrice);
  const minProvince = prices.find((p) => p.pricePerLiter === minPrice);

  document.getElementById("max-price").textContent = `¥${maxPrice.toFixed(3)}`;
  document.getElementById("max-province").textContent = maxProvince.province;
  document.getElementById("min-price").textContent = `¥${minPrice.toFixed(3)}`;
  document.getElementById("min-province").textContent = minProvince.province;
  document.getElementById("avg-price").textContent = `¥${avgPrice.toFixed(3)}`;
  document.getElementById("price-range").textContent = `差价 ¥${priceRange.toFixed(3)}`;
  document.getElementById("province-count").textContent = prices.length;
}

function createChart(prices, fuelType) {
  const labels = prices.map((p) => p.province);
  const data = prices.map((p) => p.pricePerLiter);
  const avgPrice = data.reduce((sum, p) => sum + p, 0) / data.length;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  
  // 创建渐变色
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(0, 113, 227, 0.85)');
  gradient.addColorStop(1, 'rgba(0, 113, 227, 0.65)');
  
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `${FUEL_TYPE_NAMES[fuelType]} 价格 (元/升)`,
          data: data,
          backgroundColor: gradient,
          borderColor: 'rgba(0, 113, 227, 0.3)',
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: 'start',
          labels: {
            font: {
              size: 15,
              weight: '600',
              family: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            color: "#1d1d1f",
            padding: 16,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            boxWidth: 12,
            boxHeight: 12,
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(28, 28, 30, 0.96)",
          titleColor: "#ffffff",
          bodyColor: "rgba(255, 255, 255, 0.85)",
          titleFont: {
            size: 15,
            weight: '600',
            family: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          bodyFont: {
            size: 14,
            weight: '500',
            family: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          padding: 14,
          cornerRadius: 12,
          displayColors: false,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            title: function (context) {
              return context[0].label;
            },
            label: function (context) {
              const price = context.parsed.y;
              const diff = price - avgPrice;
              const diffText = diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);
              return [
                `价格: ¥${price.toFixed(3)}`,
                `平均: ¥${avgPrice.toFixed(3)}`,
                `差值: ${diffText}`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          border: {
            display: false,
          },
          ticks: {
            callback: function (value) {
              return "¥" + value.toFixed(2);
            },
            font: {
              size: 13,
              weight: '500',
              family: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            color: "#86868b",
            padding: 8,
          },
          grid: {
            color: "rgba(0, 0, 0, 0.06)",
            lineWidth: 1,
            drawTicks: false,
          },
        },
        x: {
          border: {
            display: false,
          },
          ticks: {
            font: {
              size: 12,
              weight: '500',
              family: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            color: "#86868b",
            maxRotation: 45,
            minRotation: 45,
            padding: 8,
          },
          grid: {
            display: false,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      animation: {
        duration: 800,
        easing: 'easeInOutQuart',
      },
    },
  });
}

async function updateChart(fuelType) {
  try {
    const prices = await fetchLatestPrices(fuelType);
    
    if (prices.length === 0) {
      showToast("暂无数据", true);
      return;
    }

    createChart(prices, fuelType);
    updateStatistics(prices);
    showToast(`已加载 ${prices.length} 个省份的数据`);
  } catch (err) {
    console.error("Error updating chart:", err);
    showToast(err.message, true);
  }
}

// 页面加载时自动显示图表（默认92号汽油）
window.addEventListener("DOMContentLoaded", async () => {
  // 确保 Chart.js 已加载
  if (typeof Chart === 'undefined') {
    showToast("图表库加载失败，请刷新页面", true);
    return;
  }
  
  // 先获取用户所在省份
  userProvince = await getUserProvince("北京");
  console.log("用户所在省份:", userProvince);
  
  // 加载本地油价
  await loadLocalPrices(userProvince);
  
  // 默认加载92号汽油数据
  await updateChart("GASOLINE_92");
});
