import React, { useEffect, useState } from 'react';
import { Download, FileBarChart, RefreshCw } from 'lucide-react';
import type { ServiceOrder, Ticket, TicketStatus, UserProfile, UserRole } from '../../types';
import { TicketDetailView as TicketDetailViewV46 } from './TicketDetailViewV46';
import { sacV47Service, type ProtocolExecutiveSnapshot } from '../../services/sacV47Service';

interface Props {
  ticket: Ticket; currentUser: UserProfile; userRole: UserRole; users: UserProfile[]; onBack: () => void;
  onUpdateStatus: (ticketId:string,newStatus:TicketStatus,notes:string)=>void;
  onDispatch: (ticketId:string,assignedArea:string,assignedToId?:string,assignedToName?:string,notes?:string)=>void;
  onCreateOS: (osData:Omit<ServiceOrder,'id'|'osNumber'|'openedAt'>)=>void;
  onUpdateTicket: (ticket:Ticket,changes:Partial<Ticket>)=>Promise<void>;
  onDeleteTicket: (ticket:Ticket,reason:string)=>Promise<void>;
}

const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const escapeHtml = (value:unknown)=>String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export const TicketDetailView:React.FC<Props> = props => {
  const { ticket } = props;
  const [snapshot,setSnapshot] = useState<ProtocolExecutiveSnapshot|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const load = async()=>{setLoading(true);setError('');try{setSnapshot(await sacV47Service.getExecutiveSnapshot(ticket.id));}catch(err){setError(err instanceof Error?err.message:'Falha ao consolidar o protocolo.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[ticket.id]);

  const downloadCosts=()=>{if(!snapshot)return;const blob=new Blob([sacV47Service.buildCostCsv(ticket,snapshot)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${ticket.protocol.replace(/[^a-zA-Z0-9._-]/g,'_')}-custos.csv`;a.click();URL.revokeObjectURL(url);};
  const printExecutive=()=>{if(!snapshot)return;const p=window.open('','_blank','width=1100,height=800');if(!p){setError('Libere pop-ups para gerar o relatório executivo.');return;}const costs=snapshot.costs.map(c=>`<tr><td>${escapeHtml(c.occurredAt)}</td><td>${escapeHtml(c.costType)}</td><td>${escapeHtml(c.description)}</td><td>${money.format(c.amount)}</td><td>${money.format(c.recoveredAmount||0)}</td><td>${money.format(c.amount-(c.recoveredAmount||0))}</td><td>${escapeHtml(c.invoiceNumber||'')}</td><td>${escapeHtml(c.createdByName||'')}</td></tr>`).join('');const history=snapshot.events.map(e=>`<tr><td>${escapeHtml(new Date(e.occurredAt).toLocaleString('pt-BR'))}</td><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.description||'')}</td><td>${escapeHtml(e.actorName||'')}</td></tr>`).join('');p.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ticket.protocol)}</title><style>body{font-family:Arial;padding:28px;color:#172033;font-size:12px}h1{font-size:22px}h2{font-size:15px;margin-top:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d8dee9;padding:7px;text-align:left;vertical-align:top}th{background:#f4f6f9}.cards{display:flex;gap:12px}.card{border:1px solid #d8dee9;padding:12px;flex:1}.desc{white-space:pre-wrap;border:1px solid #d8dee9;padding:10px}</style></head><body><h1>Relatório Executivo · ${escapeHtml(ticket.protocol)}</h1><p><b>Cliente:</b> ${escapeHtml(ticket.customerName)} · <b>Status:</b> ${escapeHtml(ticket.status)} · <b>Prioridade:</b> ${escapeHtml(ticket.priority)}</p><div class="cards"><div class="card"><b>Custo bruto</b><br>${money.format(snapshot.grossCost)}</div><div class="card"><b>Recuperado</b><br>${money.format(snapshot.recoveredAmount)}</div><div class="card"><b>Custo líquido</b><br>${money.format(snapshot.netCost)}</div><div class="card"><b>Eventos</b><br>${snapshot.events.length}</div></div><h2>Ocorrência</h2><div class="desc">${escapeHtml(ticket.description)}</div><h2>Memória financeira</h2><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Bruto</th><th>Recuperado</th><th>Líquido</th><th>Documento</th><th>Responsável</th></tr></thead><tbody>${costs}</tbody></table><h2>Histórico cronológico</h2><table><thead><tr><th>Data</th><th>Evento</th><th>Descrição</th><th>Responsável</th></tr></thead><tbody>${history}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);p.document.close();};

  return <div className="space-y-5">
    <section className="rounded-2xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-[#10233F] text-white flex flex-wrap justify-between gap-3"><div><div className="flex items-center gap-2"><FileBarChart className="w-5 h-5"/><h2 className="font-black">SACPROH V4.7 · Resumo executivo do protocolo</h2></div><p className="text-xs text-slate-300 mt-1">Histórico, pendências e impacto financeiro em uma visão única.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="px-3 py-2 bg-white/10 rounded-lg text-xs font-bold flex items-center gap-1"><RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/>Atualizar</button><button onClick={downloadCosts} disabled={!snapshot} className="px-3 py-2 bg-white text-[#10233F] rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Download className="w-3.5 h-3.5"/>Custos CSV</button><button onClick={printExecutive} disabled={!snapshot} className="px-3 py-2 bg-[#FF8500] rounded-lg text-xs font-bold disabled:opacity-50">Relatório executivo / PDF</button></div></div>
      <div className="p-5 text-xs space-y-4">{error&&<div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}{snapshot&&<><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div className="p-3 bg-slate-50 border rounded-xl"><span className="text-slate-500">Eventos</span><strong className="block text-lg">{snapshot.events.length}</strong></div><div className="p-3 bg-slate-50 border rounded-xl"><span className="text-slate-500">Pendências registradas</span><strong className="block text-lg">{snapshot.pendingActions.length}</strong></div><div className="p-3 bg-slate-50 border rounded-xl"><span className="text-slate-500">Custo bruto</span><strong className="block text-lg">{money.format(snapshot.grossCost)}</strong></div><div className="p-3 bg-slate-50 border rounded-xl"><span className="text-slate-500">Recuperado</span><strong className="block text-lg text-emerald-700">{money.format(snapshot.recoveredAmount)}</strong></div><div className="p-3 bg-slate-50 border rounded-xl"><span className="text-slate-500">Custo líquido</span><strong className="block text-lg text-red-700">{money.format(snapshot.netCost)}</strong></div></div>{snapshot.pendingActions.length>0&&<div><h3 className="font-black text-sm mb-2">Próximas ações registradas</h3><div className="grid md:grid-cols-2 gap-2">{snapshot.pendingActions.slice(0,6).map((a,i)=><div key={`${a.title}-${i}`} className="p-3 border rounded-xl bg-amber-50"><strong>{a.nextAction}</strong><div className="text-slate-500 mt-1">{a.title}{a.dueAt?` · prazo ${new Date(a.dueAt).toLocaleString('pt-BR')}`:''}{a.actorName?` · ${a.actorName}`:''}</div></div>)}</div></div>}</>}</div>
    </section>
    <TicketDetailViewV46 {...props}/>
  </div>;
};
