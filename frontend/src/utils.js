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
