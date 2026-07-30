import React, { useState } from 'react';
import { BookOpen, Search, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const articles = [
    {
      id: 'k1',
      title: 'Manual de Triagem e Erro E-04 em Bisturis Eletrônicos HF-400W',
      category: 'Assistência Técnica',
      views: 142,
      confidence: 96,
      summary: 'Procedimento técnico para teste de continuidade no cabo monopolar e substituição da placa da interface frontal Wem.'
    },
    {
      id: 'k2',
      title: 'Protocolo de Avaria em Transporte de Materiais Pérsico e Descartáveis Estéreis',
      category: 'Logística & Qualidade',
      views: 98,
      confidence: 94,
      summary: 'Critérios de rejeição de caixas rasgadas conforme norma RDC 304/2019 ANVISA.'
    },
    {
      id: 'k3',
      title: 'Guia de Notificação de Queixa Técnica ANVISA (Notivisa)',
      category: 'Farmacovigilância',
      views: 210,
      confidence: 99,
      summary: 'Instruções para preenchimento de parecer técnico do farmacêutico responsável.'
    }
  ];

  const filtered = articles.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.category.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-[#10233F]">Base de Conhecimento & IA de Chamados Semelhantes</h1>
        <p className="text-xs text-slate-500 mt-0.5">Artigos técnicos, procedimentos de bancada e pesquisa por vetores pgvector</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input 
          type="text"
          placeholder="Pesquisar artigos ou sintomas (Ex: erro E-04, avaria caixa estéril, laudo ANVISA)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus:border-[#145EDB] outline-none"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#10233F] text-sm">{a.title}</span>
              <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center space-x-1">
                <Sparkles className="w-3 h-3 mr-1" /> Relevância IA: {a.confidence}%
              </span>
            </div>
            <p className="text-slate-600">{a.summary}</p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Categoria: <strong>{a.category}</strong></span>
              <span>{a.views} visualizações</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
