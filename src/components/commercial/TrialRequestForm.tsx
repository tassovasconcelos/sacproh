import React, { FormEvent, useState } from 'react';
import { CalendarCheck, LoaderCircle, ShieldCheck } from 'lucide-react';
import { submitTrialRequest, TrialRequestInput } from '../../services/trialService';

const initialForm: TrialRequestInput = {
  companyName: '', contactName: '', workEmail: '', phone: '', segment: '', monthlyTicketVolume: '',
  planInterest: 'UNDECIDED', message: '', acceptedPrivacy: false, website: '', campaignCode: 'LAUNCH50_FIRST5', leadSource: 'LANDING_PAGE',
};

export function TrialRequestForm() {
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const update = (field: keyof TrialRequestInput, value: string | boolean) => setForm(previous => ({ ...previous, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.acceptedPrivacy) return;
    setState('sending'); setFeedback('');
    try {
      await submitTrialRequest(form);
      setState('success');
      setFeedback('Solicitação recebida. Nossa equipe entrará em contato para a qualificação e ativação assistida.');
      setForm(initialForm);
    } catch (error) {
      setState('error');
      setFeedback(error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.');
    }
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none focus:border-orange-300';
  return <section id="trial" className="border-y border-white/10 bg-slate-900/60 px-5 py-20">
    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.85fr_1.15fr]">
      <div><span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-400/10 text-orange-300"><CalendarCheck/></span>
        <h2 className="mt-5 text-3xl font-black">Teste gratuito por 15 dias</h2>
        <p className="mt-4 text-slate-300">Valide o seu processo real com 1 usuário, configuração inicial, indicadores e acompanhamento comercial da GRIT.</p>
        <ol className="mt-7 space-y-4 text-sm text-slate-300">
          {['Qualificação da operação e definição do objetivo do piloto','Configuração segura para 1 usuário','Execução dos fluxos prioritários por 15 dias','Revisão de indicadores e proposta do plano adequado'].map((item,index)=><li key={item} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-300 font-black text-slate-950">{index+1}</span>{item}</li>)}
        </ol>
        <p className="mt-7 flex gap-2 text-xs text-slate-400"><ShieldCheck size={17} className="shrink-0 text-emerald-400"/>O trial não exige cartão. A ativação acontece após qualificação para proteger os dados e garantir acompanhamento.</p>
      </div>
      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-slate-950 p-6 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Empresa<input required maxLength={160} value={form.companyName} onChange={e=>update('companyName',e.target.value)} className={fieldClass}/></label>
          <label className="text-sm font-semibold">Seu nome<input required maxLength={120} value={form.contactName} onChange={e=>update('contactName',e.target.value)} className={fieldClass}/></label>
          <label className="text-sm font-semibold">E-mail profissional<input required type="email" maxLength={200} value={form.workEmail} onChange={e=>update('workEmail',e.target.value)} className={fieldClass}/></label>
          <label className="text-sm font-semibold">Telefone<input maxLength={30} value={form.phone} onChange={e=>update('phone',e.target.value)} className={fieldClass}/></label>
          <label className="text-sm font-semibold">Segmento<select required value={form.segment} onChange={e=>update('segment',e.target.value)} className={fieldClass}><option value="">Selecione</option><option>Importador</option><option>Distribuidor</option><option>Fabricante</option><option>Indústria</option><option>Varejo</option><option>Serviços</option><option>Outro</option></select></label>
          <label className="text-sm font-semibold">Chamados por mês<select required value={form.monthlyTicketVolume} onChange={e=>update('monthlyTicketVolume',e.target.value)} className={fieldClass}><option value="">Selecione</option><option value="UP_TO_100">Até 100</option><option value="101_TO_500">101 a 500</option><option value="501_TO_3000">501 a 3.000</option><option value="OVER_3000">Mais de 3.000</option></select></label>
          <label className="text-sm font-semibold sm:col-span-2">Plano de interesse<select value={form.planInterest} onChange={e=>update('planInterest',e.target.value)} className={fieldClass}><option value="UNDECIDED">Quero uma recomendação</option><option value="START">SAC Start</option><option value="PRO">SAC Profissional</option><option value="ENTERPRISE">SAC Enterprise</option></select></label>
          <label className="text-sm font-semibold sm:col-span-2">Principal desafio<textarea maxLength={1200} rows={3} value={form.message} onChange={e=>update('message',e.target.value)} className={fieldClass}/></label>
          <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>update('website',e.target.value)}/></label>
        </div>
        <label className="mt-5 flex gap-3 text-xs text-slate-400"><input required type="checkbox" checked={form.acceptedPrivacy} onChange={e=>update('acceptedPrivacy',e.target.checked)} className="mt-0.5"/>Autorizo o contato comercial e o tratamento destes dados para avaliação e ativação do trial, conforme a política de privacidade.</label>
        <div className="mt-5 rounded-xl border border-orange-300/30 bg-orange-400/10 p-3 text-xs text-orange-100"><strong>Campanha de lançamento:</strong> os 5 primeiros clientes aprovados recebem 50% de desconto na mensalidade por 12 meses.</div>
        <button disabled={state==='sending'} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF8500] px-5 py-3 font-black text-white hover:bg-[#E07500] disabled:opacity-60">{state==='sending'?<LoaderCircle className="animate-spin" size={18}/>:<CalendarCheck size={18}/>}Quero testar por 15 dias</button>
        {feedback&&<p role="status" className={`mt-4 rounded-xl p-3 text-sm ${state==='success'?'bg-emerald-400/10 text-emerald-300':'bg-red-400/10 text-red-300'}`}>{feedback}</p>}
      </form>
    </div>
  </section>;
}
