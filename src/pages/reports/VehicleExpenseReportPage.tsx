import { ClearOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Input, Radio, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { getData } from '../../services/api';

interface VehicleExpense {
  id: string;
  date: string;
  vehicle: string;
  expense_head: string;
  expense_sub_head: string;
  title: string;
  amount: string;
  payment_mode: string;
  description: string | null;
  vehicle_status: string;
}

interface VehicleExpenseReport { title: string; entries: VehicleExpense[] }

const money = (value: unknown) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const dateText = (value: string) => dayjs(value).format('DD-MMM-YYYY');

export function VehicleExpenseReportPage() {
  const [data, setData] = useState<VehicleExpenseReport>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicle, setVehicle] = useState<string>();
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  useEffect(() => {
    getData<VehicleExpenseReport>('/crud/reports/vehicle-expenses')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (data?.entries || []).filter((entry) => {
      const matchesDate = (!from || entry.date >= from) && (!to || entry.date <= to);
      const searchable = [entry.expense_head, entry.expense_sub_head, entry.title, entry.description].join(' ').toLowerCase();
      return matchesDate && (!vehicle || entry.vehicle === vehicle) && (!query || searchable.includes(query));
    });
    const direction = order === 'ASC' ? 1 : -1;
    const ordered = [...filtered].sort((a, b) =>
      (dayjs(a.date).valueOf() - dayjs(b.date).valueOf()) * direction
      || (Number(a.id) - Number(b.id)) * direction,
    );
    let balance = order === 'ASC' ? 0 : ordered.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    return ordered.map((entry) => {
      if (order === 'ASC') balance += Number(entry.amount || 0);
      const currentBalance = balance;
      if (order === 'DESC') balance -= Number(entry.amount || 0);
      return { ...entry, debit: entry.amount, credit: '0', balance: currentBalance };
    });
  }, [data, from, order, search, to, vehicle]);

  const total = rows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const vehicleOptions = useMemo(() => Array.from(new Set((data?.entries || []).filter((entry) => entry.vehicle_status === 'ACTIVE').map((entry) => entry.vehicle)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value })), [data]);
  const clear = () => { setVehicle(undefined); setSearch(''); setFrom(undefined); setTo(undefined); };
  const download = async () => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.json_to_sheet(rows.map((entry) => ({
      Date: dateText(entry.date), Vehicle: entry.vehicle,
      'Expense Sub Head': entry.expense_sub_head, Title: entry.title,
      'Payment Mode': entry.payment_mode, Description: entry.description || '-',
      Debit: Number(entry.debit), Credit: Number(entry.credit), Balance: entry.balance,
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Vehicle Expenses');
    XLSX.writeFile(book, 'Vehicle Expense Report.xlsx');
  };

  return <div>
    <div className="crud-header retailer-dispatch-page-header">
      <div><Typography.Title level={3}>{data?.title || 'Vehicle Expense Report'}</Typography.Title><Typography.Text className="retailer-dispatch-subtitle report-ledger-subtitle">View all expenses assigned to vehicles.</Typography.Text></div>
    </div>
    <div className="ledger-filter-row ledger-filter-standalone">
      <Space wrap align="end">
        <div><Typography.Text className="ledger-filter-label">Vehicle</Typography.Text><Select showSearch allowClear optionFilterProp="label" placeholder="Select vehicle" options={vehicleOptions} value={vehicle} onChange={setVehicle} style={{ width: 220 }} /></div>
        <div><Typography.Text className="ledger-filter-label">Search Expense</Typography.Text><Input allowClear prefix={<SearchOutlined />} placeholder="Search expense" value={search} onChange={(event) => setSearch(event.target.value)} style={{ width: 280 }} /></div>
        <div><Typography.Text className="ledger-filter-label">Date From</Typography.Text><DatePicker value={from ? dayjs(from) : null} format="DD-MMM-YYYY" onChange={(value) => setFrom(value?.format('YYYY-MM-DD'))} /></div>
        <div><Typography.Text className="ledger-filter-label">Date To</Typography.Text><DatePicker value={to ? dayjs(to) : null} format="DD-MMM-YYYY" onChange={(value) => setTo(value?.format('YYYY-MM-DD'))} /></div>
        <Button icon={<ClearOutlined />} onClick={clear}>Clear</Button>
      </Space>
      <Button icon={<DownloadOutlined />} onClick={download}>Download Excel</Button>
    </div>
    <Card title="Vehicle Expenses" style={{ marginTop: 16 }} extra={<Space><Typography.Text strong>Total: {money(total)}</Typography.Text><Radio.Group size="small" value={order} onChange={(event) => setOrder(event.target.value)} optionType="button" buttonStyle="solid" options={['ASC', 'DESC']} /></Space>}>
      <Table rowKey="id" loading={loading} dataSource={rows} pagination={{ pageSize: 10 }} columns={[
        { title: 'Date', dataIndex: 'date', render: dateText },
        { title: 'Vehicle', dataIndex: 'vehicle' },
        { title: 'Expense Sub Head', dataIndex: 'expense_sub_head' },
        { title: 'Title', dataIndex: 'title' },
        { title: 'Payment Mode', dataIndex: 'payment_mode' },
        { title: 'Description', dataIndex: 'description', render: (value) => value || '-' },
        { title: 'Debit', dataIndex: 'debit', align: 'right', render: (value) => Number(value) ? money(value) : '-' },
        { title: 'Credit', dataIndex: 'credit', align: 'right', render: (value) => Number(value) ? money(value) : '-' },
        { title: 'Balance', dataIndex: 'balance', align: 'right', render: money },
      ]} />
    </Card>
  </div>;
}
