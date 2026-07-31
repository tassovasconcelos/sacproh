import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, NavView } from './components/layout/Sidebar';
import { TicketList } from './components/tickets/TicketList';
import { NewTicketModal } from './components/tickets/NewTicketModal';
import { TicketDetailView } from './components/tickets/TicketDetailView';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { QualityModule } from './components/quality/QualityModule';
import { TechnicalModule } from './components/technical/TechnicalModule';
import { LogisticsModule } from './components/logistics/LogisticsModule';
import { SpreadsheetImporter } from './components/import/SpreadsheetImporter';
import { KnowledgeBase } from './components/knowledge/KnowledgeBase';
import { SettingsModule } from './components/settings/SettingsModule';
import { GritNewsPortal } from './components/grit/GritNewsPortal';
import { AdminLoginModal } from './components/auth/AdminLoginModal';

import { 
  Tenant, UserProfile, Ticket, TicketStatus, Customer, Product, QualityActionPlan, TechnicalCase, LogisticsCase, ServiceOrder
} from './types';
import { mockTenants, mockCustomers, mockProducts } from './lib/mockData';
import { apiService } from './services/apiService';
import { supabase } from './lib/supabase';

export default function App() {
  // Check if current URL path includes /sacproh
  const isSacProhPath = typeof window !== 'undefined' && (
    window.location.pathname.toLowerCase().includes('sacproh') || 
    window.location.hash.toLowerCase().includes('sacproh') ||
    window.location.search.toLowerCase().includes('sacproh')
  );

  // Portal vs SAC App Mode ('portal' for gritnews.com.br, 'app' for gritnews.com.br/sacproh)
  const [appMode, setAppMode] = useState<'portal' | 'app'>(isSacProhPath ? 'app' : 'portal');

  // Sync mode with browser URL bar
  const navigateToApp = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({ path: '/sacproh' }, '', '/sacproh');
    }
    setAppMode('app');
  };

  const navigateToPortal = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({ path: '/' }, '', '/');
    }
    setAppMode('portal');
  };

  useEffect(() => {
    const handlePopState = () => {
      const isSac = window.location.pathname.toLowerCase().includes('sacproh') || window.location.hash.toLowerCase().includes('sacproh');
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

  const [customers] = useState<Customer[]>(mockCustomers);
  const [products] = useState<Product[]>(mockProducts);
  const [qualityPlans, setQualityPlans] = useState<QualityActionPlan[]>([]);
  const [technicalCases, setTechnicalCases] = useState<TechnicalCase[]>([]);
  const [logisticsCases, setLogisticsCases] = useState<LogisticsCase[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);

  // Load Initial Data
  const loadAllData = async (tenantId?: string) => {
    const effectiveTenantId = tenantId || currentUser?.tenantId || currentTenant.id;
    const fetchedTickets = await apiService.getTickets({ tenantId: effectiveTenantId });
    setTickets(fetchedTickets);

    const fetchedUsers = await apiService.getUsers();
    setUsers(fetchedUsers);

    const qPlans = await apiService.getQualityPlans();
    setQualityPlans(qPlans);

    const tCases = await apiService.getTechnicalCases();
    setTechnicalCases(tCases);

    const lCases = await apiService.getLogisticsCases();
    setLogisticsCases(lCases);

    const sOrders = await apiService.getServiceOrders();
    setServiceOrders(sOrders);
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

  if (appMode === 'portal') {
    return (
      <>
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
      </>
    );
  }

  if (!currentUser) {
    return <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
      <AdminLoginModal isOpen onClose={navigateToPortal} onSuccess={handleAdminAuthSuccess} />
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#10233F] font-sans antialiased flex flex-col">
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
              userRole={currentUser.roleCode}
              users={users}
              onBack={() => setSelectedTicket(null)}
              onUpdateStatus={handleUpdateStatus}
              onDispatch={handleDispatchTicket}
              onCreateOS={handleCreateOS}
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
                  <h1 className="text-xl font-bold text-[#10233F]">Trilha de Auditoria ImutÃ¡vel (Audit Logs)</h1>
                  <p className="text-xs text-slate-500">Registro histÃ³rico de todas as alteraÃ§Ãµes, aberturas, transiÃ§Ãµes de status e acessos no tenant ProcirÃºrgica</p>
                  <div className="divide-y divide-slate-100 text-xs pt-2">
                    <div className="py-2.5 flex justify-between">
                      <div>
                        <strong className="text-[#145EDB]">STATUS_CHANGED</strong> - Protocolo SAC.2607.001
                        <p className="text-slate-500">Status alterado de EM TRIAGEM para EM ANÃLISE TÃ‰CNICA por Dra. Patricia Lima</p>
                      </div>
                      <span className="text-slate-400">28/07/2026 10:15</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <div>
                        <strong className="text-emerald-600">TICKET_CREATED</strong> - Protocolo SAC.2607.001
                        <p className="text-slate-500">Abertura de protocolo para Hospital SÃ£o Mateus Ltda por Mariana Vasconcelos</p>
                      </div>
                      <span className="text-slate-400">28/07/2026 09:30</span>
                    </div>
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
    </div>
  );
}

