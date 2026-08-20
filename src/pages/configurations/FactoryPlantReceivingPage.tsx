import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { getData, postData } from '../../services/api';

interface PlantData { plant: { id: string; plant_name: string; factory_name: string; city_name: string; address?: string; opening_balance: string; total_builties: number; total_dispatch_amount: string; balance: string } }
interface Option { value: string; label: string }
const decodeId = (value: string) => { try { const raw=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='); const id=atob(raw); return /^\d+$/.test(id)?id:''; } catch { return ''; } };

export function FactoryPlantReceivingPage({ onBack }: { onBack: () => void }) {
  const id=decodeId(new URLSearchParams(location.search).get('factoryPlantId')||'');
  const [data,setData]=useState<PlantData>(); const [sourceAccounts,setSourceAccounts]=useState<Option[]>([]); const [factoryAccounts,setFactoryAccounts]=useState<Option[]>([]); const [saving,setSaving]=useState(false); const [notFound,setNotFound]=useState(!id); const [form]=Form.useForm();
  const load=async()=>{try{setData(await getData(`/crud/factory-plant-receiving/${id}`));setNotFound(false);}catch{setNotFound(true);}};
  useEffect(()=>{if(id){void load();Promise.all([getData<Option[]>('/crud/bank-account-options?receivingEnd=DISTRIBUTOR'),getData<Option[]>('/crud/bank-account-options?receivingEnd=FACTORY')]).then(([source,factory])=>{setSourceAccounts(source);setFactoryAccounts(factory);});} },[id]);
  if(notFound)return <Card><Button onClick={onBack}>Back</Button><Typography.Title level={3} type="danger" style={{textAlign:'center'}}>No Factory Plant Found</Typography.Title></Card>;
  const save=async()=>{const values=await form.validateFields();setSaving(true);try{await postData(`/crud/factory-plant-receiving/${id}`,values);message.success('Factory payment saved');form.resetFields();await load();}catch(e:any){message.error(e.response?.data?.message||'Payment could not be saved');}finally{setSaving(false);}};
  return <Space direction="vertical" size="middle" style={{width:'100%'}}>
    <div className="crud-header retailer-dispatch-page-header"><div><div className="retailer-dispatch-title-row"><Button type="text" icon={<ArrowLeftOutlined/>} onClick={onBack}/><Typography.Title level={3}>{data?.plant.factory_name} - {data?.plant.plant_name}</Typography.Title></div><Typography.Text className="retailer-dispatch-subtitle">Record payments and review the factory plant balance.</Typography.Text></div></div>
    <Card title="Factory Plant Receiving" loading={!data}>{data&&<div className="builty-table-wrap"><table className="builty-info-table"><thead><tr><th>City</th><th>Total No. of Bilty</th><th>Total Dispatch Amount</th><th>Balance</th></tr></thead><tbody><tr><td className="metric-cell">{data.plant.city_name}</td><td className="metric-cell">{data.plant.total_builties}</td><td className="metric-cell">{Number(data.plant.total_dispatch_amount).toLocaleString()}</td><td className="metric-cell">{Number(data.plant.balance).toLocaleString()}</td></tr></tbody></table></div>}</Card>
    <Card title="Receive Payment"><Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={8}><Form.Item name="amount" label="Payment Amount" rules={[{required:true},{type:'number',min:0.01}]}><InputNumber min={0.01} style={{width:'100%'}}/></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="sourceBankAccountId" label="Source Bank Account" rules={[{required:true}]}><Select showSearch optionFilterProp="label" placeholder="Select personal or business account" options={sourceAccounts}/></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="bankAccountId" label="Factory Bank Account" rules={[{required:true}]}><Select showSearch optionFilterProp="label" placeholder="Select factory account" options={factoryAccounts}/></Form.Item></Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={8}><Form.Item name="instrumentType" label="Instrument Type" rules={[{required:true}]}><Select options={['CHEQUE','CASH','DRAFT','ONLINE'].map(value=>({value,label:value[0]+value.slice(1).toLowerCase()}))}/></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="instrumentNumber" label="Instrument Number"><Input/></Form.Item></Col>
        <Col xs={24} md={8}><Form.Item name="description" label="Description"><Input.TextArea rows={3}/></Form.Item></Col>
      </Row>
      <div style={{display:'flex',justifyContent:'flex-end'}}><Button type="primary" loading={saving} onClick={save}>Receive Payment</Button></div>
    </Form></Card>
  </Space>;
}
