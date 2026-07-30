import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { 
  TrendingUp, Clock, AlertTriangle, CheckCircle2, DollarSign, Award, Filter, RefreshCw 
} from 'lucide-react';
import { Ticket, DashboardFilters } from '../../types';

interface ExecutiveDashboardProps {
  tickets: Ticket[];
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ tickets }) => {
  const [filters, setFilters] = useState<DashboardFilters>({
    status: 'ALL',
    priority: 'ALL'
  });

  const totalTickets = tickets.length;
  const criticalCount = tickets.filter(t => t.priority === 'CRITICAL').length;
  const closedCount = tickets.filter(t => t.status === 'CLOSED_PROCEDENT' || t.status === 'CLOSED_NON_PROCEDENT').length;
  const inProgressCount = totalTickets - closedCount;
  const slaCompliance = 96.4; // %
  const npsScore = 88; // NPS

  // Pareto Chart Data (80/20 rule for root causes / categories)
  const paretoData = [
    { cause: 'Defeito Placa Eletrônica', count: 42, percentage: 42 },
    { cause: 'Avaria no Transporte', count: 28, percentage: 70 },
    { cause: 'Cabo Paciente / Desgaste', count: 12, percentage: 82 },
    { cause: 'Dúvida Operacional', count: 10, percentage: 92 },
    { cause: 'Embalagem Violada', count: 8, percentage: 100 }
  ];

  // Category Pie Data
  const categoryData = [
    { name: 'Assistência Técnica', value: 45, color: '#145EDB' },
    { name: 'Logística / Coleta', value: 30, color: '#FF8500' },
    { name: 'Qualidade / Lote', value: 15, color: '#22A06B' },
    { name: 'Comercial / Troca', value: 10, color: '#D92D20' }
  ];

  // Monthly Volume Trend Data
  const monthlyTrendData = [
    { month: 'Mar/26', novos: 35, encerrados: 30, sla: 95 },
    { month: 'Abr/26', novos: 42, encerrados: 40, sla: 97 },
    { month: 'Mai/26', novos: 50, encerrados: 48, sla: 94 },
    { month: 'Jun/26', novos: 48, encerrados: 46, sla: 98 },
    { month: 'Jul/26', novos: 55, encerrados: 52, sla: 96 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Interactive Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#10233F]">Dashboard Executivo & Análise Gerencial</h1>
          <p className="text-xs text-slate-500 mt-0.5">Indicadores chave de desempenho de SAC, Qualidade, SLA e Custos para Procirúrgica</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#145EDB]" />
            <span className="text-slate-600">Período:</span>
            <select className="bg-transparent font-bold text-slate-800 outline-none">
              <option>Últimos 30 Dias (Julho/2026)</option>
              <option>Último Trimestre (Q2 2026)</option>
              <option>Ano Vigente (2026)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Chamados</span>
            <TrendingUp className="w-4 h-4 text-[#145EDB]" />
          </div>
          <p className="text-2xl font-black text-[#10233F]">{totalTickets}</p>
          <p className="text-[10px] text-emerald-600 font-bold">↑ +12% em relação a Junho</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Em Andamento</span>
            <Clock className="w-4 h-4 text-[#FF8500]" />
          </div>
          <p className="text-2xl font-black text-[#FF8500]">{inProgressCount}</p>
          <p className="text-[10px] text-slate-500 font-medium">Com atuações em andamento</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Críticos / Risco</span>
            <AlertTriangle className="w-4 h-4 text-[#D92D20]" />
          </div>
          <p className="text-2xl font-black text-[#D92D20]">{criticalCount}</p>
          <p className="text-[10px] text-red-600 font-bold">Risco cirúrgico ou paciente</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">SLA Cumprimento</span>
            <CheckCircle2 className="w-4 h-4 text-[#22A06B]" />
          </div>
          <p className="text-2xl font-black text-[#22A06B]">{slaCompliance}%</p>
          <p className="text-[10px] text-emerald-600 font-bold">Meta: ≥ 95.0%</p>
        </div>

        {/* KPI 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">NPS Pós-Venda</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700">{npsScore}</p>
          <p className="text-[10px] text-purple-600 font-bold">Zona de Excelência (&gt;75)</p>
        </div>

      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Pareto 80/20 Analysis Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-[#10233F]">Análise de Pareto (80/20) - Principais Causas Raiz</h3>
            <p className="text-xs text-slate-500">20% das causas representam 80% dos chamados de SAC</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="cause" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="count" fill="#145EDB" radius={[4, 4, 0, 0]} name="Ocorrências" />
                <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#FF8500" strokeWidth={3} name="% Acumulada" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-[#10233F]">Distribuição por Categoria</h3>
            <p className="text-xs text-slate-500">Proporção por tipo de atendimento</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={categoryData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* CHARTS ROW 2: Monthly Evolution */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div>
          <h3 className="font-bold text-sm text-[#10233F]">Evolução Mensal de Volume x Resolução de Chamados</h3>
          <p className="text-xs text-slate-500">Comparativo mensal de novos chamados vs encerrados dentro do SLA</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="novos" stroke="#145EDB" strokeWidth={3} name="Novos Chamados" />
              <Line type="monotone" dataKey="encerrados" stroke="#22A06B" strokeWidth={3} name="Encerrados" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
