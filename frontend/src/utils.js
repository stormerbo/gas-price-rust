import { FUEL_TYPE_NAMES } from './constants.js';

export function mapFuelType(value) {
  return FUEL_TYPE_NAMES[value] || value;
}

export function formatPriceChange(value) {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  if (num > 0) return `+${num.toFixed(3)}`;
  if (num < 0) return num.toFixed(3);
  return '0.000';
}

export function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#8c1c13' : 'rgba(28, 28, 30, 0.95)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

export function buildQuery({ province, fuelType, dates, page, size, sortBy, sortDir }) {
  const query = new URLSearchParams();
  if (province) query.set('province', province);
  if (fuelType) query.set('fuelType', fuelType);
  if (dates && dates.length === 2) {
    query.set('startDate', dates[0]);
    query.set('endDate', dates[1]);
  }
  query.set('page', String(page ?? 0));
  query.set('size', String(size ?? 20));
  if (sortBy) query.set('sortBy', sortBy);
  if (sortDir) query.set('sortDir', sortDir);
  return query;
}

/**
 * 导出数据为 CSV 文件
 * @param {Array} data - 数据数组
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToCSV(data, filename = 'export') {
  if (!data || data.length === 0) {
    showToast('没有数据可导出', 'error');
    return;
  }

  const headers = ['ID', '省份', '油品', '生效日期', '单价(元/L)', '涨跌'];
  const rows = data.map((row) => [
    row.id,
    row.province,
    mapFuelType(row.fuelType),
    row.effectiveDate,
    Number(row.pricePerLiter).toFixed(3),
    row.priceChange != null ? Number(row.priceChange).toFixed(3) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // 添加 BOM 以支持 Excel 正确显示中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`已导出 ${data.length} 条数据`);
}

/**
 * 导出数据为 Excel 文件 (使用简单的 XML 格式)
 * @param {Array} data - 数据数组
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToExcel(data, filename = 'export') {
  if (!data || data.length === 0) {
    showToast('没有数据可导出', 'error');
    return;
  }

  const headers = ['ID', '省份', '油品', '生效日期', '单价(元/L)', '涨跌'];
  const rows = data.map((row) => [
    row.id,
    row.province,
    mapFuelType(row.fuelType),
    row.effectiveDate,
    Number(row.pricePerLiter).toFixed(3),
    row.priceChange != null ? Number(row.priceChange).toFixed(3) : '',
  ]);

  // 构建简单的 HTML 表格，Excel 可以直接打开
  let tableHtml = '<table border="1">';
  tableHtml += '<tr>' + headers.map((h) => `<th>${h}</th>`).join('') + '</tr>';
  rows.forEach((row) => {
    tableHtml += '<tr>' + row.map((cell) => `<td>${cell}</td>`).join('') + '</tr>';
  });
  tableHtml += '</table>';

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>${tableHtml}</body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`已导出 ${data.length} 条数据`);
}
