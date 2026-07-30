import React, { useState } from 'react';
import { Wrench, X, Check, FileText, AlertCircle } from 'lucide-react';
import { Ticket, UserProfile, ServiceOrder } from '../../types';

interface NewServiceOrderModalProps {
  tickets: Ticket[];
  users: UserProfile[];
  preselectedTicket?: Ticket;
  onClose: () => void;
  onCreateOS: (osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>) => void;
}

export const NewServiceOrderModal: React.FC<NewServiceOrderModalProps> = ({
  tickets,
  users,
  preselectedTicket,
  onClose,
  onCreateOS
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(preselectedTicket?.id || (tickets[0]?.id || ''));
  const currentTicket = tickets.find(t => t.id === selectedTicketId) || preselectedTicket;

  const [technicianId, setTechnicianId] = useState<string>('u002');
  const [serviceType, setServiceType] = useState<ServiceOrder['serviceType']>('CORRECTIVE_MAINTENANCE');
  const [urgency, setUrgency] = useState<ServiceOrder['urgency']>(currentTicket?.priority || 'HIGH');
  const [equipmentName, setEquipmentName] = useState<string>(
    currentTicket?.items[0]?.productName || 'Bisturi Eletrônico Alta Frequência HF-400W'
  );
  const [serialNumber, setSerialNumber] = useState<string>(currentTicket?.items[0]?.serialNumber || 'SN-400W-2026-88');
  const [lotNumber, setLotNumber] = useState<string>(currentTicket?.items[0]?.lotNumber || 'LOTE-202604');
  const [diagnostic, setDiagnostic] = useState<string>('');
  const [partsReplaced, setPartsReplaced] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number>(850);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const techUser = users.find(u => u.id === technicianId);

    onCreateOS({
      ticketId: selectedTicketId,
      protocol: currentTicket?.protocol || 'SAC.2607.001',
      customerName: currentTicket?.customerName || 'Hospital Cliente',
      equipmentName,
      serialNumber,
      lotNumber,
      technicianId,
      technicianName: techUser?.fullName || 'Eng. Carlos Eduardo',
      serviceType,
      urgency,
      diagnostic: diagnostic || 'Equipamento entregue em bancada. Necessária calibração e substituição de placas.',
      partsReplaced,
      estimatedCost: Number(estimatedCost) || 0,
      status: 'OPEN'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#0B2343] text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-[#FF8500]" />
            <h3 className="font-bold text-sm">Abrir Nova Ordem de Serviço (OS)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          
          {/* Select Linked Ticket */}
          {!preselectedTicket && (
            <div>
              <label className="block font-bold mb-1 text-slate-700">Protocolo de Chamado Vinculado *</label>
              <select
                value={selectedTicketId}
                onChange={(e) => setSelectedTicketId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg outline-none font-bold"
              >
                {tickets.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.protocol} - {t.customerName} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentTicket && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
              <p className="font-bold text-[#145EDB]">Chamado: {currentTicket.protocol} - {currentTicket.customerName}</p>
              <p className="text-slate-600 text-[11px]">{currentTicket.description.slice(0, 120)}...</p>
            </div>
          )}

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700">Técnico Responsável *</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
              >
                {users.filter(u => u.roleCode === 'TECNICO' || u.roleCode === 'RESPONSAVEL_TECNICA' || u.roleCode === 'SUPERADMIN').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.roleCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">Tipo de Atendimento *</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
              >
                <option value="CORRECTIVE_MAINTENANCE">Manutenção Corretiva</option>
                <option value="PREVENTIVE_MAINTENANCE">Manutenção Preventiva</option>
                <option value="CALIBRATION">Calibração & Aferição ANVISA</option>
                <option value="INSTALLATION">Instalação & Treinamento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700">Equipamento / Modelo *</label>
              <input
                type="text"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700">Número de Série</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700">Número do Lote</label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700">Diagnóstico Inicial de Bancada *</label>
            <textarea
              rows={3}
              value={diagnostic}
              onChange={(e) => setDiagnostic(e.target.value)}
              placeholder="Descreva a avaliação do defeito relatado, sintomas observados em bancada e provável causa raiz..."
              required
              className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1 text-slate-700">Peças a Substituir / Acessórios</label>
              <input
                type="text"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                placeholder="Ex: Placa mãe, cabo monopolar..."
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold mb-1 text-slate-700">Previsão de Custo Técnico (R$)</label>
              <input
                type="number"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold rounded-lg shadow"
            >
              Gerar Ordem de Serviço (OS)
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
