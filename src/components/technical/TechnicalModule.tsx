
import React, { useState } from 'react';
import { Wrench, Plus, FileText, Calendar, DollarSign, CheckCircle2, AlertTriangle, Printer, Search, Clock, Edit3, Trash2 } from 'lucide-react';
import { TechnicalCase, ServiceOrder, Ticket, UserProfile } from '../../types';
import { NewServiceOrderModal } from './NewServiceOrderModal';

interface TechnicalModuleProps {
  cases: TechnicalCase[];
  serviceOrders: ServiceOrder[];
  tickets: Ticket[];
  users: UserProfile[];
  onCreateOS: (osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>) => void;
  onUpdateOS: (order: ServiceOrder, changes: Partial<ServiceOrder>) => Promise<void>;
  onDeleteOS: (order: ServiceOrder, reason: string) => Promise<void>;
}

export const TechnicalModule: React.FC<TechnicalModuleProps> = ({
  cases,
  serviceOrders,
  tickets,
  users,
  onCreateOS,
  onUpdateOS,
  onDeleteOS
}) => {
  const [showNewOSModal, setShowNewOSModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [operationError, setOperationError] = useState('');

  const filteredOS = serviceOrders.filter(os => 
    os.osNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    os.equipmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#10233F]">Assistência Técnica & Ordens de Serviço (OS)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emissão de laudos de bancada, Ordens de Serviço (OS), substituição de peças e calibração de equipamentos hospitalares
          </p>
        </div>

        <button
          onClick={() => setShowNewOSModal(true)}
          className="bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Abrir Ordem de Serviço (OS)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar por número da OS (Ex: OS-2026-0001), protocolo SAC, cliente ou modelo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus:border-[#145EDB] outline-none"
        />
      </div>

      {/* Service Orders Grid */}
      <div className="space-y-4">
        <h2 className="font-bold text-sm text-[#10233F] flex items-center space-x-2">
          <Wrench className="w-4 h-4 text-[#FF8500]" />
          <span>Ordens de Serviço (OS) Registradas ({filteredOS.length})</span>
        </h2>

        {filteredOS.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
            Nenhuma Ordem de Serviço cadastrada. Clique no botão acima para abrir a primeira OS.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOS.map(os => (
              <div key={os.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-base text-[#145EDB]">{os.osNumber}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                      {os.protocol}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    os.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    os.status === 'IN_ATTENDANCE' ? 'bg-purple-100 text-purple-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {os.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-slate-900 font-bold text-sm">{os.equipmentName}</p>
                  <p className="text-slate-500">Cliente: <strong className="text-slate-800">{os.customerName}</strong></p>
                  <div className="flex flex-wrap gap-3 font-mono text-[11px] text-slate-600 pt-1">
                    <span>Nº Série: <strong>{os.serialNumber || 'N/A'}</strong></span>
                    <span>Lote: <strong>{os.lotNumber || 'N/A'}</strong></span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700">Diagnóstico Técnico:</p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{os.diagnostic}</p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-500">Técnico: </span>
                    <strong className="text-slate-900">{os.technicianName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Custo Estimado: </span>
                    <strong className="text-[#10233F]">R$ {os.estimatedCost.toFixed(2)}</strong>
                  </div>

                  <button
                    onClick={() => setSelectedOS(os)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Visualizar OS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Printable/View OS Modal */}
      {selectedOS && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-mono font-bold text-lg text-[#145EDB]">{selectedOS.osNumber}</h3>
                <p className="text-slate-500 text-[11px]">Ordem de Serviço de Assistência Técnica Procirúrgica</p>
              </div>
              <button onClick={() => setSelectedOS(null)} className="p-1 bg-slate-100 rounded-lg font-bold">Fechar</button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2 border">
              <p><strong>Protocolo SAC:</strong> {selectedOS.protocol}</p>
              <p><strong>Cliente:</strong> {selectedOS.customerName}</p>
              <p><strong>Equipamento:</strong> {selectedOS.equipmentName}</p>
              <p><strong>Nº Série / Lote:</strong> {selectedOS.serialNumber || 'N/A'} / {selectedOS.lotNumber || 'N/A'}</p>
              <p><strong>Tipo de Atendimento:</strong> {selectedOS.serviceType}</p>
              <p><strong>Técnico Responsável:</strong> {selectedOS.technicianName}</p>
              <p><strong>Custo Estimado:</strong> R$ {selectedOS.estimatedCost.toFixed(2)}</p>
              <p><strong>Diagnóstico:</strong> {selectedOS.diagnostic}</p>
              <p><strong>Peças a Substituir:</strong> {selectedOS.partsReplaced || 'Nenhuma'}</p>
            </div>

            {isEditing && <form onSubmit={async e=>{e.preventDefault();if(!selectedOS)return;try{setOperationError('');await onUpdateOS(selectedOS,selectedOS);setIsEditing(false);}catch(error){setOperationError(error instanceof Error?error.message:'Falha ao editar OS');}}} className="p-4 border rounded-xl space-y-3"><div className="grid grid-cols-2 gap-3"><label className="font-bold">Equipamento<input value={selectedOS.equipmentName} onChange={e=>setSelectedOS({...selectedOS,equipmentName:e.target.value})} className="mt-1 w-full border rounded p-2 font-normal"/></label><label className="font-bold">Número de série<input value={selectedOS.serialNumber||''} onChange={e=>setSelectedOS({...selectedOS,serialNumber:e.target.value})} className="mt-1 w-full border rounded p-2 font-normal"/></label></div><label className="block font-bold">Diagnóstico<textarea value={selectedOS.diagnostic} onChange={e=>setSelectedOS({...selectedOS,diagnostic:e.target.value})} className="mt-1 w-full border rounded p-2 font-normal"/></label><div className="grid grid-cols-2 gap-3"><label className="font-bold">Custo estimado<input type="number" step="0.01" value={selectedOS.estimatedCost} onChange={e=>setSelectedOS({...selectedOS,estimatedCost:Number(e.target.value)})} className="mt-1 w-full border rounded p-2 font-normal"/></label><label className="font-bold">Status<select value={selectedOS.status} onChange={e=>setSelectedOS({...selectedOS,status:e.target.value as ServiceOrder['status']})} className="mt-1 w-full border rounded p-2 font-normal"><option value="OPEN">Aberta</option><option value="IN_ATTENDANCE">Em atendimento</option><option value="WAITING_PARTS">Aguardando peças</option><option value="TESTING">Em testes</option><option value="COMPLETED">Concluída</option><option value="CANCELLED">Cancelada</option></select></label></div><button className="bg-[#145EDB] text-white px-4 py-2 rounded font-bold">Salvar OS</button></form>}

            {showDelete && <form onSubmit={async e=>{e.preventDefault();if(!selectedOS)return;try{setOperationError('');await onDeleteOS(selectedOS,deleteReason);setSelectedOS(null);setShowDelete(false);}catch(error){setOperationError(error instanceof Error?error.message:'Falha ao excluir OS');}}} className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2"><p className="font-bold text-red-700">Excluir definitivamente esta OS</p><textarea required placeholder="Informe o motivo da exclusão" value={deleteReason} onChange={e=>setDeleteReason(e.target.value)} className="w-full border rounded p-2"/><button className="bg-red-600 text-white px-4 py-2 rounded font-bold">Confirmar exclusão</button></form>}
            {operationError && <p className="bg-red-50 text-red-700 p-2 rounded">{operationError}</p>}

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={()=>{setIsEditing(!isEditing);setShowDelete(false);}} className="px-4 py-2 bg-slate-100 font-bold rounded-lg flex items-center gap-1"><Edit3 className="w-4 h-4"/>Editar</button>
              <button onClick={()=>{setShowDelete(!showDelete);setIsEditing(false);}} className="px-4 py-2 bg-red-50 text-red-700 font-bold rounded-lg flex items-center gap-1"><Trash2 className="w-4 h-4"/>Excluir</button>
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#0B2343] text-white font-bold rounded-lg flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Creating New OS */}
      {showNewOSModal && (
        <NewServiceOrderModal
          tickets={tickets}
          users={users}
          onClose={() => setShowNewOSModal(false)}
          onCreateOS={onCreateOS}
        />
      )}
    </div>
  );
};

