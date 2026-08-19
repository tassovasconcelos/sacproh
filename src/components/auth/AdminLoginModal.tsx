import React, { useEffect, useState } from 'react';
import { ArrowRight, Key, Mail, ShieldAlert, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'request-reset' | 'update-password'>('login');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [recoveryActive, setRecoveryActive] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryActive(true);
        setMode('update-password');
        setErrorMsg('');
        setSuccessMsg('Link validado. Defina sua nova senha.');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isOpen && !recoveryActive) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'request-reset') {
      if (!email) {
        setErrorMsg('Informe o e-mail cadastrado.');
        return;
      }
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      setIsSubmitting(false);
      if (error) {
        const isRateLimited = error.message.toLowerCase().includes('rate limit');
        setErrorMsg(isRateLimited
          ? 'Muitas solicitações foram feitas. Aguarde alguns minutos e tente novamente.'
          : `Não foi possível enviar o acesso: ${error.message}`);
        return;
      }
      setSuccessMsg('Se o e-mail estiver cadastrado, você receberá um link para definir ou recuperar sua senha.');
      return;
    }

    if (mode === 'update-password') {
      if (password.length < 8) {
        setErrorMsg('A nova senha deve ter pelo menos 8 caracteres.');
        return;
      }
      if (password !== passwordConfirmation) {
        setErrorMsg('As senhas informadas não são iguais.');
        return;
      }
      setIsSubmitting(true);
      setErrorMsg('');
      const { error } = await supabase.auth.updateUser({ password });
      setIsSubmitting(false);
      if (error) {
        setErrorMsg('Não foi possível atualizar a senha. Solicite um novo link.');
        return;
      }
      setSuccessMsg('Senha atualizada. Entre novamente com seu e-mail e a nova senha.');
      setPassword('');
      setPasswordConfirmation('');
      setMode('login');
      setRecoveryActive(false);
      await supabase.auth.signOut({ scope: 'local' });
      return;
    }

    if (!email || !password) {
      setErrorMsg('Preencha o e-mail e a senha.');
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg('A autenticação ainda não foi configurada. Conecte o projeto ao Supabase.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error || !data.user) {
        setErrorMsg('E-mail ou senha incorretos. Se for seu primeiro acesso, use a opção abaixo para definir a senha.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, unit_id, full_name, email, phone, job_title, department, employee_code, manager_name, notes, role_code, avatar_url, is_active, last_access_at')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile?.is_active) {
        await supabase.auth.signOut({ scope: 'local' });
        setErrorMsg('Seu usuário não possui um perfil ativo no SAC.');
        return;
      }

      const accessedAt = new Date().toISOString();
      await supabase.from('profiles').update({ last_access_at: accessedAt }).eq('id', data.user.id);
      onSuccess({
        id: data.user.id,
        tenantId: profile.tenant_id,
        unitId: profile.unit_id || undefined,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone || undefined,
        jobTitle: profile.job_title || undefined,
        department: profile.department || undefined,
        employeeCode: profile.employee_code || undefined,
        managerName: profile.manager_name || undefined,
        notes: profile.notes || undefined,
        roleCode: profile.role_code,
        avatarUrl: profile.avatar_url || undefined,
        isActive: profile.is_active,
        lastAccessAt: accessedAt
      });
    } catch {
      setErrorMsg('Não foi possível autenticar agora. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B2343] text-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-700 overflow-hidden text-xs">
        <div className="bg-[#071325] p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/procirurgica-logo.png" alt="Procirúrgica" className="h-10 w-auto object-contain" />
            <div>
              <strong className="mb-1.5 block text-sm tracking-wide text-white">SACPROH · Procirúrgica</strong>
              <h3 className="font-extrabold text-sm text-white">Acesso Seguro ao SAC 4.0</h3>
              <p className="text-[11px] text-slate-400">Identificação individual e trilha de auditoria</p>
            </div>
          </div>
          <button onClick={() => { setRecoveryActive(false); onClose(); }} className="p-1 text-slate-400 hover:text-white rounded-lg" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Entre com seu usuário individual. O sistema aplica automaticamente as permissões do seu perfil: SAC, Responsável Técnica, Técnico, Logística, Diretoria ou Administração.
          </p>
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-xl flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" /><span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl">
              {successMsg}
            </div>
          )}
          {mode !== 'update-password' && <label className="block font-bold text-slate-300">
            E-mail corporativo
            <span className="relative block mt-1">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" autoCapitalize="none"
                className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl text-white outline-none focus:border-[#145EDB]" />
            </span>
          </label>}
          {mode !== 'request-reset' && <label className="block font-bold text-slate-300">
            {mode === 'update-password' ? 'Nova senha' : 'Senha'}
            <span className="relative block mt-1">
              <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={mode === 'update-password' ? 'new-password' : 'current-password'}
                className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl text-white outline-none focus:border-[#145EDB]" />
            </span>
          </label>}
          {mode === 'update-password' && (
            <label className="block font-bold text-slate-300">
              Confirmar nova senha
              <span className="relative block mt-1">
                <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="password" value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} required autoComplete="new-password"
                  className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl text-white outline-none focus:border-[#FF8500]" />
              </span>
            </label>
          )}
          {mode === 'login' && (
            <button type="button" onClick={() => { setMode('request-reset'); setErrorMsg(''); setSuccessMsg(''); }}
              className="text-[#FF8500] font-bold hover:underline">
              Primeiro acesso ou esqueci minha senha
            </button>
          )}
          <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            Uma nova aba do SAC exige autenticação. Use “Sair” ao encerrar o atendimento em computadores compartilhados.
          </div>
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button type="button" onClick={() => mode === 'login' ? onClose() : setMode('login')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl">{mode === 'login' ? 'Cancelar' : 'Voltar'}</button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#145EDB] hover:bg-[#0f4bb3] disabled:opacity-60 text-white font-extrabold rounded-xl shadow-lg flex items-center space-x-2">
              <span>{isSubmitting ? 'Processando...' : mode === 'request-reset' ? 'Enviar link de acesso' : mode === 'update-password' ? 'Salvar nova senha' : 'Entrar no SAC 4.0'}</span><ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
