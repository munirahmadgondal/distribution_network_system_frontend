import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, PrinterOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, DatePicker, Form, InputNumber, Select, Space, Typography, message } from 'antd';
import type { FormInstance } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { getData, postData } from '../services/api';

const { Title, Text } = Typography;

interface SelectOption { value: string; label: string }
interface FactoryDispatch {
  factory_plant?: string;
  date: string;
  remaining_bags: string | number;
  vehicle?: string;
  weight_in_tons: string | number;
  rate_per_ton: string | number;
  amount: string | number;
}
interface DispatchEntryValues {
  cityId?: string;
  retailerId?: string;
  noOfBags?: number;
  ratePerBag?: number;
  appliedRatePerBag?: number;
  farePerBag?: number;
  totalCementAmount?: number;
  totalFareAmount?: number;
  fareReceived?: number;
  paidByAnotherRetailer?: boolean;
  farePaidByRetailerId?: string;
  fareBalance?: number;
  grandTotal?: number;
}
interface DispatchFormValues { factoryDispatchId?: string; builtyAddedAt?: Dayjs; freightPerBag?: number; dispatches: DispatchEntryValues[] }

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const formatNumber = (value: string | number, maximumFractionDigits = 2) =>
  Number(value).toLocaleString('en-US', { maximumFractionDigits });
const errorText = (error: unknown) => {
  const detail = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
  return Array.isArray(detail) ? detail.join(', ') : detail || 'Unable to save retailer dispatches.';
};

