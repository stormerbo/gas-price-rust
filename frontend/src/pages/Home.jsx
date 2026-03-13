import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Dropdown,
  Form,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import LocalPrices from '../components/LocalPrices.jsx';
import PriceAlert from '../components/PriceAlert.jsx';
import { PROVINCES, FUEL_TYPE_NAMES, FUEL_TYPES } from '../constants.js';
import { fetchHistory, triggerCrawl } from '../api/index.js';
import { buildQuery, formatPriceChange, mapFuelType, showToast, exportToCSV, exportToExcel } from '../utils.js';
import { lunarCellRender } from '../lunarCell.jsx';

dayjs.locale('zh-cn');

const { Title } = Typography;

export default function HomePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [sorter, setSorter] = useState({ field: 'effectiveDate', order: 'descend' });
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 90 },
      { title: '省份', dataIndex: 'province', width: 120 },
      {
        title: '油品',
        dataIndex: 'fuelType',
        width: 120,
        render: (value) => mapFuelType(value),
      },
      { title: '生效日期', dataIndex: 'effectiveDate', width: 140 },
      {
        title: '单价(元/L)',
        dataIndex: 'pricePerLiter',
        sorter: true,
        width: 140,
        render: (value) => Number(value).toFixed(3),
      },
      {
        title: '涨跌',
        dataIndex: 'priceChange',
        sorter: true,
        width: 120,
        render: (value) => formatPriceChange(value),
      },
    ],
    []
  );

  const fetchTable = async (page = 1, pageSize = 20, currentSorter = sorter) => {
    const values = form.getFieldsValue();
    const dates = values.dates?.length
      ? [values.dates[0].format('YYYY-MM-DD'), values.dates[1].format('YYYY-MM-DD')]
      : null;

    const sortBy = currentSorter.field === 'pricePerLiter'
      ? 'pricePerLiter'
      : currentSorter.field === 'priceChange'
      ? 'priceChange'
      : 'effectiveDate';
    const sortDir = currentSorter.order === 'ascend' ? 'asc' : 'desc';

    const query = buildQuery({
      province: values.province,
      fuelType: values.fuelType,
      dates,
      page: page - 1,
      size: pageSize,
      sortBy,
      sortDir,
    });

    setLoading(true);
    try {
      const result = await fetchHistory(query);
      setData(result.content || []);
      setPagination({
        current: result.page + 1,
        pageSize: result.size,
        total: result.totalElements,
      });
    } catch (err) {
      showToast(err.message || '查询失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      fuelType: undefined,
      province: undefined,
      dates: [dayjs().startOf('month'), dayjs().endOf('month')],
    });
    fetchTable(1, pagination.pageSize, sorter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async () => {
    await fetchTable(1, pagination.pageSize, sorter);
  };

  const handleTableChange = (pager, _filters, tableSorter) => {
    const nextSorter = tableSorter.order
      ? { field: tableSorter.field, order: tableSorter.order }
      : sorter;
    setSorter(nextSorter);
    fetchTable(pager.current, pager.pageSize, nextSorter);
  };

  const handleCrawl = async () => {
    setLoading(true);
    try {
      const result = await triggerCrawl();
      const total = result.created + result.updated;
      if (total > 0) {
        showToast(`爬取完成：新增 ${result.created} 条，更新 ${result.updated} 条`);
      } else {
        showToast(`数据已是最新（共抓取 ${result.fetchedRecords} 条，无变化）`);
      }
      fetchTable(1, pagination.pageSize, sorter);
    } catch (err) {
      showToast(err.message || '爬取失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="hero card reveal">
        <div className="hero-decoration">
          <span className="fuel-drop"></span>
          <span className="fuel-drop"></span>
          <span className="fuel-drop"></span>
        </div>
        <Title level={1}>中国油价数据</Title>
        <p className="hero-subtitle">实时追踪全国 31 省市油价动态，智能分析价格趋势</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">31</span>
            <span className="hero-stat-label">省级行政区</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">4</span>
            <span className="hero-stat-label">油品类型</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">24h</span>
            <span className="hero-stat-label">自动更新</span>
          </div>
        </div>
      </header>

      <LocalPrices />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>历史记录</h2>
        </div>

        <div className="history-toolbar">
          <Form layout="inline" form={form} className="history-filters" onFinish={handleSearch}>
            <Form.Item name="province">
              <Select
                placeholder="全部省份"
                allowClear
                showSearch={false}
                style={{ width: 120 }}
                options={PROVINCES.map((p) => ({ value: p, label: p }))}
              />
            </Form.Item>
            <Form.Item name="fuelType">
              <Select
                placeholder="全部油品"
                allowClear
                showSearch={false}
                style={{ width: 110 }}
                options={FUEL_TYPES.map((f) => ({ value: f, label: FUEL_TYPE_NAMES[f] }))}
              />
            </Form.Item>
            <Form.Item name="dates">
              <DatePicker.RangePicker format="YYYY-MM-DD" cellRender={lunarCellRender} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
            </Form.Item>
          </Form>
          <Space className="history-actions">
            <Button onClick={handleCrawl} loading={loading}>检查更新</Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'csv', label: '导出 CSV', disabled: data.length === 0, onClick: () => exportToCSV(data, '油价数据') },
                  { key: 'excel', label: '导出 Excel', disabled: data.length === 0, onClick: () => exportToExcel(data, '油价数据') },
                ],
              }}
            >
              <Button>导出 ▾</Button>
            </Dropdown>
            <Button onClick={() => setAlertModalVisible(true)}>🔔 预警</Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </section>

      <PriceAlert visible={alertModalVisible} onClose={() => setAlertModalVisible(false)} />
      <p id="toast" className="toast"></p>
    </>
  );
}
