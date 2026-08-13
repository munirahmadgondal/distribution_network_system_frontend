import { ClearOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Empty, Input, Radio, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getData } from '../../services/api';

interface Option { value: string; label: string }
interface LedgerEntry {
  source_id: string; date: string | null; cashflow_type: string; description: string;
  receivable?: string; payable?: string; debit?: string; credit?: string; balance_effect?: string; sort_type?: number;
}
interface LedgerResponse { retailer?: { name: string }; plant?: { name: string }; entries: LedgerEntry[] }
const money = (value: unknown) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const dateText = (value: string | null) => value ? dayjs(value).format('DD-MMM-YYYY') : '—';

export function EntityLedgerReportPage({ kind }: { kind: 'retailer' | 'factory' }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [ledger, setLedger] = useState<LedgerResponse>();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [search, setSearch] = useState('');
  const [draftFrom, setDraftFrom] = useState<string>();
  const [draftTo, setDraftTo] = useState<string>();
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const isRetailer = kind === 'retailer';
  const entityLabel = isRetailer ? 'Retailer' : 'Factory Plant';

  useEffect(() => {
    setSelectedId(undefined); setLedger(undefined); setSearch(''); setDateFrom(undefined); setDateTo(undefined);
    getData<Option[]>(`/crud/${isRetailer ? 'retailers' : 'factory_plant'}/options?limit=500`)
      .then(setOptions).catch(() => message.error(`Unable to load ${isRetailer ? 'retailers' : 'factory plants'}`));
  }, [isRetailer]);

  async function selectEntity(id?: string) {
    setSelectedId(id); setLedger(undefined);
    if (!id) return;
    setLoading(true);
    try { setLedger(await getData<LedgerResponse>(`/crud/${isRetailer ? 'retailer-ledger' : 'factory-plant-ledger'}/${id}`)); }
    catch { message.error(`Unable to load ${isRetailer ? 'retailer' : 'factory'} ledger`); }
    finally { setLoading(false); }
  }

  const query = search.trim().toLowerCase();
  const filtered = (ledger?.entries || []).filter((entry) => {
    if (query && !entry.cashflow_type.toLowerCase().includes(query) && !String(entry.description || '').toLowerCase().includes(query)) return false;
    if (!entry.date) return !dateFrom && !dateTo;
    const date = dayjs(entry.date);
    return (!dateFrom || !date.isBefore(dayjs(dateFrom), 'day')) && (!dateTo || !date.isAfter(dayjs(dateTo), 'day'));
  });
  const direction = order === 'ASC' ? 1 : -1;
  const ordered = [...filtered].sort((a, b) => ((a.date ? dayjs(a.date).valueOf() : 0) - (b.date ? dayjs(b.date).valueOf() : 0)) * direction || (Number(a.sort_type || 0) - Number(b.sort_type || 0)) * direction || (Number(a.source_id) - Number(b.source_id)) * direction);
  let balance = order === 'ASC' ? 0 : ordered.reduce((sum, entry) => sum + Number(entry.balance_effect || 0), 0);
  const rows = ordered.map((entry) => { if (order === 'ASC') balance += Number(entry.balance_effect || 0); const current = balance; if (order === 'DESC') balance -= Number(entry.balance_effect || 0); return { ...entry, balance: current }; });
  const debit = (entry: LedgerEntry) => isRetailer ? entry.receivable : entry.debit;
  const credit = (entry: LedgerEntry) => isRetailer ? entry.payable : entry.credit;

  function clear() { setSearch(''); setDraftFrom(undefined); setDraftTo(undefined); setDateFrom(undefined); setDateTo(undefined); }
  async function download() {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.json_to_sheet(rows.map((entry) => ({ Date: dateText(entry.date), 'Cashflow Type': entry.cashflow_type, Description: entry.description, Debit: Number(debit(entry)) || '', Credit: Number(credit(entry)) || '', Balance: entry.balance })));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, `${entityLabel} Ledger`);
    const name = (ledger?.retailer?.name || ledger?.plant?.name || entityLabel).replace(/[\\/:*?"<>|]/g, '-');
    XLSX.writeFile(book, `${name} Ledger.xlsx`);
  }

  return <div>
    <div className="crud-header retailer-dispatch-page-header"><div><Typography.Title level={3}>{isRetailer ? 'Retailer' : 'Factory'} Report</Typography.Title><Typography.Text>View transactions and running balance.</Typography.Text></div></div>
    <div className="ledger-filter-row ledger-filter-standalone">
      <Space wrap align="end">
        <div><Typography.Text className="ledger-filter-label">{entityLabel}</Typography.Text><Select showSearch allowClear optionFilterProp="label" placeholder={`Select ${entityLabel}`} options={options} value={selectedId} onChange={selectEntity} style={{ width: 240 }} /></div>
        <div><Typography.Text className="ledger-filter-label">Search Title or Description</Typography.Text><Input allowClear prefix={<SearchOutlined />} placeholder="Search title or description" value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 280 }} /></div>
        <div><Typography.Text className="ledger-filter-label">Date From</Typography.Text><DatePicker value={draftFrom ? dayjs(draftFrom) : null} format="DD-MMM-YYYY" onChange={(value) => setDraftFrom(value?.format('YYYY-MM-DD'))} /></div>
        <div><Typography.Text className="ledger-filter-label">Date To</Typography.Text><DatePicker value={draftTo ? dayjs(draftTo) : null} format="DD-MMM-YYYY" onChange={(value) => setDraftTo(value?.format('YYYY-MM-DD'))} /></div>
        <Button type="primary" icon={<SearchOutlined />} onClick={() => { setDateFrom(draftFrom); setDateTo(draftTo); }}>Search</Button>
        <Button icon={<ClearOutlined />} onClick={clear}>Clear</Button>
      </Space>
      <Button icon={<DownloadOutlined />} onClick={download} disabled={!rows.length}>Download Excel</Button>
    </div>
    <Card title={`${ledger?.retailer?.name || ledger?.plant?.name || entityLabel} Ledger`} style={{ marginTop: 16 }} extra={<Radio.Group size="small" value={order} onChange={(event) => setOrder(event.target.value)} optionType="button" buttonStyle="solid" options={['ASC', 'DESC']} />}>
      {!selectedId && <Empty description={`Select a ${entityLabel.toLowerCase()} to view the ledger`} />}
      {selectedId && <Table loading={loading} rowKey={(record, index) => `${record.source_id}-${index}`} pagination={false} dataSource={rows} columns={[
        { title: 'Date', dataIndex: 'date', render: dateText }, { title: 'Cashflow Type', dataIndex: 'cashflow_type' }, { title: 'Description', dataIndex: 'description', render: (value) => value || '—' },
        { title: 'Debit', align: 'right', render: (_, record) => Number(debit(record)) ? money(debit(record)) : '—' }, { title: 'Credit', align: 'right', render: (_, record) => Number(credit(record)) ? money(credit(record)) : '—' },
        { title: 'Balance', dataIndex: 'balance', align: 'right', render: money },
      ]} />}
    </Card>
  </div>;
}
