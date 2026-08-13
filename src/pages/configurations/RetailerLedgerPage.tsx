import { ArrowLeftOutlined, ClearOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Radio, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getData } from '../../services/api';

interface LedgerData {
  retailer: { id: string; name: string };
  entries: Array<{ cashflow_type: string; description: string; date: string | null; receivable: string; payable: string; current_balance: string; balance_effect: string; sort_type: number; source_id: string; debit_cement: string; debit_fare: string; credit_cement: string; credit_fare: string }>;
}

export function RetailerLedgerPage({ onBack }: { onBack: () => void }) {
  const encodedId = new URLSearchParams(window.location.search).get('retailerId') || '';
  let retailerId = '';
  try {
    const base64 = encodedId.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedId.length / 4) * 4, '=');
    const decoded = atob(base64);
    retailerId = /^\d+$/.test(decoded) ? decoded : '';
  } catch { retailerId = ''; }
  const [data, setData] = useState<LedgerData>();
  const [notFound, setNotFound] = useState(!retailerId);
  const [dateOrder, setDateOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [pendingDateFrom, setPendingDateFrom] = useState<string>();
  const [pendingDateTo, setPendingDateTo] = useState<string>();

  useEffect(() => {
    if (!retailerId) { setNotFound(true); return; }
    getData<LedgerData>(`/crud/retailer-ledger/${retailerId}`)
      .then((ledger) => { setData(ledger); setNotFound(false); })
      .catch(() => { setData(undefined); setNotFound(true); });
  }, [retailerId]);

  if (notFound) return <Card>
    <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
    <div style={{ display: 'flex', justifyContent: 'center', margin: '48px 0' }}>
      <Typography.Title level={3} type="danger" style={{ margin: 0, padding: '9px 18px', border: '1px solid #ff4d4f', borderRadius: 8, background: '#fff', fontSize: 16, fontWeight: 500 }}>No Retailer Found</Typography.Title>
    </div>
  </Card>;

  const money = (value: string) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const dateText = (value: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const filteredEntries = (data?.entries || []).filter((entry) => {
    if (!entry.date) return !dateFrom && !dateTo;
    const timestamp = new Date(entry.date).getTime();
    if (dateFrom && timestamp < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
    if (dateTo && timestamp > new Date(`${dateTo}T23:59:59.999`).getTime()) return false;
    return true;
  });
  const orderedEntries = [...filteredEntries].sort((left, right) => {
    const leftTime = left.date ? new Date(left.date).getTime() : 0;
    const rightTime = right.date ? new Date(right.date).getTime() : 0;
    const direction = dateOrder === 'ASC' ? 1 : -1;
    return (leftTime - rightTime) * direction
      || (Number(left.sort_type) - Number(right.sort_type)) * direction
      || (Number(left.source_id) - Number(right.source_id)) * direction;
  });
  const totalBalance = orderedEntries.reduce((total, entry) => total + Number(entry.balance_effect || 0), 0);
  let runningBalance = dateOrder === 'ASC' ? 0 : totalBalance;
  const sortedEntries = orderedEntries.map((entry) => {
    if (dateOrder === 'ASC') runningBalance += Number(entry.balance_effect || 0);
    const calculated = runningBalance;
    if (dateOrder === 'DESC') runningBalance -= Number(entry.balance_effect || 0);
    return { ...entry, calculated_balance: String(calculated) };
  });
  const breakdownText = (record: LedgerData['entries'][number], side: 'debit' | 'credit') => {
    const cement = Number(record[`${side}_cement`]);
    const fare = Number(record[`${side}_fare`]);
    if (!cement && !fare) {
      const amount = Number(side === 'debit' ? record.receivable : record.payable);
      return amount ? money(String(amount)) : '-';
    }
    return [cement > 0 ? money(String(cement)) : '', fare > 0 ? `Fare: ${money(String(fare))}` : ''].filter(Boolean).join('\n');
  };
  const breakdown = (record: LedgerData['entries'][number], side: 'debit' | 'credit') => <div>{breakdownText(record, side).split('\n').map((line) => <div key={line}>{line}</div>)}</div>;
  const description = (value: string) => {
    const dispatchMatch = String(value || '').match(/^([\d,]+) Bags of (.+) @ ([\d,.]+)$/);
    if (dispatchMatch) return <span>
      <strong className="ledger-description-label">{dispatchMatch[1]}</strong>
      {' Bags of '}
      <strong className="ledger-description-label">{dispatchMatch[2]}</strong>
      {' @ '}
      <strong className="ledger-description-label">{dispatchMatch[3]}</strong>
    </span>;
    const parts = String(value || '-').split(/(No\. of Bags:|Rate Per Bag:|Factory Plant:)/g);
    return <span>{parts.map((part, index) => /^(No\. of Bags:|Rate Per Bag:|Factory Plant:)$/.test(part)
      ? <strong className="ledger-description-label" key={`${part}-${index}`}>{part}</strong>
      : <span key={`${part}-${index}`}>{part}</span>)}</span>;
  };
  async function downloadExcel() {
    const XLSX = await import('xlsx');
    const rows = sortedEntries.map((entry) => ({
      'Cashflow Type': entry.cashflow_type,
      Date: dateText(entry.date),
      Description: entry.description,
      Debit: breakdownText(entry, 'debit'),
      Credit: breakdownText(entry, 'credit'),
      'Running Balance': Number(entry.calculated_balance),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 58 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Retailer Ledger');
    const safeName = (data?.retailer.name || 'Retailer').replace(/[\\/:*?"<>|]/g, '-');
    XLSX.writeFile(workbook, `${safeName} Ledger.xlsx`);
  }
  return <div>
    <div className="crud-header retailer-dispatch-page-header">
      <div>
        <div className="retailer-dispatch-title-row">
          <Button type="text" aria-label="Back to Retailers" icon={<ArrowLeftOutlined />} onClick={onBack} />
          <Typography.Title level={3}>{data?.retailer.name || 'Retailer'}</Typography.Title>
        </div>
        <Typography.Text className="retailer-dispatch-subtitle">View retailer transaction history and running balance.</Typography.Text>
      </div>
    </div>
    <div className="ledger-filter-row ledger-filter-standalone">
        <Space wrap align="end">
          <div><Typography.Text className="ledger-filter-label">Date From</Typography.Text><DatePicker value={pendingDateFrom ? dayjs(pendingDateFrom) : null} format="DD-MMM-YYYY" onChange={(value) => setPendingDateFrom(value?.format('YYYY-MM-DD'))} /></div>
          <div><Typography.Text className="ledger-filter-label">Date To</Typography.Text><DatePicker value={pendingDateTo ? dayjs(pendingDateTo) : null} format="DD-MMM-YYYY" onChange={(value) => setPendingDateTo(value?.format('YYYY-MM-DD'))} /></div>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => { setDateFrom(pendingDateFrom); setDateTo(pendingDateTo); }}>Search</Button>
          <Button icon={<ClearOutlined />} onClick={() => { setPendingDateFrom(undefined); setPendingDateTo(undefined); setDateFrom(undefined); setDateTo(undefined); }}>Clear</Button>
        </Space>
        <Space className="ledger-filter-actions">
          <Button type="primary" ghost style={{ background: '#fff' }} icon={<DownloadOutlined />} onClick={downloadExcel} disabled={!sortedEntries.length}>Download Excel</Button>
        </Space>
    </div>
    <Card
      title="Retailer Ledger"
      loading={!data}
      style={{ marginTop: 16 }}
      extra={<Radio.Group size="small" value={dateOrder} onChange={(event) => setDateOrder(event.target.value)} optionType="button" buttonStyle="solid" options={['ASC', 'DESC']} />}
    >
      <Table rowKey={(_, index) => String(index)} pagination={false} dataSource={sortedEntries} columns={[
        { title: 'Date', dataIndex: 'date', render: dateText },
        { title: 'Cashflow Type', dataIndex: 'cashflow_type' },
        { title: 'Description', dataIndex: 'description', render: description },
        { title: 'Debit', dataIndex: 'receivable', align: 'right', render: (_value, record) => breakdown(record, 'debit') },
        { title: 'Credit', dataIndex: 'payable', align: 'right', render: (_value, record) => breakdown(record, 'credit') },
        { title: 'Running Balance', dataIndex: 'calculated_balance', align: 'right', render: money },
      ]} />
    </Card>
  </div>;
}
