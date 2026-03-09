// 主入口文件
import { initProvinceSelects } from './ui/provinceSelect.js';
import { initDatePickers } from './ui/datePicker.js';
import { initHistoryTable } from './ui/historyTable.js';
import { initLocalPricesWidget } from './components/localPricesWidget.js';

/**
 * 应用初始化
 */
async function initApp() {
  // 初始化省份选择器
  initProvinceSelects();
  
  // 初始化日期选择器
  initDatePickers();
  
  // 初始化本地油价组件
  await initLocalPricesWidget({
    sectionId: 'local-prices-section',
    provinceNameId: 'local-province-name',
    updateTimeId: 'local-update-time',
    gridId: 'local-prices-grid',
    refreshBtnId: 'refresh-location-btn',
    clickable: false
  });
  
  // 初始化历史记录表格
  initHistoryTable();
}

// DOM加载完成后初始化应用
window.addEventListener("DOMContentLoaded", initApp);
