import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CreditCard, LoaderCircle, LogIn, RefreshCw, ShieldCheck, TestTube2, Users } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { commercialTrialService, PlatformOverview, PlatformUser } from '../../services/commercialTrialService';

type Tab = 'overview' | 'trials' | 'companies' | 'users' | 'billing';
const empty: PlatformOverview = { trials: [], subscriptions: [], orders: [], alerts: [], users: [] };
const roles = ['ADMIN_EMPRESA', 'DIRETORIA', 'RESPONSAVEL_TECNICA', 'SAC', 'TECNICO', 'LOGISTICA', 'GERENTE_LOJA'];

export function PlatformAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [data, setData] = useState<PlatformOverview>(empty);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await commercialTrialService.platformOverview());
      setAuthenticated(true);
    } catch (cause) {
      setAuthenticated(false);
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a gestão da plataforma.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: session }) => {
      if (session.session) load();
    });
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }
    await load();
  };

  const metrics = useMemo(() => ({
    leads: data.trials.length,
    trials: data.subscriptions.filter(item => item.status === 'TRIAL').length,
    active: data.subscriptions.filter(item => item.status === 'ACTIVE').length,
    users: data.users.filter(item => item.is_active).length,
    alerts: data.alerts.length,
    revenue: data.orders.filter(item => item.status === 'PAID').reduce((sum, item) => sum + Number(item.expected_amount || 0), 0)
  }), [data]);

  const updateUser = async (user: PlatformUser, changes: Partial<PlatformUser>) => {
    const roleCode = changes.role_code || user.role_code;
    const isActive = changes.is_active ?? user.is_active;
    if (!window.confirm(`Confirma a alteração de acesso de ${user.full_name}?`)) return;
    setLoading(true);
    setError('');
    try {
      const updated = await commercialTrialService.updatePlatformUser(user.id, roleCode, isActive);
      setData(old => ({ ...old, users: old.users.map(item => item.id === user.id ? { ...item, ...updated } : item) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao atualizar usuário.');
    } finally { setLoading(false); }
  };

  const updateSubscription = async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELED') => {
    const reason = window.prompt(`Informe a justificativa para alterar a assinatura para ${status}:`, '');
    if (!reason) return;
    if (reason.trim().length < 10) { setError('A justificativa deve ter pelo menos 10 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      await commercialTrialService.updateSubscription(id, status, reason.trim());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao atualizar a assinatura.');
    } finally { setLoading(false); }
  };

  const acknowledgeAlert = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      await commercialTrialService.acknowledgeAlert(id);
      setData(old => ({ ...old, alerts: old.alerts.filter(item => item.id !== id) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao reconhecer o alerta.');
    } finally { setLoading(false); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setData(empty);
    setPassword('');
  };

  if (!authenticated) return <main className="grid min-h-screen place-items-center bg-slate-950 p-5 text-white">
    <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8">
      <ShieldCheck className="text-orange-300" />
      <h1 className="mt-4 text-2xl font-black">Gestão da plataforma</h1>
      <p className="mt-2 text-sm text-slate-400">Use o mesmo superadministrador do SACPROH.</p>
      {!isSupabaseConfigured && <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">A publicação ainda não recebeu as credenciais públicas do Supabase.</p>}
      <input required type="email" placeholder="E-mail" value={email} onChange={event => setEmail(event.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" />
      <input required type="password" placeholder="Senha" value={password} onChange={event => setPassword(event.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" />
      <button disabled={loading || !isSupabaseConfigured} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF8500] p-3 font-black disabled:opacity-50"><LogIn size={18} />Entrar</button>
      {loading && <p className="mt-4 text-sm text-orange-200">Validando acesso...</p>}
      {error && <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
    </form>
  </main>;

  const cards = [
    [TestTube2, 'Leads', metrics.leads], [Building2, 'Trials ativos', metrics.trials],
    [ShieldCheck, 'Assinaturas ativas', metrics.active], [Users, 'Usuários ativos', metrics.users],
    [AlertTriangle, 'Alertas abertos', metrics.alerts],
    [CreditCard, 'Recebido em pedidos', `R$ ${metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
  ] as const;

  return <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-orange-300">GRIT · SUPERADMIN</p><h1 className="text-3xl font-black">Central gerencial SAC 4.0</h1><p className="text-sm text-slate-400">Empresas, testes, usuários, assinaturas, pagamentos e alertas em uma visão.</p></div><div className="flex gap-2"><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2"><RefreshCw size={17} />Atualizar</button><button onClick={logout} className="rounded-xl border border-white/15 px-4 py-2">Sair</button></div></header>
    {error && <p className="mt-5 rounded-xl bg-red-400/10 p-3 text-red-300">{error}</p>}
    {loading && <p className="mt-4 flex items-center gap-2 text-orange-300"><LoaderCircle className="animate-spin" size={18} />Processando...</p>}
    <nav className="mt-7 flex gap-2 overflow-x-auto">{([['overview', 'Visão geral'], ['trials', 'Leads e testes'], ['companies', 'Empresas'], ['users', 'Usuários'], ['billing', 'Pagamentos']] as [Tab, string][]).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? 'bg-orange-400 text-slate-950' : 'bg-slate-900 text-slate-300'}`}>{label}</button>)}</nav>

    {tab === 'overview' && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([Icon, label, value]) => <article key={label} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><Icon className="text-orange-300" /><p className="mt-4 text-sm text-slate-400">{label}</p><strong className="text-3xl">{value}</strong></article>)}</div>}
    {tab === 'trials' && <section className="mt-6 space-y-3">{data.trials.length === 0 && <Empty label="Nenhum lead ou teste cadastrado." />}{data.trials.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-black">{item.company_name}</h2><p className="text-sm text-slate-300">{item.work_email} · {item.segment}</p></div><Badge>{item.status}</Badge></div><p className="mt-2 text-xs text-slate-400">Entrada: {new Date(item.created_at).toLocaleString('pt-BR')}{item.trial_ends_at && ` · Trial até ${new Date(item.trial_ends_at).toLocaleDateString('pt-BR')}`}</p></article>)}</section>}
    {tab === 'companies' && <section className="mt-6 space-y-3">{data.subscriptions.length === 0 && <Empty label="Nenhuma assinatura cadastrada." />}{data.subscriptions.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-black">{item.tenant.trade_name || item.tenant.name}</h2><p className="text-sm text-slate-300">CNPJ {item.tenant.document} · {item.plan.name} · limite {item.seat_limit || item.plan.included_seats}</p></div><Badge>{item.status}</Badge></div><div className="mt-4 flex flex-wrap gap-2">{item.status !== 'ACTIVE' && <Action color="emerald" onClick={() => updateSubscription(item.id, 'ACTIVE')}>Ativar</Action>}{item.status !== 'SUSPENDED' && <Action color="amber" onClick={() => updateSubscription(item.id, 'SUSPENDED')}>Suspender</Action>}{item.status !== 'CANCELED' && <Action color="red" onClick={() => updateSubscription(item.id, 'CANCELED')}>Cancelar</Action>}</div></article>)}</section>}
    {tab === 'users' && <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-800 text-slate-300"><tr><th className="p-4">Usuário</th><th className="p-4">Empresa</th><th className="p-4">Perfil</th><th className="p-4">Situação</th><th className="p-4">Ação</th></tr></thead><tbody>{data.users.map(user => <tr key={user.id} className="border-t border-white/10"><td className="p-4"><strong>{user.full_name}</strong><p className="text-xs text-slate-400">{user.email}</p></td><td className="p-4">{user.tenant?.trade_name || user.tenant?.name || user.tenant_id}</td><td className="p-4">{user.role_code === 'SUPERADMIN' ? <span className="font-bold text-orange-300">SUPERADMIN GRIT</span> : <select value={user.role_code} onChange={event => updateUser(user, { role_code: event.target.value })} className="rounded-lg bg-slate-950 p-2">{roles.map(role => <option key={role}>{role}</option>)}</select>}</td><td className="p-4">{user.is_active ? 'Ativo' : 'Bloqueado'}</td><td className="p-4">{user.role_code !== 'SUPERADMIN' && <Action color={user.is_active ? 'red' : 'emerald'} onClick={() => updateUser(user, { is_active: !user.is_active })}>{user.is_active ? 'Bloquear' : 'Reativar'}</Action>}</td></tr>)}</tbody></table></section>}
    {tab === 'billing' && <section className="mt-6 grid gap-4 lg:grid-cols-2"><div><h2 className="mb-3 flex items-center gap-2 font-black"><CreditCard />Pedidos Mercado Pago</h2>{data.orders.length === 0 && <Empty label="Nenhum pedido registrado." />}{data.orders.map(order => <article key={order.id} className="mb-3 rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex justify-between"><strong>{order.plan_code}</strong><span>{order.status}</span></div><p className="mt-2 text-sm text-slate-300">R$ {Number(order.expected_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · {order.last_payment_status || 'sem retorno do pagamento'}</p></article>)}</div><div><h2 className="mb-3 flex items-center gap-2 font-black"><AlertTriangle />Alertas financeiros</h2>{data.alerts.length === 0 && <Empty label="Nenhum alerta financeiro aberto." />}{data.alerts.map(alert => <article key={alert.id} className="mb-3 rounded-2xl border border-red-300/20 bg-red-400/10 p-5"><strong>{alert.alert_type}</strong><p className="mt-2 text-sm text-red-100">{alert.message}</p><button onClick={() => acknowledgeAlert(alert.id)} className="mt-3 rounded-lg border border-red-200/30 px-3 py-2 text-xs font-bold">Marcar como tratado</button></article>)}</div></section>}
  </div></main>;
}

function Empty({ label }: { label: string }) { return <p className="rounded-2xl border border-dashed border-white/15 bg-slate-900 p-6 text-sm text-slate-400">{label}</p>; }
function Badge({ children }: { children: string }) { return <span className="h-fit rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">{children}</span>; }
function Action({ children, color, onClick }: { children: string; color: 'emerald' | 'amber' | 'red'; onClick: () => void }) {
  const styles = { emerald: 'bg-emerald-300', amber: 'bg-amber-300', red: 'bg-red-300' };
  return <button onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-black text-slate-950 ${styles[color]}`}>{children}</button>;
}
