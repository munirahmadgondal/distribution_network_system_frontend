import { ArrowDownOutlined, ArrowUpOutlined, BankOutlined, ReloadOutlined, ShopOutlined, ShoppingCartOutlined, SwapOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { getData } from '../../services/api';

interface OverviewPeriod {
  period: string;
  factory_load_value: string;
  factory_paid: string;
  factory_bags: string;
  retailer_dispatch_value: string;
  retailer_bags: string;
  retailer_receipts: string;
}
interface OverviewResponse {
  from: string;
  to: string;
  summary: {
    factoryLoadValue: number; factoryPaid: number; factoryBags: number; factoryPayable: number;
    retailerDispatchValue: number; retailerBags: number; retailerReceipts: number;
    retailerOutstanding: number; undistributedBags: number;
  };
  periods: OverviewPeriod[];
}

const money = (value: unknown) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const quantity = (value: unknown) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });

function FlowChart({ periods }: { periods: OverviewPeriod[] }) {
  const series = [
    { key: 'factory_load_value' as const, label: 'Factory Load', color: '#2f6f4e' },
    { key: 'retailer_dispatch_value' as const, label: 'Retailer Dispatch', color: '#d99a2b' },
    { key: 'retailer_receipts' as const, label: 'Retailer Receipts', color: '#3b82b8' },
  ];
  const width = 1040, height = 310, left = 72, right = 24, top = 24, bottom = 54;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...periods.flatMap(period => series.map(item => Number(period[item.key]) || 0)));
  const ticks = Array.from({ length: 5 }, (_, index) => maximum * index / 4);
  const groupWidth = chartWidth / Math.max(periods.length, 1);
  const barWidth = Math.min(24, Math.max(8, (groupWidth - 18) / series.length));
  return <div className="overview-chart-wrap">
    <div className="overview-chart-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }}/>{item.label}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly factory load, retailer dispatch and retailer receipt comparison">
      {ticks.map((tick, index) => {
        const y = top + chartHeight - (tick / maximum) * chartHeight;
        return <g key={tick}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#dce8e1"/><text x={left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#60756a">{tick >= 1000000 ? `${(tick / 1000000).toFixed(1)}m` : tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick.toFixed(0)}</text></g>;
      })}
      {periods.map((period, periodIndex) => {
        const startX = left + periodIndex * groupWidth + (groupWidth - barWidth * series.length) / 2;
        return <g key={period.period}>
          {series.map((item, seriesIndex) => {
            const value = Number(period[item.key]) || 0;
            const barHeight = value / maximum * chartHeight;
            return <rect key={item.key} x={startX + seriesIndex * barWidth} y={top + chartHeight - barHeight} width={barWidth - 2} height={barHeight} rx="3" fill={item.color}><title>{`${item.label}: ${money(value)}`}</title></rect>;
          })}
          <text x={left + periodIndex * groupWidth + groupWidth / 2} y={height - 24} textAnchor="middle" fontSize="11" fill="#40584c">{dayjs(`${period.period}-01`).format('MMM YY')}</text>
        </g>;
      })}
    </svg>
  </div>;
}

