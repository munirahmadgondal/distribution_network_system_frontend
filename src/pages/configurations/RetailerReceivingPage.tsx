import { ArrowLeftOutlined, DollarOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Radio, Row, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getData, postData } from '../../services/api';

interface ReceivingData {
  retailer: { id: string; retailer_name: string; business_name: string; city_name: string; city_area_name?: string; total_builties: number; pending_builties: number; pending_cement_amount: string };
  fareBuilties: Array<{ id: string; builty_number: string; total_fare_amount: string; received_amount: string; pending_amount: string }>;
}
interface Option { value: string; label: string }

export function RetailerReceivingPage({ onBack }: { onBack: () => void }) {
  const encodedRetailerId = new URLSearchParams(window.location.search).get('retailerId') || '';
  let retailerId = '';
  try {
    const base64 = encodedRetailerId.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedRetailerId.length / 4) * 4, '=');
    const decoded = atob(base64);
    retailerId = /^\d+$/.test(decoded) ? decoded : '';
  } catch { retailerId = ''; }
  const [data, setData] = useState<ReceivingData>();
  const [retailerNotFound, setRetailerNotFound] = useState(!retailerId);
  const [accounts, setAccounts] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [fareEmployees, setFareEmployees] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [fareToReceive, setFareToReceive] = useState<ReceivingData['fareBuilties'][number] | null>(null);
  const [fareReceiving, setFareReceiving] = useState(false);
  const [form] = Form.useForm();
  const [fareForm] = Form.useForm<{ amount: number; receivingDate: dayjs.Dayjs; paymentMode: 'BANK'|'CASH'; bankAccountId?: string; instrumentType?: string; instrumentNumber?: string; designationId?: string; employeeId?: string }>();
  const receivingFareAmount = Form.useWatch('amount', fareForm);
  const farePaymentMode = Form.useWatch('paymentMode', fareForm);
  const fareDesignationId = Form.useWatch('designationId', fareForm);
  const paymentMode = Form.useWatch('paymentMode', form);
  const designationId = Form.useWatch('designationId', form);
  const receivingCementAmount = Form.useWatch('amount', form);

  async function load() {
    if (!retailerId) { setRetailerNotFound(true); return; }
    try {
      const receivingData = await getData<ReceivingData>(`/crud/retailer-receiving/${retailerId}`);
      setData(receivingData);
      setRetailerNotFound(false);
    } catch {
      setData(undefined);
      setRetailerNotFound(true);
    }
  }
  useEffect(() => {
    void load();
    getData<Option[]>('/crud/bank-account-options?receivingEnd=DISTRIBUTOR')
      .then(setAccounts).catch(() => setAccounts([]));
    getData<Option[]>('/crud/designation/options')
      .then(setDesignations).catch(() => setDesignations([]));
  }, [retailerId]);

  useEffect(() => {
    if (paymentMode !== 'CASH' || !designationId) {
      setEmployees([]);
      form.setFieldValue('employeeId', undefined);
      return;
    }
    getData<Option[]>(`/crud/employee-options?designationId=${encodeURIComponent(String(designationId))}`)
      .then(setEmployees).catch(() => setEmployees([]));
  }, [designationId, form, paymentMode]);

  useEffect(() => {
    if (farePaymentMode !== 'CASH' || !fareDesignationId) {
      setFareEmployees([]);
      fareForm.setFieldValue('employeeId', undefined);
      return;
    }
    getData<Option[]>(`/crud/employee-options?designationId=${encodeURIComponent(String(fareDesignationId))}`)
      .then(setFareEmployees).catch(() => setFareEmployees([]));
  }, [fareDesignationId, fareForm, farePaymentMode]);

  async function submit() {
    const values = await form.validateFields(); setLoading(true);
    try {
      await postData(`/crud/retailer-receiving/${retailerId}/cement`, {
        ...values,
        receivingDate: values.receivingDate.format('YYYY-MM-DD'),
      });
      message.success('Cement payment received and allocated FIFO'); form.resetFields(); form.setFieldsValue({ paymentMode: 'BANK', receivingDate: dayjs() }); await load();
    } catch (error: any) { message.error(error.response?.data?.message || 'Payment could not be saved'); } finally { setLoading(false); }
  }
  async function confirmFareReceipt() {
    if (!fareToReceive) return;
    const values = await fareForm.validateFields();
    setFareReceiving(true);
    try {
      await postData(`/crud/retailer-receiving/dispatch/${fareToReceive.id}/fare`, {
        ...values,
        receivingDate: values.receivingDate.format('YYYY-MM-DD'),
      });
      message.success('Fare marked as received');
      setFareToReceive(null);
      await load();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Fare could not be received');
    } finally {
      setFareReceiving(false);
    }
  }
  function openFareReceipt(row: ReceivingData['fareBuilties'][number]) {
    fareForm.resetFields();
    fareForm.setFieldsValue({paymentMode:'BANK',receivingDate:dayjs()});
    setFareToReceive(row);
  }

  if (retailerNotFound) return <Card>
    <Button icon={<ArrowLeftOutlined />} onClick={onBack}>Back</Button>
    <div style={{ display: 'flex', justifyContent: 'center', margin: '48px 0' }}>
      <Typography.Title level={3} type="danger" style={{ margin: 0, padding: '9px 18px', border: '1px solid #ff4d4f', borderRadius: 8, background: '#fff', fontSize: 16, fontWeight: 500 }}>
        No Retailer Found
      </Typography.Title>
    </div>
  </Card>;
  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <div className="crud-header retailer-dispatch-page-header">
      <div>
        <div className="retailer-dispatch-title-row">
          <Button type="text" aria-label="Back to Retailers" icon={<ArrowLeftOutlined />} onClick={onBack} />
          <Typography.Title level={3}>{data ? (data.retailer.business_name || data.retailer.retailer_name) : 'Retailer'}</Typography.Title>
        </div>
        <Typography.Text className="retailer-dispatch-subtitle">Receive cement payments and settle pending freight against this retailer.</Typography.Text>
      </div>
    </div>
    <Card loading={!data} title="Retailer Receiving">
      {data && <div className="builty-table-wrap">
        <table className="builty-info-table">
          <thead><tr>
            <th>City / City Area</th>
            <th>Total No. of Bilty</th>
            <th>Pending No. of Bilty</th>
            <th>Pending Cement Amount</th>
          </tr></thead>
          <tbody><tr>
            <td className="metric-cell">{data.retailer.city_name}{data.retailer.city_area_name ? ` / ${data.retailer.city_area_name}` : ''}</td>
            <td className="metric-cell">{data.retailer.total_builties}</td>
            <td className="metric-cell">{data.retailer.pending_builties}</td>
            <td className="metric-cell">{Math.max(
              Number(data.retailer.pending_cement_amount) - (Number(receivingCementAmount) || 0),
              0,
            ).toLocaleString()}</td>
          </tr></tbody>
        </table>
      </div>}
    </Card>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}><Card title="Receive Cement Amount"><Form form={form} layout="vertical" initialValues={{ paymentMode: 'BANK', receivingDate: dayjs() }} onFinish={submit}>
        <Row gutter={16}>
          <Col xs={24} md={6}><Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}><Radio.Group onChange={() => form.setFieldsValue({ bankAccountId: undefined, instrumentType: undefined, instrumentNumber: undefined, designationId: undefined, employeeId: undefined })} options={[{ label: 'Bank', value: 'BANK' }, { label: 'Cash', value: 'CASH' }]} /></Form.Item></Col>
          {paymentMode === 'BANK' && <>
            <Col xs={24} md={6}><Form.Item name="bankAccountId" label="Bank Account" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={accounts} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="instrumentType" label="Instrument Type" rules={[{ required: true }]}><Select options={['CHEQUE', 'CASH', 'DRAFT', 'ONLINE'].map(value => ({ value, label: value[0] + value.slice(1).toLowerCase() }))} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="instrumentNumber" label="Instrument Number"><Input /></Form.Item></Col>
          </>}
          {paymentMode === 'CASH' && <>
            <Col xs={24} md={9}><Form.Item name="designationId" label="Designation" rules={[{ required: true, message: 'Designation is required' }]}><Select showSearch optionFilterProp="label" options={designations} onChange={() => form.setFieldValue('employeeId', undefined)} /></Form.Item></Col>
            <Col xs={24} md={9}><Form.Item name="employeeId" label="Receiver (Employee)" rules={[{ required: true, message: 'Receiver is required' }]}><Select showSearch optionFilterProp="label" options={employees} disabled={!designationId} /></Form.Item></Col>
          </>}
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}><Form.Item name="amount" label="Receiving Amount" rules={[{ required: true }, { type: 'number', min: 0.01 }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="receivingDate" label="Receiving Date" rules={[{ required: true, message: 'Receiving Date is required' }]}><DatePicker format="YYYY-MM-DD" allowClear={false} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item></Col>
        </Row>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" htmlType="submit" loading={loading}>Receive Amount</Button>
        </div>
      </Form></Card></Col>
      <Col xs={24} lg={8}><Card title="Pending Fare Builties"><Table rowKey="id" size="small" pagination={false} dataSource={data?.fareBuilties || []} columns={[
        { title: 'Bilty Number', dataIndex: 'builty_number' },
        { title: 'Received', dataIndex: 'received_amount', align: 'right', render: value => Number(value).toLocaleString() },
        { title: 'Pending', dataIndex: 'pending_amount', align: 'right', render: value => Number(value).toLocaleString() },
        { title: 'Action', render: (_, row) => <Button size="small" type="primary" onClick={() => openFareReceipt(row)}>Receive Fare</Button> },
      ]} /></Card></Col>
    </Row>
    <Modal
      title={<span className="modal-title"><DollarOutlined />Receive Fare</span>}
      open={Boolean(fareToReceive)}
      onCancel={() => { setFareToReceive(null); fareForm.resetFields(); }}
      onOk={confirmFareReceipt}
      confirmLoading={fareReceiving}
      okText="Receive Fare"
      cancelText="Cancel"
      width={520}
    >
      {fareToReceive && <Form form={fareForm} layout="vertical">
        <Row gutter={16}>
          <Col span={8}><Form.Item label="Bilty Number"><Input value={fareToReceive.builty_number} disabled /></Form.Item></Col>
          <Col span={8}><Form.Item label="Total Fare"><Input value={Number(fareToReceive.total_fare_amount).toLocaleString()} disabled /></Form.Item></Col>
          <Col span={8}><Form.Item label="Remaining Fare"><InputNumber value={Math.max(Number(fareToReceive.pending_amount) - (Number(receivingFareAmount) || 0), 0)} formatter={(value) => Number(value || 0).toLocaleString()} controls={false} disabled style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="amount" label="Receiving Fare" rules={[
            { required: true, message: 'Receiving Fare is required' },
            { type: 'number', min: 0.01, max: Number(fareToReceive.pending_amount), message: `Amount must be between 0.01 and ${Number(fareToReceive.pending_amount).toLocaleString()}` },
          ]}>
            <InputNumber min={0.01} max={Number(fareToReceive.pending_amount)} style={{ width: '100%' }} />
          </Form.Item></Col>
          <Col span={12}><Form.Item name="receivingDate" label="Receiving Date" rules={[{required:true,message:'Receiving Date is required'}]}><DatePicker format="YYYY-MM-DD" allowClear={false} style={{width:'100%'}}/></Form.Item></Col>
        </Row>
        <Form.Item name="paymentMode" label="Payment Mode" rules={[{required:true}]}><Radio.Group onChange={() => fareForm.setFieldsValue({bankAccountId:undefined,instrumentType:undefined,instrumentNumber:undefined,designationId:undefined,employeeId:undefined})} options={[{label:'Bank',value:'BANK'},{label:'Cash',value:'CASH'}]} /></Form.Item>
        {farePaymentMode==='BANK'&&<>
          <Form.Item name="bankAccountId" label="Bank Account" rules={[{required:true,message:'Bank Account is required'}]}><Select showSearch optionFilterProp="label" options={accounts}/></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="instrumentType" label="Instrument Type" rules={[{required:true,message:'Instrument Type is required'}]}><Select options={['CHEQUE','CASH','DRAFT','ONLINE'].map(value=>({value,label:value[0]+value.slice(1).toLowerCase()}))}/></Form.Item></Col>
            <Col span={12}><Form.Item name="instrumentNumber" label="Instrument Number"><Input/></Form.Item></Col>
          </Row>
        </>}
        {farePaymentMode==='CASH'&&<Row gutter={16}>
          <Col span={12}><Form.Item name="designationId" label="Designation" rules={[{required:true,message:'Designation is required'}]}><Select showSearch optionFilterProp="label" options={designations} onChange={()=>fareForm.setFieldValue('employeeId',undefined)}/></Form.Item></Col>
          <Col span={12}><Form.Item name="employeeId" label="Receiver (Employee)" rules={[{required:true,message:'Receiver is required'}]}><Select showSearch optionFilterProp="label" options={fareEmployees} disabled={!fareDesignationId}/></Form.Item></Col>
        </Row>}
      </Form>}
    </Modal>
  </Space>;
}
