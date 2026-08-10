import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavView } from './components/layout/Sidebar';
import { TicketList } from './components/tickets/TicketList';
import { NewTicketModal } from './components/tickets/NewTicketModal';
import { TicketDetailView } from './components/tickets/TicketDetailView';
const ExecutiveDashboard = lazy(() => import('./components/dashboard/ExecutiveDashboard').then(module => ({ default: module.ExecutiveDashboard })));
const QualityModule = lazy(() => import('./components/quality/QualityModule').then(module => ({ default: module.QualityModule })));
const TechnicalModule = lazy(() => import('./components/technical/TechnicalModule').then(module => ({ default: module.TechnicalModule })));
const LogisticsModule = lazy(() => import('./components/logistics/LogisticsModule').then(module => ({ default: module.LogisticsModule })));
const SpreadsheetImporter = lazy(() => import('./components/import/SpreadsheetImporter').then(module => ({ default: module.SpreadsheetImporter })));
const KnowledgeBase = lazy(() => import('./components/knowledge/KnowledgeBase').then(module => ({ default: module.KnowledgeBase })));
const SettingsModule = lazy(() => import('./components/settings/SettingsModule').then(module => ({ default: module.SettingsModule })));
const GritNewsPortal = lazy(() => import('./components/grit/GritNewsPortal').then(module => ({ default: module.GritNewsPortal })));
const AdminLoginModal = lazy(() => import('./components/auth/AdminLoginModal').then(module => ({ default: module.AdminLoginModal })));
const SaasTrialPortal = lazy(() => import('./components/commercial/SaasTrialPortal').then(module => ({ default: module.SaasTrialPortal })));
const CommercialTrialAdmin = lazy(() => import('./components/commercial/CommercialTrialAdmin').then(module => ({ default: module.CommercialTrialAdmin })));
const CommercialOrderAdmin = lazy(() => import('./components/commercial/CommercialOrderAdmin').then(module => ({ default: module.CommercialOrderAdmin })));
const CommercialAlertsAdmin = lazy(() => import('./components/commercial/CommercialAlertsAdmin').then(module => ({ default: module.CommercialAlertsAdmin })));

const ModuleLoading = () => <div className="min-h-[240px] flex items-center justify-center text-sm font-semibold text-slate-500">Carregando módulo...</div>;

import { 
  Tenant, UserProfile, Ticket, TicketStatus, Customer, Product, QualityActionPlan, TechnicalCase, LogisticsCase, ServiceOrder, Carrier, AuditLog
} from './types';
import { mockTenants, mockCustomers, mockProducts } from './lib/mockData';
import { apiService } from './services/apiService';
import { supabase } from './lib/supabase';

