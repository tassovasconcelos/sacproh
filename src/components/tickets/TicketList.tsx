import React, { useEffect, useState } from 'react';
import { Search, Filter, Plus, Clock, AlertTriangle, LayoutGrid, Table, Package, ChevronRight } from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority } from '../../types';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenNewModal: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onSelectTicket, onOpenNewModal }) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    const search = searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (search && ![
      t.protocol, t.customerName, t.customerDocument, t.category, t.description,
      t.invoiceNumber, t.assignedToName, t.assignedArea,
      ...t.items.flatMap(item => [item.productName, item.sku, item.lotNumber, item.serialNumber])
    ].some(value => value?.toLocaleLowerCase('pt-BR').includes(search))) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const visibleTickets = filteredTickets.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [statusFilter, priorityFilter, searchTerm, viewMode]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const renderSla = (ticket: Ticket) => {
    if (!ticket.slaDueAt) return <span className="text-slate-400">Não definido</span>;
    const due = new Date(ticket.slaDueAt);
    const isClosed = ['CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT', 'CANCELLED'].includes(ticket.status);
    const overdue = !isClosed && due.getTime() < Date.now();
    const soon = !isClosed && !overdue && due.getTime() - Date.now() <= 86400000;
    return <div className={`flex flex-wrap items-center gap-1 font-semibold ${overdue ? 'text-red-700' : soon ? 'text-amber-700' : 'text-slate-600'}`}>
      <Clock className="w-3.5 h-3.5 flex-none" />
      <span className="whitespace-nowrap">{due.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
      {overdue && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold">VENCIDO</span>}
    </div>;
  };

  const statusLabel: Record<TicketStatus, string> = {
    NEW: 'Novo', TRIAGE: 'Em triagem', WAITING_DOCS: 'Aguardando documentos',
    TECHNICAL_ANALYSIS: 'Em análise', SENT_TO_TECHNICAL: 'Assistência técnica',
    SENT_TO_LOGISTICS: 'Logística', WAITING_SUPPLIER: 'Aguardando fornecedor',
    WAITING_CARRIER: 'Aguardando transportadora', WAITING_CUSTOMER: 'Atendimento / cliente',
    CORRECTIVE_ACTION: 'Plano de ação', SOLUTION_PROPOSED: 'Solução / validação',
    WAITING_CONFIRMATION: 'Finalização', CLOSED_PROCEDENT: 'Encerrado procedente',
    CLOSED_NON_PROCEDENT: 'Encerrado não procedente', CANCELLED: 'Cancelado', REOPENED: 'Reaberto'
  };

  const getStatusBadge = (status: TicketStatus) => {
    const style = status === 'TRIAGE' ? 'bg-amber-100 text-amber-800 border-amber-200'
      : ['TECHNICAL_ANALYSIS','SENT_TO_TECHNICAL'].includes(status) ? 'bg-purple-100 text-purple-800 border-purple-200'
      : ['SENT_TO_LOGISTICS','WAITING_CARRIER'].includes(status) ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
      : ['CORRECTIVE_ACTION','SOLUTION_PROPOSED','WAITING_CONFIRMATION'].includes(status) ? 'bg-blue-100 text-blue-800 border-blue-200'
      : status === 'CLOSED_PROCEDENT' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'CLOSED_NON_PROCEDENT' ? 'bg-slate-100 text-slate-700 border-slate-300'
      : status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-slate-100 text-slate-800 border-slate-200';
    return <span className={`inline-flex max-w-full px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-normal leading-tight ${style}`}>{statusLabel[status]}</span>;
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'CRITICAL': return <span className="inline-flex px-2 py-1 rounded text-[11px] font-bold bg-[#D92D20] text-white items-center"><AlertTriangle className="w-3 h-3 mr-1"/>CRÍTICO</span>;
      case 'HIGH': return <span className="inline-flex px-2 py-1 rounded text-[11px] font-bold bg-[#FF8500] text-white">ALTA</span>;
      case 'MEDIUM': return <span className="inline-flex px-2 py-1 rounded text-[11px] font-bold bg-amber-500 text-white">MÉDIA</span>;
      case 'LOW': return <span className="inline-flex px-2 py-1 rounded text-[11px] font-bold bg-slate-500 text-white">BAIXA</span>;
    }
  };

  return <div className="space-y-5 min-w-0">
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="min-w-0"><h1 className="text-xl font-bold text-[#10233F]">Gestão de Chamados SAC</h1><p className="text-xs text-slate-500 mt-0.5">Acompanhamento e protocolo unificado da Procirúrgica</p></div>
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${viewMode === 'list' ? 'bg-white text-[#145EDB] shadow-sm' : 'text-slate-600'}`}><Table className="w-4 h-4"/><span>Tabela</span></button>
          <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-white text-[#145EDB] shadow-sm' : 'text-slate-600'}`}><LayoutGrid className="w-4 h-4"/><span>Kanban</span></button>
        </div>
        <button onClick={onOpenNewModal} className="ml-auto lg:ml-0 bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center gap-2"><Plus className="w-4 h-4"/><span>Novo Atendimento SAC</span></button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[auto_minmax(260px,1fr)_auto_auto] gap-3 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
      <label className="block"><span className="flex items-center gap-2 text-slate-600 font-bold mb-1.5"><Filter className="w-4 h-4 text-[#145EDB]"/>Status</span><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"><option value="ALL">Todos os status</option>{Object.entries(statusLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label className="relative block"><span className="block text-slate-600 font-bold mb-1.5">Busca</span><Search className="absolute left-3 bottom-2.5 w-4 h-4 text-slate-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Protocolo, cliente, produto, NF, lote..." className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3"/></label>
      <label className="block"><span className="block text-slate-600 font-bold mb-1.5">Prioridade</span><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800"><option value="ALL">Todas</option><option value="CRITICAL">Crítica</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option></select></label>
      <div className="text-slate-500 font-medium pb-2 whitespace-nowrap">Exibindo <strong>{filteredTickets.length ? (page-1)*pageSize+1 : 0}–{Math.min(page*pageSize,filteredTickets.length)}</strong> de <strong>{filteredTickets.length}</strong></div>
    </div>

    {viewMode === 'list' && <>
      <div className="xl:hidden space-y-3">
        {visibleTickets.map(ticket=><button type="button" key={ticket.id} onClick={()=>onSelectTicket(ticket)} className="w-full text-left bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-blue-300 transition">
          <div className="flex flex-wrap justify-between gap-2"><div><div className="font-mono font-black text-[#145EDB]">{ticket.protocol}</div><div className="text-[11px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</div></div><div>{getPriorityBadge(ticket.priority)}</div></div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs"><div><span className="block text-[10px] uppercase text-slate-400 font-bold">Cliente</span><b className="text-[#10233F] break-words">{ticket.customerName}</b></div><div><span className="block text-[10px] uppercase text-slate-400 font-bold">Produto</span><span className="break-words">{ticket.items[0]?.productName||'Sem produto'}</span></div><div className="sm:col-span-2"><span className="block text-[10px] uppercase text-slate-400 font-bold">Ocorrência</span><b>{ticket.category}</b><p className="mt-1 text-slate-600 break-words line-clamp-3">{ticket.description}</p></div></div>
          <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-3"><div>{getStatusBadge(ticket.status)}</div><div>{renderSla(ticket)}</div><span className="ml-auto text-[#145EDB] font-bold flex items-center">Abrir <ChevronRight className="w-4 h-4"/></span></div>
        </button>)}
      </div>
      <div className="hidden xl:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1080px] table-fixed text-left border-collapse">
            <colgroup><col className="w-[13%]"/><col className="w-[19%]"/><col className="w-[20%]"/><col className="w-[23%]"/><col className="w-[9%]"/><col className="w-[9%]"/><col className="w-[7%]"/></colgroup>
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider"><th className="p-3.5">Protocolo & data</th><th className="p-3.5">Cliente</th><th className="p-3.5">Produtos</th><th className="p-3.5">Categoria / ocorrência</th><th className="p-3.5">Prioridade</th><th className="p-3.5">Status</th><th className="p-3.5">SLA</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">{visibleTickets.map(ticket=><tr key={ticket.id} onClick={()=>onSelectTicket(ticket)} className="hover:bg-blue-50/40 cursor-pointer transition-colors align-top">
              <td className="p-3.5"><span className="font-bold text-[#145EDB] font-mono text-xs break-all">{ticket.protocol}</span><p className="text-[11px] text-slate-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</p></td>
              <td className="p-3.5"><p className="font-bold text-[#10233F] break-words leading-snug">{ticket.customerName}</p><p className="text-[11px] text-slate-500 font-mono break-all mt-1">{ticket.customerDocument}</p></td>
              <td className="p-3.5"><div className="flex items-start gap-1.5"><Package className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-none"/><span className="font-medium text-slate-700 break-words leading-snug">{ticket.items[0]?.productName||'Sem produto'}</span></div>{ticket.items.length>1&&<span className="text-[10px] text-[#145EDB] font-bold bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">+{ticket.items.length-1} outros produtos</span>}</td>
              <td className="p-3.5"><span className="font-semibold text-slate-800 break-words">{ticket.category}</span><p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-3 break-words">{ticket.description}</p></td>
              <td className="p-3.5">{getPriorityBadge(ticket.priority)}</td><td className="p-3.5">{getStatusBadge(ticket.status)}</td><td className="p-3.5">{renderSla(ticket)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </>}

    {viewMode === 'kanban' && <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">{['NEW','TECHNICAL_ANALYSIS','SENT_TO_LOGISTICS','CLOSED_PROCEDENT'].map(colStatus=>{const colTickets=visibleTickets.filter(t=>t.status===colStatus||(colStatus==='TECHNICAL_ANALYSIS'&&t.status==='TRIAGE'));return <div key={colStatus} className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 min-w-0"><div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 font-bold text-xs text-slate-700"><span>{colStatus==='NEW'?'Novos Chamados':colStatus==='TECHNICAL_ANALYSIS'?'Em Análise Técnica':colStatus==='SENT_TO_LOGISTICS'?'Em Logística / Coleta':'Encerrados'}</span><span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{colTickets.length}</span></div><div className="space-y-3">{colTickets.map(ticket=><div key={ticket.id} onClick={()=>onSelectTicket(ticket)} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm hover:shadow cursor-pointer min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-[#145EDB]">{ticket.protocol}</span>{getPriorityBadge(ticket.priority)}</div><p className="font-bold text-xs text-[#10233F] mt-2 break-words">{ticket.customerName}</p><p className="text-[11px] text-slate-600 mt-1 line-clamp-3 break-words">{ticket.description}</p><div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-medium"><span>{ticket.category}</span><span>{ticket.items.length} produto(s)</span></div></div>)}</div></div>})}</div>}

    {totalPages>1&&<nav aria-label="Paginação dos chamados" className="flex flex-wrap items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl p-3 text-xs"><button type="button" disabled={page===1} onClick={()=>setPage(v=>Math.max(1,v-1))} className="px-3 py-2 rounded-lg border font-bold disabled:opacity-40">Anterior</button><span>Página <strong>{page}</strong> de <strong>{totalPages}</strong></span><button type="button" disabled={page===totalPages} onClick={()=>setPage(v=>Math.min(totalPages,v+1))} className="px-3 py-2 rounded-lg border font-bold disabled:opacity-40">Próxima</button></nav>}
  </div>;
};
