// 工具函数

/**
 * 显示Toast提示
 */
export function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  
  toast.textContent = message;
  toast.style.background = isError ? "#8c1c13" : "#0f1720";
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

/**
 * 映射油品类型到中文名称
 */
export function mapFuelType(fuelType) {
  const map = {
    GASOLINE_92: "92号",
    GASOLINE_95: "95号",
    GASOLINE_98: "98号",
    DIESEL_0: "0号",
  };
  return map[fuelType] || fuelType;
}

/**
 * 格式化价格变动
 */
export function formatPriceChange(priceChange) {
  if (priceChange == null || priceChange === 0) {
    return "-";
  }
  
  const change = Number(priceChange);
  const sign = change > 0 ? "+" : "";
  const color = change > 0 ? "#e74c3c" : "#27ae60";
  return `<span style="color: ${color}; font-weight: 500;">${sign}${change.toFixed(3)}</span>`;
}

/**
 * 构建查询参数
 */
export function buildQuery(formData, page = 0, size = 20) {
  const query = new URLSearchParams();
  
  for (const [key, value] of formData.entries()) {
    const trimmed = String(value).trim();
    if (trimmed) {
      query.set(key, trimmed);
    }
  }
  
  query.set("page", String(page));
  query.set("size", String(size));
  
  return query;
}

/**
 * 转换为仅日期对象
 */
export function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

/**
 * 添加月份
 */
export function addMonths(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDateValue(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 解析日期字符串
 */
export function parseDateValue(value) {
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

/**
 * 判断两个日期是否相同
 */
export function isSameDate(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
