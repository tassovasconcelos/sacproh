import React,{useState} from 'react';
import {
  LayoutDashboard, Ticket, CheckSquare2, Wrench, Truck, UploadCloud,
  BookOpen, BarChart3, Users, Settings, History, PlusCircle, ArrowLeft, Lock, Unlock, Globe, ScanSearch, ClipboardCheck, ShieldAlert, PackageSearch, X
} from 'lucide-react';
import {ProductWorkspace} from '../products/ProductWorkspace';

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
  | 'regulatory'
  | 'risk'
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
  currentUserRole: string;
  enabledModules?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,onSelectView,openTicketsCount,isAdminAuthenticated,onOpenAdminLogin,onGoToPortal,currentUserRole,enabledModules=['SAC']
}) => {
  const [showProducts,setShowProducts]=useState(false);
  const contracted=(code:string)=>currentUserRole==='SUPERADMIN'||code==='SAC'||enabledModules.includes(code);
  const roleAllows=(roles:string[])=>currentUserRole==='SUPERADMIN'||roles.includes(currentUserRole);
  const allOpMenuItems:{id:NavView;label:string;icon:React.ReactNode;badge?:number;module:string;roles:string[]}[]=[
    {id:'dashboard',label:'Dashboard Executivo',icon:<LayoutDashboard className="w-4 h-4"/>,module:'SAC',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO','LOGISTICA','GERENTE_LOJA']},
    {id:'tickets',label:'Chamados SAC',icon:<Ticket className="w-4 h-4"/>,badge:openTicketsCount,module:'SAC',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO','LOGISTICA','GERENTE_LOJA']},
    {id:'quality',label:'Qualidade & 5W2H',icon:<CheckSquare2 className="w-4 h-4"/>,module:'QUALITY',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC']},
    {id:'risk',label:'Riscos, CAPA & Auditorias',icon:<ShieldAlert className="w-4 h-4"/>,module:'RISK',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO']},
    {id:'technical',label:'Assistência Técnica (OS)',icon:<Wrench className="w-4 h-4"/>,module:'SAC',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO']},
    {id:'logistics',label:'Logística & Coletas',icon:<Truck className="w-4 h-4"/>,module:'SAC',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','LOGISTICA']},
    {id:'knowledge',label:'Base de Conhecimento',icon:<BookOpen className="w-4 h-4"/>,module:'SAC',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO','LOGISTICA','GERENTE_LOJA']},
    {id:'reports',label:'Relatórios Gerenciais',icon:<BarChart3 className="w-4 h-4"/>,module:'SAC',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA']},
    {id:'traceability',label:'Rastreabilidade & Lotes',icon:<ScanSearch className="w-4 h-4"/>,module:'TRACEABILITY',roles:['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','LOGISTICA']},
    {id:'regulatory',label:'Relatórios Anvisa & Inmetro',icon:<ClipboardCheck className="w-4 h-4"/>,module:'REGULATORY',roles:['RESPONSAVEL_TECNICA']},
  ];
  const opMenuItems=allOpMenuItems.filter(item=>contracted(item.module)&&roleAllows(item.roles));
  const productRoles=['DIRETORIA','RESPONSAVEL_TECNICA','ADMIN_EMPRESA','SAC','TECNICO','LOGISTICA','GERENTE_LOJA'];
  const productVisible=roleAllows(productRoles);

  const adminMenuItems:{id:NavView;label:string;icon:React.ReactNode}[]=[
    {id:'users',label:'Editar Usuários & Perfis',icon:<Users className="w-4 h-4"/>},
    {id:'import',label:'Importar Planilha SAC',icon:<UploadCloud className="w-4 h-4"/>},
    {id:'settings',label:'Zerar & Configurações ADM',icon:<Settings className="w-4 h-4"/>},
    {id:'audit',label:'Trilha de Auditoria',icon:<History className="w-4 h-4"/>},
  ];
  const handleAdminClick=(viewId:NavView)=>{if(!isAdminAuthenticated)onOpenAdminLogin();else onSelectView(viewId)};

  return <>
    <aside className="w-64 bg-[#0B2343] text-slate-300 h-[calc(100vh-4rem)] border-r border-slate-700/60 p-3 flex flex-col justify-between flex-shrink-0 overflow-y-auto overscroll-contain">
      <div className="space-y-4">
        <button onClick={onGoToPortal} className="w-full bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-between transition-colors"><div className="flex items-center space-x-2"><Globe className="w-3.5 h-3.5 text-emerald-400"/><span>gritnews.com.br</span></div><ArrowLeft className="w-3.5 h-3.5 text-slate-400"/></button>
        <button onClick={()=>{setShowProducts(false);onSelectView('new_ticket')}} className="w-full bg-[#FF8500] hover:bg-[#e07500] text-white font-bold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-95"><PlusCircle className="w-5 h-5"/><span className="text-sm">Abrir Novo SAC</span></button>
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Operacional SAC</p>
          {opMenuItems.slice(0,2).map(item=>{const active=currentView===item.id&&!showProducts;return <button key={item.id} onClick={()=>{setShowProducts(false);onSelectView(item.id)}} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active?'bg-[#145EDB] text-white shadow-sm font-bold':'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}><div className="flex items-center space-x-3">{item.icon}<span>{item.label}</span></div>{item.badge!==undefined&&item.badge>0&&<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active?'bg-white text-[#145EDB]':'bg-[#FF8500] text-white'}`}>{item.badge}</span>}</button>})}
          {productVisible&&<button onClick={()=>setShowProducts(true)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${showProducts?'bg-[#145EDB] text-white border-[#145EDB] shadow-sm':'bg-[#102E55] text-white border-slate-600 hover:bg-[#145EDB]'}`}><div className="flex items-center space-x-3"><PackageSearch className="w-4 h-4 text-[#FFB14A]"/><span>Produtos & Inteligência</span></div><span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF8500] text-white">V4.10</span></button>}
          {opMenuItems.slice(2).map(item=>{const active=currentView===item.id&&!showProducts;return <button key={item.id} onClick={()=>{setShowProducts(false);onSelectView(item.id)}} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active?'bg-[#145EDB] text-white shadow-sm font-bold':'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}><div className="flex items-center space-x-3">{item.icon}<span>{item.label}</span></div>{item.badge!==undefined&&item.badge>0&&<span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active?'bg-white text-[#145EDB]':'bg-[#FF8500] text-white'}`}>{item.badge}</span>}</button>})}
        </nav>
        <nav className="space-y-1 pt-2 border-t border-slate-800">
          <div className="px-3 flex items-center justify-between mb-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Área Restrita ADM</p>{isAdminAuthenticated?<span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 font-mono font-bold flex items-center space-x-1"><Unlock className="w-2.5 h-2.5 mr-0.5"/><span>LIBERADO</span></span>:<span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800 font-mono font-bold flex items-center space-x-1"><Lock className="w-2.5 h-2.5 mr-0.5"/><span>RESTRITO</span></span>}</div>
          {adminMenuItems.map(item=>{const active=currentView===item.id&&!showProducts;return <button key={item.id} onClick={()=>{setShowProducts(false);handleAdminClick(item.id)}} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${active?'bg-[#145EDB] text-white shadow-sm font-bold':'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}><div className="flex items-center space-x-3">{item.icon}<span>{item.label}</span></div>{!isAdminAuthenticated&&<Lock className="w-3 h-3 text-slate-500"/>}</button>})}
        </nav>
      </div>
      <div className="p-3 mt-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center"><p className="text-[11px] font-bold text-white">SACPROH · Procirúrgica</p><p className="text-[10px] text-slate-400 mt-0.5">Gestão integrada de atendimento</p></div>
    </aside>
    {showProducts&&<div className="fixed z-[60] left-64 top-16 right-0 bottom-0 bg-[#F7F9FC] overflow-y-auto"><div className="max-w-7xl mx-auto p-4 md:p-6"><div className="flex justify-end mb-2"><button onClick={()=>setShowProducts(false)} className="p-2 rounded-lg border bg-white hover:bg-slate-50 text-slate-600" title="Fechar módulo"><X className="w-4 h-4"/></button></div><ProductWorkspace currentUserRole={currentUserRole}/></div></div>}
  </>;
};
