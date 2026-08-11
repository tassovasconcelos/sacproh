import {supabase} from '../lib/supabase';

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; } }

export type MarketingEvent = {id:string;event_name:string;page_path:string;source?:string|null;medium?:string|null;campaign?:string|null;referrer?:string|null;created_at:string};

const measurementId=(import.meta as any).env?.VITE_GA_MEASUREMENT_ID as string|undefined;

export function initializeMarketingAnalytics(){
  if(measurementId && !document.querySelector(`script[data-ga4="${measurementId}"]`)){
    const script=document.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;script.dataset.ga4=measurementId;document.head.appendChild(script);
    window.dataLayer=window.dataLayer||[];window.gtag=(...args:unknown[])=>window.dataLayer?.push(args);window.gtag('js',new Date());window.gtag('config',measurementId,{anonymize_ip:true});
  }
  trackMarketingEvent('page_view');
}

export async function trackMarketingEvent(eventName:string,metadata:Record<string,string>={}){
  const query=new URLSearchParams(window.location.search);
  const event={event_name:eventName,page_path:window.location.pathname,source:query.get('utm_source')||metadata.source||null,medium:query.get('utm_medium')||metadata.medium||null,campaign:query.get('utm_campaign')||metadata.campaign||null,referrer:document.referrer||null,metadata};
  window.gtag?.('event',eventName,{event_category:'marketing',...metadata});
  try{await supabase.from('marketing_events').insert(event);}catch{/* Analytics must never block conversion. */}
}

export async function listMarketingEvents(days=30){
  const since=new Date(Date.now()-days*86400000).toISOString();
  const {data,error}=await supabase.from('marketing_events').select('id,event_name,page_path,source,medium,campaign,referrer,created_at').gte('created_at',since).order('created_at',{ascending:false});
  if(error)throw error;return (data||[]) as MarketingEvent[];
}
