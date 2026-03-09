import { API_BASE } from './js/constants.js';

const searchForm = document.getElementById("search-form");
const bodyEl = document.getElementById("result-body");
const pageInfo = document.getElementById("page-info");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const toast = document.getElementById("toast");
const localPricesSection = document.getElementById("local-prices-section");
const localProvinceName = document.getElementById("local-province-name");
const localUpdateTime = document.getElementById("local-update-time");
const localPricesGrid = document.getElementById("local-prices-grid");

const PROVINCES = [
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
const PROVINCE_EN_TO_CN = {
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

const state = {
  page: 0,
  size: 20,
  totalPages: 0,
  lastQuery: null,
};

function populateProvinceSelect(selectEl, options) {
  if (!selectEl) return;

  selectEl.innerHTML = options
    .map(
      (item) =>
        `<option value="${item.value}" ${item.selected ? "selected" : ""}>${item.label}</option>`,
    )
    .join("");
}

function initProvinceSelects() {
  const searchProvince = document.getElementById("province");

  populateProvinceSelect(searchProvince, [
    { value: "", label: "全部省份", selected: true },
    ...PROVINCES.map((name) => ({ value: name, label: name, selected: false })),
  ]);
}

function initDatePickers() {
  const inputs = Array.from(document.querySelectorAll(".date-input"));
  if (!inputs.length) return;

  const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];
  const lunarShortFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
    month: "long",
    day: "numeric",
  });
  const lunarFullFormatter = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const gregorianMonthFormatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  });

  const solarTerms = {
    "01-05": "小寒", "01-20": "大寒",
    "02-04": "立春", "02-19": "雨水",
    "03-05": "惊蛰", "03-20": "春分",
    "04-04": "清明", "04-20": "谷雨",
    "05-05": "立夏", "05-21": "小满",
    "06-05": "芒种", "06-21": "夏至",
    "07-07": "小暑", "07-22": "大暑",
    "08-07": "立秋", "08-23": "处暑",
    "09-07": "白露", "09-23": "秋分",
    "10-08": "寒露", "10-23": "霜降",
    "11-07": "立冬", "11-22": "小雪",
    "12-07": "大雪", "12-22": "冬至",
  };

  const festivals = {
    "01-01": "元旦",
    "02-14": "情人节",
    "03-08": "妇女节",
    "05-01": "劳动节",
    "05-04": "青年节",
    "06-01": "儿童节",
    "10-01": "国庆节",
    "12-25": "圣诞节",
  };

  const lunarFestivals = {
    "正月初一": "春节",
    "正月十五": "元宵",
    "五月初五": "端午",
    "七月初七": "七夕",
    "八月十五": "中秋",
    "九月初九": "重阳",
    "腊月初八": "腊八",
    "腊月廿三": "小年",
    "腊月三十": "除夕",
    "腊月廿九": "除夕",
  };

  const today = toDateOnly(new Date());
  let viewMonthDate = toDateOnly(today);
  let selectedDate = null;
  let activeInput = null;

  const picker = document.createElement("div");
  picker.className = "apple-date-picker";
  picker.hidden = true;
  picker.innerHTML = `
    <div class="apple-date-header">
      <div class="apple-date-headline">
        <div class="apple-date-title-row">
          <button type="button" class="apple-date-year-nav" data-year-nav="-1" aria-label="上一年">‹</button>
          <h3 class="apple-date-title"></h3>
          <button type="button" class="apple-date-year-nav" data-year-nav="1" aria-label="下一年">›</button>
        </div>
        <p class="apple-date-subtitle"></p>
      </div>
      <div class="apple-date-nav-group">
        <button type="button" class="apple-date-nav" data-nav="-1" aria-label="上个月">‹</button>
        <button type="button" class="apple-date-nav" data-nav="1" aria-label="下个月">›</button>
      </div>
    </div>
    <hr class="apple-date-divider" />
    <div class="apple-date-weekdays"></div>
    <div class="apple-date-grid"></div>
    <hr class="apple-date-divider" />
    <div class="apple-date-footer">
      <button type="button" class="apple-date-action" data-action="today">今天</button>
      <button type="button" class="apple-date-action" data-action="clear">清空</button>
    </div>
  `;
  document.body.appendChild(picker);

  const titleEl = picker.querySelector(".apple-date-title");
  const subtitleEl = picker.querySelector(".apple-date-subtitle");
  const weekdayEl = picker.querySelector(".apple-date-weekdays");
  const gridEl = picker.querySelector(".apple-date-grid");
  weekdayEl.innerHTML = weekdayLabels.map((label) => `<span>${label}</span>`).join("");

  function toDateOnly(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }

  function addMonths(date, offset) {
    return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);
  }

  function formatDateValue(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateValue(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  function isSameDate(a, b) {
    return (
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function getLunarMeta(date) {
    try {
      const full = lunarShortFormatter.format(date);
      const isMonthStart = /初一$/.test(full);
      let display = isMonthStart ? full : full.replace(/^.+月/, "");

      const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const solarTerm = solarTerms[mmdd];
      const festival = festivals[mmdd];
      const lunarFestival = lunarFestivals[full];

      let isFestival = false;
      let isSolarTerm = false;

      if (solarTerm) {
        display = solarTerm;
        isSolarTerm = true;
      } else if (lunarFestival) {
        display = lunarFestival;
        isFestival = true;
      } else if (festival) {
        display = festival;
        isFestival = true;
      }

      return { full, display, isMonthStart, isFestival, isSolarTerm };
    } catch (_) {
      return { full: "", display: "", isMonthStart: false, isFestival: false, isSolarTerm: false };
    }
  }

  function placePicker() {
    if (!activeInput || picker.hidden) return;

    const inputRect = activeInput.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    const viewportPadding = 12;

    let left = window.scrollX + inputRect.left;
    left = Math.max(
      window.scrollX + viewportPadding,
      Math.min(left, window.scrollX + window.innerWidth - pickerRect.width - viewportPadding),
    );

    let top = window.scrollY + inputRect.bottom + 10;
    const maxBottom = window.scrollY + window.innerHeight - viewportPadding;
    if (top + pickerRect.height > maxBottom) {
      top = window.scrollY + inputRect.top - pickerRect.height - 10;
    }
    top = Math.max(window.scrollY + viewportPadding, top);

    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  }

  function renderCalendar() {
    const viewYear = viewMonthDate.getFullYear();
    const viewMonth = viewMonthDate.getMonth();

    titleEl.textContent = `${viewYear}年${viewMonth + 1}月`;

    const infoDate = selectedDate || today;
    let lunarText = "";
    try {
      lunarText = lunarFullFormatter.format(infoDate);
    } catch (_) {
      lunarText = "";
    }
    subtitleEl.textContent = lunarText || "农历信息暂不可用";

    const firstDay = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(viewYear, viewMonth, 1 - startOffset, 12, 0, 0, 0);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const lunar = getLunarMeta(date);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "apple-date-cell";
      cell.innerHTML = `
        <span class="apple-date-cell-day">${date.getDate()}</span>
        <span class="apple-date-cell-lunar">${lunar.display}</span>
      `;

      if (date.getMonth() !== viewMonth) {
        cell.classList.add("is-other-month");
      }
      if (date.getDay() === 0 || date.getDay() === 6) {
        cell.classList.add("is-weekend");
      }
      if (isSameDate(date, today)) {
        cell.classList.add("is-today");
      }
      if (isSameDate(date, selectedDate)) {
        cell.classList.add("is-selected");
      }
      if (lunar.isFestival) {
        cell.classList.add("is-festival");
      }
      if (lunar.isSolarTerm) {
        cell.classList.add("is-solar-term");
      }

      cell.addEventListener("click", () => {
        if (!activeInput) return;
        selectedDate = toDateOnly(date);
        activeInput.value = formatDateValue(selectedDate);
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
        activeInput.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
      });

      fragment.appendChild(cell);
    }

    gridEl.innerHTML = "";
    gridEl.appendChild(fragment);
  }

  function openPicker(input) {
    activeInput?.classList.remove("date-input-active");
    activeInput = input;
    activeInput.classList.add("date-input-active");

    const parsed = parseDateValue(activeInput.value);
    selectedDate = parsed ? toDateOnly(parsed) : null;
    viewMonthDate = addMonths(selectedDate || today, 0);

    renderCalendar();
    picker.hidden = false;
    picker.classList.add("show");
    placePicker();
  }

  function closePicker() {
    activeInput?.classList.remove("date-input-active");
    activeInput = null;
    picker.classList.remove("show");
    picker.hidden = true;
  }

  picker.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const yearNavDelta = target.closest("[data-year-nav]")?.dataset.yearNav;
    if (yearNavDelta) {
      const currentYear = viewMonthDate.getFullYear();
      const currentMonth = viewMonthDate.getMonth();
      viewMonthDate = new Date(currentYear + Number(yearNavDelta), currentMonth, 1, 12, 0, 0, 0);
      renderCalendar();
      return;
    }

    const navDelta = target.closest("[data-nav]")?.dataset.nav;
    if (navDelta) {
      viewMonthDate = addMonths(viewMonthDate, Number(navDelta));
      renderCalendar();
      return;
    }

    const action = target.closest("[data-action]")?.dataset.action;
    if (!action || !activeInput) return;

    if (action === "today") {
      selectedDate = toDateOnly(today);
      activeInput.value = formatDateValue(selectedDate);
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      closePicker();
      return;
    }

    if (action === "clear") {
      selectedDate = null;
      activeInput.value = "";
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      closePicker();
    }
  });

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (picker.hidden) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (picker.contains(target)) return;
      if (activeInput && activeInput.contains(target)) return;
      closePicker();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (!picker.hidden && event.key === "Escape") {
      closePicker();
    }
  });

  window.addEventListener("resize", placePicker);
  window.addEventListener("scroll", placePicker, true);

  for (const input of inputs) {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("inputmode", "none");
    input.readOnly = true;

    input.addEventListener("click", () => openPicker(input));
    input.addEventListener("focus", () => openPicker(input));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        openPicker(input);
      }
    });
  }
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.background = isError ? "#8c1c13" : "#0f1720";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function mapFuel(v) {
  return (
    {
      GASOLINE_92: "92号",
      GASOLINE_95: "95号",
      GASOLINE_98: "98号",
      DIESEL_0: "0号",
    }[v] || v
  );
}

