// 导入本地油价组件
import { initLocalPricesWidget } from './js/components/localPricesWidget.js';
import { API_BASE } from './js/constants.js';

const toast = document.getElementById("toast");
const canvas = document.getElementById("priceChart");

let chartInstance = null;
let currentFuelType = "GASOLINE_92"; // 当前选中的油品类型

const FUEL_TYPE_NAMES = {
  GASOLINE_92: "92号汽油",
  GASOLINE_95: "95号汽油",
  GASOLINE_98: "98号汽油",
  DIESEL_0: "0号柴油",
};

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? "#8c1c13" : "#0f1720";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchLatestPrices(fuelType) {
  let allRecords = [];
  let page = 0;
  let totalPages = 1;
  
  while (page < totalPages) {
    const resp = await fetch(`${API_BASE}/history?fuelType=${fuelType}&page=${page}&size=200`);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "查询失败");
    }

    allRecords = allRecords.concat(data.content);
    totalPages = data.totalPages;
    page++;
    
    if (page >= 5) break;
  }

  const provinceMap = new Map();
  
  for (const record of allRecords) {
    const existing = provinceMap.get(record.province);
    if (!existing || record.effectiveDate > existing.effectiveDate) {
      provinceMap.set(record.province, record);
    }
  }

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
    currentFuelType = fuelType;
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
  if (typeof Chart === 'undefined') {
    showToast("图表库加载失败，请刷新页面", true);
    return;
  }
  
  // 初始化本地油价组件（可点击切换图表）
  await initLocalPricesWidget({
    sectionId: 'local-prices-section',
    provinceNameId: 'local-province-name',
    updateTimeId: 'local-update-time',
    gridId: 'local-prices-grid',
    refreshBtnId: 'refresh-location-btn',
    clickable: true,
    activeType: currentFuelType,
    onCardClick: async (fuelType) => {
      currentFuelType = fuelType;
      await updateChart(fuelType);
    }
  });
  
  // 默认加载92号汽油数据
  await updateChart("GASOLINE_92");
});
