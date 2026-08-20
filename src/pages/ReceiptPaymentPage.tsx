import { DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { getData, postData } from '../services/api';

interface Option { value:string; label:string }
interface Batch { id:string; date:string; retailer_count:number; total_amount:string }
interface Entry { key:number; retailerId?:string; city?:string; pending?:number; amount?:number; paymentMode:'BANK'|'CASH'; bankAccountId?:string; instrumentType?:string; instrumentNumber?:string; description?:string }
interface Detail { batch:{id:string;date:string;total_amount:string}; rows:Array<{id:string;retailer:string;city:string;amount:string;payment_mode:string;bank_account:string;instrument_type?:string;instrument_number?:string;description?:string}> }
let nextKey=1;
const money=(value:unknown)=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
const emptyRow=():Entry=>({key:nextKey++,paymentMode:'BANK'});

export function ReceiptPaymentPage(){
  const[batches,setBatches]=useState<Batch[]>([]);const[retailers,setRetailers]=useState<Option[]>([]);const[accounts,setAccounts]=useState<Option[]>([]);const[rows,setRows]=useState<Entry[]>([]);const[open,setOpen]=useState(false);const[saving,setSaving]=useState(false);const[detail,setDetail]=useState<Detail>();
  const load=()=>getData<Batch[]>('/crud/receipt-payment/batches').then(setBatches);
  useEffect(()=>{void load();Promise.all([getData<Option[]>('/crud/retailers/options'),getData<Option[]>('/crud/bank-account-options?receivingEnd=DISTRIBUTOR')]).then(([r,a])=>{setRetailers(r);setAccounts(a);});},[]);
  const update=(key:number,values:Partial<Entry>)=>setRows(current=>current.map(row=>row.key===key?{...row,...values}:row));
  const selectRetailer=async(key:number,retailerId?:string)=>{update(key,{retailerId,city:undefined,pending:undefined,amount:undefined});if(!retailerId)return;try{const data=await getData<{retailer:{city_name:string;city_area_name?:string;pending_cement_amount:string}}>(`/crud/retailer-receiving/${retailerId}`);update(key,{city:`${data.retailer.city_name}${data.retailer.city_area_name?` / ${data.retailer.city_area_name}`:''}`,pending:Number(data.retailer.pending_cement_amount)});}catch{message.error('Retailer receiving details could not be loaded');}};
  const total=rows.reduce((sum,row)=>sum+(Number(row.amount)||0),0);
  const save=async()=>{if(!rows.length)return message.error('Add at least one retailer');if(new Set(rows.map(row=>row.retailerId)).size!==rows.length)return message.error('Select each retailer only once');for(const row of rows){if(!row.retailerId||!row.amount||row.amount<=0||row.amount>Number(row.pending||0))return message.error('Enter a valid receiving amount for every retailer');if(row.paymentMode==='BANK'&&(!row.bankAccountId||!row.instrumentType))return message.error('Bank Account and Instrument Type are required');}setSaving(true);try{await postData('/crud/receipt-payment/batches',{rows});message.success('Receipt & Payment saved');setOpen(false);setRows([]);await load();}catch(error:any){message.error(error.response?.data?.message||'Receipt & Payment could not be saved');}finally{setSaving(false);}};
  const view=async(id:string)=>{try{setDetail(await getData<Detail>(`/crud/receipt-payment/batches/${id}`));}catch{message.error('Receipt & Payment details could not be loaded');}};
  const editColumns=[
    {title:'Retailer',render:(_:unknown,row:Entry)=><Select showSearch optionFilterProp="label" value={row.retailerId} options={retailers} onChange={value=>void selectRetailer(row.key,value)} style={{width:190}}/>},
    {title:'City',dataIndex:'city',render:(value:string)=>value||'-'},
    {title:'Pending Cement Amount',dataIndex:'pending',align:'right' as const,render:(value:number)=>value==null?'-':money(value)},
    {title:'Receive',render:(_:unknown,row:Entry)=><InputNumber min={0.01} max={row.pending} value={row.amount} onChange={value=>update(row.key,{amount:Number(value)||undefined})} style={{width:125}}/>},
    {title:'Payment Mode',render:(_:unknown,row:Entry)=><Select value={row.paymentMode} options={[{value:'BANK',label:'Bank'},{value:'CASH',label:'Cash'}]} onChange={value=>update(row.key,{paymentMode:value,bankAccountId:undefined,instrumentType:undefined,instrumentNumber:undefined})} style={{width:105}}/>},
    {title:'Bank Account',render:(_:unknown,row:Entry)=>row.paymentMode==='BANK'?<Select showSearch optionFilterProp="label" value={row.bankAccountId} options={accounts} onChange={value=>update(row.key,{bankAccountId:value})} style={{width:180}}/>:'-'},
    {title:'Instrument Type',render:(_:unknown,row:Entry)=>row.paymentMode==='BANK'?<Select value={row.instrumentType} options={['CHEQUE','CASH','DRAFT','ONLINE'].map(value=>({value,label:value[0]+value.slice(1).toLowerCase()}))} onChange={value=>update(row.key,{instrumentType:value})} style={{width:125}}/>:'-'},
    {title:'Instrument Number',render:(_:unknown,row:Entry)=>row.paymentMode==='BANK'?<Input value={row.instrumentNumber} onChange={event=>update(row.key,{instrumentNumber:event.target.value})} style={{width:135}}/>:'-'},
    {title:'',render:(_:unknown,row:Entry)=><Button danger icon={<DeleteOutlined/>} onClick={()=>setRows(current=>current.filter(item=>item.key!==row.key))}/>},
  ];
  return <div><div className="crud-header"><Typography.Title level={3}>Receipt &amp; Payment</Typography.Title><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{setRows([emptyRow()]);setOpen(true);}}>New</Button></div><Table rowKey="id" dataSource={batches} columns={[{title:'Date',dataIndex:'date'},{title:'No. of Retailers',dataIndex:'retailer_count'},{title:'Total Amount',dataIndex:'total_amount',render:money},{title:'Action',render:(_:unknown,row:Batch)=><Button icon={<EyeOutlined/>} onClick={()=>void view(row.id)}>View</Button>}]} />
  <Modal title="New Receipt & Payment" open={open} width="95%" onCancel={()=>setOpen(false)} onOk={()=>void save()} confirmLoading={saving} okText="Save">
    <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,marginBottom:12}}>
      <div style={{background:'#16803c4a',padding:5,borderRadius:7,color:'#046226',fontWeight:600}}>Total Amount: {money(total)}</div>
      <Button icon={<PlusOutlined/>} onClick={()=>setRows(current=>[...current,emptyRow()])}>Add Row</Button>
    </div>
    <Table rowKey="key" pagination={false} scroll={{x:1400}} dataSource={rows} columns={editColumns}/>
  </Modal>
  <Modal title="Receipt & Payment Details" open={Boolean(detail)} width="90%" footer={<Button onClick={()=>setDetail(undefined)}>Close</Button>} onCancel={()=>setDetail(undefined)}>{detail&&<><Typography.Text strong>Total Amount: {money(detail.batch.total_amount)}</Typography.Text><Table style={{marginTop:12}} rowKey="id" pagination={false} dataSource={detail.rows} columns={[{title:'Retailer',dataIndex:'retailer'},{title:'City',dataIndex:'city'},{title:'Receive',dataIndex:'amount',render:money},{title:'Payment Mode',dataIndex:'payment_mode'},{title:'Bank Account',dataIndex:'bank_account'},{title:'Instrument Type',dataIndex:'instrument_type',render:(v)=>v||'-'},{title:'Instrument Number',dataIndex:'instrument_number',render:(v)=>v||'-'},{title:'Description',dataIndex:'description',render:(v)=>v||'-'}]}/></>}</Modal></div>;
}