export default function App() {
  const isSaasTrialHost = typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase() === 'apps.sactrial.gritnews.com.br';
  const isCommercialTrialAdmin = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('commercial-trials');
  const isCommercialOrderAdmin = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('commercial-orders');
  const isCommercialAlertsAdmin = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('commercial-alerts');
  const isDedicatedSacHost = typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase() === 'apps.sacproh.gritnews.com.br';

  // O domínio dedicado deve abrir diretamente o SAC, mesmo usando a rota raiz (/).
  const isSacProhPath = typeof window !== 'undefined' && (
    isDedicatedSacHost ||
    window.location.pathname.toLowerCase().includes('sacproh') || 
    window.location.hash.toLowerCase().includes('sacproh') ||
    window.location.search.toLowerCase().includes('sacproh')
  );

  // Portal vs SAC App Mode ('portal' for gritnews.com.br, 'app' for gritnews.com.br/sacproh)
  const [appMode, setAppMode] = useState<'portal' | 'app'>(isSacProhPath ? 'app' : 'portal');

  // Sync mode with browser URL bar
  const navigateToApp = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      const appPath = isDedicatedSacHost ? '/' : '/sacproh';
      window.history.pushState({ path: appPath }, '', appPath);
    }
    setAppMode('app');
  };

  const navigateToPortal = () => {
    if (isDedicatedSacHost && typeof window !== 'undefined') {
      window.location.assign('https://gritnews.com.br/');
      return;
    }
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({ path: '/' }, '', '/');
    }
    setAppMode('portal');
  };

  useEffect(() => {
    const handlePopState = () => {
      const isSac = isDedicatedSacHost || window.location.pathname.toLowerCase().includes('sacproh') || window.location.hash.toLowerCase().includes('sacproh');
      setAppMode(isSac ? 'app' : 'portal');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Admin Security Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [pendingAdminView, setPendingAdminView] = useState<NavView | null>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-Tenant & User Role State
  const [tenants] = useState<Tenant[]>(mockTenants);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(mockTenants[0]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Data Store
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState<boolean>(false);

  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [qualityPlans, setQualityPlans] = useState<QualityActionPlan[]>([]);
  const [technicalCases, setTechnicalCases] = useState<TechnicalCase[]>([]);
  const [logisticsCases, setLogisticsCases] = useState<LogisticsCase[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Load Initial Data
  const loadAllData = async (tenantId?: string) => {
    const effectiveTenantId = tenantId || currentUser?.tenantId || currentTenant.id;
    const [fetchedTickets, fetchedUsers, fetchedCustomers, fetchedProducts, fetchedCarriers,
      qPlans, tCases, lCases, sOrders, logs] = await Promise.all([
      apiService.getTickets({ tenantId: effectiveTenantId }), apiService.getUsers(),
      apiService.getCustomers(), apiService.getProducts(), apiService.getCarriers(),
      apiService.getQualityPlans(), apiService.getTechnicalCases(), apiService.getLogisticsCases(),
      apiService.getServiceOrders(), apiService.getAuditLogs()
    ]);
    setTickets(fetchedTickets); setUsers(fetchedUsers); setCustomers(fetchedCustomers);
    setProducts(fetchedProducts); setCarriers(fetchedCarriers); setQualityPlans(qPlans);
    setTechnicalCases(tCases); setLogisticsCases(lCases); setServiceOrders(sOrders); setAuditLogs(logs);
  };

  useEffect(() => {
    if (!currentUser?.tenantId) return;
    loadAllData(currentUser.tenantId);
  }, [currentUser?.id, currentUser?.tenantId]);

  useEffect(() => {
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      const profile = await apiService.getCurrentProfile(data.session.user.id);
      if (profile) {
        setCurrentTenant(previous => ({ ...previous, id: profile.tenantId }));
        setCurrentUser(profile);
        setIsAdminAuthenticated(['SUPERADMIN', 'DIRETORIA', 'RESPONSAVEL_TECNICA', 'ADMIN_EMPRESA'].includes(profile.roleCode));
      }
    };
    restoreSession();
  }, []);

  // Ticket Created Handler
  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets(prev => [newTicket, ...prev]);
    setIsNewTicketModalOpen(false);
    setSelectedTicket(newTicket);
  };

  // Ticket Status Updated Handler
  const handleUpdateStatus = async (ticketId: string, newStatus: TicketStatus, notes: string) => {
    if (!currentUser) return;
    const updated = await apiService.updateTicketStatus(ticketId, newStatus, notes, currentUser.id);
    if (updated) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  // Dispatch / Route Ticket Handler
  const handleDispatchTicket = async (
    ticketId: string, 
    assignedArea: string, 
    assignedToId?: string, 
    assignedToName?: string, 
    notes?: string
  ) => {
    if (!currentUser) return;
    const updated = await apiService.dispatchTicket(ticketId, assignedArea, assignedToId, assignedToName, notes, currentUser.email);
    if (updated) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...updated } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...updated });
      }
    }
  };

  // Service Order Creation Handler
  const handleCreateOS = async (osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>) => {
    const newOS = await apiService.createServiceOrder(osData);
    setServiceOrders(prev => [newOS, ...prev]);
    const tCases = await apiService.getTechnicalCases();
    setTechnicalCases(tCases);
  };

  const handleUpdateTicket = async (ticket: Ticket, changes: Partial<Ticket>) => {
    if (!currentUser) return;
    const updated = await apiService.updateTicket(ticket, changes, currentUser);
    setTickets(previous => previous.map(item => item.id === updated.id ? updated : item));
    setSelectedTicket(updated);
  };

  const handleDeleteTicket = async (ticket: Ticket, reason: string) => {
    await apiService.deleteTicket(ticket, reason);
    setTickets(previous => previous.filter(item => item.id !== ticket.id));
    setSelectedTicket(null);
  };

  const handleUpdateOS = async (order: ServiceOrder, changes: Partial<ServiceOrder>) => {
    const updated = await apiService.updateServiceOrder(order, changes);
    setServiceOrders(previous => previous.map(item => item.id === updated.id ? updated : item));
  };

  const handleDeleteOS = async (order: ServiceOrder, reason: string) => {
    await apiService.deleteServiceOrder(order, reason);
    setServiceOrders(previous => previous.filter(item => item.id !== order.id));
  };

  // User Management Handlers
  const handleCreateUser = async (userData: Omit<UserProfile, 'id'>) => {
    const created = await apiService.createUser(userData);
    setUsers(prev => [created, ...prev]);
  };

  const handleUpdateUser = async (userId: string, data: Partial<UserProfile>) => {
    const updated = await apiService.updateUser(userId, data);
    if (updated) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...updated } : u));
    }
  };

  // Reset Data Handler
  const handleResetData = async () => {
    await apiService.resetAllData();
    setSelectedTicket(null);
    await loadAllData();
  };

  // Quality Plan Created Handler
  const handleCreateQualityPlan = async (plan: Omit<QualityActionPlan, 'id'>) => {
    const created = await apiService.createQualityPlan(plan);
    setQualityPlans(prev => [created, ...prev]);
  };

  // Filter Search
  const searchFilteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.protocol.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  const handleAdminAuthSuccess = (profile: UserProfile) => {
    setCurrentTenant(previous => ({ ...previous, id: profile.tenantId }));
    setCurrentUser(profile);
    const hasAdminAccess = ['SUPERADMIN', 'DIRETORIA', 'RESPONSAVEL_TECNICA', 'ADMIN_EMPRESA'].includes(profile.roleCode);
    setIsAdminAuthenticated(hasAdminAccess);
    setShowAdminLoginModal(false);
    navigateToApp();
    if (pendingAdminView && hasAdminAccess) {
      setCurrentView(pendingAdminView);
      setPendingAdminView(null);
    } else {
      setCurrentView(hasAdminAccess ? 'settings' : 'dashboard');
    }
  };

  if (isSaasTrialHost && isCommercialAlertsAdmin) {
    return <Suspense fallback={<ModuleLoading />}><CommercialAlertsAdmin /></Suspense>;
  }

  if (isSaasTrialHost && isCommercialOrderAdmin) {
    return <Suspense fallback={<ModuleLoading />}><CommercialOrderAdmin /></Suspense>;
  }

  if (isSaasTrialHost && isCommercialTrialAdmin) {
    return <Suspense fallback={<ModuleLoading />}><CommercialTrialAdmin /></Suspense>;
  }

  if (isSaasTrialHost) {
    return <Suspense fallback={<ModuleLoading />}><SaasTrialPortal /></Suspense>;
  }

  if (appMode === 'portal') {
    return (
      <Suspense fallback={<ModuleLoading />}>
        <GritNewsPortal
          onGoToSAC={() => navigateToApp()}
          onOpenAdminLogin={() => {
            setPendingAdminView('settings');
            setShowAdminLoginModal(true);
          }}
        />

        <AdminLoginModal
          isOpen={showAdminLoginModal}
          onClose={() => setShowAdminLoginModal(false)}
          onSuccess={handleAdminAuthSuccess}
        />
      </Suspense>
    );
  }

  if (!currentUser) {
    return <Suspense fallback={<ModuleLoading />}><div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
      <AdminLoginModal isOpen onClose={navigateToPortal} onSuccess={handleAdminAuthSuccess} />
    </div></Suspense>;
  }

  return (
    <Suspense fallback={<ModuleLoading />}><div className="min-h-screen bg-[#F7F9FC] text-[#10233F] font-sans antialiased flex flex-col">
      {/* Top Header */}
      <Header
        tenants={tenants}
        currentTenant={currentTenant}
        onSelectTenant={setCurrentTenant}
        currentUser={currentUser}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Body Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={(view) => {
            if (view === 'new_ticket') {
              setIsNewTicketModalOpen(true);
            } else {
              setCurrentView(view);
              setSelectedTicket(null);
            }
          }}
          openTicketsCount={tickets.filter(t => t.status !== 'CLOSED_PROCEDENT' && t.status !== 'CLOSED_NON_PROCEDENT').length}
          isAdminAuthenticated={isAdminAuthenticated}
          onOpenAdminLogin={() => {
            setPendingAdminView('settings');
            setShowAdminLoginModal(true);
          }}
          onGoToPortal={() => navigateToPortal()}
        />

        {/* View Workspace Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Detail View Takes Priority if a ticket is selected */}
          {selectedTicket ? (
            <TicketDetailView
              ticket={selectedTicket}
              currentUser={currentUser}
              userRole={currentUser.roleCode}
              users={users}
              onBack={() => setSelectedTicket(null)}
              onUpdateStatus={handleUpdateStatus}
              onDispatch={handleDispatchTicket}
              onCreateOS={handleCreateOS}
              onUpdateTicket={handleUpdateTicket}
              onDeleteTicket={handleDeleteTicket}
            />
          ) : (
            <>
              {currentView === 'dashboard' && (
                <ExecutiveDashboard tickets={tickets} />
              )}

              {currentView === 'tickets' && (
                <TicketList
                  tickets={searchFilteredTickets}
                  onSelectTicket={setSelectedTicket}
                  onOpenNewModal={() => setIsNewTicketModalOpen(true)}
                />
              )}

              {currentView === 'quality' && (
                <QualityModule
                  plans={qualityPlans}
                  onCreatePlan={handleCreateQualityPlan}
                />
              )}

              {currentView === 'technical' && (
                <TechnicalModule 
                  cases={technicalCases}
                  serviceOrders={serviceOrders}
                  tickets={tickets}
                  users={users}
                  onCreateOS={handleCreateOS}
                  onUpdateOS={handleUpdateOS}
                  onDeleteOS={handleDeleteOS}
                />
              )}

              {currentView === 'logistics' && (
                <LogisticsModule cases={logisticsCases} />
              )}

              {currentView === 'import' && (
                <SpreadsheetImporter currentUser={currentUser} onImported={loadAllData} />
              )}

              {currentView === 'knowledge' && (
                <KnowledgeBase />
              )}

              {currentView === 'reports' && (
                <ExecutiveDashboard tickets={tickets} />
              )}

              {currentView === 'users' && (
                <SettingsModule 
                  tenants={tenants} 
                  currentTenant={currentTenant} 
                  users={users}
                  onUpdateUser={handleUpdateUser}
                  onCreateUser={handleCreateUser}
                  onResetData={handleResetData}
                  currentUser={currentUser}
                />
              )}

              {currentView === 'settings' && (
                <SettingsModule 
                  tenants={tenants} 
                  currentTenant={currentTenant} 
                  users={users}
                  onUpdateUser={handleUpdateUser}
                  onCreateUser={handleCreateUser}
                  onResetData={handleResetData}
                  currentUser={currentUser}
                />
              )}

              {currentView === 'audit' && (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h1 className="text-xl font-bold text-[#10233F]">Trilha de Auditoria</h1>
                  <p className="text-xs text-slate-500">Registro histórico real das alterações, aberturas e transições do SAC.</p>
                  <div className="divide-y divide-slate-100 text-xs pt-2">
                    {auditLogs.length === 0 && <p className="py-6 text-center text-slate-500">Nenhum evento registrado.</p>}
                    {auditLogs.map(log => <div key={log.id} className="py-2.5 flex justify-between gap-4">
                      <div><strong className="text-[#145EDB]">{log.action}</strong> · {log.entity}
                        <p className="text-slate-500 break-all">{log.details}</p>
                        <p className="text-slate-400">{log.userEmail}</p>
                      </div>
                      <span className="text-slate-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                    </div>)}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* New SAC Ticket Creation Modal */}
      {isNewTicketModalOpen && (
        <NewTicketModal
          customers={customers}
          products={products}
          currentTenantId={currentTenant.id}
          currentUser={currentUser}
          carriers={carriers}
          onClose={() => setIsNewTicketModalOpen(false)}
          onTicketCreated={handleTicketCreated}
        />
      )}

      {/* Admin Login Gate Modal */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onSuccess={handleAdminAuthSuccess}
      />
    </div></Suspense>
  );
}
