import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, Users, Clock, History, Check, Lock, Key, 
  Trash2, AlertTriangle, UserPlus, Edit3, Search, UploadCloud, RefreshCw, X 
} from 'lucide-react';
import { Tenant, UserProfile, UserRole } from '../../types';
import { SpreadsheetImporter } from '../import/SpreadsheetImporter';
import { apiService } from '../../services/apiService';
import { BrandingSettings } from './BrandingSettings';

interface SettingsModuleProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  users: UserProfile[];
  onUpdateUser: (userId: string, data: Partial<UserProfile>) => void;
  onCreateUser: (userData: Omit<UserProfile, 'id'>) => Promise<void>;
  onResetData: () => Promise<void>;
  currentUser: UserProfile;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  tenants, 
  currentTenant, 
  users,
  onUpdateUser,
  onCreateUser,
  onResetData,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'import' | 'reset' | 'roles' | 'tenants' | 'branding'>('users');
  const [userSearch, setUserSearch] = useState('');
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SAC');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [passwordSendingTo, setPasswordSendingTo] = useState('');
  const [passwordCooldowns, setPasswordCooldowns] = useState<Record<string,number>>({});

  const sendPasswordEmail = async (email: string) => {
    if ((passwordCooldowns[email] || 0) > Date.now()) return;
    setPasswordSendingTo(email); setUserMessage('');
    try {
      await apiService.sendPasswordReset(email);
      setPasswordCooldowns(previous=>({...previous,[email]:Date.now()+60*60*1000}));
      setUserMessage(`E-mail de definição de senha enviado para ${email}. Novo envio ficará disponível em 1 hora.`);
    } catch(error) {
      setPasswordCooldowns(previous=>({...previous,[email]:Date.now()+10*60*1000}));
      setUserMessage(error instanceof Error?error.message:'Falha no envio.');
    } finally { setPasswordSendingTo(''); }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.roleCode.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMessage('');
    setIsCreatingUser(true);
    try { await onCreateUser({
      tenantId: currentTenant.id,
      fullName: newFullName,
      email: newEmail,
      phone: newPhone,
      jobTitle: newJobTitle,
      department: newDepartment,
      roleCode: newRole,
      isActive: true
    });
    setUserMessage('Usuário cadastrado. O convite para definir a senha foi enviado por e-mail.');
    setShowAddUserModal(false);
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewJobTitle('');
    setNewDepartment('');
    } catch (error) { setUserMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar o usuário.'); }
    finally { setIsCreatingUser(false); }
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    onUpdateUser(editingUser.id, {
      fullName: editingUser.fullName,
      email: editingUser.email,
      phone: editingUser.phone,
      jobTitle: editingUser.jobTitle,
      department: editingUser.department,
      employeeCode: editingUser.employeeCode,
      managerName: editingUser.managerName,
      notes: editingUser.notes,
      roleCode: editingUser.roleCode,
      isActive: editingUser.isActive
    });
    setEditingUser(null);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    await onResetData();
    setIsResetting(false);
    setShowResetConfirmModal(false);
  };

  const permissionsMatrix = [
    { module: 'Chamados SAC', superadmin: true, diretoria: true, respTecnica: true, tecnico: true, gerenteLoja: true, sac: true, logistica: true },
    { module: 'Aprovação Parecer ANVISA', superadmin: true, diretoria: true, respTecnica: true, tecnico: false, gerenteLoja: false, sac: false, logistica: false },
    { module: 'Registrar Laudo Técnico', superadmin: true, diretoria: true, respTecnica: true, tecnico: true, gerenteLoja: false, sac: false, logistica: false },
    { module: 'Gestão de Fretes / Coletas', superadmin: true, diretoria: true, respTecnica: false, tecnico: false, gerenteLoja: false, sac: false, logistica: true },
    { module: 'Dashboard Executivo & Custos', superadmin: true, diretoria: true, respTecnica: false, tecnico: false, gerenteLoja: false, sac: false, logistica: false }
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-[#10233F]">Área Administrativa & Configurações da Plataforma</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gestão de usuários, alteração de perfis (RBAC), importação de dados de SAC e zeramento do banco de dados
        </p>
      </div>

      {/* Main Admin Tab Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
        
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap ${activeTab === 'branding' ? 'border-[#145EDB] text-[#145EDB] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'}`}><Building2 className="w-4 h-4"/><span>Marca & Documentos</span></button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              activeTab === 'users' ? 'border-[#145EDB] text-[#145EDB] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Editar Usuários & Perfis</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              activeTab === 'import' ? 'border-[#145EDB] text-[#145EDB] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Planilha SAC</span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              activeTab === 'reset' ? 'border-red-600 text-red-600 bg-white' : 'border-transparent text-slate-600 hover:text-red-600'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Zerar Informações</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              activeTab === 'roles' ? 'border-[#145EDB] text-[#145EDB] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Matriz de Permissões (RBAC)</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap ${
              activeTab === 'tenants' ? 'border-[#145EDB] text-[#145EDB] bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Tenants (Empresas)</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-5">
          {activeTab === 'branding' && <BrandingSettings tenant={currentTenant}/>}
          
          {/* TAB 1: USERS & PROFILES MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {userMessage && <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg font-semibold">{userMessage}</div>}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail ou cargo..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-[#145EDB]"
                  />
                </div>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-[#145EDB] hover:bg-[#0f4bb3] text-white font-bold px-4 py-2 rounded-lg flex items-center space-x-2 shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar Novo Usuário</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="p-3">Nome Completo</th>
                      <th className="p-3">E-mail</th>
                      <th className="p-3">Perfil / Cargo (RBAC)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                        <td className="p-3 font-mono text-slate-600">{u.email}</td>
                        <td className="p-3">
                          <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-[11px]">
                            {u.roleCode}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold inline-flex items-center space-x-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar Perfil</span>
                          </button>
                          <button type="button" disabled={passwordSendingTo===u.email || (passwordCooldowns[u.email]||0)>Date.now()} onClick={()=>sendPasswordEmail(u.email)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#145EDB] rounded-lg font-bold inline-flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Key className="w-3.5 h-3.5" /><span>{passwordSendingTo===u.email?'Enviando...':(passwordCooldowns[u.email]||0)>Date.now()?'Aguardar':'Enviar senha'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SPREADSHEET IMPORTER */}
          {activeTab === 'import' && (
            <SpreadsheetImporter currentUser={currentUser} />
          )}

          {/* TAB 3: ZERAR INFORMAÇÕES (DATABASE RESET) */}
          {activeTab === 'reset' && (
            <div className="space-y-4 max-w-2xl bg-red-50/50 p-6 rounded-2xl border border-red-200">
              <div className="flex items-start space-x-3 text-red-900">
                <AlertTriangle className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base">Zerar Todas as Informações da Plataforma</h3>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Esta ação apagará permanentemente todos os chamados de SAC cadastrados, Ordens de Serviço (OS),
                    planos de ação 5W2H e históricos de atendimento. Utilize esta rotina para reiniciar os testes ou antes de realizar a importação oficial da planilha histórica.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-red-200 flex justify-end">
                <button
                  onClick={() => setShowResetConfirmModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl shadow flex items-center space-x-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Informações Agora</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: RBAC MATRIX */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#10233F]">Matriz de Controle de Acesso por Função</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="p-2.5">Módulo / Ação</th>
                      <th className="p-2.5 text-center">Superadmin</th>
                      <th className="p-2.5 text-center">Diretoria</th>
                      <th className="p-2.5 text-center">Resp. Técnica</th>
                      <th className="p-2.5 text-center">Técnico</th>
                      <th className="p-2.5 text-center">Gerente Loja</th>
                      <th className="p-2.5 text-center">SAC</th>
                      <th className="p-2.5 text-center">Logística</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissionsMatrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{row.module}</td>
                        <td className="p-2.5 text-center">{row.superadmin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                        <td className="p-2.5 text-center">{row.diretoria ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                        <td className="p-2.5 text-center">{row.respTecnica ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                        <td className="p-2.5 text-center">{row.tecnico ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                        <td className="p-2.5 text-center">{row.gerenteLoja ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                        <td className="p-2.5 text-center">{row.sac ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                        <td className="p-2.5 text-center">{row.logistica ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <Lock className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: TENANTS */}
          {activeTab === 'tenants' && (
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#10233F]">Tenants Multi-Empresa Cadastrados</h3>
              {tenants.map(t => (
                <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">CNPJ: {t.document}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Ativo</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-[#10233F] text-base">Editar Usuário & Perfil</h3>
              <button onClick={() => setEditingUser(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">E-mail</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Cargo / Perfil RBAC</label>
                <select
                  value={editingUser.roleCode}
                  onChange={e => setEditingUser({ ...editingUser, roleCode: e.target.value as UserRole })}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-bold"
                >
                  <option value="SUPERADMIN">Superadmin</option>
                  <option value="DIRETORIA">Diretoria</option>
                  <option value="RESPONSAVEL_TECNICA">Responsável Técnica (Farmacêutica)</option>
                  <option value="TECNICO">Técnico de Manutenção</option>
                  <option value="GERENTE_LOJA">Gerente de Loja</option>
                  <option value="SAC">Atendente SAC</option>
                  <option value="LOGISTICA">Logística / Expedição</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block font-bold">Cargo
                  <input value={editingUser.jobTitle || ''} onChange={e => setEditingUser({ ...editingUser, jobTitle: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
                </label>
                <label className="block font-bold">Departamento
                  <input value={editingUser.department || ''} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
                </label>
                <label className="block font-bold">Telefone
                  <input value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
                </label>
                <label className="block font-bold">Matrícula
                  <input value={editingUser.employeeCode || ''} onChange={e => setEditingUser({ ...editingUser, employeeCode: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
                </label>
              </div>

              <label className="block font-bold">Gestor responsável
                <input value={editingUser.managerName || ''} onChange={e => setEditingUser({ ...editingUser, managerName: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
              </label>

              <label className="block font-bold">Observações de gestão
                <textarea value={editingUser.notes || ''} onChange={e => setEditingUser({ ...editingUser, notes: e.target.value })} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" rows={2} />
              </label>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="user-active"
                  checked={editingUser.isActive}
                  onChange={e => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                  className="rounded text-[#145EDB]"
                />
                <label htmlFor="user-active" className="font-bold text-slate-800">Usuário Ativo</label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#145EDB] text-white font-bold rounded-lg">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-[#10233F] text-base">Cadastrar Novo Usuário</h3>
              <button onClick={() => setShowAddUserModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  required
                  placeholder="Ex: Dra. Ana Souza"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                  placeholder="ana.souza@procirurgica.com.br"
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Cargo / Perfil RBAC *</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-bold"
                >
                  <option value="SUPERADMIN">Superadmin</option>
                  <option value="DIRETORIA">Diretoria</option>
                  <option value="RESPONSAVEL_TECNICA">Responsável Técnica (Farmacêutica)</option>
                  <option value="TECNICO">Técnico de Manutenção</option>
                  <option value="GERENTE_LOJA">Gerente de Loja</option>
                  <option value="SAC">Atendente SAC</option>
                  <option value="LOGISTICA">Logística / Expedição</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block font-bold">Cargo
                  <input value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
                </label>
                <label className="block font-bold">Departamento
                  <input value={newDepartment} onChange={e => setNewDepartment(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-300 p-2.5 rounded-lg font-normal" />
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button type="button" disabled={isCreatingUser} onClick={() => setShowAddUserModal(false)} className="px-4 py-2 bg-slate-200 font-bold rounded-lg disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isCreatingUser} className="px-4 py-2 bg-[#145EDB] text-white font-bold rounded-lg disabled:opacity-60 min-w-36">{isCreatingUser ? 'Enviando convite...' : 'Cadastrar Usuário'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM RESET MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="font-bold text-base text-slate-900">Confirmar Zeramento de Dados</h3>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Você tem certeza que deseja <strong>zerar todos os dados</strong> da plataforma? Esta operação removerá todos os chamados, ordens de serviço e laudos.
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 bg-slate-200 font-bold rounded-lg text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow"
              >
                {isResetting ? 'Zerando...' : 'Sim, Zerar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
