import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, FileSpreadsheet, Filter, PackageSearch, Printer, TrendingUp } from 'lucide-react';
import type { Tenant, Ticket, UserProfile } from '../../types';

interface ExecutiveDashboardProps { tickets: Ticket[]; tenant: Tenant; currentUser?: UserProfile | null; }

const CLOSED = new Set(['CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT', 'CANCELLED']);
const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadText = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ tickets, tenant, currentUser }) => {
  const [period, setPeriod] = useState<'30'|'90'|'365'|'ALL'>('ALL');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [productQuery, setProductQuery] = useState('');

  const filtered = useMemo(() => {
    const limit = period === 'ALL' ? null : Date.now() - Number(period) * 86400000;
    const q = productQuery.trim().toLocaleLowerCase('pt-BR');
    return tickets.filter(ticket => {
      const byDate = !limit || new Date(ticket.createdAt).getTime() >= limit;
      const byStatus = status === 'ALL' || ticket.status === status;
      const byPriority = priority === 'ALL' || ticket.priority === priority;
      const byCategory = category === 'ALL' || ticket.category === category;
      const byProduct = !q || (ticket.items || []).some(item => [item.productName, item.productModel, item.productDescription, item.sku, item.lotNumber, item.serialNumber].some(value => value?.toLocaleLowerCase('pt-BR').includes(q)));
      return byDate && byStatus && byPriority && byCategory && byProduct;
    });
  }, [tickets, period, status, priority, category, productQuery]);

  const categories = useMemo(() => [...new Set(tickets.map(t => t.category).filter(Boolean))].sort(), [tickets]);

  const metrics = useMemo(() => {
    const closed = filtered.filter(t => CLOSED.has(t.status));
    const open = filtered.length - closed.length;
    const critical = filtered.filter(t => t.priority === 'CRITICAL' || t.userRiskFlag || t.adverseEventFlag).length;
    const overdue = filtered.filter(t => !CLOSED.has(t.status) && t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now()).length;
    const averageDays = closed.length ? closed.reduce((sum,t) => sum + Math.max(0,(new Date(t.closedAt || t.updatedAt).getTime()-new Date(t.createdAt).getTime())/86400000),0)/closed.length : 0;
    return { total: filtered.length, closed: closed.length, open, critical, overdue, averageDays };
  }, [filtered]);

  const productQuality = useMemo(() => {
    const items = filtered.flatMap(ticket => (ticket.items || []).map(item => ({ ticket, item })));
    const withDescription = items.filter(({item}) => Boolean(item.productDescription?.trim())).length;
    const withModel = items.filter(({item}) => Boolean(item.productModel?.trim())).length;
    const withTraceability = items.filter(({item}) => Boolean(item.lotNumber?.trim() || item.serialNumber?.trim())).length;
    const incomplete = items.filter(({item}) => !item.productDescription?.trim() || !item.productModel?.trim() || (!item.lotNumber?.trim() && !item.serialNumber?.trim()));
    return {
      total: items.length,
      descriptionRate: items.length ? (withDescription/items.length)*100 : 100,
      modelRate: items.length ? (withModel/items.length)*100 : 100,
      traceabilityRate: items.length ? (withTraceability/items.length)*100 : 100,
      incomplete
    };
  }, [filtered]);

  const topCategories = useMemo(() => Object.entries(filtered.reduce<Record<string,number>>((acc,t) => {
    const key = t.category || 'Não classificado'; acc[key] = (acc[key] || 0) + 1; return acc;
  }, {})).sort((a,b) => b[1]-a[1]).slice(0,10), [filtered]);

  const topProducts = useMemo(() => Object.entries(filtered.flatMap(t => t.items || []).reduce<Record<string,number>>((acc,item) => {
    const key = [item.productName, item.productModel].filter(Boolean).join(' · ') || 'Produto não identificado';
    acc[key] = (acc[key] || 0) + Number(item.quantity || 1); return acc;
  }, {})).sort((a,b) => b[1]-a[1]).slice(0,10), [filtered]);

  const recurring = useMemo(() => Object.entries(filtered.reduce<Record<string,number>>((acc,t) => {
    acc[t.customerName] = (acc[t.customerName] || 0) + 1; return acc;
  }, {})).filter(([,count]) => count > 1).sort((a,b) => b[1]-a[1]).slice(0,10), [filtered]);

  const exportRows = () => filtered.flatMap(ticket => (ticket.items?.length ? ticket.items : [undefined]).map(item => ({
    Protocolo: ticket.protocol,
    Abertura: new Date(ticket.createdAt).toLocaleString('pt-BR'),
    Status: ticket.status,
    Prioridade: ticket.priority,
    Categoria: ticket.category,
    Subcategoria: ticket.subcategory || '',
    Cliente: ticket.customerName,
    DocumentoCliente: ticket.customerDocument,
    DescricaoOcorrencia: ticket.description,
    Responsavel: ticket.assignedToName || ticket.assignedArea || '',
    Produto: item?.productName || '',
    DescricaoProduto: item?.productDescription || '',
    Modelo: item?.productModel || '',
    SKU: item?.sku || '',
    Quantidade: item?.quantity || '',
    Lote: item?.lotNumber || '',
    Serie: item?.serialNumber || '',
    Anvisa: item?.anvisaRegister || '',
    Fabricante: item?.manufacturerName || '',
    Importador: item?.importerName || '',
    Distribuidor: item?.distributorName || '',
    SLA: ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString('pt-BR') : '',
    Encerramento: ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('pt-BR') : ''
  })));

  const exportCsv = () => {
    const rows = exportRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows.map(row => headers.map(key => escapeCsv((row as any)[key])).join(';'))].join('\n');
    downloadText(`sacproh-relatorio-${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const exportXlsx = async () => {
    const rows = exportRows();
    if (!rows.length) return;
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const details = XLSX.utils.json_to_sheet(rows);
    const summary = XLSX.utils.aoa_to_sheet([
      ['SACPROH - Relatório Gerencial'],
      ['Empresa', tenant.tradeName || tenant.name],
      ['Emitido por', currentUser?.fullName || 'Usuário SAC'],
      ['Emitido em', new Date().toLocaleString('pt-BR')],
      ['SACs filtrados', metrics.total],
      ['Em andamento', metrics.open],
      ['Encerrados', metrics.closed],
      ['Críticos / risco', metrics.critical],
      ['SLA vencido', metrics.overdue],
      ['Descrição completa de produto (%)', Number(productQuality.descriptionRate.toFixed(1))],
      ['Rastreabilidade (%)', Number(productQuality.traceabilityRate.toFixed(1))]
    ]);
    XLSX.utils.book_append_sheet(workbook, summary, 'Resumo');
    XLSX.utils.book_append_sheet(workbook, details, 'Protocolos');
    XLSX.writeFile(workbook, `sacproh-relatorio-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return <div className="space-y-5">
    <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div><p className="text-[10px] uppercase tracking-[.18em] font-black text-[#145EDB]">SACPROH · Inteligência operacional</p><h1 className="text-2xl font-black text-[#10233F]">Relatórios Gerenciais e Qualidade dos Dados</h1><p className="text-xs text-slate-500 mt-1">Filtros, recorrência, produtos, rastreabilidade e exportação para análise da diretoria e responsável técnica.</p></div>
        <div className="flex flex-wrap gap-2 print:hidden"><button onClick={exportCsv} className="px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1"><Download className="w-4 h-4"/>CSV</button><button onClick={exportXlsx} className="px-3 py-2 border rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet className="w-4 h-4"/>Excel</button><button onClick={()=>window.print()} className="px-3 py-2 bg-[#145EDB] text-white rounded-lg text-xs font-bold flex items-center gap-1"><Printer className="w-4 h-4"/>PDF / Imprimir</button></div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs print:hidden"><Filter className="w-4 h-4 text-[#145EDB] mt-2"/><select value={period} onChange={e=>setPeriod(e.target.value as any)} className="border rounded-lg p-2"><option value="ALL">Todo histórico</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">12 meses</option></select><select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-lg p-2"><option value="ALL">Todos os status</option>{[...new Set(tickets.map(t=>t.status))].sort().map(value=><option key={value}>{value}</option>)}</select><select value={priority} onChange={e=>setPriority(e.target.value)} className="border rounded-lg p-2"><option value="ALL">Todas prioridades</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select><select value={category} onChange={e=>setCategory(e.target.value)} className="border rounded-lg p-2"><option value="ALL">Todas categorias</option>{categories.map(value=><option key={value}>{value}</option>)}</select><input value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="Produto, modelo, SKU, lote ou série" className="border rounded-lg p-2 min-w-64"/></div>
    </section>

    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{[
      ['SACs',metrics.total,<TrendingUp className="w-4 h-4"/>],['Em andamento',metrics.open,<Clock className="w-4 h-4"/>],['Encerrados',metrics.closed,<CheckCircle2 className="w-4 h-4"/>],['Críticos / risco',metrics.critical,<AlertTriangle className="w-4 h-4"/>],['SLA vencido',metrics.overdue,<Clock className="w-4 h-4"/>],['Tempo médio',`${metrics.averageDays.toFixed(1)} d`,<TrendingUp className="w-4 h-4"/>]
    ].map(([label,value,icon])=><article key={String(label)} className="bg-white p-4 rounded-xl border shadow-sm"><div className="flex items-center justify-between text-slate-500"><span className="text-[10px] font-bold uppercase">{label}</span>{icon as React.ReactNode}</div><strong className="text-2xl text-[#10233F]">{value}</strong></article>)}</div>

    <section className="bg-white p-5 rounded-2xl border shadow-sm space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-[#10233F] flex items-center gap-2"><PackageSearch className="w-5 h-5 text-[#145EDB]"/>Qualidade do cadastro de produto</h2><p className="text-xs text-slate-500">Mede se o protocolo possui dados suficientes para laudos, relatórios e rastreabilidade.</p></div><span className={`text-xs font-black rounded-full px-3 py-1 ${productQuality.incomplete.length ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{productQuality.incomplete.length} item(ns) com pendência</span></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[['Descrição completa',productQuality.descriptionRate],['Modelo',productQuality.modelRate],['Lote ou série',productQuality.traceabilityRate]].map(([label,value])=><div key={String(label)} className="p-4 rounded-xl bg-slate-50 border"><p className="text-xs font-bold text-slate-600">{label}</p><p className="text-2xl font-black text-[#10233F]">{Number(value).toFixed(1)}%</p><div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden"><div className="h-full bg-[#145EDB]" style={{width:`${Math.min(100,Number(value))}%`}}/></div></div>)}</div>{productQuality.incomplete.length>0&&<div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="text-left p-2">Protocolo</th><th className="text-left p-2">Produto</th><th className="text-left p-2">Modelo</th><th className="text-left p-2">Pendências</th></tr></thead><tbody>{productQuality.incomplete.slice(0,30).map(({ticket,item},index)=><tr key={`${ticket.id}-${item.id}-${index}`} className="border-t"><td className="p-2 font-mono font-bold text-[#145EDB]">{ticket.protocol}</td><td className="p-2">{item.productName}</td><td className="p-2">{item.productModel||'-'}</td><td className="p-2 text-amber-800">{[!item.productDescription?.trim()?'descrição':null,!item.productModel?.trim()?'modelo':null,!item.lotNumber?.trim()&&!item.serialNumber?.trim()?'lote/série':null].filter(Boolean).join(', ')}</td></tr>)}</tbody></table></div>}</section>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><Ranking title="Categorias com maior volume" rows={topCategories}/><Ranking title="Produtos/modelos mais envolvidos" rows={topProducts}/><Ranking title="Clientes recorrentes" rows={recurring}/></div>

    <section className="bg-white p-5 rounded-2xl border shadow-sm"><h2 className="font-black text-[#10233F] mb-3">Base analítica dos protocolos</h2><div className="overflow-x-auto max-h-[520px]"><table className="w-full text-xs"><thead className="bg-slate-50 sticky top-0"><tr><th className="text-left p-2">Protocolo</th><th className="text-left p-2">Abertura</th><th className="text-left p-2">Cliente</th><th className="text-left p-2">Categoria</th><th className="text-left p-2">Produto / modelo</th><th className="text-left p-2">Lote / série</th><th className="text-left p-2">Status</th></tr></thead><tbody>{filtered.map(ticket=><tr key={ticket.id} className="border-t align-top"><td className="p-2 font-mono font-bold text-[#145EDB]">{ticket.protocol}</td><td className="p-2 whitespace-nowrap">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</td><td className="p-2">{ticket.customerName}</td><td className="p-2">{ticket.category}</td><td className="p-2">{(ticket.items||[]).map(item=><div key={item.id}><strong>{item.productName}</strong>{item.productModel&&` · ${item.productModel}`}{item.productDescription&&<p className="text-slate-500 max-w-xl whitespace-normal">{item.productDescription}</p>}</div>)}</td><td className="p-2">{(ticket.items||[]).map(item=><div key={item.id}>{item.lotNumber||item.serialNumber||'-'}</div>)}</td><td className="p-2 font-semibold">{ticket.status}</td></tr>)}</tbody></table></div></section>
  </div>;
};

const Ranking: React.FC<{title:string;rows:Array<[string,number]>}> = ({title,rows}) => <section className="bg-white p-5 rounded-2xl border shadow-sm"><h3 className="font-black text-[#10233F] mb-3">{title}</h3>{rows.length===0?<p className="text-xs text-slate-500">Sem dados no filtro atual.</p>:<div className="space-y-2">{rows.map(([name,count],index)=><div key={name} className="flex items-center gap-3"><span className="w-6 text-xs font-black text-slate-400">{index+1}.</span><div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{name}</p><div className="h-1.5 rounded-full bg-slate-100 mt-1"><div className="h-full rounded-full bg-[#145EDB]" style={{width:`${Math.min(100,count/Math.max(1,rows[0][1])*100)}%`}}/></div></div><strong className="text-sm">{count}</strong></div>)}</div>}</section>;
