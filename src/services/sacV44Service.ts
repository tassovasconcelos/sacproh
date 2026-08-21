import { supabase } from '../lib/supabase';
import type { Ticket, TicketQualificationStage, UserProfile } from '../types';
import { sacV43Service, type TicketEvent } from './sacV43Service';

export type V44Attachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  documentType?: string;
  qualificationStage?: TicketQualificationStage;
  description?: string;
  uploadedByName?: string;
  createdAt: string;
};

export type V44ProductSnapshot = {
  id: string;
  productId?: string;
  productName: string;
  productDescription?: string;
  productModel?: string;
  sku?: string;
  quantity: number;
  serialNumber?: string;
  lotNumber?: string;
  manufacturingDate?: string;
  expirationDate?: string;
  anvisaRegister?: string;
  manufacturerName?: string;
  importerName?: string;
  distributorName?: string;
  retailerName?: string;
};

export type UploadResult = {
  fileName: string;
  ok: boolean;
  error?: string;
};

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const sacV44Service = {
  async getProductSnapshots(ticketId: string): Promise<V44ProductSnapshot[]> {
    const { data, error } = await supabase
      .from('ticket_items')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Não foi possível carregar os produtos completos: ${error.message}`);
    return (data || []).map((row: any) => ({
      id: row.id,
      productId: row.product_id || undefined,
      productName: row.product_name,
      productDescription: row.product_description || undefined,
      productModel: row.product_model || undefined,
      sku: row.sku || undefined,
      quantity: Number(row.quantity || 0),
      serialNumber: row.serial_number || undefined,
      lotNumber: row.lot_number || undefined,
      manufacturingDate: row.manufacturing_date || undefined,
      expirationDate: row.expiration_date || undefined,
      anvisaRegister: row.anvisa_register || undefined,
      manufacturerName: row.manufacturer_name || undefined,
      importerName: row.importer_name || undefined,
      distributorName: row.distributor_name || undefined,
      retailerName: row.retailer_name || undefined
    }));
  },

  async getAttachments(ticketId: string): Promise<V44Attachment[]> {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Não foi possível carregar os anexos: ${error.message}`);
    return Promise.all((data || []).map(async (row: any) => {
      const { data: signed } = await supabase.storage.from('sac-attachments').createSignedUrl(row.file_path, 3600);
      return {
        id: row.id,
        fileName: row.file_name,
        fileType: row.file_type || '',
        fileSize: Number(row.file_size || 0),
        url: signed?.signedUrl || '',
        documentType: row.document_type || undefined,
        qualificationStage: row.qualification_stage || undefined,
        description: row.description || undefined,
        uploadedByName: row.uploaded_by_name || undefined,
        createdAt: row.created_at
      };
    }));
  },

  async uploadAttachments(
    ticket: Ticket,
    files: File[],
    user: UserProfile,
    metadata: { documentType?: string; qualificationStage?: TicketQualificationStage; description?: string }
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      try {
        sacV43Service.validateAttachment(file);
        const unique = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const path = `${ticket.tenantId}/${ticket.id}/${unique}-${safeFileName(file.name)}`;
        const { error: storageError } = await supabase.storage
          .from('sac-attachments')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (storageError) throw storageError;

        const { error: recordError } = await supabase.from('ticket_attachments').insert({
          ticket_id: ticket.id,
          tenant_id: ticket.tenantId,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          uploaded_by_name: user.fullName,
          document_type: metadata.documentType || 'EVIDENCE',
          qualification_stage: metadata.qualificationStage || ticket.qualificationStage || 'REGISTRATION',
          description: metadata.description?.trim() || null
        });
        if (recordError) {
          await supabase.storage.from('sac-attachments').remove([path]);
          throw recordError;
        }
        results.push({ fileName: file.name, ok: true });
      } catch (error) {
        results.push({ fileName: file.name, ok: false, error: error instanceof Error ? error.message : 'Falha no envio' });
      }
    }
    return results;
  },

  async getTimeline(ticketId: string): Promise<TicketEvent[]> {
    return sacV43Service.getTicketTimeline(ticketId);
  },

  buildCsv(ticket: Ticket, products: V44ProductSnapshot[], attachments: V44Attachment[], timeline: TicketEvent[]): string {
    const rows: Array<Array<string | number>> = [
      ['PROTOCOLO', ticket.protocol],
      ['CLIENTE', ticket.customerName],
      ['CPF/CNPJ', ticket.customerDocument],
      ['STATUS', ticket.status],
      ['CATEGORIA', ticket.category],
      ['SUBCATEGORIA', ticket.subcategory || ''],
      ['PRIORIDADE', ticket.priority],
      ['DESCRIÇÃO DA OCORRÊNCIA', ticket.description],
      [],
      ['PRODUTOS'],
      ['Produto', 'Descrição completa', 'Modelo', 'SKU', 'Qtd', 'Lote', 'Série', 'ANVISA', 'Fabricante'],
      ...products.map(item => [item.productName, item.productDescription || '', item.productModel || '', item.sku || '', item.quantity, item.lotNumber || '', item.serialNumber || '', item.anvisaRegister || '', item.manufacturerName || '']),
      [],
      ['ANEXOS'],
      ['Arquivo', 'Tipo documental', 'Etapa', 'Descrição', 'Responsável', 'Data'],
      ...attachments.map(item => [item.fileName, item.documentType || '', item.qualificationStage || '', item.description || '', item.uploadedByName || '', new Date(item.createdAt).toLocaleString('pt-BR')]),
      [],
      ['HISTÓRICO'],
      ['Data', 'Evento', 'Título', 'Descrição', 'Responsável'],
      ...timeline.map(item => [new Date(item.occurredAt).toLocaleString('pt-BR'), item.eventType, item.title, item.description || '', item.actorName || ''])
    ];
    const encode = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return '\uFEFF' + rows.map(row => row.map(encode).join(';')).join('\n');
  }
};
