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
  
  // 爬取按钮 - 独立绑定，不依赖表格元素
  const crawlBtn = document.getElementById("crawl-btn");
  if (crawlBtn) {
    crawlBtn.addEventListener("click", async () => {
      crawlBtn.disabled = true;
      crawlBtn.textContent = "爬取中...";
      try {
        const { triggerCrawl } = await import('./api.js');
        const { showToast } = await import('./utils.js');
        const result = await triggerCrawl();
        const total = result.created + result.updated;
        if (total > 0) {
          showToast(`爬取完成：新增 ${result.created} 条，更新 ${result.updated} 条`);
        } else {
          showToast(`数据已是最新（共抓取 ${result.fetchedRecords} 条，无变化）`);
        }
        // 触发表格刷新
        const form = document.getElementById("search-form");
        if (form) form.requestSubmit();
      } catch (err) {
        const { showToast } = await import('./utils.js');
        showToast(err.message || "爬取失败", true);
      } finally {
        crawlBtn.disabled = false;
        crawlBtn.textContent = "爬取最新油价";
      }
    });
  }

  // 初始化历史记录表格
  initHistoryTable();
}

// DOM加载完成后初始化应用
window.addEventListener("DOMContentLoaded", initApp);