export function GeneralOverviewReportPage() {
  const initialFrom = dayjs().subtract(5, 'month').startOf('month');
  const [from, setFrom] = useState(initialFrom.format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState<OverviewResponse>();
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    try { setData(await getData<OverviewResponse>(`/crud/reports/general-overview?from=${from}&to=${to}`)); }
    catch { message.error('Unable to load the general overview'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const rows = useMemo(() => (data?.periods || []).map(period => ({
    ...period,
    key: period.period,
    factory_gap: Number(period.factory_load_value) - Number(period.factory_paid),
    collection_gap: Number(period.retailer_dispatch_value) - Number(period.retailer_receipts),
  })), [data]);
  const summary = data?.summary;
  const collectionRate = summary?.retailerDispatchValue ? summary.retailerReceipts / summary.retailerDispatchValue * 100 : 0;
  return <div className="general-overview-page">
    <div className="crud-header"><div><Typography.Title level={3}>General Overview</Typography.Title><Typography.Text>Executive view of inventory movement and cash conversion from factory to retailer.</Typography.Text></div></div>
    <Card className="overview-filter-card">
      <Space wrap align="end">
        <div><Typography.Text className="ledger-filter-label">From</Typography.Text><DatePicker value={dayjs(from)} format="DD-MMM-YYYY" onChange={value => value && setFrom(value.format('YYYY-MM-DD'))}/></div>
        <div><Typography.Text className="ledger-filter-label">To</Typography.Text><DatePicker value={dayjs(to)} format="DD-MMM-YYYY" onChange={value => value && setTo(value.format('YYYY-MM-DD'))}/></div>
        <Button type="primary" icon={<ReloadOutlined/>} loading={loading} onClick={() => void load()}>Refresh Overview</Button>
      </Space>
    </Card>
    <Row gutter={[14, 14]} className="overview-kpi-row">
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Factory Load Value" value={summary?.factoryLoadValue || 0} formatter={money} prefix={<ShopOutlined/>}/><Typography.Text type="secondary">{quantity(summary?.factoryBags)} bags picked</Typography.Text></Card></Col>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Paid to Factory" value={summary?.factoryPaid || 0} formatter={money} prefix={<BankOutlined/>}/><Tag color={(summary?.factoryPayable || 0) > 0 ? 'gold' : 'green'}>{money(summary?.factoryPayable)} payable</Tag></Card></Col>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Sent to Retailers" value={summary?.retailerDispatchValue || 0} formatter={money} prefix={<ShoppingCartOutlined/>}/><Typography.Text type="secondary">{quantity(summary?.retailerBags)} bags dispatched</Typography.Text></Card></Col>
      <Col xs={24} sm={12} xl={6}><Card><Statistic title="Received from Retailers" value={summary?.retailerReceipts || 0} formatter={money} prefix={<SwapOutlined/>}/><Tag color={collectionRate >= 90 ? 'green' : collectionRate >= 70 ? 'gold' : 'red'}>{collectionRate.toFixed(1)}% collected</Tag></Card></Col>
    </Row>
    <Row gutter={[14, 14]} className="overview-control-row">
      <Col xs={24} md={8}><Card size="small"><Statistic title="Retailer Outstanding" value={summary?.retailerOutstanding || 0} formatter={money} prefix={<ArrowUpOutlined/>}/></Card></Col>
      <Col xs={24} md={8}><Card size="small"><Statistic title="Undistributed Inventory" value={summary?.undistributedBags || 0} formatter={quantity} suffix="bags" prefix={<ArrowDownOutlined/>}/></Card></Col>
      <Col xs={24} md={8}><Card size="small"><Statistic title="Value Spread" value={(summary?.retailerDispatchValue || 0) - (summary?.factoryLoadValue || 0)} formatter={money}/></Card></Col>
    </Row>
    <Card title="Monthly Flow Comparison" className="overview-table-card">
      <Table loading={loading} rowKey="key" pagination={false} scroll={{ x: 1050 }} dataSource={rows} summary={() => summary ? <Table.Summary.Row>
        <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
        {[summary.factoryLoadValue, summary.factoryPaid, summary.factoryPayable, summary.retailerDispatchValue, summary.retailerReceipts, summary.retailerOutstanding].map((value, index) => <Table.Summary.Cell index={index + 1} align="right" key={index}><strong>{money(value)}</strong></Table.Summary.Cell>)}
        <Table.Summary.Cell index={7}/>
      </Table.Summary.Row> : null} columns={[
        { title: 'Period', dataIndex: 'period', fixed: 'left', render: value => dayjs(`${value}-01`).format('MMMM YYYY') },
        { title: 'Factory Load', dataIndex: 'factory_load_value', align: 'right', render: money },
        { title: 'Factory Paid', dataIndex: 'factory_paid', align: 'right', render: money },
        { title: 'Factory Gap', dataIndex: 'factory_gap', align: 'right', render: money },
        { title: 'Retailer Dispatch', dataIndex: 'retailer_dispatch_value', align: 'right', render: money },
        { title: 'Retailer Receipts', dataIndex: 'retailer_receipts', align: 'right', render: money },
        { title: 'Collection Gap', dataIndex: 'collection_gap', align: 'right', render: money },
        { title: 'Physical Flow', align: 'right', render: (_, row) => `${quantity(row.retailer_bags)} / ${quantity(row.factory_bags)} bags` },
      ]}/>
      <Typography.Paragraph type="secondary" className="overview-note">Physical Flow shows retailer-dispatched bags versus factory-picked bags. Value Spread is a period-level operating indicator, not an accounting profit figure.</Typography.Paragraph>
    </Card>
    <Card title="Monthly Value Movement" className="overview-chart-card"><FlowChart periods={data?.periods || []}/></Card>
  </div>;
}
