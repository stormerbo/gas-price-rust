// 导入本地油价组件
import { initLocalPricesWidget } from './js/components/localPricesWidget.js';
import { API_BASE } from './js/constants.js';

const toast = document.getElementById("toast");

let myChart = null;
let allProvincePrices = {};

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

// 省份中心点坐标（经纬度）
const provinceCenterCoords = {
  "北京市": [116.4074, 39.9042],
  "天津市": [117.2008, 39.0842],
  "上海市": [121.4737, 31.2304],
  "重庆市": [106.5516, 29.5630],
  "河北省": [114.5149, 38.0428],
  "山西省": [112.5489, 37.8706],
  "辽宁省": [123.4315, 41.8057],
  "吉林省": [125.3245, 43.8868],
  "黑龙江省": [126.6433, 45.7567],
  "江苏省": [118.7969, 32.0603],
  "浙江省": [120.1536, 30.2875],
  "安徽省": [117.2272, 31.8206],
  "福建省": [119.2965, 26.1004],
  "江西省": [115.8581, 28.6832],
  "山东省": [117.0208, 36.6683],
  "河南省": [113.6254, 34.7466],
  "湖北省": [114.3055, 30.5931],
  "湖南省": [112.9834, 28.1129],
  "广东省": [113.2644, 23.1291],
  "海南省": [110.3312, 20.0311],
  "四川省": [104.0665, 30.5723],
  "贵州省": [106.7073, 26.5982],
  "云南省": [102.7103, 25.0406],
  "陕西省": [108.9540, 34.2656],
  "甘肃省": [103.8236, 36.0581],
  "青海省": [101.7782, 36.6171],
  "内蒙古自治区": [111.6708, 40.8183],
  "广西壮族自治区": [108.3661, 22.8172],
  "西藏自治区": [91.1174, 29.6470],
  "宁夏回族自治区": [106.2586, 38.4681],
  "新疆维吾尔自治区": [87.6278, 43.7928]
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
    
    const mapData = getMapData();

    const option = {
      tooltip: {
        trigger: "item",
        formatter: function (params) {
          // 如果是位置标记点，显示位置信息
          if (params.seriesType === 'effectScatter') {
            return '📍 当前位置：' + params.name;
          }
          
          const echartsName = params.name;
          const dbName = provinceNameMapping[echartsName];
          
          if (dbName === null) {
            return `<strong>${echartsName}</strong><br/>暂无油价数据`;
          }
          
          const priceData = allProvincePrices[dbName];
          
          if (!priceData) {
            return `<strong>${echartsName}</strong><br/>暂无油价数据`;
          }
          
          let html = `<div style="padding: 8px 0;"><strong style="font-size: 16px; font-weight: 600; color: #1d1d1f;">${echartsName}</strong></div>`;
          html += '<div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">';
          
          const fuelTypes = [
            { key: 'GASOLINE_92', label: '92号汽油', color: '#0071e3' },
            { key: 'GASOLINE_95', label: '95号汽油', color: '#5856d6' },
            { key: 'GASOLINE_98', label: '98号汽油', color: '#af52de' },
            { key: 'DIESEL_0', label: '0号柴油', color: '#30d158' },
          ];
          
          fuelTypes.forEach(fuel => {
            if (priceData[fuel.key]) {
              const price = Number(priceData[fuel.key].pricePerLiter).toFixed(3);
              html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">`;
              html += `<span style="color: #86868b; font-size: 13px; font-weight: 500;">${fuel.label}</span>`;
              html += `<span style="color: ${fuel.color}; font-weight: 600; font-size: 15px; margin-left: 20px;">¥${price}</span>`;
              html += `</div>`;
            }
          });
          
          html += '</div>';
          return html;
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "rgba(0, 0, 0, 0.08)",
        borderWidth: 1,
        textStyle: {
          color: "#1d1d1f",
          fontSize: 14,
          fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        padding: 16,
        extraCssText: "box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08); border-radius: 12px; min-width: 220px; backdrop-filter: blur(20px);",
      },
      visualMap: {
        min: 7.0,
        max: 9.5,
        text: ["高", "低"],
        realtime: false,
        calculable: true,
        inRange: {
          color: [
            "#e0f2fe",  // 最低价 - 浅蓝
            "#bae6fd",  // 
            "#7dd3fc",  // 
            "#38bdf8",  // 
            "#0ea5e9",  // 
            "#0284c7"   // 最高价 - 深蓝
          ],
        },
        textStyle: {
          color: "#6b7280",
          fontSize: 13,
          fontWeight: '500',
          fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        },
        left: "left",
        bottom: "bottom",
        itemWidth: 20,
        itemHeight: 140,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        borderRadius: 12,
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
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            itemStyle: {
              areaColor: "#0071e3",  // Apple蓝色
              borderColor: "#005bb5",
              borderWidth: 2,
              shadowBlur: 20,
              shadowColor: "rgba(0, 113, 227, 0.6)",
              shadowOffsetX: 0,
              shadowOffsetY: 4,
            },
          },
          select: {
            label: {
              show: true,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: "600",
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            },
            itemStyle: {
              areaColor: "#0077ed",  // Apple蓝色（稍亮）
              borderColor: "#0071e3",
              borderWidth: 2.5,
              shadowBlur: 16,
              shadowColor: "rgba(0, 113, 227, 0.5)",
              shadowOffsetX: 0,
              shadowOffsetY: 3,
            },
          },
          itemStyle: {
            areaColor: "#f0f9ff",  // 默认浅蓝色
            borderColor: "#ffffff",
            borderWidth: 1.5,
            shadowBlur: 3,
            shadowColor: "rgba(0, 0, 0, 0.05)",
            shadowOffsetX: 0,
            shadowOffsetY: 1,
          },
          label: {
            show: true,
            fontSize: 11,
            color: "#6b7280",
            fontWeight: '500',
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
          },
          data: mapData,
        },
      ],
    };

    myChart.setOption(option);

    myChart.on("click", function (params) {
      if (params.componentType === "series" && params.seriesType === "map") {
        // 点击地图时，重新加载该省份的油价（不使用组件，直接更新）
        loadProvinceDataForMap(params.name);
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
        hasMore = (page + 1) < data.totalPages;
        page++;
      } else {
        hasMore = false;
      }
    }

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
  } catch (error) {
    console.error("加载油价数据失败:", error);
  }
}

