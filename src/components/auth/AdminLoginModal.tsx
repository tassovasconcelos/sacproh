import React, { useState } from 'react';
import { ArrowRight, Key, Lock, Mail, ShieldAlert, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setErrorMsg('Preencha o e-mail e a senha de administrador.');
      return;
    }
    if (!isSupabaseConfigured) {
      setErrorMsg('A autenticação ainda não foi configurada. Conecte o projeto ao Supabase.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setErrorMsg('E-mail ou senha incorretos.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role_code, is_active')
        .eq('id', data.user.id)
        .single();

      const allowedRoles = ['SUPERADMIN', 'DIRETORIA', 'RESPONSAVEL_TECNICA', 'ADMIN_EMPRESA'];
      if (profileError || !profile?.is_active || !allowedRoles.includes(profile.role_code)) {
        await supabase.auth.signOut();
        setErrorMsg('Seu usuário não possui permissão administrativa ativa.');
        return;
      }
      onSuccess();
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
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#FF8500]/20 text-[#FF8500] rounded-lg"><Lock className="w-5 h-5" /></div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Área Restrita ADM</h3>
              <p className="text-[11px] text-slate-400">Autenticação segura pelo Supabase</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-slate-300 leading-relaxed text-[11px]">
            O acesso é restrito a administradores, diretoria e responsáveis técnicos autorizados.
          </p>
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-xl flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" /><span>{errorMsg}</span>
            </div>
          )}
          <label className="block font-bold text-slate-300">
            E-mail de administrador
            <span className="relative block mt-1">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl text-white outline-none focus:border-[#145EDB]" />
            </span>
          </label>
          <label className="block font-bold text-slate-300">
            Senha
            <span className="relative block mt-1">
              <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl text-white outline-none focus:border-[#145EDB]" />
            </span>
          </label>
          <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            O acesso é validado pelo Supabase. Nunca compartilhe sua senha.
          </div>
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl">Cancelar</button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#145EDB] hover:bg-[#0f4bb3] disabled:opacity-60 text-white font-extrabold rounded-xl shadow-lg flex items-center space-x-2">
              <span>{isSubmitting ? 'Validando...' : 'Entrar na Área ADM'}</span><ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
