// 油价调整日期计算模块
// 根据《石油价格管理办法》，国内油价每10个工作日调整一次

use chrono::NaiveDate;
use chrono::Datelike;

/// 中国法定节假日数据
/// 格式: (月份, 假日开始日期, 假日结束日期, 节日名称)
const CHINESE_HOLIDAYS_2024: &[(u32, u32, u32, &str)] = &[
    (1, 1, 1, "元旦"),
    (2, 10, 16, "春节"),
    (4, 4, 6, "清明节"),
    (5, 1, 5, "劳动节"),
    (6, 8, 10, "端午节"),
    (9, 15, 17, "中秋节"),
    (10, 1, 7, "国庆节"),
];

const CHINESE_HOLIDAYS_2025: &[(u32, u32, u32, &str)] = &[
    (1, 1, 1, "元旦"),
    (1, 28, 2, "春节"),
    (2, 1, 2, "春节调休"),
    (4, 4, 4, "清明节"),
    (4, 5, 6, "清明调休"),
    (5, 1, 5, "劳动节"),
    (5, 31, 2, "端午节"),
    (9, 7, 9, "中秋节"),
    (10, 1, 8, "国庆节"),
];

const CHINESE_HOLIDAYS_2026: &[(u32, u32, u32, &str)] = &[
    (1, 1, 1, "元旦"),
    (1, 28, 2, "春节"),
    (2, 16, 22, "春节"),
    (4, 4, 4, "清明节"),
    (4, 5, 5, "清明调休"),
    (5, 1, 3, "劳动节"),
    (5, 31, 2, "端午节"),
    (9, 25, 27, "中秋节"),
    (10, 1, 8, "国庆节"),
];

/// 调休工作日（周末需要上班的日子）
const HOLIDAY_WORKDAYS_2024: &[(u32, u32)] = &[
    (2, 17),
    (2, 18),
    (4, 7),
    (5, 11),
    (9, 14),
    (9, 29),
    (10, 12),
];

const HOLIDAY_WORKDAYS_2025: &[(u32, u32)] = &[
    (1, 26),
    (2, 8),
    (4, 6),
    (5, 10),
    (6, 1),
    (9, 28),
    (10, 11),
];

const HOLIDAY_WORKDAYS_2026: &[(u32, u32)] = &[
    (1, 25),
    (2, 15),
    (4, 6),
    (5, 4),
    (6, 1),
    (9, 28),
    (10, 10),
];

fn get_holidays(year: i32) -> &'static [(u32, u32, u32, &'static str)] {
    match year {
        2024 => CHINESE_HOLIDAYS_2024,
        2025 => CHINESE_HOLIDAYS_2025,
        2026 => CHINESE_HOLIDAYS_2026,
        _ => &[],
    }
}

fn get_holiday_workdays(year: i32) -> &'static [(u32, u32)] {
    match year {
        2024 => HOLIDAY_WORKDAYS_2024,
        2025 => HOLIDAY_WORKDAYS_2025,
        2026 => HOLIDAY_WORKDAYS_2026,
        _ => &[],
    }
}

fn is_weekend(date: NaiveDate) -> bool {
    let weekday = date.weekday();
    weekday == chrono::Weekday::Sat || weekday == chrono::Weekday::Sun
}

fn is_holiday(date: NaiveDate) -> bool {
    let year = date.year();
    let month = date.month();
    let day = date.day();

    for (m, start, end, _) in get_holidays(year) {
        if *m == month && day >= *start && day <= *end {
            return true;
        }
    }
    false
}

fn is_holiday_workday(date: NaiveDate) -> bool {
    let year = date.year();
    let month = date.month();
    let day = date.day();

    for (m, d) in get_holiday_workdays(year) {
        if *m == month && *d == day {
            return true;
        }
    }
    false
}

pub fn is_workday(date: NaiveDate) -> bool {
    if is_holiday_workday(date) {
        return true;
    }
    if is_weekend(date) {
        return false;
    }
    if is_holiday(date) {
        return false;
    }
    true
}

fn add_workdays(start_date: NaiveDate, days: usize) -> NaiveDate {
    let mut current = start_date;
    let mut remaining = days;

    while remaining > 0 {
        current = current.succ_opt().unwrap_or(current);
        if is_workday(current) {
            remaining -= 1;
        }
    }

    current
}

/// 根据已知的调价日期，计算下次调价日期
/// 每次调价后，需要等待10个工作日才会迎来下次调价窗口
pub fn calculate_next_adjustment_date(last_adjustment_date: NaiveDate) -> NaiveDate {
    let next_day = last_adjustment_date.succ_opt().unwrap_or(last_adjustment_date);
    add_workdays(next_day, 10)
}

/// 根据已知的调价日期列表，获取未来几次调价日期
pub fn get_future_adjustment_dates(last_adjustment_date: NaiveDate, count: usize) -> Vec<NaiveDate> {
    let mut dates = Vec::with_capacity(count);
    let mut current = last_adjustment_date;

    for _ in 0..count {
        current = calculate_next_adjustment_date(current);
        dates.push(current);
    }

    dates
}

/// 获取最近一次调价日期
pub fn get_latest_known_adjustment_date() -> NaiveDate {
    NaiveDate::from_ymd_opt(2026, 3, 9).unwrap()
}

/// 计算下次调价日期
pub fn calculate_next() -> NaiveDate {
    let latest = get_latest_known_adjustment_date();
    calculate_next_adjustment_date(latest)
}
