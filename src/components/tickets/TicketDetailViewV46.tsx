import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CircleDollarSign, History, PlusCircle, RefreshCw } from 'lucide-react';
import type { ServiceOrder, Ticket, TicketQualificationStage, TicketStatus, UserProfile, UserRole } from '../../types';
import { TicketDetailView as TicketDetailViewV45 } from './TicketDetailViewV45';
import { sacV46Service, type CostSummary, type ProcessCost } from '../../services/sacV46Service';

interface Props {
  ticket: Ticket;
  currentUser: UserProfile;
  userRole: UserRole;
  users: UserProfile[];
  onBack: () => void;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus, notes: string) => void;
  onDispatch: (ticketId: string, assignedArea: string, assignedToId?: string, assignedToName?: string, notes?: string) => void;
  onCreateOS: (osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>) => void;
  onUpdateTicket: (ticket: Ticket, changes: Partial<Ticket>) => Promise<void>;
  onDeleteTicket: (ticket: Ticket, reason: string) => Promise<void>;
}

const stages: Array<[TicketQualificationStage,string]> = [
  ['REGISTRATION','Registro inicial'],['DOCUMENT_VALIDATION','Validação documental'],['TECHNICAL_TRIAGE','Triagem técnica'],
  ['INVESTIGATION','Investigação'],['ACTION_PLAN','Plano de ação'],['SOLUTION_VALIDATION','Validação da solução'],['COMPLETED','Concluído']
];

const costTypes = [
  ['BONUS_INVOICE','NF de bonificação'],['RETURN_INVOICE','NF de devolução'],['OUTBOUND_FREIGHT','Frete de envio/reposição'],
  ['RETURN_FREIGHT','Frete de coleta/devolução'],['TECHNICAL_SERVICE','Assistência técnica'],['PARTS','Peças'],
  ['PRODUCT_REPLACEMENT','Substituição de produto'],['REFUND','Reembolso'],['OTHER','Outros']
];

const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

