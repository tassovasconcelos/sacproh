import { useEffect,useState } from 'react';
import { Tenant } from '../../types';
import { brandingService,defaultBranding,TenantBranding } from '../../services/brandingService';

export function BrandedDocumentHeader({tenant,title,reference}:{tenant:Tenant;title:string;reference?:string}){
  const[branding,setBranding]=useState<TenantBranding>({...defaultBranding,tenantId:tenant.id});
  useEffect(()=>{brandingService.get(tenant.id).then(setBranding).catch(()=>undefined);},[tenant.id]);
  return <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white print:rounded-none print:border-x-0 print:border-t-0" style={{borderBottomColor:branding.primaryColor,borderBottomWidth:4}}><div className="flex items-center justify-between gap-5 p-4"><div className="flex items-center gap-4">{branding.logoUrl?<img src={branding.logoUrl} alt={`Logo ${tenant.tradeName||tenant.name}`} className="h-14 max-w-48 object-contain"/>:<div className="grid h-14 w-14 place-items-center rounded-xl text-lg font-black text-white" style={{backgroundColor:branding.primaryColor}}>{(tenant.tradeName||tenant.name).slice(0,2).toUpperCase()}</div>}<div><strong className="block text-lg" style={{color:branding.secondaryColor}}>{tenant.tradeName||tenant.name}</strong><span className="text-xs text-slate-500">CNPJ {tenant.document}</span></div></div><div className="text-right"><h1 className="text-xl font-black" style={{color:branding.primaryColor}}>{title}</h1>{reference&&<p className="mt-1 text-xs text-slate-500">{reference}</p>}</div></div></div>;
}

export function BrandedDocumentFooter({tenantId}:{tenantId:string}){const[branding,setBranding]=useState<TenantBranding>({...defaultBranding,tenantId});useEffect(()=>{brandingService.get(tenantId).then(setBranding).catch(()=>undefined);},[tenantId]);return <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">{branding.documentFooter&&<p>{branding.documentFooter}</p>}{branding.showPoweredBy&&<p className="mt-1">Gerado pelo SAC 4.0</p>}</footer>;}
