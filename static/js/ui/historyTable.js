// 历史记录表格模块
import { mapFuelType, formatPriceChange, showToast, buildQuery } from '../utils.js';
import { fetchHistory, deleteRecord, updateRecord } from '../api.js';

// 状态管理
const state = {
  page: 0,
  size: 20,
  totalPages: 0,
  lastQuery: null,
  sortBy: null,   // 'pricePerLiter' | 'priceChange' | null
  sortDir: 'desc', // 'asc' | 'desc'
};

/**
 * 渲染表格行
 */
function renderRows(content) {
  const bodyEl = document.getElementById("result-body");
  if (!bodyEl) return;
  
  if (!content.length) {
    bodyEl.innerHTML = `<tr><td colspan="7">暂无数据</td></tr>`;
    return;
  }

  bodyEl.innerHTML = content
    .map((row) => {
      const priceChangeText = formatPriceChange(row.priceChange);
      
      return `
        <tr data-fuel-type="${row.fuelType}">
          <td>${row.id}</td>
          <td>${row.province}</td>
          <td>${mapFuelType(row.fuelType)}</td>
          <td>${row.effectiveDate}</td>
          <td>${Number(row.pricePerLiter).toFixed(3)}</td>
          <td>${priceChangeText}</td>
          <td class="op-cell">
            <div class="row-actions">
              <button type="button" class="action-link" data-action="adjust" data-id="${row.id}">调价</button>
              <span class="action-sep" aria-hidden="true">|</span>
              <button type="button" class="action-link danger" data-action="delete" data-id="${row.id}">删除</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

/**
 * 更新表头排序图标
 */
function updateSortHeaders() {
  document.querySelectorAll("th[data-sort]").forEach(th => {
    const col = th.dataset.sort;
    const icon = th.querySelector(".sort-icon");
    if (!icon) return;
    if (col === state.sortBy) {
      icon.textContent = state.sortDir === 'asc' ? ' ↑' : ' ↓';
    } else {
      icon.textContent = ' ↕';
    }
  });
}

/**
 * 获取并显示历史记录
 */
async function loadHistory() {
  if (!state.lastQuery) {
    return;
  }

  // 注入排序参数
  if (state.sortBy) {
    state.lastQuery.set("sortBy", state.sortBy);
    state.lastQuery.set("sortDir", state.sortDir);
  } else {
    state.lastQuery.delete("sortBy");
    state.lastQuery.delete("sortDir");
  }

  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  try {
    const data = await fetchHistory(state.lastQuery);
    
    state.totalPages = data.totalPages;
    const totalPages = Math.max(data.totalPages, 1);
    
    if (pageInfo) {
      pageInfo.textContent = `第 ${data.page + 1} / ${totalPages} 页 · 共 ${data.totalElements} 条`;
    }
    
    if (prevBtn) prevBtn.disabled = data.page <= 0;
    if (nextBtn) nextBtn.disabled = data.page + 1 >= totalPages;
    
    renderRows(data.content);
  } catch (err) {
    showToast(err.message, true);
  }
}

/**
 * 处理行操作（删除、调价）
 */
async function handleRowAction(action, id, row) {
  if (action === "delete") {
    if (!window.confirm("确认删除这条记录吗？")) {
      return;
    }

    try {
      await deleteRecord(id);
      showToast("删除成功");
      await loadHistory();
    } catch (err) {
      showToast(err.message, true);
    }
    return;
  }

  if (action === "adjust") {
    if (!row) return;

    const currentPrice = Number(row.children[4].textContent || "0");
    const newPrice = window.prompt("输入新单价(元/L)", currentPrice.toFixed(3));
    if (!newPrice) {
      return;
    }

    const price = Number(newPrice);
    if (!(price > 0)) {
      showToast("请输入大于 0 的数字", true);
      return;
    }

    const payload = {
      province: row.children[1].textContent.trim(),
      fuelType: row.dataset.fuelType,
      effectiveDate: row.children[3].textContent.trim(),
      pricePerLiter: price,
    };

    if (!payload.fuelType) {
      showToast("当前行数据不完整，无法调价", true);
      return;
    }

    try {
      await updateRecord(id, payload);
      showToast("调价成功");
      await loadHistory();
    } catch (err) {
      showToast(err.message, true);
    }
  }
}

/**
 * 初始化历史记录表格
 */
export function initHistoryTable() {
  const searchForm = document.getElementById("search-form");
  const bodyEl = document.getElementById("result-body");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (!searchForm || !bodyEl) return;

  // 表头排序点击
  document.querySelectorAll("th[data-sort]").forEach(th => {
    th.style.cursor = "pointer";
    th.addEventListener("click", async () => {
      const col = th.dataset.sort;
      if (state.sortBy === col) {
        state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        state.sortBy = col;
        state.sortDir = 'desc';
      }
      state.page = 0;
      if (state.lastQuery) state.lastQuery.set("page", "0");
      updateSortHeaders();
      await loadHistory();
    });
  });

  // 搜索表单提交
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.page = 0;
    state.lastQuery = buildQuery(new FormData(searchForm), state.page, state.size);
    await loadHistory();
  });

  // 表格行操作
  bodyEl.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) {
      return;
    }

    const row = target.closest("tr");
    await handleRowAction(action, id, row);
  });

  // 分页按钮
  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      if (!state.lastQuery || state.page === 0) {
        return;
      }

      state.page -= 1;
      state.lastQuery.set("page", String(state.page));
      await loadHistory();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      if (!state.lastQuery || state.page + 1 >= state.totalPages) {
        return;
      }

      state.page += 1;
      state.lastQuery.set("page", String(state.page));
      await loadHistory();
    });
  }

  // 初始化时禁用分页按钮
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  // 自动加载第一页
  searchForm.requestSubmit();
}