function buildQuery(formData) {
  const query = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    const trimmed = String(value).trim();
    if (trimmed) {
      query.set(key, trimmed);
    }
  }

  query.set("page", String(state.page));
  query.set("size", String(state.size));
  return query;
}

function renderRows(content) {
  if (!content.length) {
    bodyEl.innerHTML = `<tr><td colspan="7">暂无数据</td></tr>`;
    return;
  }

  bodyEl.innerHTML = content
    .map(
      (row) => {
        // 格式化价格变动
        let priceChangeText = "-";
        if (row.priceChange != null && row.priceChange !== 0) {
          const change = Number(row.priceChange);
          const sign = change > 0 ? "+" : "";
          const color = change > 0 ? "#e74c3c" : "#27ae60";
          priceChangeText = `<span style="color: ${color}; font-weight: 500;">${sign}${change.toFixed(3)}</span>`;
        }

        return `
      <tr data-fuel-type="${row.fuelType}">
        <td>${row.id}</td>
        <td>${row.province}</td>
        <td>${mapFuel(row.fuelType)}</td>
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
      },
    )
    .join("");
}

async function fetchHistory() {
  if (!state.lastQuery) {
    return;
  }

  const resp = await fetch(`${API_BASE}/history?${state.lastQuery.toString()}`);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.message || "查询失败");
  }

  state.totalPages = data.totalPages;
  const totalPages = Math.max(data.totalPages, 1);
  pageInfo.textContent = `第 ${data.page + 1} / ${totalPages} 页 · 共 ${data.totalElements} 条`;
  prevBtn.disabled = data.page <= 0;
  nextBtn.disabled = data.page + 1 >= totalPages;
  renderRows(data.content);
}

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  state.page = 0;
  state.lastQuery = buildQuery(new FormData(searchForm));

  try {
    await fetchHistory();
  } catch (err) {
    showToast(err.message, true);
  }
});

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

  if (action === "delete") {
    if (!window.confirm("确认删除这条记录吗？")) {
      return;
    }

    const resp = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
    if (!resp.ok) {
      const err = await resp.json();
      showToast(err.message || "删除失败", true);
      return;
    }

    showToast("删除成功");
    await fetchHistory();
    return;
  }

  if (action === "adjust") {
    const row = target.closest("tr");
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

    const resp = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      showToast(data.message || "调价失败", true);
      return;
    }

    showToast("调价成功");
    await fetchHistory();
  }
});

prevBtn.addEventListener("click", async () => {
  if (!state.lastQuery || state.page === 0) {
    return;
  }

  state.page -= 1;
  state.lastQuery.set("page", String(state.page));
  await fetchHistory().catch((err) => showToast(err.message, true));
});

nextBtn.addEventListener("click", async () => {
  if (!state.lastQuery || state.page + 1 >= state.totalPages) {
    return;
  }

  state.page += 1;
  state.lastQuery.set("page", String(state.page));
  await fetchHistory().catch((err) => showToast(err.message, true));
});

window.addEventListener("DOMContentLoaded", () => {
  initProvinceSelects();
  initDatePickers();
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  
  // 加载本地油价
  loadLocalPrices();
  
  searchForm.requestSubmit();
});

// 获取用户所在省份并加载油价
async function loadLocalPrices() {
  let province = '北京'; // 默认省份
  
  // 使用IP定位（简单可靠）
  try {
    // 使用 ip-api.com 替代 ipapi.co，更稳定且免费额度更高
    const response = await fetch('http://ip-api.com/json/?lang=zh-CN&fields=status,regionName');
    const data = await response.json();
    
    console.log('IP定位API返回数据:', data);
    
    // ip-api.com 返回格式: {status: "success", regionName: "Beijing"}
    if (data.status === 'success' && data.regionName) {
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
      
      console.log('是否在列表中:', PROVINCES.includes(detectedProvince));
      
      if (PROVINCES.includes(detectedProvince)) {
        province = detectedProvince;
        console.log('✓ 成功定位到省份:', province);
      } else {
        console.log('✗ 省份不在列表中，使用默认省份');
      }
    }
  } catch (error) {
    console.log('IP定位失败，使用默认省份:', error);
  }
  
  console.log('最终使用的省份:', province);
  
  // 获取该省份的最新油价
  await displayLocalPrices(province);
}

// 展示本地油价
async function displayLocalPrices(province) {
  try {
    const fuelTypes = ['GASOLINE_92', 'GASOLINE_95', 'GASOLINE_98', 'DIESEL_0'];
    const fuelNames = {
      'GASOLINE_92': '92号汽油',
      'GASOLINE_95': '95号汽油',
      'GASOLINE_98': '98号汽油',
      'DIESEL_0': '0号柴油'
    };
    
    // 获取所有油品类型的最新价格
    const pricePromises = fuelTypes.map(async (fuelType) => {
      const resp = await fetch(`${API_BASE}/history?province=${encodeURIComponent(province)}&fuelType=${fuelType}&page=0&size=1`);
      const data = await resp.json();
      return {
        fuelType,
        name: fuelNames[fuelType],
        data: data.content[0] || null
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
