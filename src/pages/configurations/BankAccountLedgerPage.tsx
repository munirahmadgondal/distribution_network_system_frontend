import { ArrowLeftOutlined, ClearOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Radio, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getData } from '../../services/api';

interface Entry { cashflow_type:string; description:string; date:string|null; debit:string; credit:string; balance_effect:string; sort_type:number; source_id:string }
interface Ledger { account:{id:string;name:string;account_no:string;iban:string|null;type:string}; entries:Entry[] }
const decodeId=(value:string)=>{try{const raw=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');const id=atob(raw);return /^\d+$/.test(id)?id:'';}catch{return '';}};
const money=(value:unknown)=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
const dateText=(value:string|null)=>value?dayjs(value).format('DD-MMM-YYYY'):'-';

export function BankAccountLedgerPage({onBack}:{onBack:()=>void}){
  const id=decodeId(new URLSearchParams(location.search).get('bankAccountId')||'');
  const [data,setData]=useState<Ledger>(); const [loadError,setLoadError]=useState(!id?'No Bank Account Found':''); const [order,setOrder]=useState<'ASC'|'DESC'>('DESC');
  const [from,setFrom]=useState<string>(); const [to,setTo]=useState<string>(); const [draftFrom,setDraftFrom]=useState<string>(); const [draftTo,setDraftTo]=useState<string>();
  useEffect(()=>{if(!id)return;getData<Ledger>(`/crud/bank-account-ledger/${id}`).then(v=>{setData(v);setLoadError('');}).catch(()=>setLoadError('Unable to load bank account ledger'));},[id]);
  if(loadError)return <Card><Button onClick={onBack}>Back</Button><Typography.Title level={3} type="danger" style={{textAlign:'center'}}>{loadError}</Typography.Title></Card>;
  const filtered=(data?.entries||[]).filter(e=>{if(!e.date)return !from&&!to;const date=dayjs(e.date).format('YYYY-MM-DD');return (!from||date>=from)&&(!to||date<=to);});
  const direction=order==='ASC'?1:-1; const ordered=[...filtered].sort((a,b)=>(dayjs(a.date||0).valueOf()-dayjs(b.date||0).valueOf())*direction||(a.sort_type-b.sort_type)*direction||(Number(a.source_id)-Number(b.source_id))*direction);
  let balance=order==='ASC'?0:ordered.reduce((sum,e)=>sum+Number(e.balance_effect),0); const rows=ordered.map(e=>{if(order==='ASC')balance+=Number(e.balance_effect);const current=balance;if(order==='DESC')balance-=Number(e.balance_effect);return {...e,balance:String(current)};});
  const download=async()=>{const XLSX=await import('xlsx');const sheet=XLSX.utils.json_to_sheet(rows.map(e=>({Date:dateText(e.date),'Cashflow Type':e.cashflow_type,Description:e.description,Debit:Number(e.debit)||'',Credit:Number(e.credit)||'',Balance:Number(e.balance)})));sheet['!cols']=[{wch:16},{wch:28},{wch:55},{wch:18},{wch:18},{wch:20}];const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Bank Account Ledger');XLSX.writeFile(book,`${(data?.account.name||'Bank Account').replace(/[\\/:*?"<>|]/g,'-')} Ledger.xlsx`);};
  return <div><div className="crud-header retailer-dispatch-page-header"><div><div className="retailer-dispatch-title-row"><Button type="text" icon={<ArrowLeftOutlined/>} onClick={onBack}/><Typography.Title level={3}>{data?.account.name||'Bank Account'}</Typography.Title></div><Typography.Text className="retailer-dispatch-subtitle">View bank account transactions and running balance.</Typography.Text></div></div>
    <Card title="Account Details" style={{marginTop:16}}><Table rowKey="id" pagination={false} dataSource={data?[data.account]:[]} columns={[{title:'Account Title',dataIndex:'name'},{title:'Account Number',dataIndex:'account_no'},{title:'IBAN',dataIndex:'iban',render:v=>v||'-'},{title:'Account Type',dataIndex:'type'}]}/></Card>
    <div className="ledger-filter-row ledger-filter-standalone"><Space wrap align="end"><div><Typography.Text className="ledger-filter-label">Date From</Typography.Text><DatePicker value={draftFrom?dayjs(draftFrom):null} format="DD-MMM-YYYY" onChange={v=>setDraftFrom(v?.format('YYYY-MM-DD'))}/></div><div><Typography.Text className="ledger-filter-label">Date To</Typography.Text><DatePicker value={draftTo?dayjs(draftTo):null} format="DD-MMM-YYYY" onChange={v=>setDraftTo(v?.format('YYYY-MM-DD'))}/></div><Button type="primary" icon={<SearchOutlined/>} onClick={()=>{setFrom(draftFrom);setTo(draftTo);}}>Search</Button><Button icon={<ClearOutlined/>} onClick={()=>{setDraftFrom(undefined);setDraftTo(undefined);setFrom(undefined);setTo(undefined);}}>Clear</Button></Space><Button type="primary" ghost style={{background:'#fff'}} icon={<DownloadOutlined/>} onClick={download}>Download Excel</Button></div>
    <Card title="Bank Account Ledger" style={{marginTop:16}} extra={<Radio.Group size="small" value={order} onChange={e=>setOrder(e.target.value)} optionType="button" buttonStyle="solid" options={['ASC','DESC']}/>}><Table rowKey={(_,i)=>String(i)} pagination={false} dataSource={rows} columns={[{title:'Date',dataIndex:'date',render:dateText},{title:'Cashflow Type',dataIndex:'cashflow_type'},{title:'Description',dataIndex:'description'},{title:'Debit',dataIndex:'debit',align:'right',render:(v)=>Number(v)?money(v):'-'},{title:'Credit',dataIndex:'credit',align:'right',render:(v)=>Number(v)?money(v):'-'},{title:'Balance',dataIndex:'balance',align:'right',render:money}]}/></Card>
  </div>;
}
