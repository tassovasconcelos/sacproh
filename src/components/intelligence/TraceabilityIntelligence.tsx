import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Factory, PackageSearch, ShieldAlert, Store, Truck } from 'lucide-react';
import { Product, Ticket, UserRole } from '../../types';
import { LotControl } from './LotControl';

interface Props { tickets: Ticket[]; products: Product[]; tenantId:string; userRole:UserRole; }

const CLOSED = new Set(['CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT', 'CANCELLED']);
const escapeCsv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const TraceabilityIntelligence: React.FC<Props> = ({ tickets, products, tenantId, userRole }) => {
  const [query, setQuery] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

  const rows = useMemo(() => {
    const groups = new Map<string, {
      key:string; lot:string; sku:string; product:string; manufacturer:string; importer:string;
      distributor:string; retailer:string; expiration?:string; tickets:Set<string>; open:number;
      critical:number; adverse:number; customers:Set<string>; lastOccurrence:string;
    }>();
    tickets.forEach(ticket => ticket.items.forEach(item => {
      const catalog = item.productId ? productMap.get(item.productId) : undefined;
      const lot = item.lotNumber?.trim() || 'LOTE NÃO INFORMADO';
      const sku = item.sku || catalog?.codeSku || 'SEM SKU';
      const key = `${sku}::${lot}`;
      const current = groups.get(key) || {
        key, lot, sku, product:item.productName, manufacturer:item.manufacturerName || catalog?.manufacturerName || catalog?.supplierName || 'Não informado',
        importer:item.importerName || catalog?.importerName || 'Não informado', distributor:item.distributorName || catalog?.distributorName || 'Não informado',
        retailer:item.retailerName || 'Não informado', expiration:item.expirationDate, tickets:new Set<string>(), open:0, critical:0,
        adverse:0, customers:new Set<string>(), lastOccurrence:ticket.createdAt
      };
      current.tickets.add(ticket.id); current.customers.add(ticket.customerId || ticket.customerName);
      if (!CLOSED.has(ticket.status)) current.open += 1;
      if (ticket.priority === 'CRITICAL' || ticket.userRiskFlag) current.critical += 1;
      if (ticket.adverseEventFlag || ticket.damageFlag) current.adverse += 1;
      if (new Date(ticket.createdAt) > new Date(current.lastOccurrence)) current.lastOccurrence = ticket.createdAt;
      if (!current.expiration && item.expirationDate) current.expiration = item.expirationDate;
      groups.set(key, current);
    }));
    return [...groups.values()].map(group => {
      const expiryDays = group.expiration ? Math.ceil((new Date(group.expiration).getTime() - Date.now()) / 86400000) : null;
      const score = Math.min(100, group.tickets.size * 12 + group.open * 8 + group.critical * 25 + group.adverse * 30
        + (group.lot === 'LOTE NÃO INFORMADO' ? 15 : 0) + (expiryDays !== null && expiryDays <= 90 ? 20 : 0));
      const level = score >= 70 ? 'CRÍTICO' : score >= 40 ? 'ATENÇÃO' : 'MONITORAR';
      return { ...group, ticketCount:group.tickets.size, customerCount:group.customers.size, expiryDays, score, level };
    }).sort((a,b) => b.score - a.score || b.ticketCount - a.ticketCount);
  }, [tickets, productMap]);

  const visible = useMemo(() => rows.filter(row => {
    const term=query.trim().toLocaleLowerCase('pt-BR');
    const matches=!term || [row.lot,row.sku,row.product,row.manufacturer,row.importer,row.distributor,row.retailer].some(value=>value.toLocaleLowerCase('pt-BR').includes(term));
    return matches && (!riskOnly || row.score >= 40);
  }), [rows,query,riskOnly]);

  const kpis = useMemo(() => ({
    lots:rows.filter(row=>row.lot !== 'LOTE NÃO INFORMADO').length,
    recurrent:rows.filter(row=>row.ticketCount >= 2).length,
    critical:rows.filter(row=>row.score >= 70).length,
    missingLot:rows.filter(row=>row.lot === 'LOTE NÃO INFORMADO').reduce((sum,row)=>sum+row.ticketCount,0),
    nearExpiry:rows.filter(row=>row.expiryDays !== null && row.expiryDays <= 90).length
  }), [rows]);

  const download = () => {
    const header=['Risco','Pontuação','Produto','SKU','Lote','Validade','SACs','Em aberto','Clientes','Fabricante','Importador','Distribuidor','Lojista'];
    const body=visible.map(row=>[row.level,row.score,row.product,row.sku,row.lot,row.expiration || '',row.ticketCount,row.open,row.customerCount,row.manufacturer,row.importer,row.distributor,row.retailer]);
    const csv=[header,...body].map(line=>line.map(escapeCsv).join(';')).join('\n');
    const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    link.download=`rastreabilidade-sac-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const kpiCards = [
    { icon:PackageSearch, label:'Lotes rastreados', value:kpis.lots, color:'text-blue-700' },
    { icon:AlertTriangle, label:'Lotes reincidentes', value:kpis.recurrent, color:'text-amber-700' },
    { icon:ShieldAlert, label:'Risco crítico', value:kpis.critical, color:'text-red-700' },
    { icon:PackageSearch, label:'SAC sem lote', value:kpis.missingLot, color:'text-orange-700' },
    { icon:Store, label:'Validade em até 90 dias', value:kpis.nearExpiry, color:'text-purple-700' }
  ];
  const chainCards = [
    { icon:Factory, title:'Fabricante', text:'Identifique concentração de falhas por origem e direcione investigação e CAPA.' },
    { icon:Truck, title:'Importador e distribuidor', text:'Preserve a cadeia de responsabilidade, documentos, devoluções e retorno ao fornecedor.' },
    { icon:Store, title:'Lojista e cliente', text:'Enxergue onde o produto foi comercializado e quais clientes podem exigir ação preventiva.' }
  ];

  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-r from-[#0B2343] to-[#145EDB] p-6 text-white shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-orange-300">Inteligência SAC 4.0</p><h1 className="mt-1 text-2xl font-black">Central de Rastreabilidade da Cadeia</h1><p className="mt-2 max-w-3xl text-sm text-blue-100">Conecte ocorrência, produto, lote, validade e responsáveis da cadeia para antecipar reincidências, desvios de qualidade e risco regulatório.</p></div><button onClick={download} className="flex items-center justify-center gap-2 rounded-xl bg-[#FF8500] px-4 py-3 text-sm font-black hover:bg-[#e07500]"><Download size={17}/>Exportar análise</button></div>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {kpiCards.map(card=><div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-slate-400"><span className="text-[10px] font-black uppercase">{card.label}</span><card.icon className="h-4 w-4"/></div><p className={`mt-1 text-2xl font-black ${card.color}`}>{card.value}</p></div>)}
    </div>

    <div className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center"><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar produto, SKU, lote, fabricante, importador..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#145EDB]"/><label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={riskOnly} onChange={event=>setRiskOnly(event.target.checked)}/>Somente atenção e críticos</label></div></div>

    <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Risco','Produto / lote','Ocorrências','Validade','Fabricante','Importador','Distribuidor','Lojista','Último SAC'].map(label=><th key={label} className="p-3 text-left font-black uppercase">{label}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.key} className="border-t hover:bg-slate-50"><td className="p-3"><span className={`rounded-full px-2 py-1 font-black ${row.level==='CRÍTICO'?'bg-red-100 text-red-700':row.level==='ATENÇÃO'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{row.level} · {row.score}</span></td><td className="p-3"><strong className="text-slate-900">{row.product}</strong><br/><span className="font-mono text-slate-500">{row.sku} · {row.lot}</span></td><td className="p-3"><strong>{row.ticketCount} SAC(s)</strong><br/><span className="text-slate-500">{row.open} aberto(s) · {row.customerCount} cliente(s)</span></td><td className="p-3">{row.expiration ? new Date(`${row.expiration}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informada'}{row.expiryDays !== null && <><br/><span className={row.expiryDays<=90?'font-bold text-red-700':'text-slate-500'}>{row.expiryDays < 0 ? `${Math.abs(row.expiryDays)} dias vencido` : `${row.expiryDays} dias`}</span></>}</td><td className="p-3"><Factory className="mr-1 inline h-3 w-3"/>{row.manufacturer}</td><td className="p-3">{row.importer}</td><td className="p-3"><Truck className="mr-1 inline h-3 w-3"/>{row.distributor}</td><td className="p-3">{row.retailer}</td><td className="p-3 whitespace-nowrap">{new Date(row.lastOccurrence).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>{visible.length===0&&<p className="p-8 text-center text-sm text-slate-500">Nenhum registro corresponde aos filtros.</p>}</div>

    <div className="grid gap-3 md:grid-cols-3">{chainCards.map(card=><div key={card.title} className="rounded-xl border bg-white p-4"><card.icon className="h-5 w-5 text-[#145EDB]"/><h3 className="mt-2 font-black">{card.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{card.text}</p></div>)}</div>
    <LotControl tenantId={tenantId} products={products} tickets={tickets} userRole={userRole}/>
  </div>;
};
