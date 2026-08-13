
import { supabase } from '../lib/supabase';

export type TenantBranding={tenantId:string;logoPath?:string;logoUrl?:string;primaryColor:string;secondaryColor:string;accentColor:string;textColor:string;documentFooter?:string;showPoweredBy:boolean};
export const defaultBranding:TenantBranding={tenantId:'',logoUrl:'/procirurgica-logo.png',primaryColor:'#145EDB',secondaryColor:'#0B2343',accentColor:'#FF8500',textColor:'#10233F',documentFooter:'Procirúrgica Hospitalar · SAC, Qualidade e Assistência Técnica',showPoweredBy:false};
const map=(row:any):TenantBranding=>{const logoPath=row.logo_path||undefined;return{tenantId:row.tenant_id,logoPath,logoUrl:logoPath?supabase.storage.from('tenant-branding').getPublicUrl(logoPath).data.publicUrl:undefined,primaryColor:row.primary_color,secondaryColor:row.secondary_color,accentColor:row.accent_color,textColor:row.text_color,documentFooter:row.document_footer||undefined,showPoweredBy:row.show_powered_by};};

export const brandingService={
  async get(tenantId:string){const{data,error}=await supabase.from('tenant_branding').select('*').eq('tenant_id',tenantId).maybeSingle();if(error)throw error;return data?map(data):{...defaultBranding,tenantId};},
  async save(branding:TenantBranding){const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sessão expirada.');const{data,error}=await supabase.from('tenant_branding').upsert({tenant_id:branding.tenantId,logo_path:branding.logoPath||null,primary_color:branding.primaryColor,secondary_color:branding.secondaryColor,accent_color:branding.accentColor,text_color:branding.textColor,document_footer:branding.documentFooter||null,show_powered_by:branding.showPoweredBy,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'tenant_id'}).select().single();if(error)throw error;return map(data);},
  async uploadLogo(tenantId:string,file:File){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152)throw new Error('Use PNG, JPG ou WebP com até 2 MB.');const extension=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${tenantId}/logo.${extension}`;const{error}=await supabase.storage.from('tenant-branding').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});if(error)throw error;return path;}
};

