import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, PackageCheck, Save, X } from 'lucide-react';
import type { Product, Ticket, UserProfile } from '../../types';
import { productMasterService } from '../../services/productMasterService';

type Props={ticket:Ticket;currentUser:UserProfile};

type Draft={description:string;model:string;codeSku:string;brand:string;anvisaRegister:string;manufacturerName:string;importerName:string;distributorName:string;countryOrigin:string};
const empty:Draft={description:'',model:'',codeSku:'',brand:'',anvisaRegister:'',manufacturerName:'',importerName:'',distributorName:'',countryOrigin:''};

export const ProductMasterEditor:React.FC<Props>=({ticket,currentUser})=>{
  const allowed=['SUPERADMIN','RESPONSAVEL_TECNICA','ADMIN_EMPRESA'].includes(currentUser.roleCode);
  const ids=useMemo(()=>ticket.items.map(i=>i.productId).filter(Boolean) as string[],[ticket.items]);
  const [products,setProducts]=useState<Product[]>([]);
  const [editing,setEditing]=useState<Product|null>(null);
  const [draft,setDraft]=useState<Draft>(empty);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  const load=async()=>{try{setProducts(await productMasterService.getByIds(ids));}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar produtos.');}};
  useEffect(()=>{void load();},[ids.join('|')]);

  const open=(p:Product)=>{setEditing(p);setDraft({description:p.description||'',model:p.model||'',codeSku:p.codeSku||'',brand:p.brand||'',anvisaRegister:p.anvisaRegister||'',manufacturerName:p.manufacturerName||'',importerName:p.importerName||'',distributorName:p.distributorName||'',countryOrigin:p.countryOrigin||''});setMessage('');setError('');};
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!editing)return;setSaving(true);setError('');try{await productMasterService.update(editing.id,draft);setMessage('Cadastro mestre atualizado com auditoria. O protocolo atual mantém seu snapshot histórico. Novos SACs usarão os dados atualizados.');setEditing(null);await load();}catch(err){setError(err instanceof Error?err.message:'Falha ao salvar produto.');}finally{setSaving(false);}};

  if(!products.length)return null;
  return <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b bg-slate-50 flex flex-wrap justify-between gap-3"><div><div className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-[#145EDB]"/><h3 className="font-extrabold text-sm text-[#10233F]">Cadastro mestre dos produtos deste SAC</h3></div><p className="text-xs text-slate-500 mt-1">Descrição técnica, modelo e dados regulatórios. Alterações são auditadas e não reescrevem protocolos históricos.</p></div>{!allowed&&<span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-800">Somente RT / Admin</span>}</div>
    <div className="p-5 space-y-3 text-xs">{error&&<div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{error}</div>}{message&&<div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">{message}</div>}
      {products.map(p=><div key={p.id} className="p-4 rounded-xl border bg-slate-50 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><strong className="text-sm text-[#10233F]">{p.name}</strong><p className="font-mono text-slate-500">{p.codeSku} · {p.model||'modelo não informado'}</p></div>{allowed&&<button onClick={()=>open(p)} className="px-3 py-2 rounded-lg bg-[#145EDB] text-white font-bold flex items-center gap-1"><Edit3 className="w-3.5 h-3.5"/>Editar cadastro mestre</button>}</div><p className="leading-relaxed whitespace-pre-wrap">{p.description||'Descrição técnica ainda não cadastrada.'}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-600"><span><b>Marca:</b> {p.brand||'-'}</span><span><b>ANVISA:</b> {p.anvisaRegister||'-'}</span><span><b>Fabricante:</b> {p.manufacturerName||'-'}</span><span><b>Origem:</b> {p.countryOrigin||'-'}</span><span><b>Importador:</b> {p.importerName||'-'}</span><span><b>Distribuidor:</b> {p.distributorName||'-'}</span></div></div>)}
    </div>
    {editing&&<div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4"><form onSubmit={save} className="bg-white w-full max-w-3xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-base">Editar produto mestre</h3><p className="text-slate-500">{editing.name}</p></div><button type="button" onClick={()=>setEditing(null)}><X className="w-5 h-5"/></button></div><label className="block font-bold">Descrição técnica completa<textarea rows={6} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal" placeholder="Descrição factual do produto, finalidade, principais características e apresentação."/></label><div className="grid md:grid-cols-2 gap-3">{([['model','Modelo'],['codeSku','SKU'],['brand','Marca'],['anvisaRegister','Registro ANVISA'],['manufacturerName','Fabricante'],['importerName','Importador'],['distributorName','Distribuidor'],['countryOrigin','País de origem']] as const).map(([key,label])=><label key={key} className="font-bold">{label}<input value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})} className="mt-1 w-full border rounded-lg p-2 font-normal"/></label>)}</div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 rounded-lg bg-slate-200 font-bold">Cancelar</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-[#145EDB] text-white font-bold flex items-center gap-1"><Save className="w-3.5 h-3.5"/>{saving?'Salvando...':'Salvar com auditoria'}</button></div></form></div>}
  </section>;
};
