// 日期选择器模块
import { toDateOnly, addMonths, formatDateValue, parseDateValue, isSameDate } from '../utils.js';

/**
 * 初始化日期选择器
 */
export function initDatePickers() {
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