function DispatchTableRow({
  form,
  index,
  cities,
  allRetailers,
  remainingBags,
  disabled,
  removable,
  onRemove,
}: {
  form: FormInstance<DispatchFormValues>;
  index: number;
  cities: SelectOption[];
  allRetailers: SelectOption[];
  remainingBags: number | null;
  disabled: boolean;
  removable: boolean;
  onRemove: () => void;
}) {
  const cityId = Form.useWatch(['dispatches', index, 'cityId'], form);
  const bags = Form.useWatch(['dispatches', index, 'noOfBags'], form);
  const ratePerBag = Form.useWatch(['dispatches', index, 'ratePerBag'], form);
  const appliedRatePerBag = Form.useWatch(['dispatches', index, 'appliedRatePerBag'], form);
  const farePerBag = Form.useWatch(['dispatches', index, 'farePerBag'], form);
  const fareReceived = Form.useWatch(['dispatches', index, 'fareReceived'], form);
  const paidByAnotherRetailer = Form.useWatch(['dispatches', index, 'paidByAnotherRetailer'], form);
  const retailerId = Form.useWatch(['dispatches', index, 'retailerId'], form);
  const cementPerBag = money((Number(appliedRatePerBag) || 0) - (Number(farePerBag) || 0));
  const freightTotalAmount = money((Number(bags) || 0) * (Number(farePerBag) || 0));
  const freightPending = money(freightTotalAmount - (Number(fareReceived) || 0));
  const [retailers, setRetailers] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!cityId) { setRetailers([]); return; }
    getData<SelectOption[]>(`/crud/retailer-options?cityId=${encodeURIComponent(cityId)}`)
      .then(setRetailers)
      .catch(() => setRetailers([]));
  }, [cityId]);

  useEffect(() => {
    const bagCount = Number(bags) || 0;
    const hasRate = appliedRatePerBag !== undefined && appliedRatePerBag !== null;
    if (!hasRate) {
      form.setFieldValue(['dispatches', index, 'grandTotal'], undefined);
      return;
    }
    const cementRate = Number(appliedRatePerBag);
    const freightRate = Number(farePerBag) || 0;
    form.setFieldValue(['dispatches', index, 'grandTotal'], money((cementRate - freightRate) * bagCount));
  }, [appliedRatePerBag, bags, farePerBag, form, index]);

  useEffect(() => {
    form.setFieldValue(['dispatches', index, 'appliedRatePerBag'], ratePerBag);
  }, [form, index, ratePerBag]);

  useEffect(() => {
    if (paidByAnotherRetailer) {
      form.setFieldValue(['dispatches', index, 'fareReceived'], freightTotalAmount);
    } else {
      form.setFieldValue(['dispatches', index, 'farePaidByRetailerId'], undefined);
    }
  }, [farePerBag, bags, paidByAnotherRetailer, freightTotalAmount, form, index]);

  return (
    <tr>
      <td>
        <Form.Item name={[index, 'cityId']} rules={[{ required: true, message: 'City is required' }]}>
          <Select showSearch allowClear optionFilterProp="label" placeholder="Select City" options={cities} disabled={disabled} onChange={() => form.setFieldValue(['dispatches', index, 'retailerId'], undefined)} />
        </Form.Item>
      </td>
      <td>
        <Form.Item
          name={[index, 'retailerId']}
          rules={[
            { required: true, message: 'Retailer is required' },
            { validator: (_, value) => {
              if (!value) return Promise.resolve();
              const entries: DispatchEntryValues[] = form.getFieldValue('dispatches') || [];
              const duplicate = entries.some((entry, entryIndex) => entryIndex !== index && String(entry?.retailerId) === String(value));
              return duplicate ? Promise.reject(new Error('Retailer already selected')) : Promise.resolve();
            } },
          ]}
        >
          <Select showSearch allowClear optionFilterProp="label" placeholder="Select Retailer" options={retailers} disabled={disabled || !cityId} />
        </Form.Item>
      </td>
      <td>
        <Form.Item
          name={[index, 'noOfBags']}
          rules={[
            { required: true, message: 'Bags required' },
            { type: 'number', min: 1, message: 'Minimum 1' },
            { validator: (_, value) => {
              if (!value || remainingBags == null) return Promise.resolve();
              const entries: DispatchEntryValues[] = form.getFieldValue('dispatches') || [];
              const total = entries.reduce((sum, entry) => sum + (Number(entry?.noOfBags) || 0), 0);
              return total > remainingBags ? Promise.reject(new Error(`Maximum ${remainingBags}`)) : Promise.resolve();
            } },
          ]}
        ><InputNumber className="full-width" min={1} precision={0} disabled={disabled} /></Form.Item>
      </td>
      <td><Form.Item name={[index, 'ratePerBag']} rules={[{ required: true, message: 'Rate required' }, { type: 'number', min: 0 }]}><InputNumber className="full-width" min={0} disabled={disabled} /></Form.Item></td>
      <td><Form.Item name={[index, 'appliedRatePerBag']} rules={[{ required: true, message: 'Applied rate required' }, { type: 'number', min: 0 }]}><InputNumber className="full-width" min={0} disabled={disabled} /></Form.Item></td>
      <td><Form.Item name={[index, 'farePerBag']}><InputNumber className="full-width" min={0} disabled={disabled} /></Form.Item></td>
      <td><InputNumber className="full-width" value={cementPerBag} disabled /></td>
      <td><Form.Item name={[index, 'grandTotal']}><InputNumber className="full-width" disabled /></Form.Item></td>
      <td><InputNumber className="full-width" value={freightTotalAmount} disabled /></td>
      <td><Form.Item name={[index, 'fareReceived']} rules={[{ type: 'number', min: 0 }, { validator: (_, value) => Number(value || 0) > freightTotalAmount ? Promise.reject(new Error('Cannot exceed total freight')) : Promise.resolve() }]}><InputNumber className="full-width" min={0} disabled={disabled || paidByAnotherRetailer} /></Form.Item></td>
      <td><InputNumber className="full-width" value={paidByAnotherRetailer ? 0 : freightPending} disabled /></td>
      <td className="fare-payer-cell">
        <Form.Item name={[index, 'paidByAnotherRetailer']} valuePropName="checked">
          <Checkbox disabled={disabled}>Another retailer</Checkbox>
        </Form.Item>
        {paidByAnotherRetailer && <Form.Item name={[index, 'farePaidByRetailerId']} rules={[{ required: true, message: 'Select paying retailer' }]}>
          <Select showSearch allowClear optionFilterProp="label" placeholder="Select payer" disabled={disabled} options={allRetailers.filter((option) => String(option.value) !== String(retailerId))} />
        </Form.Item>}
      </td>
      <td className="dispatch-action-cell">{removable ? <Button danger icon={<DeleteOutlined />} onClick={onRemove}>Remove</Button> : <Text type="secondary">Primary</Text>}</td>
    </tr>
  );
}

