import type { Customer } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { apiService } from './apiService';

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim();
    if (message) return message;
  }
  return fallback;
};

const customerFromRow = (row: any): Customer => ({
  id: row.id,
  tenantId: row.tenant_id,
  type: row.type,
  name: row.name,
  tradeName: row.trade_name || undefined,
  document: row.document,
  email: row.email || undefined,
  phone: row.phone || undefined,
  whatsapp: row.whatsapp || undefined,
  city: row.city || undefined,
  state: row.state || undefined,
  address: row.address || undefined,
  lgpdConsent: Boolean(row.lgpd_consent)
});

const originalCreateCustomer = apiService.createCustomer.bind(apiService);
const originalCreateTicket = apiService.createTicket.bind(apiService);

// A abertura de SAC nao pode falhar apenas porque o operador escolheu “Novo cliente”
// para um CPF/CNPJ que ja existe. Nesse caso, reutilizamos o cadastro existente.
apiService.createCustomer = async (customer) => {
  const document = customer.document.trim();

  if (isSupabaseConfigured && document) {
    const { data: existing, error: lookupError } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', customer.tenantId)
      .eq('document', document)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Nao foi possivel validar o cliente: ${lookupError.message}`);
    }
    if (existing) return customerFromRow(existing);
  }

  try {
    return await originalCreateCustomer({ ...customer, document });
  } catch (error: any) {
    // Corrida entre duas telas ou cadastro simultaneo: recupera o registro que venceu a disputa.
    if (isSupabaseConfigured && document && (error?.code === '23505' || String(error?.message || '').includes('customers_tenant_id_document_key'))) {
      const { data: existing, error: lookupError } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', customer.tenantId)
        .eq('document', document)
        .maybeSingle();
      if (!lookupError && existing) return customerFromRow(existing);
    }
    throw new Error(errorMessage(error, 'Nao foi possivel cadastrar ou localizar o cliente.'));
  }
};

// O Supabase devolve alguns erros como objetos PostgREST, nao como Error nativo.
// Normalizamos para que a tela mostre a causa real em vez do texto generico.
apiService.createTicket = async (ticketData) => {
  try {
    return await originalCreateTicket(ticketData);
  } catch (error) {
    throw new Error(errorMessage(error, 'Nao foi possivel abrir o chamado. Tente novamente ou acione o administrador.'));
  }
};

// Compatibiliza o texto legado do modal com o padrao real e evita exemplo de mes fixo.
if (typeof window !== 'undefined') {
  const alignProtocolHint = () => {
    const currentYm = new Date().toISOString().slice(2, 7).replace('-', '');
    document.querySelectorAll('p').forEach((node) => {
      const text = node.textContent || '';
      if (text.includes('Geração automática de protocolo único SAC.2607.XXX')) {
        node.textContent = `Geração automática de protocolo único SAC.${currentYm}NNN • sequência contínua`;
      }
    });
  };

  const observer = new MutationObserver(alignProtocolHint);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', alignProtocolHint, { once: true });
}
