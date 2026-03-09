// 本地油价展示模块
import { FUEL_TYPES, FUEL_TYPE_NAMES } from '../constants.js';
import { fetchLatestPrice } from '../api.js';
import { getUserProvince, refreshProvince } from '../location.js';

/**
 * 展示本地油价
 */
export async function displayLocalPrices(province) {
  const localPricesSection = document.getElementById("local-prices-section");
  const localProvinceName = document.getElementById("local-province-name");
  const localUpdateTime = document.getElementById("local-update-time");
  const localPricesGrid = document.getElementById("local-prices-grid");
  
  if (!localPricesSection || !localProvinceName || !localUpdateTime || !localPricesGrid) {
    return;
  }
  
  try {
    // 获取所有油品类型的最新价格
    const pricePromises = FUEL_TYPES.map(async (fuelType) => {
      const data = await fetchLatestPrice(province, fuelType);
      return {
        fuelType,
        name: FUEL_TYPE_NAMES[fuelType],
        data
      };
    });
    
    const prices = await Promise.all(pricePromises);
    
    // 更新标题
    localProvinceName.textContent = `${province} 当前油价`;
    
    // 更新时间
    if (prices[0]?.data?.effectiveDate) {
      localUpdateTime.textContent = `更新于 ${prices[0].data.effectiveDate}`;
    } else {
      localUpdateTime.textContent = '暂无数据';
    }
    
    // 生成价格卡片
    localPricesGrid.innerHTML = prices.map(({ name, data }) => {
      if (!data) {
        return `
          <div class="price-card">
            <div class="price-card-label">${name}</div>
            <div class="price-card-value" style="font-size: 18px; color: #86868b;">暂无数据</div>
          </div>
        `;
      }
      
      const price = Number(data.pricePerLiter).toFixed(3);
      const change = data.priceChange;
      let changeHtml = '';
      
      if (change != null && change !== 0) {
        const changeValue = Number(change);
        const sign = changeValue > 0 ? '+' : '';
        const changeClass = changeValue > 0 ? 'up' : 'down';
        changeHtml = `<span class="price-card-change ${changeClass}">${sign}${changeValue.toFixed(3)}</span>`;
      }
      
      return `
        <div class="price-card">
          ${changeHtml}
          <div class="price-card-label">${name}</div>
          <div class="price-card-value">¥${price}</div>
          <div class="price-card-unit">元/升</div>
        </div>
      `;
    }).join('');
    
    // 显示卡片
    localPricesSection.style.display = 'block';
  } catch (error) {
    console.error('加载油价失败:', error);
    localPricesSection.style.display = 'none';
  }
}

/**
 * 加载本地油价（自动检测省份）
 */
export async function loadLocalPrices() {
  const province = await getUserProvince('北京');
  await displayLocalPrices(province);
}

/**
 * 刷新位置并重新加载油价
 */
export async function refreshLocalPrices() {
  const refreshBtn = document.getElementById('refresh-location-btn');
  const localUpdateTime = document.getElementById('local-update-time');
  
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳';
  }
  
  if (localUpdateTime) {
    localUpdateTime.textContent = '重新定位中...';
  }
  
  try {
    const province = await refreshProvince('北京');
    await displayLocalPrices(province);
    
    // 显示成功提示
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `已更新位置：${province}`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  } catch (error) {
    console.error('刷新位置失败:', error);
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '刷新位置失败，请稍后重试';
      toast.style.background = '#8c1c13';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄';
    }
  }
}

/**
 * 初始化刷新按钮
 */
export function initRefreshButton() {
  const refreshBtn = document.getElementById('refresh-location-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshLocalPrices);
  }
}
