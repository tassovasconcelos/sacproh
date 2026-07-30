import React from 'react';
import { Truck, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { LogisticsCase } from '../../types';

interface LogisticsModuleProps {
  cases: LogisticsCase[];
}

export const LogisticsModule: React.FC<LogisticsModuleProps> = ({ cases }) => {
  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-[#10233F]">Gestão de Logística, Coletas & Devoluções</h1>
        <p className="text-xs text-slate-500 mt-0.5">Rastreamento de transportadoras, agendamento de coletas de avaria e devoluções Procirúrgica</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map(lc => (
          <div key={lc.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-mono font-bold text-[#FF8500] text-sm">{lc.subprotocol}</span>
              <span className="bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded text-[10px]">
                {lc.status}
              </span>
            </div>

            <p><strong>Transportadora:</strong> {lc.carrierName}</p>
            <p><strong>Código de Rastreio:</strong> <span className="font-mono font-bold text-slate-900">{lc.trackingCode}</span></p>
            <p><strong>Operação:</strong> {lc.type === 'COLLECTION' ? 'Coleta em Cliente' : 'Devolução ao CD'}</p>
            <p><strong>Custo de Frete:</strong> R$ {lc.freightCost.toFixed(2)}</p>
            <p><strong>Data Agendada:</strong> {lc.scheduledDate}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
