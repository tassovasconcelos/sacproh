import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, CheckCircle2, Filter, Printer, RefreshCw } from 'lucide-react';
import { Ticket } from '../../types';

interface ExecutiveDashboardProps { tickets: Ticket[]; }

const CLOSED = new Set(['CLOSED_PROCEDENT', 'CLOSED_NON_PROCEDENT']);
const STATUS_LABELS: Record<string,string> = {
  NEW:'Novo', TRIAGE:'Triagem', TECHNICAL_ANALYSIS:'Análise técnica', SENT_TO_TECHNICAL:'Assistência técnica',
  SENT_TO_LOGISTICS:'Logística', WAITING_CUSTOMER:'Aguardando cliente', WAITING_SUPPLIER:'Aguardando fornecedor',
  CLOSED_PROCEDENT:'Encerrado procedente', CLOSED_NON_PROCEDENT:'Encerrado não procedente'
};
const COLORS = ['#145EDB','#FF8500','#22A06B','#D92D20','#7C3AED','#0891B2','#64748B'];

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ tickets }) => {
  const [period, setPeriod] = useState<'30'|'90'|'365'|'ALL'>('ALL');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');

  const filtered = useMemo(() => {
    const limit = period === 'ALL' ? null : Date.now() - Number(period) * 86400000;
    return tickets.filter(ticket => (!limit || new Date(ticket.createdAt).getTime() >= limit)
      && (status === 'ALL' || ticket.status === status)
      && (priority === 'ALL' || ticket.priority === priority));
  }, [tickets, period, status, priority]);

  const metrics = useMemo(() => {
    const closed = filtered.filter(t => CLOSED.has(t.status));
    const critical = filtered.filter(t => t.priority === 'CRITICAL' || t.userRiskFlag || t.adverseEventFlag).length;
    const overdue = filtered.filter(t => !CLOSED.has(t.status) && t.slaDueAt && new Date(t.slaDueAt).getTime() < Date.now()).length;
    const slaBase = closed.filter(t => t.slaDueAt && t.closedAt);
    const slaOnTime = slaBase.filter(t => new Date(t.closedAt!).getTime() <= new Date(t.slaDueAt!).getTime()).length;
    const averageDays = closed.length ? closed.reduce((sum,t) => sum + Math.max(0,(new Date(t.closedAt || t.updatedAt).getTime()-new Date(t.createdAt).getTime())/86400000),0)/closed.length : null;
    return { total:filtered.length, closed:closed.length, open:filtered.length-closed.length, critical, overdue,
      sla:slaBase.length ? (slaOnTime/slaBase.length)*100 : null, averageDays };
  }, [filtered]);

  const categoryData = useMemo(() => (Object.entries(filtered.reduce<Record<string,number>>((acc,t) => {
    const key=t.category || 'Não classificado'; acc[key]=(acc[key]||0)+1; return acc;
  },{})) as Array<[string,number]>).sort((a,b)=>b[1]-a[1]).map(([name,value],index)=>({name,value,color:COLORS[index%COLORS.length]})),[filtered]);

  const paretoData = useMemo(() => {
    const total=Math.max(filtered.length,1); let accumulated=0;
    return categoryData.slice(0,8).map(item => { accumulated+=item.value; return {cause:item.name,count:item.value,percentage:Number((accumulated/total*100).toFixed(1))}; });
  },[categoryData,filtered.length]);

  const statusData = useMemo(() => (Object.entries(filtered.reduce<Record<string,number>>((acc,t)=>{acc[t.status]=(acc[t.status]||0)+1;return acc;},{})) as Array<[string,number]>)
    .map(([key,value])=>({name:STATUS_LABELS[key]||key,value})).sort((a,b)=>b.value-a.value),[filtered]);

  const monthlyData = useMemo(() => {
    const months=new Map<string,{sort:string;month:string;novos:number;encerrados:number}>();
    filtered.forEach(t=>{
      const opened=new Date(t.createdAt); const key=`${opened.getFullYear()}-${String(opened.getMonth()+1).padStart(2,'0')}`;
      const item=months.get(key)||{sort:key,month:opened.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),novos:0,encerrados:0}; item.novos++; months.set(key,item);
      if(CLOSED.has(t.status) && t.closedAt){const closed=new Date(t.closedAt);const cKey=`${closed.getFullYear()}-${String(closed.getMonth()+1).padStart(2,'0')}`;const c=months.get(cKey)||{sort:cKey,month:closed.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),novos:0,encerrados:0};c.encerrados++;months.set(cKey,c);}
    }); return [...months.values()].sort((a,b)=>a.sort.localeCompare(b.sort)).slice(-12);
  },[filtered]);

  const responsibleData = useMemo(() => (Object.entries(filtered.reduce<Record<string,number>>((acc,t)=>{const key=t.assignedToName||t.assignedArea||'Sem responsável';acc[key]=(acc[key]||0)+1;return acc;},{})) as Array<[string,number]>)
    .sort((a,b)=>b[1]-a[1]).slice(0,8),[filtered]);

  const regulatoryAlerts = useMemo(() => filtered
    .filter(ticket => !CLOSED.has(ticket.status) && ticket.status !== 'CANCELLED')
    .map(ticket => {
      const openedAt = new Date(ticket.createdAt).getTime();
      const legalDueAt = openedAt + 30 * 86400000;
      const ageDays = Math.max(0, Math.floor((Date.now() - openedAt) / 86400000));
      const remainingDays = Math.ceil((legalDueAt - Date.now()) / 86400000);
      const level = ageDays >= 28 ? 'CRÍTICO' : ageDays >= 25 ? 'URGENTE' : ageDays >= 20 ? 'ATENÇÃO' : null;
      return { ticket, legalDueAt, ageDays, remainingDays, level };
    })
    .filter(alert => alert.level || alert.ticket.userRiskFlag || alert.ticket.adverseEventFlag)
    .sort((a,b) => a.legalDueAt - b.legalDueAt), [filtered]);

  return <div className="space-y-5 print:space-y-3">
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row justify-between gap-3"><div><h1 className="text-xl font-bold text-[#10233F]">Relatório Gerencial do SAC</h1>
        <p className="text-xs text-slate-500">Dados reais dos chamados registrados no Supabase · Atualizado em {new Date().toLocaleString('pt-BR')}</p></div>
        <div className="flex gap-2"><button onClick={()=>window.location.reload()} className="px-3 py-2 border rounded-lg text-xs font-bold flex gap-1 items-center"><RefreshCw className="w-3.5 h-3.5"/>Atualizar</button><button onClick={()=>window.print()} className="px-3 py-2 bg-[#145EDB] text-white rounded-lg text-xs font-bold flex gap-1 items-center"><Printer className="w-3.5 h-3.5"/>Imprimir / PDF</button></div></div>
      <div className="flex flex-wrap gap-2 text-xs print:hidden"><Filter className="w-4 h-4 text-[#145EDB] mt-2"/>
        <select value={period} onChange={e=>setPeriod(e.target.value as any)} className="border rounded-lg p-2"><option value="ALL">Todo o histórico</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option></select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-lg p-2"><option value="ALL">Todos os status</option>{Object.entries(STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <select value={priority} onChange={e=>setPriority(e.target.value)} className="border rounded-lg p-2"><option value="ALL">Todas as prioridades</option><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {[
        ['Total de SACs',metrics.total,'text-[#10233F]',<TrendingUp/>],['Em andamento',metrics.open,'text-[#FF8500]',<Clock/>],['Encerrados',metrics.closed,'text-[#22A06B]',<CheckCircle2/>],
        ['Críticos / risco',metrics.critical,'text-[#D92D20]',<AlertTriangle/>],['SLA vencido',metrics.overdue,'text-[#D92D20]',<Clock/>],['SLA cumprido',metrics.sla===null?'Sem base':`${metrics.sla.toFixed(1)}%`,'text-[#22A06B]',<CheckCircle2/>]
      ].map(([label,value,color,icon])=><div key={String(label)} className="bg-white p-4 rounded-xl border shadow-sm"><div className="flex justify-between text-slate-500"><span className="text-[10px] font-bold uppercase">{label}</span><span className="w-4 h-4">{icon as React.ReactNode}</span></div><p className={`text-2xl font-black ${color}`}>{value}</p></div>)}
    </div>

    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
        <div><h3 className="font-bold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#D92D20]"/>Central de alertas da Responsável Técnica</h3>
          <p className="text-xs text-slate-500">Atenção no 20º dia, urgente no 25º e crítico a partir do 28º dia. Limite final: 30 dias corridos.</p></div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${regulatoryAlerts.length ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{regulatoryAlerts.length} SAC(s) exigindo atenção</span>
      </div>
      {regulatoryAlerts.length === 0 ? <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg">Nenhum SAC atingiu os marcos internos de alerta.</p> :
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-50"><th className="p-2 text-left">Nível</th><th className="p-2 text-left">Protocolo</th><th className="p-2 text-left">Cliente / ocorrência</th><th className="p-2 text-left">Responsável</th><th className="p-2 text-right">Prazo legal</th></tr></thead>
          <tbody>{regulatoryAlerts.map(({ticket,legalDueAt,ageDays,remainingDays,level})=><tr key={ticket.id} className="border-t"><td className="p-2"><span className={`px-2 py-1 rounded font-bold ${level==='CRÍTICO'?'bg-red-100 text-red-700':level==='URGENTE'?'bg-orange-100 text-orange-700':'bg-amber-100 text-amber-700'}`}>{level || 'RISCO'}</span></td><td className="p-2 font-mono font-bold text-[#145EDB]">{ticket.protocol}</td><td className="p-2"><strong>{ticket.customerName}</strong><br/><span className="text-slate-500">{ticket.category} · aberto há {ageDays} dia(s)</span></td><td className="p-2">{ticket.assignedToName || ticket.assignedArea || 'Não atribuído'}</td><td className="p-2 text-right"><strong>{new Date(legalDueAt).toLocaleDateString('pt-BR')}</strong><br/><span className={remainingDays <= 2 ? 'text-red-700 font-bold' : 'text-slate-500'}>{remainingDays < 0 ? `${Math.abs(remainingDays)} dia(s) vencido` : `${remainingDays} dia(s) restante(s)`}</span></td></tr>)}</tbody>
        </table></div>}
      <p className="text-[10px] text-slate-500 mt-3">Casos com risco ao usuário, evento adverso ou produto essencial devem ser tratados imediatamente, independentemente da contagem de 30 dias.</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white p-5 rounded-xl border shadow-sm"><h3 className="font-bold text-sm">Pareto real por categoria</h3><p className="text-xs text-slate-500 mb-3">Volume e percentual acumulado dos SACs</p><div className="h-64"><ResponsiveContainer><BarChart data={paretoData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="cause" tick={{fontSize:9}}/><YAxis yAxisId="left"/><YAxis yAxisId="right" orientation="right" domain={[0,100]}/><Tooltip/><Bar yAxisId="left" dataKey="count" fill="#145EDB" name="SACs"/><Line yAxisId="right" dataKey="percentage" stroke="#FF8500" name="% acumulado"/></BarChart></ResponsiveContainer></div></div>
      <div className="bg-white p-5 rounded-xl border shadow-sm"><h3 className="font-bold text-sm">Distribuição por categoria</h3><div className="h-64"><ResponsiveContainer><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={80}>{categoryData.map((x,i)=><Cell key={i} fill={x.color}/>)}</Pie><Tooltip/><Legend wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer></div></div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white p-5 rounded-xl border shadow-sm"><h3 className="font-bold text-sm">Evolução mensal</h3><p className="text-xs text-slate-500 mb-3">Aberturas versus encerramentos</p><div className="h-64"><ResponsiveContainer><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line dataKey="novos" stroke="#145EDB" strokeWidth={3} name="Abertos"/><Line dataKey="encerrados" stroke="#22A06B" strokeWidth={3} name="Encerrados"/></LineChart></ResponsiveContainer></div></div>
      <div className="bg-white p-5 rounded-xl border shadow-sm"><h3 className="font-bold text-sm">Situação atual</h3><p className="text-xs text-slate-500 mb-3">Quantidade por status</p><div className="h-64"><ResponsiveContainer><BarChart data={statusData} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false}/><YAxis dataKey="name" type="category" width={125} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="value" fill="#145EDB" name="SACs"/></BarChart></ResponsiveContainer></div></div>
    </div>

    <div className="bg-white p-5 rounded-xl border shadow-sm"><h3 className="font-bold text-sm mb-3">Carga por responsável ou área</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-50"><th className="p-2 text-left">Responsável / área</th><th className="p-2 text-right">Chamados</th><th className="p-2 text-right">Participação</th></tr></thead><tbody>{responsibleData.map(([name,count])=><tr key={name} className="border-t"><td className="p-2">{name}</td><td className="p-2 text-right font-bold">{count}</td><td className="p-2 text-right">{metrics.total?((count/metrics.total)*100).toFixed(1):'0.0'}%</td></tr>)}</tbody></table></div><p className="text-xs text-slate-500 mt-3">Tempo médio de resolução: <strong>{metrics.averageDays===null?'Sem encerramentos':`${metrics.averageDays.toFixed(1)} dias`}</strong></p></div>
  </div>;
};
