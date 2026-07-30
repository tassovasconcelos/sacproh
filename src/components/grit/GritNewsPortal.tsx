import React from 'react';
import { 
  Globe, ShieldCheck, Wrench, Newspaper, ArrowRight, Activity, 
  Lock, CheckCircle2, ChevronRight, Cpu, Building2, PhoneCall, Award
} from 'lucide-react';

interface GritNewsPortalProps {
  onGoToSAC: () => void;
  onOpenAdminLogin: () => void;
}

export const GritNewsPortal: React.FC<GritNewsPortalProps> = ({
  onGoToSAC,
  onOpenAdminLogin
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Portal Top Bar */}
      <div className="bg-[#071325] border-b border-slate-800 text-xs py-2 px-4 md:px-8 flex items-center justify-between text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
            <Globe className="w-3.5 h-3.5" />
            <span>gritnews.com.br - Portal de Notícias & Tecnologia Médica</span>
          </div>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">Grupo Procirúrgica & GRIT Systems</span>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={onOpenAdminLogin}
            className="hover:text-white font-semibold flex items-center space-x-1 text-[#FF8500]"
          >
            <Lock className="w-3 h-3" />
            <span>Área Restrita ADM</span>
          </button>
        </div>
      </div>

      {/* Main Portal Header */}
      <header className="bg-[#0B2343] border-b border-slate-800 px-4 md:px-8 py-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#145EDB] to-[#FF8500] flex items-center justify-center font-black text-white text-xl tracking-wider shadow-md">
            GR
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-white">GRIT NEWS</span>
            <p className="text-xs text-slate-300 font-medium">Tecnologia, Regulação ANVISA e Pós-Venda Hospitalar</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onGoToSAC}
            className="bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 transition-all transform hover:scale-105"
          >
            <span>Central SAC Procirúrgica</span>
            <span className="bg-slate-900/60 font-mono text-[10px] px-2 py-0.5 rounded text-[#FF8500]">/sacproh</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </header>

      {/* Portal Hero & News Highlights */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* Featured News Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Headline */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#0B2343] to-slate-900 rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <span className="bg-[#FF8500] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                DESTAQUE REGULATÓRIO ANVISA
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                Plataforma GRIT Lança Módulo Unificado de Rastreabilidade e Gestão de Incidentes SAC 4.0
              </h1>
              <p className="text-slate-300 text-sm leading-relaxed">
                Integração completa de relatórios 5W2H, laudos técnicos de bancada, direcionamento por departamento e controle de devoluções cirúrgicas para atendimento às diretrizes da RDC 67/2009 e RDC 551/2021.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Atualizado há 15 minutos • Redação GRIT News</span>
              </span>
              
              <button
                onClick={onGoToSAC}
                className="text-[#145EDB] font-bold hover:underline flex items-center space-x-1"
              >
                <span>Acessar Módulo SAC</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Secondary News Column */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h2 className="font-bold text-sm text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Newspaper className="w-4 h-4 text-[#FF8500]" />
              <span>Últimas Atualizações do Setor</span>
            </h2>

            <div className="space-y-4 divide-y divide-slate-800 text-xs">
              <div className="pt-2">
                <span className="text-[10px] text-blue-400 font-mono font-bold">ASSISTÊNCIA TÉCNICA</span>
                <p className="font-bold text-slate-200 mt-1 hover:text-white cursor-pointer">
                  Abertura de Ordens de Serviço (OS) para calibração de Bisturis Eletrônicos HF-400W.
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">Laudos de bancada com cálculo automático de custos e troca de peças.</p>
              </div>

              <div className="pt-3">
                <span className="text-[10px] text-emerald-400 font-mono font-bold">LOGÍSTICA CIRÚRGICA</span>
                <p className="font-bold text-slate-200 mt-1 hover:text-white cursor-pointer">
                  Novas rotas otimizadas para recolhimento de materiais cirúrgicos com rastreio de logística reversa.
                </p>
              </div>

              <div className="pt-3">
                <span className="text-[10px] text-amber-400 font-mono font-bold">QUALIDADE & FARMACOVIGILÂNCIA</span>
                <p className="font-bold text-slate-200 mt-1 hover:text-white cursor-pointer">
                  Planos de Ação 5W2H automatizados por IA para tratativas de desvios de fabricação.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* System Capabilities Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
            <Cpu className="w-8 h-8 text-[#145EDB]" />
            <h3 className="font-bold text-base text-white">IA Generativa Gemini</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Resumos automáticos de ocorrências, sugestões de resposta para clientes e triagem de gravidade.
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
            <Wrench className="w-8 h-8 text-[#FF8500]" />
            <h3 className="font-bold text-base text-white">Ordens de Serviço (OS)</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Geração de OS de bancada, peças substituídas e estimativa de custos técnicos com laudo de calibração.
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-2">
            <Building2 className="w-8 h-8 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Multi-Tenant & RBAC</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Controle de permissões por perfil (Superadmin, Diretoria, Resp. Técnica, SAC, Logística) e empresas.
            </p>
          </div>
        </div>

        {/* CALL TO ACTION AT THE BOTTOM OF THE PAGE */}
        <div className="bg-gradient-to-r from-[#0B2343] via-[#0D2E58] to-[#145EDB] rounded-3xl p-8 md:p-10 border border-slate-700 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center space-x-2 bg-slate-900/80 px-4 py-1.5 rounded-full text-xs font-mono text-[#FF8500] border border-slate-700">
            <Award className="w-4 h-4" />
            <span>PLATAFORMA OFICIAL: gritnews.com.br/sacproh</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            Pronto para gerenciar chamados e ordens de serviço?
          </h2>
          <p className="text-slate-200 text-sm max-w-2xl mx-auto leading-relaxed">
            Acesse a central de atendimento no diretório <strong className="text-white bg-slate-900/60 px-2 py-0.5 rounded font-mono border border-slate-700">/sacproh</strong>. Registre protocolos, direcione atendimentos, abra OS de bancada e visualize relatórios executivos.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGoToSAC}
              className="w-full sm:w-auto bg-[#FF8500] hover:bg-[#e07500] text-white font-extrabold text-sm px-8 py-4 rounded-2xl shadow-xl flex items-center justify-center space-x-3 transition-all transform hover:scale-105"
            >
              <PhoneCall className="w-5 h-5" />
              <div className="text-left">
                <span className="block leading-none">Acessar Sistema SAC Procirúrgica</span>
                <span className="text-[11px] font-mono font-normal opacity-90">gritnews.com.br/sacproh</span>
              </div>
            </button>

            <button
              onClick={onOpenAdminLogin}
              className="w-full sm:w-auto bg-slate-900/90 hover:bg-slate-900 text-slate-200 font-bold text-sm px-6 py-4 rounded-2xl border border-slate-700 flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4 text-[#FF8500]" />
              <span>Acesso Restrito ADM</span>
            </button>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-[#050E1A] border-t border-slate-800 py-6 px-4 md:px-8 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 GRIT NEWS (gritnews.com.br) & Procirúrgica Hospitalar. Todos os direitos reservados.</p>
        <p className="text-[11px] text-slate-600">Sistema em conformidade com as normas ANVISA RDC 67/2009 e LGPD.</p>
      </footer>
    </div>
  );
};
