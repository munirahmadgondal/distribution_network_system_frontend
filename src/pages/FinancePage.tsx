import { AuditOutlined, BankOutlined, DollarOutlined, LineChartOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Form, InputNumber, Row, Select, Space, Tabs, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { StatCard } from '../components/atoms/StatCard';
import { DataTable } from '../components/molecules/DataTable';
import { CrudPage } from './CrudPage';
import { getData } from '../services/api';
import type { DataRecord } from '../types/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface AgingSummaryRow {
  bucket: string;
  invoice_count: number;
  amount: number;
}

export function FinancePage() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [receivables, setReceivables] = useState<DataRecord[]>([]);
  const [receivableSummary, setReceivableSummary] = useState<AgingSummaryRow[]>([]);
  const [payables, setPayables] = useState<DataRecord[]>([]);
  const [cashFlow, setCashFlow] = useState<DataRecord[]>([]);
  const [cashSummary, setCashSummary] = useState<Record<string, number>>({});
  const [ledgerRows, setLedgerRows] = useState<DataRecord[]>([]);
  const [recoveryAnalysis, setRecoveryAnalysis] = useState<DataRecord[]>([]);
  const [recoveryAging, setRecoveryAging] = useState<DataRecord[]>([]);
  const [recoveryPerformance, setRecoveryPerformance] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFinance();
  }, []);

  async function loadFinance() {
    setLoading(true);
    try {
      const [
        summaryData,
        arData,
        arSummaryData,
        apData,
        cashData,
        cashSummaryData,
        recoveryAnalysisData,
        recoveryAgingData,
        recoveryPerformanceData,
      ] = await Promise.all([
        getData<Record<string, number>>('/finance/summary'),
        getData<DataRecord[]>('/finance/receivables/aging'),
        getData<AgingSummaryRow[]>('/finance/receivables/aging-summary'),
        getData<DataRecord[]>('/finance/payables/aging'),
        getData<DataRecord[]>('/finance/cash-flow'),
        getData<Record<string, number>>('/finance/cash-flow-summary'),
        getData<DataRecord[]>('/finance/recovery/analysis'),
        getData<DataRecord[]>('/finance/recovery/aging'),
        getData<DataRecord[]>('/finance/recovery/performance'),
      ]);
      setSummary(summaryData);
      setReceivables(arData);
      setReceivableSummary(arSummaryData);
      setPayables(apData);
      setCashFlow(cashData);
      setCashSummary(cashSummaryData ?? {});
      setRecoveryAnalysis(recoveryAnalysisData);
      setRecoveryAging(recoveryAgingData);
      setRecoveryPerformance(recoveryPerformanceData);
    } catch {
      message.error('Unable to load finance reports');
    } finally {
      setLoading(false);
    }
  }

  async function loadCashFlow(values: { range?: unknown[] }) {
    const range = values.range as { format: (format: string) => string }[] | undefined;
    const query = range?.length === 2 ? `?from=${range[0].format('YYYY-MM-DD')}&to=${range[1].format('YYYY-MM-DD')}` : '';
    setLoading(true);
    try {
      const [rows, totals] = await Promise.all([
        getData<DataRecord[]>(`/finance/cash-flow${query}`),
        getData<Record<string, number>>(`/finance/cash-flow-summary${query}`),
      ]);
      setCashFlow(rows);
      setCashSummary(totals ?? {});
    } catch {
      message.error('Unable to load cash flow');
    } finally {
      setLoading(false);
    }
  }

  async function loadLedger(values: { type: string; id: number }) {
    setLoading(true);
    try {
      const endpointMap: Record<string, string> = {
        distributor: `/finance/ledgers/distributor/${values.id}`,
        retailer: `/finance/ledgers/retailer/${values.id}`,
        transport: `/finance/ledgers/transport-company/${values.id}`,
      };
      setLedgerRows(await getData<DataRecord[]>(endpointMap[values.type]));
    } catch {
      message.error('Unable to load ledger');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <Title level={2}>Finance</Title>
        <Text>Receivables, payables, ledgers, cash movement, and accounting reports.</Text>
      </div>
      <Row gutter={[16, 16]} className="finance-summary-row">
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Receivables" value={summary.receivables ?? 0} prefix={<AuditOutlined />} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Overdue AR" value={summary.overdueReceivables ?? 0} prefix={<LineChartOutlined />} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Payables" value={summary.payables ?? 0} prefix={<BankOutlined />} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Net Cash Flow" value={cashSummary.net_cash_flow ?? 0} prefix={<DollarOutlined />} />
        </Col>
      </Row>
      <Card className="module-card">
        <Tabs
          items={[
            {
              key: 'receivables',
              label: 'Receivables Aging',
              children: (
                <Space direction="vertical" size={16} className="full-width">
                  <Row gutter={[12, 12]}>
                    {receivableSummary.map((row) => (
                      <Col xs={24} sm={12} lg={4} key={row.bucket}>
                        <StatCard title={row.bucket} value={Number(row.amount ?? 0)} />
                      </Col>
                    ))}
                  </Row>
                  <DataTable rows={receivables} loading={loading} />
                </Space>
              ),
            },
            {
              key: 'payables',
              label: 'Payables Aging',
              children: <DataTable rows={payables} loading={loading} />,
            },
            {
              key: 'cash',
              label: 'Cash Flow',
              children: (
                <Space direction="vertical" size={16} className="full-width">
                  <Form layout="inline" onFinish={loadCashFlow}>
                    <Form.Item name="range" label="Period">
                      <RangePicker />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      Apply
                    </Button>
                  </Form>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={8}>
                      <StatCard title="Inflow" value={cashSummary.total_inflow ?? 0} />
                    </Col>
                    <Col xs={24} sm={8}>
                      <StatCard title="Outflow" value={cashSummary.total_outflow ?? 0} />
                    </Col>
                    <Col xs={24} sm={8}>
                      <StatCard title="Net Flow" value={cashSummary.net_cash_flow ?? 0} />
                    </Col>
                  </Row>
                  <DataTable rows={cashFlow} loading={loading} />
                </Space>
              ),
            },
            {
              key: 'ledger',
              label: 'Party Ledger',
              children: (
                <Space direction="vertical" size={16} className="full-width">
                  <Form layout="inline" onFinish={loadLedger} initialValues={{ type: 'distributor' }}>
                    <Form.Item name="type" label="Party" rules={[{ required: true }]}>
                      <Select
                        style={{ width: 220 }}
                        options={[
                          { value: 'distributor', label: 'Distributor' },
                          { value: 'retailer', label: 'Retailer' },
                          { value: 'transport', label: 'Transport Company' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="id" label="ID" rules={[{ required: true }]}>
                      <InputNumber min={1} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      Load
                    </Button>
                  </Form>
                  <DataTable rows={ledgerRows} loading={loading} />
                </Space>
              ),
            },
            {
              key: 'recovery',
              label: 'Recovery',
              children: (
                <Tabs
                  items={[
                    {
                      key: 'analysis',
                      label: 'Outstanding Analysis',
                      children: <DataTable rows={recoveryAnalysis} loading={loading} />,
                    },
                    {
                      key: 'aging',
                      label: 'Recovery Aging',
                      children: <DataTable rows={recoveryAging} loading={loading} />,
                    },
                    {
                      key: 'performance',
                      label: 'Performance',
                      children: <DataTable rows={recoveryPerformance} loading={loading} />,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
      <Card className="module-card finance-operations">
        <CrudPage embedded initialTable="sales_invoices" title="Financial Transactions" description="Create and maintain invoices, payments, allocations, journals, periods, credit notes, closings, and recovery records." />
      </Card>
    </div>
  );
}