export const TicketDetailView: React.FC<Props> = props => {
  const { ticket, currentUser } = props;
  const [revision,setRevision] = useState(0);
  const [costs,setCosts] = useState<ProcessCost[]>([]);
  const [summary,setSummary] = useState<CostSummary>({grossCost:0,recoveredAmount:0,netCost:0,costEntries:0});
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [evolution,setEvolution] = useState({
    title:'',description:'',stage:(ticket.qualificationStage || 'REGISTRATION') as TicketQualificationStage,
    nextAction:'',dueAt:'',contactChannel:'',externalParty:'',internal:false
  });
  const [cost,setCost] = useState({
    costType:'OTHER',description:'',amount:'',quantity:'1',invoiceNumber:'',supplierName:'',costCenter:'',responsibleArea:'',
    documentReference:'',occurredAt:new Date().toISOString().slice(0,10),notes:'',approvalStatus:'REGISTERED',reimbursable:false,recoveredAmount:'0'
  });

  const reloadCosts = async () => {
    const [items,total] = await Promise.all([sacV46Service.getCosts(ticket.id),sacV46Service.getCostSummary(ticket.id)]);
    setCosts(items); setSummary(total);
  };

  useEffect(()=>{ reloadCosts().catch(err=>setError(err instanceof Error?err.message:'Falha ao carregar custos.')); },[ticket.id]);

  const byType = useMemo(()=>costs.reduce<Record<string,number>>((acc,item)=>{acc[item.costType]=(acc[item.costType]||0)+item.amount;return acc;},{}),[costs]);

  const saveEvolution = async (event:React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      await sacV46Service.registerEvolution(ticket.id,{
        title:evolution.title,description:evolution.description,stage:evolution.stage,nextAction:evolution.nextAction || undefined,
        dueAt:evolution.dueAt ? new Date(evolution.dueAt).toISOString() : undefined,contactChannel:evolution.contactChannel || undefined,
        externalParty:evolution.externalParty || undefined,internal:evolution.internal
      });
      setEvolution(previous=>({...previous,title:'',description:'',nextAction:'',dueAt:'',contactChannel:'',externalParty:'',internal:false}));
      setMessage('Evolução registrada no histórico cronológico do protocolo.'); setRevision(v=>v+1);
    } catch(err) { setError(err instanceof Error?err.message:'Não foi possível registrar a evolução.'); }
    finally { setLoading(false); }
  };

  const saveCost = async (event:React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const amount=Number(cost.amount.replace(',','.')); const quantity=Number(cost.quantity.replace(',','.')) || 1;
      const recovered=Number(cost.recoveredAmount.replace(',','.')) || 0;
      await sacV46Service.createCost(ticket,currentUser,{
        costType:cost.costType,description:cost.description,amount,quantity,unitAmount:quantity?amount/quantity:amount,
        invoiceNumber:cost.invoiceNumber || undefined,supplierName:cost.supplierName || undefined,costCenter:cost.costCenter || undefined,
        responsibleArea:cost.responsibleArea || undefined,documentReference:cost.documentReference || undefined,occurredAt:cost.occurredAt,
        notes:cost.notes || undefined,approvalStatus:cost.approvalStatus as any,reimbursable:cost.reimbursable,recoveredAmount:recovered
      });
      setCost(previous=>({...previous,description:'',amount:'',quantity:'1',invoiceNumber:'',supplierName:'',documentReference:'',notes:'',recoveredAmount:'0'}));
      await reloadCosts(); setMessage('Custo registrado e incorporado automaticamente ao histórico do SAC.'); setRevision(v=>v+1);
    } catch(err) { setError(err instanceof Error?err.message:'Não foi possível registrar o custo.'); }
    finally { setLoading(false); }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#0B2343] to-[#145EDB] px-5 py-4 text-white flex flex-wrap justify-between gap-3">
        <div><div className="flex items-center gap-2"><History className="w-5 h-5"/><h2 className="font-black">SACPROH V4.6 · Evolução e custos do protocolo</h2></div>
          <p className="text-xs text-blue-100 mt-1">Cada contato, decisão, pendência, prazo e impacto financeiro passa a compor a memória cronológica do SAC.</p></div>
        <button type="button" onClick={()=>{void reloadCosts();setRevision(v=>v+1);}} className="self-start px-3 py-2 rounded-lg bg-white/10 text-xs font-bold flex gap-1 items-center"><RefreshCw className="w-3.5 h-3.5"/>Atualizar</button>
      </div>
      <div className="p-5 space-y-5 text-xs">
        {error && <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">{error}</div>}
        {message && <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">{message}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <article className="rounded-xl bg-slate-50 border p-4"><p className="text-slate-500">Lançamentos</p><strong className="text-xl">{summary.costEntries}</strong></article>
          <article className="rounded-xl bg-slate-50 border p-4"><p className="text-slate-500">Custo bruto</p><strong className="text-xl">{money.format(summary.grossCost)}</strong></article>
          <article className="rounded-xl bg-slate-50 border p-4"><p className="text-slate-500">Recuperado / reembolsado</p><strong className="text-xl text-emerald-700">{money.format(summary.recoveredAmount)}</strong></article>
          <article className="rounded-xl bg-slate-50 border p-4"><p className="text-slate-500">Custo líquido</p><strong className="text-xl text-[#D92D20]">{money.format(summary.netCost)}</strong></article>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={saveEvolution} className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex gap-2 items-center"><PlusCircle className="w-4 h-4 text-[#145EDB]"/><div><h3 className="font-black text-sm">Registrar evolução do protocolo</h3><p className="text-slate-500">Use para contato com cliente, análise, retorno da fábrica, decisão, pendência ou conclusão de etapa.</p></div></div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="font-bold md:col-span-2">Título da evolução<input required value={evolution.title} onChange={e=>setEvolution({...evolution,title:e.target.value})} placeholder="Ex.: Retorno do cliente com nova evidência" className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Etapa<select value={evolution.stage} onChange={e=>setEvolution({...evolution,stage:e.target.value as TicketQualificationStage})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white">{stages.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
              <label className="font-bold">Canal<select value={evolution.contactChannel} onChange={e=>setEvolution({...evolution,contactChannel:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"><option value="">Não se aplica</option><option>Telefone</option><option>WhatsApp</option><option>E-mail</option><option>Presencial</option><option>Fornecedor/Fábrica</option><option>Interno</option></select></label>
              <label className="font-bold md:col-span-2">Descrição completa<textarea required rows={5} value={evolution.description} onChange={e=>setEvolution({...evolution,description:e.target.value})} placeholder="Registre fatos, análise, evidências recebidas, orientação dada e decisão tomada." className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Próxima ação<input value={evolution.nextAction} onChange={e=>setEvolution({...evolution,nextAction:e.target.value})} placeholder="Ex.: cobrar laudo do fabricante" className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Prazo da próxima ação<input type="datetime-local" value={evolution.dueAt} onChange={e=>setEvolution({...evolution,dueAt:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold md:col-span-2">Parte externa / contato<input value={evolution.externalParty} onChange={e=>setEvolution({...evolution,externalParty:e.target.value})} placeholder="Cliente, hospital, transportadora, fabricante..." className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
            </div>
            <div className="flex items-center justify-between gap-3"><label className="flex gap-2 items-center"><input type="checkbox" checked={evolution.internal} onChange={e=>setEvolution({...evolution,internal:e.target.checked})}/><span>Registro interno</span></label><button disabled={loading} className="px-4 py-2 rounded-lg bg-[#145EDB] text-white font-bold">{loading?'Salvando...':'Registrar evolução'}</button></div>
          </form>

          <form onSubmit={saveCost} className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex gap-2 items-center"><CircleDollarSign className="w-4 h-4 text-[#FF8500]"/><div><h3 className="font-black text-sm">Registrar custo do processo</h3><p className="text-slate-500">Frete, peça, bonificação, assistência, devolução, reposição, reembolso e demais impactos.</p></div></div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="font-bold">Tipo<select value={cost.costType} onChange={e=>setCost({...cost,costType:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white">{costTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
              <label className="font-bold">Data<input required type="date" value={cost.occurredAt} onChange={e=>setCost({...cost,occurredAt:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold md:col-span-2">Descrição<input required value={cost.description} onChange={e=>setCost({...cost,description:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Valor total (R$)<input required inputMode="decimal" value={cost.amount} onChange={e=>setCost({...cost,amount:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Quantidade<input inputMode="decimal" value={cost.quantity} onChange={e=>setCost({...cost,quantity:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">NF / documento<input value={cost.invoiceNumber} onChange={e=>setCost({...cost,invoiceNumber:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Fornecedor<input value={cost.supplierName} onChange={e=>setCost({...cost,supplierName:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Centro de custo<input value={cost.costCenter} onChange={e=>setCost({...cost,costCenter:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Área responsável<input value={cost.responsibleArea} onChange={e=>setCost({...cost,responsibleArea:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Referência / comprovante<input value={cost.documentReference} onChange={e=>setCost({...cost,documentReference:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold">Status<select value={cost.approvalStatus} onChange={e=>setCost({...cost,approvalStatus:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"><option value="REGISTERED">Registrado</option><option value="PENDING_APPROVAL">Pendente aprovação</option><option value="APPROVED">Aprovado</option><option value="REJECTED">Rejeitado</option></select></label>
              <label className="font-bold">Valor recuperado (R$)<input inputMode="decimal" value={cost.recoveredAmount} onChange={e=>setCost({...cost,recoveredAmount:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
              <label className="font-bold flex items-end gap-2 pb-2"><input type="checkbox" checked={cost.reimbursable} onChange={e=>setCost({...cost,reimbursable:e.target.checked})}/><span>Passível de reembolso/ressarcimento</span></label>
              <label className="font-bold md:col-span-2">Observações<textarea rows={2} value={cost.notes} onChange={e=>setCost({...cost,notes:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal bg-white"/></label>
            </div>
            <div className="flex justify-end"><button disabled={loading} className="px-4 py-2 rounded-lg bg-[#FF8500] text-white font-bold">{loading?'Salvando...':'Registrar custo'}</button></div>
          </form>
        </div>

        {costs.length>0 && <div className="space-y-3">
          <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-[#145EDB]"/><h3 className="font-black text-sm">Memória financeira do protocolo</h3></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-50"><th className="p-2 text-left">Data</th><th className="p-2 text-left">Tipo / descrição</th><th className="p-2 text-left">Documento</th><th className="p-2 text-left">Centro / área</th><th className="p-2 text-right">Valor</th><th className="p-2 text-right">Recuperado</th></tr></thead><tbody>{costs.map(item=><tr key={item.id} className="border-t"><td className="p-2">{new Date(`${item.occurredAt}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="p-2"><strong>{costTypes.find(x=>x[0]===item.costType)?.[1]||item.costType}</strong><br/><span className="text-slate-500">{item.description}</span></td><td className="p-2">{item.invoiceNumber||item.documentReference||'-'}</td><td className="p-2">{[item.costCenter,item.responsibleArea].filter(Boolean).join(' / ')||'-'}</td><td className="p-2 text-right font-bold">{money.format(item.amount)}</td><td className="p-2 text-right text-emerald-700 font-bold">{money.format(item.recoveredAmount||0)}</td></tr>)}</tbody></table></div>
          <div className="flex flex-wrap gap-2">{Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([type,value])=><span key={type} className="px-2.5 py-1 rounded-full bg-slate-100 border text-slate-700"><b>{costTypes.find(x=>x[0]===type)?.[1]||type}:</b> {money.format(value)}</span>)}</div>
        </div>}
      </div>
    </section>

    <TicketDetailViewV45 key={`${ticket.id}-${revision}`} {...props}/>
  </div>;
};
