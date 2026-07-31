import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Clock, AlertTriangle, Eye, CheckCircle2, 
  XCircle, ArrowRight, LayoutGrid, Table, ChevronRight, Package 
} from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority } from '../../types';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenNewModal: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  onOpenNewModal
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Novo</span>;
      case 'TRIAGE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Em Triagem</span>;
      case 'TECHNICAL_ANALYSIS':
      case 'SENT_TO_TECHNICAL':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">Análise Técnica</span>;
      case 'SENT_TO_LOGISTICS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">Em Logística</span>;
      case 'CLOSED_PROCEDENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Encerrado Procedente</span>;
      case 'CLOSED_NON_PROCEDENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Não Procedente</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#D92D20] text-white flex items-center space-x-1"><AlertTriangle className="w-3 h-3 mr-1" /> CRÍTICO</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FF8500] text-white">ALTA</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white">MÉDIA</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-500 text-white">BAIXA</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#10233F]">Gestão de Chamados SAC</h1>
          <p className="text-xs text-slate-500 mt-0.5">Acompanhamento e protocolo unificado da Procirúrgica</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center space-x-1 transition-all ${
                viewMode === 'list' ? 'bg-white text-[#145EDB] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center space-x-1 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-[#145EDB] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <button
            onClick={onOpenNewModal}
            className="bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center space-x-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Atendimento SAC</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center space-x-2 font-bold text-slate-700">
          <Filter className="w-4 h-4 text-[#145EDB]" />
          <span>Filtros:</span>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-slate-500 font-medium">Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 outline-none focus:border-[#145EDB]"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NEW">Novos</option>
            <option value="TRIAGE">Em Triagem</option>
            <option value="TECHNICAL_ANALYSIS">Em Análise Técnica</option>
            <option value="SENT_TO_LOGISTICS">Em Logística</option>
            <option value="CLOSED_PROCEDENT">Encerrados Procedentes</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-slate-500 font-medium">Prioridade:</label>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-800 outline-none focus:border-[#145EDB]"
          >
            <option value="ALL">Todas Prioridades</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>
        </div>

        <div className="ml-auto text-slate-500 font-medium">
          Exibindo <strong>{filteredTickets.length}</strong> chamados
        </div>
      </div>

      {/* LIST VIEW TABLE */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3.5">Protocolo & Data</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Produtos (Itens)</th>
                  <th className="p-3.5">Categoria / Ocorrência</th>
                  <th className="p-3.5">Prioridade</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">SLA Vencimento</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredTickets.map(ticket => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => onSelectTicket(ticket)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="p-3.5">
                      <span className="font-bold text-[#145EDB] font-mono text-xs">{ticket.protocol}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-[#10233F]">{ticket.customerName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{ticket.customerDocument}</p>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">
                          {ticket.items[0]?.productName || 'Sem produto'}
                        </span>
                      </div>
                      {ticket.items.length > 1 && (
                        <span className="text-[10px] text-[#145EDB] font-bold bg-blue-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                          +{ticket.items.length - 1} outros produtos
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">{ticket.category}</span>
                      <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{ticket.description}</p>
                    </td>
                    <td className="p-3.5">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1 text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>30/07 - 18:00</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button className="text-[#145EDB] font-bold group-hover:translate-x-1 transition-transform inline-flex items-center space-x-1">
                        <span>Ver Detalhes</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['NEW', 'TECHNICAL_ANALYSIS', 'SENT_TO_LOGISTICS', 'CLOSED_PROCEDENT'].map(colStatus => {
            const colTickets = filteredTickets.filter(t => t.status === colStatus || (colStatus === 'TECHNICAL_ANALYSIS' && t.status === 'TRIAGE'));
            return (
              <div key={colStatus} className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 font-bold text-xs text-slate-700">
                  <span>
                    {colStatus === 'NEW' && 'Novos Chamados'}
                    {colStatus === 'TECHNICAL_ANALYSIS' && 'Em Análise Técnica'}
                    {colStatus === 'SENT_TO_LOGISTICS' && 'Em Logística / Coleta'}
                    {colStatus === 'CLOSED_PROCEDENT' && 'Encerrados'}
                  </span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTickets.map(ticket => (
                    <div 
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket)}
                      className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-shadow cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#145EDB]">{ticket.protocol}</span>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <p className="font-bold text-xs text-[#10233F] truncate">{ticket.customerName}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{ticket.description}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>{ticket.category}</span>
                        <span>{ticket.items.length} produto(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
