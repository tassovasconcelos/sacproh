import { isSupabaseConfigured, supabase } from '../lib/supabase';

const TAB_AUTH_KEY = 'sacproh.tab-authenticated-user';

const isPasswordRecoveryCallback = () => {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('type') === 'recovery' || hash.get('type') === 'recovery';
};

export const clearSecureTabSession = () => {
  if (typeof window !== 'undefined') sessionStorage.removeItem(TAB_AUTH_KEY);
};

export const initializeSecureAuth = async () => {
  if (!isSupabaseConfigured || typeof window === 'undefined') return;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user?.id) {
      sessionStorage.setItem(TAB_AUTH_KEY, session.user.id);
    }
    if (event === 'SIGNED_OUT') {
      clearSecureTabSession();
    }
  });

  // O callback de recuperação precisa manter a sessão temporária criada pelo Supabase
  // para permitir a troca de senha.
  if (isPasswordRecoveryCallback()) return;

  const { data } = await supabase.auth.getSession();
  const persistedUserId = data.session?.user?.id;
  if (!persistedUserId) {
    clearSecureTabSession();
    return;
  }

  // Sessões do localStorage não podem liberar o SAC automaticamente em uma nova aba.
  // Só restauramos uma sessão que já foi autenticada explicitamente nesta aba.
  const tabUserId = sessionStorage.getItem(TAB_AUTH_KEY);
  if (tabUserId !== persistedUserId) {
    await supabase.auth.signOut({ scope: 'local' });
    clearSecureTabSession();
  }
};
