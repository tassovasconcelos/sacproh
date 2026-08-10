import { supabase } from '../lib/supabase';

export type TrialRequestInput = {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone?: string;
  segment: string;
  monthlyTicketVolume: string;
  planInterest: 'START' | 'PRO' | 'ENTERPRISE' | 'UNDECIDED';
  message?: string;
  acceptedPrivacy: boolean;
  website?: string;
};

export async function submitTrialRequest(input: TrialRequestInput) {
  const { data, error } = await supabase.functions.invoke('request-trial', { body: input });
  if (error) throw new Error('Não foi possível enviar a solicitação. Tente novamente.');
  if (!data?.requestId) throw new Error(data?.error || 'A solicitação não foi confirmada.');
  return data as { requestId: string; status: string };
}
