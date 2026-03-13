import dayjs from 'dayjs';

export const CHINA_HOLIDAYS = {
  2025: [
    { name: '元旦', dates: ['2025-01-01'] },
    { 
      name: '春节', 
      dates: [
        '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
        '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04'
      ]
    },
    { name: '清明节', dates: ['2025-04-04', '2025-04-05', '2025-04-06'] },
    { name: '劳动节', dates: ['2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05'] },
    { name: '端午节', dates: ['2025-05-31', '2025-06-01', '2025-06-02'] },
    { name: '中秋节', dates: ['2025-10-06'] },
    { 
      name: '国庆节', 
      dates: [
        '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04',
        '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08'
      ]
    },
  ],
  2026: [
    { name: '元旦', dates: ['2026-01-01', '2026-01-02', '2026-01-03'] },
    { 
      name: '春节', 
      dates: [
        '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
        '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23'
      ]
    },
    { name: '清明节', dates: ['2026-04-04', '2026-04-05', '2026-04-06'] },
    { name: '劳动节', dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'] },
    { name: '端午节', dates: ['2026-06-19', '2026-06-20', '2026-06-21'] },
    { 
      name: '国庆节', 
      dates: [
        '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
        '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'
      ]
    },
  ],
};

const holidaySet = new Set();
Object.values(CHINA_HOLIDAYS).forEach(yearHolidays => {
  yearHolidays.forEach(holiday => {
    holiday.dates.forEach(date => holidaySet.add(date));
  });
});

export function isHoliday(dateStr) {
  return holidaySet.has(dateStr);
}

export function isWeekend(date) {
  const day = dayjs(date).day();
  return day === 0 || day === 6;
}

export function isWorkday(date) {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  return !isWeekend(date) && !isHoliday(dateStr);
}

export function addWorkdays(startDate, workdaysToAdd) {
  let current = dayjs(startDate);
  let remainingDays = workdaysToAdd;

  while (remainingDays > 0) {
    current = current.add(1, 'day');
    if (isWorkday(current)) {
      remainingDays--;
    }
  }

  return current;
}

export function getNextAdjustmentDate(lastAdjustmentDate) {
  return addWorkdays(lastAdjustmentDate, 10);
}

export function generateAdjustmentDates(startYear, startDate, count = 25) {
  const dates = [];
  let current = dayjs(startDate);

  for (let i = 0; i < count; i++) {
    dates.push(current.format('YYYY-MM-DD'));
    current = addWorkdays(current, 10);
  }

  return dates;
}

export const KNOWN_ADJUSTMENT_DATES = {
  2025: generateAdjustmentDates(2025, '2025-01-02', 25),
  2026: generateAdjustmentDates(2026, '2026-01-06', 25),
};

const allAdjustmentDates = new Set();
Object.values(KNOWN_ADJUSTMENT_DATES).forEach(yearDates => {
  yearDates.forEach(date => allAdjustmentDates.add(date));
});

export function isAdjustmentDate(dateStr) {
  return allAdjustmentDates.has(dateStr);
}

export function getNextAdjustmentFromToday() {
  const today = dayjs().format('YYYY-MM-DD');
  const year = dayjs().year();
  const yearDates = KNOWN_ADJUSTMENT_DATES[year] || [];
  
  const futureDate = yearDates.find(date => date > today);
  if (futureDate) {
    return futureDate;
  }
  
  const nextYear = year + 1;
  const nextYearDates = KNOWN_ADJUSTMENT_DATES[nextYear];
  return nextYearDates ? nextYearDates[0] : null;
}
