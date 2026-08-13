import {
  BankOutlined,
  CarOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  RiseOutlined,
  ShopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { StatCard } from '../components/atoms/StatCard';
import { getData } from '../services/api';

interface InsightItem { name: string; paid: number; outstanding: number; billed?: number; payable?: number }
interface PaymentInsights { retailers: InsightItem[]; factories: InsightItem[] }
const compactMoney = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function PaymentInsightCard({ title, subtitle, items }: { title: string; subtitle: string; items: InsightItem[] }) {
  const maximum = Math.max(...items.map((item) => Math.max(item.paid, item.outstanding)), 1);
  const totalPaid = items.reduce((sum, item) => sum + item.paid, 0);
  const totalOutstanding = items.reduce((sum, item) => sum + item.outstanding, 0);
  return <Card className="payment-insight-card" title={title} extra={<Typography.Text className="payment-insight-subtitle">{subtitle}</Typography.Text>}>
    <div className="payment-insight-summary"><span>Paid <strong>{compactMoney(totalPaid)}</strong></span><span>Outstanding <strong>{compactMoney(totalOutstanding)}</strong></span></div>
    <div className="payment-insight-legend"><span><i className="paid" />Paid</span><span><i className="outstanding" />Outstanding</span></div>
    <div className="payment-insight-chart">{items.map((item) => <div className="payment-insight-row" key={item.name}>
      <div className="payment-insight-name" title={item.name}>{item.name}</div>
      <div className="payment-insight-bars">
        <div className="payment-insight-track"><div className="payment-insight-bar paid" style={{ width: `${Math.max((item.paid / maximum) * 100, item.paid ? 2 : 0)}%` }} /><span>{compactMoney(item.paid)}</span></div>
        <div className="payment-insight-track"><div className="payment-insight-bar outstanding" style={{ width: `${Math.max((item.outstanding / maximum) * 100, item.outstanding ? 2 : 0)}%` }} /><span>{compactMoney(item.outstanding)}</span></div>
      </div>
    </div>)}</div>
  </Card>;
}

export function DashboardPage({ onNavigate }: { onNavigate: (key: string) => void }) {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [insights, setInsights] = useState<PaymentInsights>({ retailers: [], factories: [] });
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    getData<Record<string, number>>('/dashboard/summary').then(setSummary).catch(() => setSummary({}));
    getData<PaymentInsights>('/dashboard/payment-insights').then(setInsights).catch(() => setInsights({ retailers: [], factories: [] })).finally(() => setInsightsLoading(false));
  }, []);

  return (
    <div className="dashboard-page">
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
      <Card className="dashboard-quick-links" size="small" title="Quick Links">
        <Space wrap>
          <Button icon={<ShopOutlined />} onClick={() => onNavigate('config:retailers')}>Retailers</Button>
          <Button icon={<HomeOutlined />} onClick={() => onNavigate('config:factory_plant')}>Factory Plants</Button>
          <Button icon={<RiseOutlined />} onClick={() => onNavigate('accounts:income_main')}>Income</Button>
          <Button icon={<DollarOutlined />} onClick={() => onNavigate('accounts:expense_main')}>Expenses</Button>
          <Button icon={<FileTextOutlined />} onClick={() => onNavigate('report:expenses')}>Reports</Button>
        </Space>
      </Card>
      <Row className="dashboard-insights" gutter={[12, 12]}>
        <Col xs={24} lg={12}><div className={insightsLoading ? 'insight-loading' : ''}><PaymentInsightCard title="Retailer Payment Insights" subtitle="Top outstanding retailers" items={insights.retailers} /></div></Col>
        <Col xs={24} lg={12}><div className={insightsLoading ? 'insight-loading' : ''}><PaymentInsightCard title="Factory Payment Insights" subtitle="Top outstanding plants" items={insights.factories} /></div></Col>
      </Row>
    </div>
  );
}