export function RetailerDispatchAddPage({ onBack }: { onBack: () => void }) {
  const [form] = Form.useForm<DispatchFormValues>();
  const [builtyOptions, setBuiltyOptions] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [allRetailers, setAllRetailers] = useState<SelectOption[]>([]);
  const [dispatch, setDispatch] = useState<FactoryDispatch | null>(null);
  const [saving, setSaving] = useState(false);
  const factoryDispatchId = Form.useWatch('factoryDispatchId', form);
  const freightPerBag = Form.useWatch('freightPerBag', form);
  const entries = Form.useWatch('dispatches', form) || [];
  const allocatedBags = useMemo(() => entries.reduce((sum, entry) => sum + (Number(entry?.noOfBags) || 0), 0), [entries]);
  const entriesGrandTotal = useMemo(() => entries.reduce((sum, entry) => {
    if (entry?.appliedRatePerBag === undefined || entry?.appliedRatePerBag === null) return sum;
    const bags = Number(entry?.noOfBags) || 0;
    return sum + (bags * ((Number(entry?.appliedRatePerBag) || 0) - (Number(entry?.farePerBag) || 0)));
  }, 0), [entries]);
  const remainingBags = dispatch ? Number(dispatch.remaining_bags) : null;
  const totalBags = dispatch ? Number(dispatch.weight_in_tons) * 20 : null;
  const unallocatedBags = remainingBags == null ? null : Math.max(0, remainingBags - allocatedBags);
  const freightTotalAmount = money((totalBags || 0) * (Number(freightPerBag) || 0));

  useEffect(() => {
    Promise.all([
      getData<SelectOption[]>('/crud/t_factory_dispatch/options?limit=200'),
      getData<SelectOption[]>('/crud/city/options?limit=200'),
      getData<SelectOption[]>('/crud/retailers/options?limit=500'),
    ]).then(([builty, cityOptions, retailerOptions]) => { setBuiltyOptions(builty); setCities(cityOptions); setAllRetailers(retailerOptions); })
      .catch(() => message.error('Unable to load dispatch form options'));
  }, []);

  useEffect(() => {
    if (!factoryDispatchId) { setDispatch(null); return; }
    getData<FactoryDispatch>(`/crud/t_factory_dispatch/${factoryDispatchId}`)
      .then(setDispatch)
      .catch(() => { setDispatch(null); message.error('Unable to load the selected Builty Number'); });
  }, [factoryDispatchId]);

  async function save() {
    try {
      const values = await form.validateFields();
      if (remainingBags != null && allocatedBags > remainingBags) {
        message.error(`Combined bags cannot exceed ${remainingBags}`);
        return;
      }
      setSaving(true);
      await postData('/crud/retailer-dispatch/batch', { ...values, builtyAddedAt: values.builtyAddedAt?.toISOString() });
      message.success(`${values.dispatches.length} retailer dispatch${values.dispatches.length === 1 ? '' : 'es'} saved`);
      onBack();
    } catch (error) {
      if ((error as { errorFields?: unknown[] }).errorFields) return;
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="retailer-dispatch-add-page">
      <Form form={form} layout="vertical" initialValues={{ builtyAddedAt: dayjs(), freightPerBag: 0, dispatches: [{ fareReceived: 0, farePerBag: 0 }] }}>
        <div className="crud-header retailer-dispatch-page-header">
          <div>
            <div className="retailer-dispatch-title-row">
              <Button type="text" aria-label="Back to Retailer Dispatches" icon={<ArrowLeftOutlined />} onClick={onBack} />
              <Title level={3}>New Retailer Dispatches</Title>
            </div>
            <Text className="retailer-dispatch-subtitle">Create one or more retailer deliveries against the same builty.</Text>
          </div>
          <div className="retailer-dispatch-header-actions">
            <div className="header-builty-select">
              <Text strong>Builty Number</Text>
              <Form.Item name="factoryDispatchId">
                <Select showSearch allowClear optionFilterProp="label" placeholder="Select Builty Number" options={builtyOptions} />
              </Form.Item>
            </div>
            <div className="header-builty-select">
              <Text strong>Builty Added Date & Time</Text>
              <Form.Item name="builtyAddedAt" rules={[{ required: true, message: 'Builty Added Date & Time is required' }]}>
                <DatePicker showTime className="full-width" format="DD-MMM-YYYY hh:mm A" />
              </Form.Item>
            </div>
          </div>
        </div>
        <Card title="Builty Dispatch" className="dispatch-section-card">
        <div className="builty-table-wrap">
          <table className="builty-info-table">
            <thead><tr><th>Factory</th><th>Date</th><th>Vehicle</th><th>Tons</th><th>No. of Bags</th><th>Amount Per Ton</th><th>Total Amount</th><th>Fare Per Bag</th><th>Total Fare Amount</th><th>Allocated Bags</th><th>Remaining Bags</th></tr></thead>
            <tbody><tr>
              <td className="metric-cell">{dispatch?.factory_plant || '—'}</td><td className="metric-cell">{dispatch?.date ? dispatch.date.slice(0, 10) : '—'}</td><td className="metric-cell">{dispatch?.vehicle || '—'}</td><td className="metric-cell">{dispatch ? formatNumber(dispatch.weight_in_tons, 3) : '—'}</td><td className="metric-cell">{totalBags ?? '—'}</td><td className="metric-cell">{dispatch ? formatNumber(dispatch.rate_per_ton) : '—'}</td><td className="metric-cell">{dispatch ? formatNumber(dispatch.amount) : '—'}</td><td><Form.Item name="freightPerBag" rules={[{ type: 'number', min: 0 }]}><InputNumber className="full-width" min={0} disabled={!factoryDispatchId} /></Form.Item></td><td className="metric-cell">{formatNumber(freightTotalAmount)}</td><td className="metric-cell">{allocatedBags}</td><td className="metric-cell">{unallocatedBags ?? '—'}</td>
            </tr></tbody>
          </table>
        </div>
        </Card>
        <Form.List name="dispatches">
          {(fields, { add, remove }) => <Card title="Dealer Distribution" className="dispatch-section-card">
            <div className="dispatch-input-table-wrap">
              <table className="dispatch-input-table">
                <thead><tr>
                  <th>City</th><th>Retailer</th><th>Bags</th><th>Rate Per Bag</th><th>Applied Rate Per Bag</th><th>Fare Per Bag</th><th>Cement Per Bag</th><th>Total Cement</th><th>Total Fare</th><th>Fare Received</th><th>Fare Pending</th><th>Fare Paid By</th><th>Action</th>
                </tr></thead>
                <tbody>{fields.map((field, index) => <DispatchTableRow key={field.key} form={form} index={field.name} cities={cities} allRetailers={allRetailers} remainingBags={remainingBags} disabled={!factoryDispatchId} removable={index > 0} onRemove={() => remove(field.name)} />)}</tbody>
              </table>
            </div>
            <Button className="add-dispatch-button" type="primary" icon={<PlusOutlined />} onClick={() => add({ fareReceived: 0, farePerBag: 0 })} disabled={!factoryDispatchId}>Add New Row</Button>
          </Card>}
        </Form.List>
        <div className="dispatch-summary-table-wrap">
          <table className="dispatch-summary-table">
            <thead><tr><th>Total Allocated Bags</th><th>Remaining Bags</th><th>Grand Total</th></tr></thead>
            <tbody><tr><td>{allocatedBags}</td><td>{unallocatedBags ?? '—'}</td><td>{entriesGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr></tbody>
          </table>
        </div>
        <div className="page-form-actions"><Space><Button onClick={onBack}>Cancel</Button><Button icon={<PrinterOutlined />} disabled={!factoryDispatchId} onClick={() => window.print()}>Print Preview</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!factoryDispatchId} onClick={save}>Save All</Button></Space></div>
      </Form>
    </div>
  );
}
