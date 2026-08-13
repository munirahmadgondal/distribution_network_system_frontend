import { ArrowLeftOutlined, ClearOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Radio, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { getData } from '../../services/api';

interface Entry { cashflow_type:string; description:string; date:string|null; debit:string; credit:string; balance_effect:string; sort_type:number; source_id:string }
interface Ledger { plant:{id:string;name:string}; entries:Entry[] }
const decodeId=(value:string)=>{try{const raw=value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=');const id=atob(raw);return /^\d+$/.test(id)?id:'';}catch{return '';}};
const money=(value:unknown)=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
const dateText=(value:string|null)=>value?new Date(value).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'-';

export function FactoryPlantLedgerPage({onBack}:{onBack:()=>void}){
  const id=decodeId(new URLSearchParams(location.search).get('factoryPlantId')||'');
  const [data,setData]=useState<Ledger>(); const [notFound,setNotFound]=useState(!id); const [order,setOrder]=useState<'ASC'|'DESC'>('DESC');
  const [from,setFrom]=useState<string>(); const [to,setTo]=useState<string>(); const [draftFrom,setDraftFrom]=useState<string>(); const [draftTo,setDraftTo]=useState<string>();
  useEffect(()=>{if(!id)return;getData<Ledger>(`/crud/factory-plant-ledger/${id}`).then(v=>{setData(v);setNotFound(false);}).catch(()=>setNotFound(true));},[id]);
  if(notFound)return <Card><Button onClick={onBack}>Back</Button><Typography.Title level={3} type="danger" style={{textAlign:'center'}}>No Factory Plant Found</Typography.Title></Card>;
  const filtered=(data?.entries||[]).filter(e=>{if(!e.date)return !from&&!to;const t=new Date(e.date).getTime();return (!from||t>=new Date(`${from}T00:00:00`).getTime())&&(!to||t<=new Date(`${to}T23:59:59.999`).getTime());});
  const direction=order==='ASC'?1:-1; const ordered=[...filtered].sort((a,b)=>((a.date?new Date(a.date).getTime():0)-(b.date?new Date(b.date).getTime():0))*direction||(a.sort_type-b.sort_type)*direction||(Number(a.source_id)-Number(b.source_id))*direction);
  let balance=order==='ASC'?0:ordered.reduce((sum,e)=>sum+Number(e.balance_effect),0); const rows=ordered.map(e=>{if(order==='ASC')balance+=Number(e.balance_effect);const current=balance;if(order==='DESC')balance-=Number(e.balance_effect);return {...e,balance:String(current)};});
  const description=(value:string)=>{
    const dispatchMatch=String(value||'').match(/^([\d,.]+) Tons @ ([\d,.]+)$/);
    if(dispatchMatch)return <span><strong className="ledger-description-label">{dispatchMatch[1]}</strong>{' Tons @ '}<strong className="ledger-description-label">{dispatchMatch[2]}</strong></span>;
    const paymentMatch=String(value||'').match(/^(.+?) to (.+?)( - [^@|]+) @ ([^-|]+)(.*)$/);
    if(paymentMatch)return <span><strong className="ledger-description-label">{paymentMatch[1]}</strong>{' to '}<strong className="ledger-description-label">{paymentMatch[2]}{paymentMatch[3]}</strong>{' @ '}<strong className="ledger-description-label">{paymentMatch[4].trim()}</strong>{paymentMatch[5]}</span>;
    const parts=String(value||'-').split(/([A-Za-z][A-Za-z ]*:)/g);
    return <span>{parts.map((part,index)=>/^[A-Za-z][A-Za-z ]*:$/.test(part)
      ? <strong className="ledger-description-label" key={`${part}-${index}`}>{part}</strong>
      : <span key={`${part}-${index}`}>{part}</span>)}</span>;
  };
  const download=async()=>{const XLSX=await import('xlsx');const sheet=XLSX.utils.json_to_sheet(rows.map(e=>({Date:dateText(e.date),'Cashflow Type':e.cashflow_type,Description:e.description,Debit:Number(e.debit)||'',Credit:Number(e.credit)||'',Balance:Number(e.balance)})));sheet['!cols']=[{wch:16},{wch:35},{wch:55},{wch:18},{wch:18},{wch:20}];const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Factory Plant Ledger');XLSX.writeFile(book,`${(data?.plant.name||'Factory Plant').replace(/[\\/:*?"<>|]/g,'-')} Ledger.xlsx`);};
  return <div><div className="crud-header retailer-dispatch-page-header"><div><div className="retailer-dispatch-title-row"><Button type="text" icon={<ArrowLeftOutlined/>} onClick={onBack}/><Typography.Title level={3}>{data?.plant.name||'Factory Plant'}</Typography.Title></div><Typography.Text className="retailer-dispatch-subtitle">View factory plant transactions and running balance.</Typography.Text></div></div>
    <div className="ledger-filter-row ledger-filter-standalone"><Space wrap align="end"><div><Typography.Text className="ledger-filter-label">Date From</Typography.Text><DatePicker value={draftFrom?dayjs(draftFrom):null} format="DD-MMM-YYYY" onChange={v=>setDraftFrom(v?.format('YYYY-MM-DD'))}/></div><div><Typography.Text className="ledger-filter-label">Date To</Typography.Text><DatePicker value={draftTo?dayjs(draftTo):null} format="DD-MMM-YYYY" onChange={v=>setDraftTo(v?.format('YYYY-MM-DD'))}/></div><Button type="primary" icon={<SearchOutlined/>} onClick={()=>{setFrom(draftFrom);setTo(draftTo);}}>Search</Button><Button icon={<ClearOutlined/>} onClick={()=>{setDraftFrom(undefined);setDraftTo(undefined);setFrom(undefined);setTo(undefined);}}>Clear</Button></Space><Space className="ledger-filter-actions"><Button type="primary" ghost style={{background:'#fff'}} icon={<DownloadOutlined/>} onClick={download}>Download Excel</Button></Space></div>
    <Card title="Factory Plant Ledger" style={{marginTop:16}} extra={<Radio.Group size="small" value={order} onChange={e=>setOrder(e.target.value)} optionType="button" buttonStyle="solid" options={['ASC','DESC']}/>}><Table rowKey={(_,i)=>String(i)} pagination={false} dataSource={rows} columns={[{title:'Date',dataIndex:'date',render:dateText},{title:'Cashflow Type',dataIndex:'cashflow_type'},{title:'Description',dataIndex:'description',render:description},{title:'Debit',dataIndex:'debit',align:'right',render:(v)=>Number(v)?money(v):'-'},{title:'Credit',dataIndex:'credit',align:'right',render:(v)=>Number(v)?money(v):'-'},{title:'Balance',dataIndex:'balance',align:'right',render:money}]}/></Card>
  </div>;
}
