import {
  BankOutlined,
  CarOutlined,
  HomeOutlined,
  ShopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Col, Row, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { StatCard } from '../components/atoms/StatCard';
import { getData } from '../services/api';

const { Title } = Typography;

export function DashboardPage() {
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    getData<Record<string, number>>('/dashboard/summary').then(setSummary).catch(() => setSummary({}));
  }, []);

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <Title level={2}>Dashboard</Title>
      </div>
      <Row className="dashboard-stats" gutter={[12, 12]}>
        <Col xs={24} sm={12} md={8} xl={4}>
          <StatCard title="Cities" value={summary.cities ?? 0} prefix={<HomeOutlined />} />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <StatCard title="Banks" value={summary.banks ?? 0} prefix={<BankOutlined />} />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <StatCard title="Retailers" value={summary.retailers ?? 0} prefix={<ShopOutlined />} />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <StatCard title="Vehicles" value={summary.vehicles ?? 0} prefix={<CarOutlined />} />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <StatCard title="Factory Dispatches" value={summary.factoryDispatches ?? 0} prefix={<SwapOutlined />} />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <StatCard title="Retailer Dispatches" value={summary.retailerDispatches ?? 0} prefix={<SwapOutlined />} />
        </Col>
      </Row>
    </div>
  );
}