function getMapData() {
  const mapData = [];
  
  Object.keys(allProvincePrices).forEach((dbName) => {
    const echartsName = reverseProvinceMapping[dbName];
    
    if (!echartsName) {
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
  
  return mapData;
}

// 点击地图时加载省份数据（不使用组件，手动更新DOM）
async function loadProvinceDataForMap(echartsProvinceName) {
  const dbProvinceName = provinceNameMapping[echartsProvinceName];
  
  if (dbProvinceName === null) {
    showToast(`${echartsProvinceName} 暂无油价数据`, false);
    return;
  }

  try {
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

    const resp = await fetch(`${API_BASE}/history?${query.toString()}`);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "查询失败");
    }

    // 手动更新DOM
    const provinceNameEl = document.getElementById("province-name");
    const updateTimeEl = document.getElementById("update-time");
    const gridEl = document.getElementById("local-prices-grid");
    const section = document.getElementById("province-data");

    provinceNameEl.textContent = `${dbProvinceName} 当前油价`;

    if (data.content.length > 0) {
      const latestDate = data.content.reduce((latest, record) => {
        const recordDate = new Date(record.effectiveDate);
        return recordDate > latest ? recordDate : latest;
      }, new Date(data.content[0].effectiveDate));
      
      updateTimeEl.textContent = `更新于 ${formatDate(latestDate)}`;
    }

    // 获取最新价格
    const latestPrices = {
      GASOLINE_92: null,
      GASOLINE_95: null,
      GASOLINE_98: null,
      DIESEL_0: null,
    };

    const sortedRecords = [...data.content].sort((a, b) => {
      return new Date(b.effectiveDate) - new Date(a.effectiveDate);
    });

    sortedRecords.forEach((record) => {
      if (latestPrices[record.fuelType] === null) {
        latestPrices[record.fuelType] = record;
      }
    });

    // 渲染卡片
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

      return `
        <div class="price-card">
          <div class="price-card-label">${fuel.label}</div>
          <div class="price-card-value">${price}</div>
          <div class="price-card-unit">元/升</div>
          ${changeText ? `<div class="price-card-change ${changeClass}">${changeText}</div>` : ''}
        </div>
      `;
    }).join('');

    section.style.display = "block";
    section.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    console.error("加载省份数据失败:", err);
    showToast(err.message, true);
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

window.addEventListener("DOMContentLoaded", async () => {
  // 初始化本地油价组件
  await initLocalPricesWidget({
    sectionId: 'province-data',
    provinceNameId: 'province-name',
    updateTimeId: 'update-time',
    gridId: 'local-prices-grid',
    refreshBtnId: 'refresh-location-btn',
    clickable: false
  });
  
  // 获取当前用户省份
  const { getCurrentProvince } = await import('./js/components/localPricesWidget.js');
  const userProvince = await getCurrentProvince();
  console.log('当前用户省份:', userProvince);
  
  // 初始化地图
  await initMap();
  
  // 地图加载完成后，在用户所在省份添加位置图标标记
  setTimeout(() => {
    const echartsName = reverseProvinceMapping[userProvince] || "北京市";
    console.log('标记用户省份:', echartsName);
    
    // 在地图上添加位置图标标记（使用graphic文本）
    if (myChart && provinceCenterCoords[echartsName]) {
      const coord = provinceCenterCoords[echartsName];
      
      // 将地理坐标转换为像素坐标
      const pixelCoord = myChart.convertToPixel({ seriesIndex: 0 }, coord);
      
      if (pixelCoord && pixelCoord.length === 2) {
        myChart.setOption({
          graphic: [
            {
              type: 'text',
              z: 100,
              left: pixelCoord[0],
              top: pixelCoord[1],
              style: {
                text: '📍',
                fontSize: 28,
                textAlign: 'center',
                textVerticalAlign: 'middle'
              },
              silent: false,
              draggable: false,
              onclick: function() {
                showToast('当前位置：' + echartsName, false);
              }
            }
          ]
        });
        
        // 监听地图缩放和平移，更新图标位置
        myChart.on('georoam', function() {
          const newPixelCoord = myChart.convertToPixel({ seriesIndex: 0 }, coord);
          if (newPixelCoord && newPixelCoord.length === 2) {
            myChart.setOption({
              graphic: [
                {
                  left: newPixelCoord[0],
                  top: newPixelCoord[1]
                }
              ]
            });
          }
        });
      }
    }
  }, 1500);
});
