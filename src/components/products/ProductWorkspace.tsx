import React,{useState} from 'react';
import {ClipboardList,BarChart3} from 'lucide-react';
import {ProductMasterManagement} from './ProductMasterManagement';
import {ProductCatalogModule} from './ProductCatalogModule';

type Props={currentUserRole:string};
export const ProductWorkspace:React.FC<Props>=({currentUserRole})=>{const[tab,setTab]=useState<'master'|'intelligence'>('master');return <div className="space-y-4"><div className="inline-flex rounded-xl border bg-white p-1 shadow-sm"><button onClick={()=>setTab('master')} className={`px-4 py-2 rounded-lg text-xs font-bold flex gap-2 items-center ${tab==='master'?'bg-[#145EDB] text-white':'text-slate-600'}`}><ClipboardList className="w-4 h-4"/>Cadastro completo</button><button onClick={()=>setTab('intelligence')} className={`px-4 py-2 rounded-lg text-xs font-bold flex gap-2 items-center ${tab==='intelligence'?'bg-[#145EDB] text-white':'text-slate-600'}`}><BarChart3 className="w-4 h-4"/>Inteligência e vendas</button></div>{tab==='master'?<ProductMasterManagement currentUserRole={currentUserRole}/>:<ProductCatalogModule currentUserRole={currentUserRole}/>}</div>};