/**
 * 本地油价组件
 * 可在多个页面复用的油价展示组件
 */

import { getUserProvince, refreshProvince } from '../location.js';
import { getApiBase } from '../constants.js';

/**
 * 获取指定省份的最新油价
 */
async function fetchProvincePrices(province) {
  const base = await getApiBase();
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

  const resp = await fetch(`${base}/history?${query.toString()}`);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.message || "查询失败");
  }

  return data.content;
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 显示Toast提示
 */
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.style.background = isError ? '#8c1c13' : 'rgba(28, 28, 30, 0.95)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

/**
 * 渲染油价卡片
 */
function renderPriceCards(records, containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

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

  // 生成油价卡片
  const fuelTypes = [
    { key: 'GASOLINE_92', label: '92号汽油' },
    { key: 'GASOLINE_95', label: '95号汽油' },
    { key: 'GASOLINE_98', label: '98号汽油' },
    { key: 'DIESEL_0', label: '0号柴油' },
  ];

  const clickable = options.clickable || false;
  const onCardClick = options.onCardClick || null;
  const activeType = options.activeType || null;

  container.innerHTML = fuelTypes.map(fuel => {
    const record = latestPrices[fuel.key];
    const price = record ? `¥${Number(record.pricePerLiter).toFixed(3)}` : '-';
    const change = record && record.priceChange ? record.priceChange : 0;
    const changeClass = change > 0 ? 'up' : (change < 0 ? 'down' : '');
    const changeText = change > 0 ? `+${change.toFixed(3)}` : (change < 0 ? change.toFixed(3) : '');
    const isActive = activeType === fuel.key ? 'active' : '';
    const clickableClass = clickable ? 'clickable' : '';
    const cursorStyle = clickable ? 'cursor: pointer;' : '';

    return `
      <div class="price-card ${clickableClass} ${isActive}" 
           data-fuel="${fuel.key}" 
           style="${cursorStyle}">
        <div class="price-card-label">${fuel.label}</div>
        <div class="price-card-value">${price}</div>
        <div class="price-card-unit">元/升</div>
        ${changeText ? `<div class="price-card-change ${changeClass}">${changeText}</div>` : ''}
      </div>
    `;
  }).join('');

  // 如果需要点击功能，添加事件监听
  if (clickable && onCardClick) {
    const cards = container.querySelectorAll('.price-card');
    cards.forEach(card => {
      card.addEventListener('click', function() {
        const fuelType = this.getAttribute('data-fuel');
        
        // 移除所有卡片的active类
        cards.forEach(c => c.classList.remove('active'));
        
        // 给当前卡片添加active类
        this.classList.add('active');
        
        // 调用回调函数
        onCardClick(fuelType);
      });
    });
  }
}

/**
 * 初始化本地油价组件
 * @param {Object} options - 配置选项
 * @param {string} options.sectionId - 组件容器ID
 * @param {string} options.provinceNameId - 省份名称元素ID
 * @param {string} options.updateTimeId - 更新时间元素ID
 * @param {string} options.gridId - 油价卡片容器ID
 * @param {string} options.refreshBtnId - 刷新按钮ID
 * @param {boolean} options.clickable - 卡片是否可点击
 * @param {Function} options.onCardClick - 卡片点击回调
 * @param {string} options.activeType - 当前激活的油品类型
 */
export async function initLocalPricesWidget(options = {}) {
  const {
    sectionId = 'local-prices-section',
    provinceNameId = 'local-province-name',
    updateTimeId = 'local-update-time',
    gridId = 'local-prices-grid',
    refreshBtnId = 'refresh-location-btn',
    clickable = false,
    onCardClick = null,
    activeType = null
  } = options;

  const section = document.getElementById(sectionId);
  const provinceNameEl = document.getElementById(provinceNameId);
  const updateTimeEl = document.getElementById(updateTimeId);
  const refreshBtn = document.getElementById(refreshBtnId);

  if (!section || !provinceNameEl || !updateTimeEl) {
    console.warn('本地油价组件：缺少必要的DOM元素');
    return;
  }

  // 显示加载状态
  if (updateTimeEl) {
    updateTimeEl.textContent = '加载中...';
  }

  try {
    // 获取用户所在省份（使用缓存）
    const province = await getUserProvince('北京');
    console.log('本地油价组件：用户所在省份 =', province);

    // 获取油价数据
    const records = await fetchProvincePrices(province);

    // 更新省份名称
    provinceNameEl.textContent = `${province} 当前油价`;

    // 更新时间
    if (records.length > 0) {
      const latestDate = records.reduce((latest, record) => {
        const recordDate = new Date(record.effectiveDate);
        return recordDate > latest ? recordDate : latest;
      }, new Date(records[0].effectiveDate));
      
      updateTimeEl.textContent = `更新于 ${formatDate(latestDate)}`;
    } else {
      updateTimeEl.textContent = '暂无数据';
    }

    // 渲染油价卡片
    renderPriceCards(records, gridId, { clickable, onCardClick, activeType });

    // 显示组件
    section.style.display = 'block';

    // 初始化刷新按钮
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '⏳';
        updateTimeEl.textContent = '重新定位中...';

        try {
          const newProvince = await refreshProvince('北京');
          const newRecords = await fetchProvincePrices(newProvince);

          provinceNameEl.textContent = `${newProvince} 当前油价`;

          if (newRecords.length > 0) {
            const latestDate = newRecords.reduce((latest, record) => {
              const recordDate = new Date(record.effectiveDate);
              return recordDate > latest ? recordDate : latest;
            }, new Date(newRecords[0].effectiveDate));
            
            updateTimeEl.textContent = `更新于 ${formatDate(latestDate)}`;
          }

          renderPriceCards(newRecords, gridId, { clickable, onCardClick, activeType });

          showToast(`已更新位置：${newProvince}`);
        } catch (error) {
          console.error('刷新位置失败:', error);
          showToast('刷新位置失败，请稍后重试', true);
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = '🔄';
        }
      });
    }

  } catch (error) {
    console.error('加载本地油价失败:', error);
    section.style.display = 'none';
  }
}

/**
 * 获取当前用户省份（供外部使用）
 */
export async function getCurrentProvince() {
  return await getUserProvince('北京');
}
