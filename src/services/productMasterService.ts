import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export type ProductMasterChanges = Partial<Pick<Product,
  'name'|'description'|'model'|'codeSku'|'brand'|'anvisaRegister'|'manufacturerName'|'importerName'|'distributorName'|'countryOrigin'>>;

const fromDb = (row:any):Product => ({
  id:row.id,tenantId:row.tenant_id,codeSku:row.code_sku,name:row.name,description:row.description||undefined,
  familyId:row.family_id||undefined,model:row.model||undefined,anvisaRegister:row.anvisa_register||undefined,
  supplierName:row.supplier_name||undefined,countryOrigin:row.country_origin||undefined,brand:row.brand||undefined,
  manufacturerName:row.manufacturer_name||undefined,importerName:row.importer_name||undefined,distributorName:row.distributor_name||undefined
});

export const productMasterService = {
  async getByIds(ids:string[]):Promise<Product[]> {
    const unique=[...new Set(ids.filter(Boolean))];
    if(!unique.length)return [];
    const {data,error}=await supabase.from('products').select('*').in('id',unique).order('name');
    if(error)throw new Error(`Não foi possível carregar o cadastro mestre: ${error.message}`);
    return (data||[]).map(fromDb);
  },

  async update(productId:string,changes:ProductMasterChanges):Promise<Product>{
    const {data,error}=await supabase.rpc('update_product_master',{p_product_id:productId,p_changes:changes});
    if(error)throw new Error(`Não foi possível atualizar o produto: ${error.message}`);
    return fromDb(data);
  }
};
