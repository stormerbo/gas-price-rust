import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Select,
  Table,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import LocalPrices from '../components/LocalPrices.jsx';
import { PROVINCES, FUEL_TYPE_NAMES, FUEL_TYPES } from '../constants.js';
import { deleteRecord, fetchHistory, triggerCrawl, updateRecord } from '../api/index.js';
import { buildQuery, formatPriceChange, mapFuelType, showToast } from '../utils.js';

const { Title } = Typography;

export default function HomePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [sorter, setSorter] = useState({ field: 'effectiveDate', order: 'descend' });
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustRow, setAdjustRow] = useState(null);
  const [adjustPrice, setAdjustPrice] = useState(null);

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
      {
        title: '操作',
        key: 'action',
        width: 160,
        render: (_, record) => (
          <div className="row-actions">
            <button
              type="button"
              className="action-link"
              onClick={() => openAdjust(record)}
            >
              调价
            </button>
            <span className="action-sep">|</span>
            <button
              type="button"
              className="action-link danger"
              onClick={() => handleDelete(record)}
            >
              删除
            </button>
          </div>
        ),
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
      dates: [dayjs().subtract(30, 'day'), dayjs()],
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

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除这条记录吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deleteRecord(record.id);
          showToast('删除成功');
          fetchTable(pagination.current, pagination.pageSize, sorter);
        } catch (err) {
          showToast(err.message || '删除失败', 'error');
        }
      },
    });
  };

  const openAdjust = (record) => {
    setAdjustRow(record);
    setAdjustPrice(Number(record.pricePerLiter).toFixed(3));
    setAdjustOpen(true);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustRow) return;
    const price = Number(adjustPrice);
    if (!(price > 0)) {
      showToast('请输入大于 0 的数字', 'error');
      return;
    }

    const payload = {
      province: adjustRow.province,
      fuelType: adjustRow.fuelType,
      effectiveDate: adjustRow.effectiveDate,
      pricePerLiter: price,
    };

    try {
      await updateRecord(adjustRow.id, payload);
      showToast('调价成功');
      setAdjustOpen(false);
      fetchTable(pagination.current, pagination.pageSize, sorter);
    } catch (err) {
      showToast(err.message || '调价失败', 'error');
    }
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
        <Title level={1}>中国汽油价格管理系统</Title>
        <p>按省份与油品类型查询历史油价，快速调价与维护记录。</p>
      </header>

      <LocalPrices />

      <section className="card reveal delay-2">
        <div className="section-header">
          <h2>历史记录</h2>
          <Button className="btn" onClick={handleCrawl} loading={loading}>
            爬取最新油价
          </Button>
        </div>

        <Form layout="inline" form={form} className="filters" onFinish={handleSearch}>
          <Form.Item name="province" label="省份">
            <Select
              placeholder="全部省份"
              allowClear
              style={{ minWidth: 140 }}
              options={PROVINCES.map((p) => ({ value: p, label: p }))}
            />
          </Form.Item>
          <Form.Item name="fuelType" label="油品">
            <Select
              placeholder="全部油品"
              allowClear
              style={{ minWidth: 140 }}
              options={FUEL_TYPES.map((f) => ({ value: f, label: FUEL_TYPE_NAMES[f] }))}
            />
          </Form.Item>
          <Form.Item name="dates" label="日期">
            <DatePicker.RangePicker format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
        </Form>

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

      <p id="toast" className="toast"></p>

      <Modal
        title="调价"
        open={adjustOpen}
        onOk={handleAdjustSubmit}
        onCancel={() => setAdjustOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <p>输入新的单价（元/升）</p>
        <InputNumber
          value={adjustPrice}
          onChange={(value) => setAdjustPrice(value)}
          precision={3}
          min={0}
          style={{ width: '100%' }}
        />
      </Modal>
    </>
  );
}
