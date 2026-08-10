import React, { useEffect } from 'react';
import { ArrowRight, BarChart3, Check, CreditCard, Headphones, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { startMercadoPagoCheckout } from '../../services/checkoutService';
import { TrialRequestForm } from './TrialRequestForm';

type Plan = {
  code: 'START' | 'PRO' | 'ENTERPRISE';
  name: string;
  description: string;
  monthly: string;
  annual: string;
  setup: string;
  seats: string;
  highlight?: boolean;
  features: string[];
  checkout?: string;
};

const plans: Plan[] = [
  {
    code: 'START', name: 'SAC Start', description: 'Para operações que estão estruturando o atendimento.',
    monthly: 'R$ 449', annual: 'R$ 5.388', setup: 'R$ 1.490', seats: '5 usuários incluídos',
    checkout: (import.meta as any).env?.VITE_CHECKOUT_START_URL,
    features: ['Até 500 chamados/mês', 'Dashboard gerencial', 'Anexos, SLA e auditoria', 'Implantação assistida'],
  },
  {
    code: 'PRO', name: 'SAC Profissional', description: 'Para distribuidores, importadores e fabricantes.',
    monthly: 'R$ 1.079', annual: 'R$ 12.948', setup: 'R$ 2.990', seats: '15 usuários incluídos', highlight: true,
    checkout: (import.meta as any).env?.VITE_CHECKOUT_PRO_URL,
    features: ['Até 3.000 chamados/mês', 'Marca e fluxos personalizados', 'Relatórios executivos e API', 'Onboarding e importação inicial'],
  },
  {
    code: 'ENTERPRISE', name: 'SAC Enterprise', description: 'Para grupos com múltiplas empresas e operações.',
    monthly: 'R$ 2.249', annual: 'R$ 26.988', setup: 'R$ 5.990', seats: '40 usuários incluídos',
    checkout: (import.meta as any).env?.VITE_CHECKOUT_ENTERPRISE_URL,
    features: ['Chamados sob política comercial', 'Multiempresa e múltiplas unidades', 'SSO, auditoria avançada e API', 'Gerente de implantação dedicado'],
  },
];

const requestCheckoutFallback = (plan: Plan) => {
  if (plan.checkout) {
    window.location.assign(plan.checkout);
    return;
  }
  const subject = encodeURIComponent(`Contratação anual ${plan.name}`);
  const body = encodeURIComponent(`Olá, quero contratar o plano ${plan.name} por 12 meses, incluindo o setup. Por favor, envie o link seguro para pagamento no cartão.`);
  window.location.assign(`mailto:gritsolucoes@gmail.com?subject=${subject}&body=${body}`);
};

export function SaasTrialPortal() {
  const checkoutEnabled = (import.meta as any).env?.VITE_COMMERCIAL_CHECKOUT_ENABLED === 'true';
  const requestCheckout = async (plan: Plan) => {
    window.alert(`A contratação do ${plan.name} é liberada após validação cadastral e contrato. Envie a solicitação para receber a proposta e o link seguro.`);
    document.querySelector('#trial')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    document.title = 'SAC 4.0 | Plataforma de Gestão de Atendimento';
    const description = document.querySelector('meta[name="description"]') || document.head.appendChild(document.createElement('meta'));
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'Plataforma SaaS de SAC para importadores, distribuidores, indústrias e fabricantes.');
    const orderToken = new URLSearchParams(window.location.search).get('order');
    if (orderToken && checkoutEnabled) startMercadoPagoCheckout(orderToken).catch(error => window.alert(error instanceof Error ? error.message : 'Não foi possível abrir o pagamento.'));
  }, []);

  return <div className="min-h-screen bg-slate-950 text-white font-sans">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="#inicio" className="flex items-center gap-3" aria-label="SAC 4.0 GRIT - início">
          <img src="/grit-logo.png" alt="GRIT Soluções e Negócios" className="h-12 w-52 object-cover object-center" />
          <div className="hidden border-l border-slate-700 pl-3 sm:block"><strong className="block text-lg leading-none">SAC 4.0</strong><span className="text-xs text-slate-400">Gestão inteligente de atendimento</span></div>
        </a>
        <nav className="hidden gap-6 text-sm text-slate-300 md:flex" aria-label="Navegação principal">
          <a href="#recursos" className="hover:text-white">Recursos</a><a href="#trial" className="hover:text-white">Trial</a><a href="#planos" className="hover:text-white">Planos</a><a href="#seguranca" className="hover:text-white">Segurança</a>
        </nav>
        <a href="#planos" className="rounded-xl bg-[#FF8500] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#E07500]">Conhecer planos</a>
      </div>
    </header>

    <main id="inicio">
      <section className="relative overflow-hidden px-5 py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,133,0,.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(11,35,67,.45),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <span className="inline-flex rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs font-bold text-orange-300">SaaS multiempresa • contratação anual</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">Transforme o SAC em uma operação mensurável, segura e rentável.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Centralize chamados, assistência técnica, qualidade, logística, documentos, evidências e indicadores em uma plataforma preparada para importadores, distribuidores, indústrias e fabricantes.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#trial" className="inline-flex items-center gap-2 rounded-xl bg-[#FF8500] px-6 py-3 font-bold text-white hover:bg-[#E07500]">Iniciar avaliação <ArrowRight size={18}/></a><a href="#planos" className="rounded-xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/5">Ver planos</a></div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><CreditCard size={15}/> Pagamento por link seguro. O SAC 4.0 não armazena dados de cartão.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-orange-950/30">
            <div className="grid grid-cols-2 gap-4">
              {[['Controle completo','SAC, OS e logística'],['Gestão executiva','SLA, custos e tendências'],['Multiempresa','Dados isolados por cliente'],['Auditoria','Histórico de cada decisão']].map(([title,text],index)=><div key={title} className="rounded-2xl border border-white/10 bg-slate-900 p-4"><span className="mb-5 grid h-9 w-9 place-items-center rounded-lg bg-orange-400/10 text-orange-300">{index===0?<Headphones size={19}/>:index===1?<BarChart3 size={19}/>:index===2?<Users size={19}/>:<ShieldCheck size={19}/>}</span><strong className="block">{title}</strong><span className="mt-1 block text-xs text-slate-400">{text}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-y border-white/10 bg-slate-900/50 px-5 py-16">
        <div className="mx-auto max-w-7xl"><h2 className="text-center text-3xl font-black">Um fluxo único do atendimento à solução</h2><p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Operação padronizada, indicadores reais e rastreabilidade para toda a equipe.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{['Abertura, triagem e protocolo contínuo','Qualificação, causa raiz e plano de ação','Assistência técnica, OS e peças','Transportadora, coleta e logística reversa','Nota fiscal, lote, série, fornecedor e fábrica','SLA, alertas, auditoria e relatórios'].map(item=><div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950 p-5"><Check className="mt-0.5 shrink-0 text-orange-300" size={19}/><span className="font-semibold text-slate-200">{item}</span></div>)}</div>
        </div>
      </section>

      <TrialRequestForm />

      <section id="planos" className="px-5 py-20">
        <div className="mx-auto max-w-7xl"><div className="text-center"><span className="text-sm font-bold uppercase tracking-widest text-orange-300">Condição sugerida de lançamento</span><h2 className="mt-2 text-3xl font-black md:text-4xl">Planos anuais + setup de implantação</h2><p className="mt-3 text-slate-400">Valores comerciais sugeridos, com contrato de 12 meses. Usuários adicionais cobrados conforme o plano.</p></div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">{plans.map(plan=><article key={plan.code} className={`relative flex flex-col rounded-3xl border p-7 ${plan.highlight?'border-orange-300 bg-orange-400/[.08] shadow-xl shadow-orange-950/30':'border-white/10 bg-white/[.03]'}`}>{plan.highlight&&<span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF8500] px-3 py-1 text-xs font-black text-white">MAIS INDICADO</span>}<h3 className="text-2xl font-black">{plan.name}</h3><p className="mt-2 min-h-12 text-sm text-slate-400">{plan.description}</p><div className="mt-6"><span className="text-4xl font-black">{plan.monthly}</span><span className="text-slate-400">/mês</span><p className="mt-1 text-sm text-slate-300">Contrato anual: <strong>{plan.annual}</strong></p><p className="text-sm text-slate-300">Setup único: <strong>{plan.setup}</strong></p></div><div className="my-6 h-px bg-white/10"/><strong className="text-sm text-orange-300">{plan.seats}</strong><ul className="mt-4 flex-1 space-y-3 text-sm text-slate-300">{plan.features.map(feature=><li key={feature} className="flex gap-2"><Check size={17} className="shrink-0 text-emerald-400"/>{feature}</li>)}</ul><button onClick={()=>requestCheckout(plan)} className={`mt-8 w-full rounded-xl px-5 py-3 font-bold ${plan.highlight?'bg-[#FF8500] text-white hover:bg-[#E07500]':'border border-white/20 hover:bg-white/5'}`}>Contratar por 12 meses</button></article>)}</div>
          <p className="mt-6 text-center text-xs text-slate-500">Os preços apresentados são uma sugestão comercial e podem ser ajustados antes da ativação dos links de checkout.</p>
        </div>
      </section>

      <section className="px-5 py-16"><div className="mx-auto max-w-5xl rounded-3xl border border-orange-300/30 bg-gradient-to-r from-[#071325] to-[#0B2343] p-8 text-center md:p-12"><span className="text-sm font-black uppercase tracking-widest text-orange-300">Vamos estruturar seu SAC?</span><h2 className="mt-3 text-3xl font-black md:text-4xl">Receba uma demonstração orientada ao seu processo real</h2><p className="mx-auto mt-4 max-w-2xl text-slate-300">Converse sobre atendimento, garantia, lote, validade, assistência técnica, qualidade, logística e indicadores. A avaliação inicial não exige cartão.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><a href="#trial" className="rounded-xl bg-[#FF8500] px-6 py-3 font-black text-white hover:bg-[#E07500]">Solicitar teste assistido</a><a href="mailto:gritsolucoes@gmail.com?subject=Quero%20conhecer%20o%20SAC%204.0" className="rounded-xl border border-white/20 px-6 py-3 font-bold">gritsolucoes@gmail.com</a></div></div></section>

      <section id="seguranca" className="border-t border-white/10 bg-slate-900/50 px-5 py-16"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[.8fr_1.2fr]"><div><span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><LockKeyhole/></span><h2 className="mt-5 text-3xl font-black">Segurança desde a arquitetura</h2><p className="mt-3 text-slate-400">Cada empresa acessa somente seus próprios dados, com autenticação, trilha de auditoria e políticas no banco.</p></div><div className="grid gap-3 sm:grid-cols-2">{['Isolamento multiempresa (RLS)','Controle de acesso por função','HTTPS e conteúdo protegido','Auditoria de alterações','Backups e continuidade','Adequação progressiva à LGPD'].map(item=><div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-4"><ShieldCheck className="text-emerald-400" size={19}/><span className="text-sm font-semibold">{item}</span></div>)}</div></div></section>
    </main>
    <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} SAC 4.0 • Comercial: gritsolucoes@gmail.com</footer>
  </div>;
}
