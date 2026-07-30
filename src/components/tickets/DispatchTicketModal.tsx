import React, { useState } from 'react';
import { Send, X, Users, Building2, Check, FileText } from 'lucide-react';
import { Ticket, UserProfile } from '../../types';

interface DispatchTicketModalProps {
  ticket: Ticket;
  users: UserProfile[];
  onClose: () => void;
  onDispatch: (ticketId: string, assignedArea: string, assignedToId?: string, assignedToName?: string, notes?: string) => void;
}

export const DispatchTicketModal: React.FC<DispatchTicketModalProps> = ({
  ticket,
  users,
  onClose,
  onDispatch
}) => {
  const [assignedArea, setAssignedArea] = useState<string>(ticket.assignedArea || 'Assistência Técnica');
  const [assignedToId, setAssignedToId] = useState<string>(ticket.assignedTo || 'u002');
  const [notes, setNotes] = useState<string>('');

  const areasList = [
    'Assistência Técnica',
    'Logística / Coleta & Devoluções',
    'Qualidade & Farmacovigilância',
    'Comercial / Troca & Garantia',
    'Financeiro / Devolução de Valores',
    'Diretoria & Ouvidoria'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = users.find(u => u.id === assignedToId);

    onDispatch(
      ticket.id,
      assignedArea,
      assignedToId,
      selectedUser?.fullName || 'Não especificado',
      notes
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs flex flex-col">
        {/* Header */}
        <div className="bg-[#145EDB] text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5" />
            <h3 className="font-bold text-sm">Direcionar & Atribuir Chamado</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-200 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="font-mono font-bold text-[#145EDB] text-sm">{ticket.protocol}</p>
            <p className="font-bold text-slate-800">{ticket.customerName}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{ticket.description.slice(0, 100)}...</p>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700">Área Destino / Departamento *</label>
            <select
              value={assignedArea}
              onChange={(e) => setAssignedArea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-bold text-slate-800"
            >
              {areasList.map((area, idx) => (
                <option key={idx} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700">Usuário Responsável Atribuído *</label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg text-slate-800"
            >
              <option value="">-- Selecionar Usuário --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.fullName} - {u.roleCode} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700">Instruções / Observações do Direcionamento</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Priorizar análise em bancada devido ao risco cirúrgico; agendar visita do engenheiro..."
              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold rounded-lg shadow flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Confirmar Direcionamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
