import {supabase} from '../lib/supabase';

export type SalesVolumeRecord={
  id:string;periodStart:string;periodEnd:string;productId?:string;sku:string;productName:string;model?:string;brand?:string;manufacturerName?:string;unitsSold:number;customersCount:number;revenue?:number;sourceFile?:string;importedAt?:string;
};
export type SalesImportResult={batchId:string;inserted:number;unmatched:number};

const fromDb=(r:any):SalesVolumeRecord=>({
  id:r.id,periodStart:r.period_start,periodEnd:r.period_end,productId:r.product_id||undefined,sku:r.sku||'',productName:r.product_name||'',model:r.model||undefined,brand:r.brand||undefined,manufacturerName:r.manufacturer_name||undefined,unitsSold:Number(r.units_sold||0),customersCount:Number(r.customers_count||0),revenue:r.revenue==null?undefined:Number(r.revenue),sourceFile:r.source_file||undefined,importedAt:r.imported_at||r.created_at||undefined
});

export const salesVolumeService={
  async list():Promise<SalesVolumeRecord[]>{
    const{data,error}=await supabase.from('sales_volume_records').select('*').order('period_start',{ascending:true});
    if(error)throw new Error(`Não foi possível carregar a base histórica de vendas: ${error.message}`);
    return(data||[]).map(fromDb);
  },
  async importBatch(rows:Record<string,unknown>[],sourceFile:string):Promise<SalesImportResult>{
    const{data,error}=await supabase.rpc('import_sales_volume_batch',{p_rows:rows,p_source_file:sourceFile});
    if(error)throw new Error(`Não foi possível importar as vendas: ${error.message}`);
    return{batchId:String(data?.batchId||data?.batch_id||''),inserted:Number(data?.inserted||0),unmatched:Number(data?.unmatched||0)};
  }
};
