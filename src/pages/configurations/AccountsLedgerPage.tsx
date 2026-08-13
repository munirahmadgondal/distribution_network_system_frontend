import { ArrowLeftOutlined, ClearOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Input, Radio, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getData } from '../../services/api';

interface Entry { source_id:string; date:string; cashflow_type:string; description:string; debit:string; credit:string; balance_effect:string }
interface Ledger { title:string; entries:Entry[] }
const money=(v:unknown)=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
const dateText=(v:string)=>dayjs(v).format('DD-MMM-YYYY');

export function AccountsLedgerPage({kind,onBack}:{kind:'expenses'|'income';onBack?:()=>void}){
  const[data,setData]=useState<Ledger>(); const[order,setOrder]=useState<'ASC'|'DESC'>('DESC');
  const[from,setFrom]=useState<string>(); const[to,setTo]=useState<string>(); const[df,setDf]=useState<string>(); const[dt,setDt]=useState<string>(); const[search,setSearch]=useState('');
  useEffect(()=>{getData<Ledger>(`/crud/accounts-ledger/${kind}`).then(setData);},[kind]);
  const query=search.trim().toLowerCase();
  const filtered=(data?.entries||[]).filter(e=>(!from||e.date>=from)&&(!to||e.date<=to)&&(!query||e.cashflow_type.toLowerCase().includes(query)||String(e.description||'').toLowerCase().includes(query)));
  const direction=order==='ASC'?1:-1; const ordered=[...filtered].sort((a,b)=>(dayjs(a.date).valueOf()-dayjs(b.date).valueOf())*direction||(Number(a.source_id)-Number(b.source_id))*direction);
  let balance=order==='ASC'?0:ordered.reduce((s,e)=>s+Number(e.balance_effect),0); const rows=ordered.map(e=>{if(order==='ASC')balance+=Number(e.balance_effect);const current=balance;if(order==='DESC')balance-=Number(e.balance_effect);return{...e,balance:current}});
  const clear=()=>{setFrom(undefined);setTo(undefined);setDf(undefined);setDt(undefined);setSearch('')};
  const download=async()=>{const XLSX=await import('xlsx');const sheet=XLSX.utils.json_to_sheet(rows.map(e=>({Date:dateText(e.date),'Cashflow Type':e.cashflow_type,Description:e.description,Debit:Number(e.debit)||'',Credit:Number(e.credit)||'',Balance:e.balance})));const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,data?.title||'Ledger');XLSX.writeFile(book,`${data?.title||'Ledger'}.xlsx`);};
  return <div>
    <div className="crud-header retailer-dispatch-page-header"><div><div className="retailer-dispatch-title-row">{onBack && <Button type="text" icon={<ArrowLeftOutlined/>} onClick={onBack}/>}<Typography.Title level={3}>{data?.title||'Ledger'}</Typography.Title></div><Typography.Text className={`retailer-dispatch-subtitle${onBack ? '' : ' report-ledger-subtitle'}`}>View transactions and running balance.</Typography.Text></div></div>
    <div className="ledger-filter-row ledger-filter-standalone"><Space wrap align="end"><div><Typography.Text className="ledger-filter-label">Search Title or Description</Typography.Text><Input allowClear prefix={<SearchOutlined/>} placeholder="Search title or description" value={search} onChange={e=>setSearch(e.target.value)} style={{width:280}}/></div><div><Typography.Text className="ledger-filter-label">Date From</Typography.Text><DatePicker value={df?dayjs(df):null} format="DD-MMM-YYYY" onChange={v=>setDf(v?.format('YYYY-MM-DD'))}/></div><div><Typography.Text className="ledger-filter-label">Date To</Typography.Text><DatePicker value={dt?dayjs(dt):null} format="DD-MMM-YYYY" onChange={v=>setDt(v?.format('YYYY-MM-DD'))}/></div><Button type="primary" icon={<SearchOutlined/>} onClick={()=>{setFrom(df);setTo(dt)}}>Search</Button><Button icon={<ClearOutlined/>} onClick={clear}>Clear</Button></Space><Button icon={<DownloadOutlined/>} onClick={download}>Download Excel</Button></div>
    <Card title={data?.title} style={{marginTop:16}} extra={<Radio.Group size="small" value={order} onChange={e=>setOrder(e.target.value)} optionType="button" buttonStyle="solid" options={['ASC','DESC']}/>}><Table rowKey="source_id" pagination={false} dataSource={rows} columns={[{title:'Date',dataIndex:'date',render:dateText},{title:'Cashflow Type',dataIndex:'cashflow_type'},{title:'Description',dataIndex:'description',render:(v)=>v||'-'},{title:'Debit',dataIndex:'debit',align:'right',render:v=>Number(v)?money(v):'-'},{title:'Credit',dataIndex:'credit',align:'right',render:v=>Number(v)?money(v):'-'},{title:'Balance',dataIndex:'balance',align:'right',render:money}]}/></Card>
  </div>;
}
