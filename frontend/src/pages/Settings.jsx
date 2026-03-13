import React, { useState, useEffect } from 'react';
import { Button, Table, Card, Form, InputNumber, DatePicker, Tabs, Space } from 'antd';
import { SyncOutlined, SettingOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  syncHolidays,
  fetchHolidays,
  fetchAdjustmentDates,
  fetchAdjustmentSettings,
  updateAdjustmentSettings,
} from '../api';
import { showToast } from '../utils';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [adjustmentDates, setAdjustmentDates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const [holidayData, adjustmentData, settingsData] = await Promise.all([
        fetchHolidays(year),
        fetchAdjustmentDates(year),
        fetchAdjustmentSettings(),
      ]);
      setHolidays(holidayData);
      setAdjustmentDates(adjustmentData);
      setSettings(settingsData);
      
      form.setFieldsValue({
        workdaysInterval: settingsData.workdaysInterval,
        firstAdjustment2026: settingsData.firstAdjustment2026 ? dayjs(settingsData.firstAdjustment2026) : null,
      });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncHolidays();
      showToast(result.message);

      const year = new Date().getFullYear();
      const [holidayData, adjustmentData] = await Promise.all([
        fetchHolidays(year),
        fetchAdjustmentDates(year),
      ]);
      setHolidays(holidayData);
      setAdjustmentDates(adjustmentData);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async (values) => {
    setLoading(true);
    try {
      const payload = {
        workdaysInterval: values.workdaysInterval,
        firstAdjustment2026: values.firstAdjustment2026 ? values.firstAdjustment2026.format('YYYY-MM-DD') : null,
      };
      await updateAdjustmentSettings(payload);
      showToast('配置已保存');
      
      const year = new Date().getFullYear();
      const adjustmentData = await fetchAdjustmentDates(year);
      setAdjustmentDates(adjustmentData);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const holidayColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '节假日名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '是否休息',
      dataIndex: 'isOffDay',
      key: 'isOffDay',
      width: 100,
      render: (v) => (
        <span style={{ color: v ? '#22c55e' : '#ef4444' }}>
          {v ? '休息' : '上班'}
        </span>
      ),
    },
  ];

  const adjustmentColumns = [
    {
      title: '序号',
      dataIndex: 'sequence',
      key: 'sequence',
      width: 80,
      render: (v) => `第${v}次`,
    },
    {
      title: '调价日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
  ];

  return (
    <>
      <header className="hero card reveal">
        <h1>系统设置</h1>
        <p className="hero-subtitle">管理节假日数据和油价调整规则</p>
      </header>

      <section className="card reveal delay-1">
        <Tabs 
          defaultActiveKey="holidays"
          items={[
            {
              key: 'holidays',
              label: (
                <span>
                  <CalendarOutlined />
                  节假日管理
                </span>
              ),
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card>
                    <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>
                      从 GitHub (NateScarlet/holiday-cn) 同步最新的中国法定节假日数据。
                      系统会自动同步前一年、当年和下一年的数据。
                    </p>
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={syncing} />}
                      onClick={handleSync}
                      loading={syncing}
                      size="large"
                    >
                      {syncing ? '正在同步...' : '同步节假日数据'}
                    </Button>
                  </Card>

                  <Card title={`${new Date().getFullYear()}年节假日列表`}>
                    <Table
                      dataSource={holidays}
                      columns={holidayColumns}
                      rowKey="id"
                      loading={loading}
                      pagination={{ pageSize: 20 }}
                      size="small"
                    />
                  </Card>
                </Space>
              ),
            },
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined />
                  调价规则配置
                </span>
              ),
              children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Card>
                    <Form
                      form={form}
                      layout="inline"
                      onFinish={handleSaveSettings}
                      initialValues={settings}
                      style={{ alignItems: 'flex-start' }}
                    >
                      <Form.Item
                        label="工作日间隔"
                        name="workdaysInterval"
                        rules={[{ required: true, message: '请输入工作日间隔' }]}
                        tooltip="每隔多少个工作日调整一次油价"
                      >
                        <InputNumber min={1} max={30} style={{ width: 120 }} placeholder="10" />
                      </Form.Item>

                      <Form.Item
                        label="2026年首次调价日期"
                        name="firstAdjustment2026"
                        rules={[{ required: true, message: '请选择日期' }]}
                      >
                        <DatePicker 
                          style={{ width: 160 }} 
                          format="YYYY-MM-DD"
                          placeholder="选择日期"
                        />
                      </Form.Item>

                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading}>
                          保存配置
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>

                  <Card title={`${new Date().getFullYear()}年调价日期（基于当前配置）`}>
                    <Table
                      dataSource={adjustmentDates}
                      columns={adjustmentColumns}
                      rowKey="sequence"
                      loading={loading}
                      pagination={{ pageSize: 25 }}
                      size="small"
                    />
                  </Card>
                </Space>
              ),
            },
          ]}
        />
      </section>

      <p id="toast" className="toast"></p>
    </>
  );
}
