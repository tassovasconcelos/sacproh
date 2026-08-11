import React from 'react';
import { 
  LayoutDashboard, Ticket, CheckSquare2, Wrench, Truck, UploadCloud, 
  BookOpen, BarChart3, Users, Settings, History, PlusCircle, ArrowLeft, Lock, Unlock, Globe, ScanSearch
} from 'lucide-react';

export type NavView = 
  | 'dashboard' 
  | 'tickets' 
  | 'new_ticket' 
  | 'quality' 
  | 'technical' 
  | 'logistics' 
  | 'import' 
  | 'knowledge' 
  | 'reports' 
  | 'traceability'
  | 'users' 
  | 'settings' 
  | 'audit';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  openTicketsCount: number;
  isAdminAuthenticated: boolean;
  onOpenAdminLogin: () => void;
  onGoToPortal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  openTicketsCount,
  isAdminAuthenticated,
  onOpenAdminLogin,
  onGoToPortal
}) => {
  const opMenuItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard Executivo', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tickets', label: 'Chamados SAC', icon: <Ticket className="w-4 h-4" />, badge: openTicketsCount },
    { id: 'quality', label: 'Qualidade & 5W2H', icon: <CheckSquare2 className="w-4 h-4" /> },
    { id: 'technical', label: 'Assistência Técnica (OS)', icon: <Wrench className="w-4 h-4" /> },
    { id: 'logistics', label: 'Logística & Coletas', icon: <Truck className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Base de Conhecimento', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'reports', label: 'Relatórios Gerenciais', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'traceability', label: 'Rastreabilidade & Lotes', icon: <ScanSearch className="w-4 h-4" /> },
  ];

  const adminMenuItems: { id: NavView; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'Editar Usuários & Perfis', icon: <Users className="w-4 h-4" /> },
    { id: 'import', label: 'Importar Planilha SAC', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'settings', label: 'Zerar & Configurações ADM', icon: <Settings className="w-4 h-4" /> },
    { id: 'audit', label: 'Trilha de Auditoria', icon: <History className="w-4 h-4" /> },
  ];

  const handleAdminClick = (viewId: NavView) => {
    if (!isAdminAuthenticated) {
      onOpenAdminLogin();
    } else {
      onSelectView(viewId);
    }
  };

  return (
    <aside className="w-64 bg-[#0B2343] text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-700/60 p-3 flex flex-col justify-between flex-shrink-0">
      <div className="space-y-4">
        {/* Return to Portal Link */}
        <button
          onClick={onGoToPortal}
          className="w-full bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>gritnews.com.br</span>
          </div>
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Quick New SAC Button */}
        <button 
          onClick={() => onSelectView('new_ticket')}
          className="w-full bg-[#FF8500] hover:bg-[#e07500] text-white font-bold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-sm">Abrir Novo SAC</span>
        </button>

        {/* Operational Menu */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Operacional SAC</p>
          {opMenuItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-[#145EDB] text-white shadow-sm font-bold' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-[#145EDB]' : 'bg-[#FF8500] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Menu (Restricted Section) */}
        <nav className="space-y-1 pt-2 border-t border-slate-800">
          <div className="px-3 flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Área Restrita ADM</p>
            {isAdminAuthenticated ? (
              <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 font-mono font-bold flex items-center space-x-1">
                <Unlock className="w-2.5 h-2.5 mr-0.5" />
                <span>LIBERADO</span>
              </span>
            ) : (
              <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800 font-mono font-bold flex items-center space-x-1">
                <Lock className="w-2.5 h-2.5 mr-0.5" />
                <span>RESTRITO</span>
              </span>
            )}
          </div>

          {adminMenuItems.map(item => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleAdminClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-[#145EDB] text-white shadow-sm font-bold' 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>

                {!isAdminAuthenticated && (
                  <Lock className="w-3 h-3 text-slate-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
        <p className="text-[11px] font-bold text-white">GRIT SAC 4.0 Platform</p>
        <p className="text-[10px] text-slate-400 mt-0.5">gritnews.com.br</p>
      </div>
    </aside>
  );
};

