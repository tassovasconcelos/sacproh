import React, { useState } from 'react';
import { 
  CheckSquare2, ShieldCheck, Plus, FileText, AlertCircle, Clock, DollarSign 
} from 'lucide-react';
import { QualityActionPlan } from '../../types';

interface QualityModuleProps {
  plans: QualityActionPlan[];
  onCreatePlan: (plan: Omit<QualityActionPlan, 'id'>) => void;
}

export const QualityModule: React.FC<QualityModuleProps> = ({ plans, onCreatePlan }) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [whatAction, setWhatAction] = useState('');
  const [whyReason, setWhyReason] = useState('');
  const [whereLocation, setWhereLocation] = useState('Central Procirúrgica');
  const [whenDeadline, setWhenDeadline] = useState('2026-08-15');
  const [whoResponsible, setWhoResponsible] = useState('Dra. Patricia Lima');
  const [howMethod, setHowMethod] = useState('');
  const [howMuchCost, setHowMuchCost] = useState<number>(500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreatePlan({
      title,
      rootCause,
      whatAction,
      whyReason,
      whereLocation,
      whenDeadline,
      whoResponsible,
      howMethod,
      howMuchCost,
      status: 'PENDING'
    });
    setShowModal(false);
    setTitle('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#10233F]">Gestão de Qualidade & Plano de Ação 5W2H</h1>
          <p className="text-xs text-slate-500 mt-0.5">Metodologia 5W2H para tratativas de causa raiz, ações corretivas e preventivas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold text-xs px-4 py-2 rounded-lg shadow flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Plano 5W2H</span>
        </button>
      </div>

      <div className="space-y-4">
        {plans.map(p => (
          <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-[#10233F]">{p.title}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {p.status}
              </span>
            </div>

            <p className="text-slate-600"><strong>Causa Raiz:</strong> {p.rootCause}</p>

            {/* 5W2H Grid */}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
              <div><strong className="block text-slate-500">WHAT (O quê):</strong> {p.whatAction}</div>
              <div><strong className="block text-slate-500">WHY (Por quê):</strong> {p.whyReason}</div>
              <div><strong className="block text-slate-500">WHERE (Onde):</strong> {p.whereLocation}</div>
              <div><strong className="block text-slate-500">WHEN (Quando):</strong> {p.whenDeadline}</div>
              <div><strong className="block text-slate-500">WHO (Quem):</strong> {p.whoResponsible}</div>
              <div><strong className="block text-slate-500">HOW (Como):</strong> {p.howMethod}</div>
              <div><strong className="block text-slate-500">HOW MUCH (Custo):</strong> R$ {p.howMuchCost.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for new 5W2H */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-base text-[#10233F]">Criar Plano de Ação 5W2H</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Título do Plano *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Causa Raiz Identificada *</label>
                <textarea 
                  rows={2} 
                  value={rootCause} 
                  onChange={e => setRootCause(e.target.value)} 
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">O quê será feito (WHAT)</label>
                  <input type="text" value={whatAction} onChange={e => setWhatAction(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Quem executará (WHO)</label>
                  <input type="text" value={whoResponsible} onChange={e => setWhoResponsible(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-2 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#145EDB] text-white font-bold rounded-lg">Salvar Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
