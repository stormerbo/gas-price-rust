import React, { useState, useEffect } from 'react';
import { Card, Form, Select, DatePicker, Button, Table, Space, message, Popconfirm } from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { gasPriceAPI } from '../services/api';

const { RangePicker } = DatePicker;

const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
];

const FUEL_TYPES = [
  { label: '92号汽油', value: 'GASOLINE_92' },
  { label: '95号汽油', value: 'GASOLINE_95' },
  { label: '98号汽油', value: 'GASOLINE_98' },
  { label: '0号柴油', value: 'DIESEL_0' },
];

const FUEL_TYPE_MAP = {
  GASOLINE_92: '92号',
  GASOLINE_95: '95号',
  GASOLINE_98: '98号',
  DIESEL_0: '0号',
};

export default function HomePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '省份',
      dataIndex: 'province',
      key: 'province',
      width: 100,
    },
    {
      title: '油品',
      dataIndex: 'fuelType',
      key: 'fuelType',
      width: 100,
      render: (type) => FUEL_TYPE_MAP[type] || type,
    },
    {
      title: '调整日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
    },
    {
      title: '单价(元/L)',
      dataIndex: 'pricePerLiter',
      key: 'pricePerLiter',
      width: 120,
      render: (price) => `¥${price.toFixed(3)}`,
    },
    {
      title: '价格变动',
      dataIndex: 'priceChange',
      key: 'priceChange',
      width: 120,
      render: (change) => {
        if (!change) return '-';
        const color = change > 0 ? '#f5222d' : '#52c41a';
        const prefix = change > 0 ? '+' : '';
        return <span style={{ color }}>{prefix}{change.toFixed(3)}</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确定删除这条记录吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params = {
        page: page - 1,
        size: pagination.pageSize,
        province: values.province,
        fuelType: values.fuelType,
      };

      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD');
        params.endDate = values.dateRange[1].format('YYYY-MM-DD');
      }

      const response = await gasPriceAPI.getHistory(params);
      setData(response.data.content);
      setPagination({
        ...pagination,
        current: page,
        total: response.data.totalElements,
      });
    } catch (error) {
      message.error('查询失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await gasPriceAPI.delete(id);
      message.success('删除成功');
      fetchData(pagination.current);
    } catch (error) {
      message.error('删除失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleTableChange = (newPagination) => {
    fetchData(newPagination.current);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Card title="历史查询" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="inline"
          onFinish={() => fetchData(1)}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="province" label="省份">
            <Select
              placeholder="请选择省份"
              allowClear
              style={{ width: 150 }}
              showSearch
            >
              {PROVINCES.map(p => (
                <Select.Option key={p} value={p}>{p}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="fuelType" label="油品">
            <Select
              placeholder="请选择油品"
              allowClear
              style={{ width: 150 }}
            >
              {FUEL_TYPES.map(f => (
                <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="dateRange" label="日期范围">
            <RangePicker />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              查询
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
