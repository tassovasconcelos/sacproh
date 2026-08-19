import React, { useState } from 'react';
import { Building2, ShieldCheck, Bell, Search, LogOut } from 'lucide-react';
import { Tenant, UserProfile } from '../../types';
import { supabase } from '../../lib/supabase';
import { clearSecureTabSession } from '../../services/secureAuth';

interface HeaderProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  currentUser: UserProfile;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  currentUser,
  searchQuery,
  onSearchChange
}) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const rolesList = [
    { code: 'SUPERADMIN', label: 'Superadministrador Procirúrgica' },
    { code: 'DIRETORIA', label: 'Diretoria Executiva' },
    { code: 'RESPONSAVEL_TECNICA', label: 'Resp. Técnica / Farmacêutica' },
    { code: 'TECNICO', label: 'Técnico Especializado' },
    { code: 'GERENTE_LOJA', label: 'Gerente de Loja / Unidade' },
    { code: 'SAC', label: 'Pós-Venda / SAC' },
    { code: 'LOGISTICA', label: 'Logística & Coletas' },
    { code: 'ADMIN_EMPRESA', label: 'Admin da Empresa' }
  ];

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    clearSecureTabSession();
    await supabase.auth.signOut({ scope: 'local' });
    window.location.assign(window.location.origin + window.location.pathname);
  };

  return (
    <header className="h-16 bg-[#0B2343] text-white border-b border-black/20 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <img src="/procirurgica-logo.png" alt="Procirúrgica" className="h-10 w-auto object-contain" />
          <div className="hidden sm:block border-l border-slate-600 pl-3">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wide text-white">SAC</span>
              <span className="text-[10px] bg-[#FF8500] text-white px-1.5 py-0.5 rounded font-mono font-semibold">4.0</span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium">{currentTenant.tradeName || currentTenant.name}</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
          <Building2 className="w-3.5 h-3.5 text-[#FF8500] mr-2" />
          <select
            value={currentTenant.id}
            onChange={(e) => {
              const t = tenants.find(x => x.id === e.target.value);
              if (t) onSelectTenant(t);
            }}
            className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 font-medium"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                {t.tradeName || t.name} ({t.document})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por protocolo, cliente, produto ou lote..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-800/90 text-sm text-slate-100 placeholder-slate-400 pl-9 pr-4 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-[#FF8500] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="hidden lg:flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF8500] mr-2" />
          <span className="text-slate-400 mr-1">Perfil:</span>
          <span className="text-slate-100 font-semibold">
            {rolesList.find(r => r.code === currentUser.roleCode)?.label || currentUser.roleCode}
          </span>
        </div>

        <button className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors" aria-label="Notificações">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF8500] ring-2 ring-[#0B2343]"></span>
        </button>

        <div className="flex items-center space-x-2.5 border-l border-slate-700/80 pl-3">
          <div className="w-8 h-8 rounded-full bg-[#FF8500] text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-600">
            {currentUser.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-100 leading-snug">{currentUser.fullName}</p>
            <p className="text-[10px] text-slate-400">{currentUser.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isSigningOut}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-60 transition-colors text-xs font-semibold"
          title="Encerrar sessão"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{isSigningOut ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </header>
  );
};
