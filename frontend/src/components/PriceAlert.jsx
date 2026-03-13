import React, { useEffect, useState } from 'react';
import { Button, Form, InputNumber, Modal, Select, Switch, Table, Tag } from 'antd';
import { PROVINCES, FUEL_TYPES, FUEL_TYPE_NAMES } from '../constants.js';
import { showToast } from '../utils.js';

const STORAGE_KEY = 'gas_price_alerts';

function loadAlerts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveAlerts(alerts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function checkPriceAlerts(prices) {
  const alerts = loadAlerts();
  if (!alerts.length || !prices.length) return;

  const triggered = [];

  alerts.forEach((alert) => {
    if (!alert.enabled) return;

    const matchingPrice = prices.find(
      (p) => p.province === alert.province && p.fuelType === alert.fuelType
    );

    if (!matchingPrice) return;

    const currentPrice = matchingPrice.pricePerLiter;
    const isTriggered =
      (alert.condition === 'below' && currentPrice <= alert.targetPrice) ||
      (alert.condition === 'above' && currentPrice >= alert.targetPrice);

    if (isTriggered) {
      triggered.push({
        ...alert,
        currentPrice,
      });
    }
  });

  if (triggered.length > 0) {
    notifyUser(triggered);
  }
}

function notifyUser(triggered) {
  triggered.forEach((alert) => {
    const conditionText = alert.condition === 'below' ? '低于' : '高于';
    const message = `${alert.province} ${FUEL_TYPE_NAMES[alert.fuelType]} 当前价格 ¥${alert.currentPrice.toFixed(3)} ${conditionText}目标价 ¥${alert.targetPrice.toFixed(3)}`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('油价提醒', { body: message, icon: '⛽' });
    }

    showToast(message);
  });
}

export default function PriceAlert({ visible, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    setAlerts(loadAlerts());
  }, [visible]);

  const handleAdd = () => {
    form.validateFields().then((values) => {
      const newAlert = {
        id: Date.now(),
        ...values,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [...alerts, newAlert];
      setAlerts(updated);
      saveAlerts(updated);
      form.resetFields();
      showToast('预警已添加');
    });
  };

  const handleDelete = (id) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const handleToggle = (id, enabled) => {
    const updated = alerts.map((a) => (a.id === id ? { ...a, enabled } : a));
    setAlerts(updated);
    saveAlerts(updated);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('您的浏览器不支持通知功能', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('通知权限已开启');
    } else {
      showToast('通知权限被拒绝', 'error');
    }
  };

  const columns = [
    {
      title: '省份',
      dataIndex: 'province',
      width: 80,
    },
    {
      title: '油品',
      dataIndex: 'fuelType',
      width: 90,
      render: (val) => FUEL_TYPE_NAMES[val],
    },
    {
      title: '条件',
      dataIndex: 'condition',
      width: 70,
      render: (val) => (
        <Tag color={val === 'below' ? 'green' : 'red'}>
          {val === 'below' ? '低于' : '高于'}
        </Tag>
      ),
    },
    {
      title: '目标价',
      dataIndex: 'targetPrice',
      width: 90,
      render: (val) => `¥${val.toFixed(2)}`,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 70,
      render: (val, record) => (
        <Switch
          size="small"
          checked={val}
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_, record) => (
        <Button type="link" danger size="small" onClick={() => handleDelete(record.id)}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title="价格预警设置"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <div style={{ marginBottom: 16 }}>
        <Button onClick={requestNotificationPermission} size="small">
          开启浏览器通知
        </Button>
      </div>

      <Form form={form} layout="inline" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <Form.Item name="province" rules={[{ required: true, message: '请选择省份' }]}>
          <Select
            placeholder="省份"
            style={{ width: 100 }}
            showSearch={false}
            options={PROVINCES.map((p) => ({ value: p, label: p }))}
          />
        </Form.Item>
        <Form.Item name="fuelType" rules={[{ required: true, message: '请选择油品' }]}>
          <Select
            placeholder="油品"
            style={{ width: 100 }}
            showSearch={false}
            options={FUEL_TYPES.map((f) => ({ value: f, label: FUEL_TYPE_NAMES[f] }))}
          />
        </Form.Item>
        <Form.Item name="condition" rules={[{ required: true, message: '请选择条件' }]}>
          <Select
            placeholder="条件"
            style={{ width: 80 }}
            showSearch={false}
            options={[
              { value: 'below', label: '低于' },
              { value: 'above', label: '高于' },
            ]}
          />
        </Form.Item>
        <Form.Item name="targetPrice" rules={[{ required: true, message: '请输入目标价' }]}>
          <InputNumber
            placeholder="目标价"
            style={{ width: 100 }}
            min={0}
            max={20}
            step={0.1}
            precision={2}
            prefix="¥"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleAdd}>
            添加
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={alerts}
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
        locale={{ emptyText: '暂无预警规则' }}
      />
    </Modal>
  );
}
