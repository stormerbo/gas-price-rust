import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Typography, Badge, Modal, Table, Spin, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import lunarPlugin from 'dayjs-plugin-lunar';
import LocalPrices from '../components/LocalPrices.jsx';
import { FUEL_TYPE_NAMES } from '../constants.js';
import { fetchHistory } from '../api/index.js';
import { showToast, mapFuelType } from '../utils.js';
import { fetchAdjustmentDates, fetchHolidays } from '../api';

dayjs.extend(lunarPlugin);

function getLunarInfo(date) {
  try {
    const d = dayjs(date);
    const lunarDay = d.toLunarDay();
    const solarDay = lunarDay.getSolarDay();

    const lunarFestival = lunarDay.getFestival();
    if (lunarFestival) {
      return { text: lunarFestival.getName(), isSpecial: true };
    }

    const solarFestival = solarDay.getFestival();
    if (solarFestival) {
      return { text: solarFestival.getName(), isSpecial: true };
    }

    const termDay = solarDay.getTermDay();
    if (termDay && termDay.getDayIndex() === 0) {
      return { text: termDay.getSolarTerm().getName(), isSpecial: true };
    }

    const dayName = lunarDay.getName();
    if (dayName === '初一') {
      return { text: lunarDay.getLunarMonth().getName(), isSpecial: false };
    }
    return { text: dayName, isSpecial: false };
  } catch (e) {
    return { text: '', isSpecial: false };
  }
}

const { Title } = Typography;

async function fetchMonthData(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');

  const allRecords = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 10) {
    const query = new URLSearchParams({
      startDate,
      endDate,
      page: String(page),
      size: '200',
    });
    const data = await fetchHistory(query);
    allRecords.push(...(data.content || []));
    totalPages = data.totalPages;
    page += 1;
  }

  return allRecords;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [adjustmentDates, setAdjustmentDates] = useState(new Set());
  const [holidays, setHolidays] = useState(new Map());

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      fetchMonthData(currentDate.year(), currentDate.month() + 1),
      fetchAdjustmentDates(currentDate.year()),
      fetchHolidays(currentDate.year())
    ])
      .then(([data, adjustmentData, holidayData]) => {
        if (mounted) {
          setRecords(data);
          const dateSet = new Set(adjustmentData.map(d => d.date));
          setAdjustmentDates(dateSet);
          
          const holidayMap = new Map();
          holidayData.forEach(h => {
            holidayMap.set(h.date, { name: h.name, isOffDay: h.isOffDay });
          });
          setHolidays(holidayMap);
        }
      })
      .catch((err) => {
        showToast(err.message || '加载失败', 'error');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [currentDate.year(), currentDate.month()]);

  const dateMap = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const date = r.effectiveDate;
      if (!map[date]) {
        map[date] = { up: 0, down: 0, records: [] };
      }
      map[date].records.push(r);
      if (r.priceChange > 0) map[date].up += 1;
      else if (r.priceChange < 0) map[date].down += 1;
    });
    return map;
  }, [records]);

  const fullCellRender = (current, info) => {
    if (info.type !== 'date') return info.originNode;

    const dateStr = current.format('YYYY-MM-DD');
    const priceInfo = dateMap[dateStr];
    const lunar = getLunarInfo(current.toDate());
    const isCurrentMonth = current.month() === currentDate.month();
    const isToday = current.format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
    const isAdjustment = adjustmentDates.has(dateStr);
    const holiday = holidays.get(dateStr);

    const hasUp = priceInfo?.up > 0;
    const hasDown = priceInfo?.down > 0;

    return (
      <div 
        className={`calendar-full-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isAdjustment && isCurrentMonth ? 'adjustment-date' : ''} ${holiday?.isOffDay ? 'holiday-off' : ''}`}
        onClick={() => handleSelect(current)}
      >
        <div className="calendar-date-top">
          <div className="calendar-date-num">{current.date()}</div>
          <div className={`calendar-date-lunar ${lunar.isSpecial ? 'lunar-special' : ''}`}>
            {holiday ? holiday.name : lunar.text}
          </div>
        </div>
        <div className="calendar-date-badges">
          {holiday && isCurrentMonth && (
            <>
              {holiday.isOffDay && <span className="price-badge holiday">休</span>}
              {!holiday.isOffDay && <span className="price-badge workday">班</span>}
            </>
          )}
          {priceInfo && isCurrentMonth && (
            <>
              {hasUp && <span className="price-badge up">↑涨</span>}
              {hasDown && <span className="price-badge down">↓跌</span>}
            </>
          )}
          {!priceInfo && isAdjustment && isCurrentMonth && (
            <span className="price-badge pending">待调价</span>
          )}
        </div>
      </div>
    );
  };

  const handleSelect = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const info = dateMap[dateStr];

    if (info && info.records.length > 0) {
      setSelectedDate(dateStr);
      setSelectedRecords(info.records);
      setModalVisible(true);
    }
  };

  const handlePanelChange = (date) => {
    setCurrentDate(date);
  };

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const headerRender = () => (
    <div className="calendar-custom-header">
      <Button 
        type="text" 
        icon={<LeftOutlined />} 
        onClick={handlePrevMonth}
        className="calendar-nav-btn"
      />
      <span className="calendar-header-title">
        {currentDate.format('YYYY年M月')}
      </span>
      <Button 
        type="text" 
        icon={<RightOutlined />} 
        onClick={handleNextMonth}
        className="calendar-nav-btn"
      />
    </div>
  );

  const columns = [
    { title: '省份', dataIndex: 'province', width: 100 },
    { 
      title: '油品', 
      dataIndex: 'fuelType', 
      width: 100,
      render: (val) => mapFuelType(val),
    },
    { 
      title: '价格', 
      dataIndex: 'pricePerLiter', 
      width: 100,
      render: (val) => `¥${Number(val).toFixed(3)}`,
    },
    { 
      title: '涨跌', 
      dataIndex: 'priceChange', 
      width: 100,
      render: (val) => {
        if (!val || val === 0) return '-';
        const color = val > 0 ? '#ef4444' : '#22c55e';
        const prefix = val > 0 ? '+' : '';
        return <span style={{ color, fontWeight: 500 }}>{prefix}{val.toFixed(3)}</span>;
      },
    },
  ];

  return (
    <>
      <header className="hero card reveal">
        <Title level={1}>油价日历</Title>
        <p>日历视图查看历史油价调整记录。</p>
      </header>

      <LocalPrices />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>调价日历</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '13px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="price-badge up">↑涨</span> 涨价
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="price-badge down">↓跌</span> 降价
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="price-badge holiday">休</span> 节假日
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="price-badge workday">班</span> 补班
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="price-badge pending">待调价</span>
            </span>
          </div>
        </div>

        <Spin spinning={loading}>
          <Calendar
            value={currentDate}
            onPanelChange={handlePanelChange}
            fullCellRender={fullCellRender}
            headerRender={headerRender}
          />
        </Spin>
      </section>

      <Modal
        title={`${selectedDate} 油价调整`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={selectedRecords}
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />
      </Modal>

      <p id="toast" className="toast"></p>
    </>
  );
}
