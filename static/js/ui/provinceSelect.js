// 省份选择器UI模块
import { PROVINCES } from '../constants.js';

/**
 * 填充省份选择器
 */
export function populateProvinceSelect(selectEl, options) {
  if (!selectEl) return;

  selectEl.innerHTML = options
    .map(
      (item) =>
        `<option value="${item.value}" ${item.selected ? "selected" : ""}>${item.label}</option>`,
    )
    .join("");
}

/**
 * 初始化省份选择器
 */
export function initProvinceSelects() {
  const searchProvince = document.getElementById("province");

  populateProvinceSelect(searchProvince, [
    { value: "", label: "全部省份", selected: true },
    ...PROVINCES.map((name) => ({ value: name, label: name, selected: false })),
  ]);
}
