import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Sparkles, AlertTriangle, ShieldCheck, Upload, FileText, CheckCircle 
} from 'lucide-react';
import { Customer, Product, Ticket, TicketPriority, UserProfile } from '../../types';
import { apiService } from '../../services/apiService';

interface NewTicketModalProps {
  customers: Customer[];
  products: Product[];
  currentTenantId: string;
  currentUser: UserProfile;
  onClose: () => void;
  onTicketCreated: (ticket: Ticket) => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  customers,
  products,
  currentTenantId,
  currentUser,
  onClose,
  onTicketCreated
}) => {
  // Step State
  const [step, setStep] = useState<number>(1);
  const [isClassifying, setIsClassifying] = useState<boolean>(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(customers.length ? 'existing' : 'new');
  const [newCustomer, setNewCustomer] = useState({
    type: 'PF' as Customer['type'], name: '', tradeName: '', document: '', email: '',
    phone: '', whatsapp: '', city: '', state: '', address: '', lgpdConsent: false
  });
  const [sellerName, setSellerName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [salesChannel, setSalesChannel] = useState<string>('NAO_INFORMADO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Multi-Product Items State
  const [items, setItems] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    serialNumber: string;
    lotNumber: string;
  }[]>([
    {
      productId: products[0]?.id || '',
      productName: products[0]?.name || 'Bisturi EletrÃ´nico',
      quantity: 1,
      serialNumber: '',
      lotNumber: ''
    }
  ]);

  // Occurrence State
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('AssistÃªncia TÃ©cnica');
  const [subcategory, setSubcategory] = useState<string>('Defeito de Componente');
  const [priority, setPriority] = useState<TicketPriority>('HIGH');
  const [userRiskFlag, setUserRiskFlag] = useState<boolean>(false);
  const [adverseEventFlag, setAdverseEventFlag] = useState<boolean>(false);
  const [damageFlag, setDamageFlag] = useState<boolean>(false);
  const [readyForCollection, setReadyForCollection] = useState<boolean>(true);

  // AI Classification Trigger
  const handleAIClassify = async () => {
    if (!description || description.length < 10) return;
    setIsClassifying(true);
    try {
      const res = await apiService.classifyTicketWithGemini(description);
      if (res) {
        setCategory(res.suggested_category || category);
        setSubcategory(res.suggested_subcategory || subcategory);
        setPriority(res.suggested_priority || priority);
      }
    } catch (err) {
      console.error('AI Classification error:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: products[0]?.id || '',
        productName: products[0]?.name || 'Novo Produto',
        quantity: 1,
        serialNumber: '',
        lotNumber: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      let customer = customers.find(c => c.id === selectedCustomerId);
      if (customerMode === 'new') {
        if (!newCustomer.name.trim() || !newCustomer.document.trim()) {
          throw new Error('Informe o nome e o CPF/CNPJ do cliente.');
        }
        customer = await apiService.createCustomer({
          ...newCustomer,
          name: newCustomer.name.trim(),
          document: newCustomer.document.trim(),
          tenantId: currentTenantId
        });
      }
      if (!customer) throw new Error('Selecione ou cadastre um cliente.');

      const newTicketData = {
      tenantId: currentTenantId,
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      sellerName,
      invoiceNumber,
      purchaseDate: purchaseDate || undefined,
      deliveryDate: deliveryDate || undefined,
      salesChannel,
      description,
      category,
      subcategory,
      priority,
      urgency: priority,
      impact: priority,
      initialProcedency: 'PROCEDENT' as const,
      userRiskFlag,
      adverseEventFlag,
      damageFlag,
      readyForCollection,
      status: 'TRIAGE' as const,
      assignedArea: 'SAC & Qualidade',
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      attachmentsCount: 0,
      items: items.map((it, idx) => ({
        id: 'ti-new-' + idx,
        ticketId: '',
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        serialNumber: it.serialNumber,
        lotNumber: it.lotNumber
      }))
      };

      const created = await apiService.createTicket(newTicketData);
      onTicketCreated(created);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel abrir o chamado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#0B2343] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Abertura de Novo Chamado SAC</h2>
            <p className="text-xs text-slate-300">GeraÃ§Ã£o automÃ¡tica de protocolo Ãºnico SAC.2607.XXX</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Wizard Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-[#145EDB]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-[#145EDB] text-white flex items-center justify-center text-[10px]">1</span>
            <span>Cliente e Comercial</span>
          </div>
          <div className="h-0.5 bg-slate-300 flex-1 mx-4"></div>
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-[#145EDB]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-[#145EDB] text-white flex items-center justify-center text-[10px]">2</span>
            <span>Produtos do Chamado</span>
          </div>
          <div className="h-0.5 bg-slate-300 flex-1 mx-4"></div>
          <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-[#145EDB]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-[#145EDB] text-white flex items-center justify-center text-[10px]">3</span>
            <span>OcorrÃªncia & RegulatÃ³rio</span>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* STEP 1: CLIENTE E COMERCIAL */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#10233F]">Cliente e origem da venda</h3>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button type="button" onClick={() => setCustomerMode('existing')}
                    className={`px-3 py-1.5 font-bold ${customerMode === 'existing' ? 'bg-[#145EDB] text-white' : 'bg-white text-slate-600'}`}>
                    Cliente cadastrado
                  </button>
                  <button type="button" onClick={() => setCustomerMode('new')}
                    className={`px-3 py-1.5 font-bold ${customerMode === 'new' ? 'bg-[#145EDB] text-white' : 'bg-white text-slate-600'}`}>
                    + Novo cliente
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cliente *</label>
                  <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:border-[#145EDB] outline-none">
                    <option value="">Selecione...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.document}){c.city ? ` - ${c.city}/${c.state || ''}` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <label className="sm:col-span-1 font-semibold text-slate-700">Tipo *
                      <select value={newCustomer.type} onChange={e => setNewCustomer({...newCustomer, type: e.target.value as Customer['type']})}
                        className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2">
                        <option value="PF">Pessoa fÃ­sica</option><option value="PJ">Empresa</option>
                        <option value="CLINIC">ClÃ­nica</option><option value="HOSPITAL">Hospital</option>
                      </select>
                    </label>
                    <label className="sm:col-span-2 font-semibold text-slate-700">Nome / RazÃ£o social *
                      <input value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer,name:e.target.value})} required
                        className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2" />
                    </label>
                    <label className="font-semibold text-slate-700">CPF / CNPJ *
                      <input value={newCustomer.document} onChange={e => setNewCustomer({...newCustomer,document:e.target.value})} required
                        className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2" />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <label className="font-semibold text-slate-700">WhatsApp
                      <input value={newCustomer.whatsapp} onChange={e => setNewCustomer({...newCustomer,whatsapp:e.target.value})} className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2" />
                    </label>
                    <label className="font-semibold text-slate-700">E-mail
                      <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer,email:e.target.value})} className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2" />
                    </label>
                    <label className="font-semibold text-slate-700">Cidade
                      <input value={newCustomer.city} onChange={e => setNewCustomer({...newCustomer,city:e.target.value})} className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2" />
                    </label>
                    <label className="font-semibold text-slate-700">UF
                      <input maxLength={2} value={newCustomer.state} onChange={e => setNewCustomer({...newCustomer,state:e.target.value.toUpperCase()})} className="mt-1 w-full bg-white border border-slate-300 rounded-lg p-2 uppercase" />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-slate-700"><input type="checkbox" checked={newCustomer.lgpdConsent} onChange={e => setNewCustomer({...newCustomer,lgpdConsent:e.target.checked})} /> Consentimento para contato e tratamento dos dados (LGPD)</label>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Canal de venda *</label>
                  <select value={salesChannel} onChange={(e) => setSalesChannel(e.target.value)} required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:border-[#145EDB] outline-none">
                    <option value="NAO_INFORMADO">NÃ£o informado</option>
                    <option value="LOJA_FISICA">Loja fÃ­sica</option><option value="E_COMMERCE">E-commerce prÃ³prio</option>
                    <option value="MARKETPLACE">Marketplace</option><option value="REPRESENTANTE">Representante comercial</option>
                    <option value="VENDA_DIRETA">Venda direta</option><option value="DISTRIBUIDOR_REVENDEDOR">Distribuidor / revendedor</option>
                    <option value="LICITACAO">LicitaÃ§Ã£o / contrato pÃºblico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{salesChannel === 'LOJA_FISICA' ? 'Nome da loja *' : 'Loja / parceiro / vendedor'}</label>
                  <input type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)} required={salesChannel === 'LOJA_FISICA'}
                    placeholder={salesChannel === 'LOJA_FISICA' ? 'Informe a loja onde comprou' : 'IdentificaÃ§Ã£o da origem'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:border-[#145EDB] outline-none" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nota Fiscal</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:border-[#145EDB] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="font-semibold text-slate-700">Data da compra
                  <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg p-2" />
                </label>
                <label className="font-semibold text-slate-700">Data de entrega
                  <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-lg p-2" />
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: PRODUTOS DO CHAMADO */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#10233F]">Itens e Produtos Envolvidos na OcorrÃªncia</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-slate-100 hover:bg-slate-200 text-[#145EDB] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Produto</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#145EDB]">Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Produto *</label>
                        <select
                          value={it.productId}
                          onChange={(e) => {
                            const p = products.find(x => x.id === e.target.value);
                            const copy = [...items];
                            copy[idx].productId = e.target.value;
                            copy[idx].productName = p?.name || '';
                            setItems(copy);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-medium text-slate-900"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.codeSku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Qtd</label>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => {
                              const copy = [...items];
                              copy[idx].quantity = Number(e.target.value);
                              setItems(copy);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">NÂº SÃ©rie</label>
                          <input
                            type="text"
                            placeholder="SN-XXX"
                            value={it.serialNumber}
                            onChange={(e) => {
                              const copy = [...items];
                              copy[idx].serialNumber = e.target.value;
                              setItems(copy);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1">Lote</label>
                          <input
                            type="text"
                            placeholder="L-2026"
                            value={it.lotNumber}
                            onChange={(e) => {
                              const copy = [...items];
                              copy[idx].lotNumber = e.target.value;
                              setItems(copy);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: OCORRÃŠNCIA E REGULATÃ“RIO */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#10233F]">Relato da OcorrÃªncia & ClassificaÃ§Ã£o RegulatÃ³rio</h3>
                
                {/* AI Assistant Button */}
                <button
                  type="button"
                  onClick={handleAIClassify}
                  disabled={isClassifying || description.length < 10}
                  className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>{isClassifying ? 'Classificando com Gemini...' : 'Triagem Inteligente Gemini'}</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Relato Detalhado do Cliente *</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o problema relatado pelo cliente em detalhes (cÃ³digo de erro, avaria, defeito, condiÃ§Ãµes de cirurgia...)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-900 focus:border-[#145EDB] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900"
                  >
                    <option value="AssistÃªncia TÃ©cnica">AssistÃªncia TÃ©cnica</option>
                    <option value="LogÃ­stica / Avaria">LogÃ­stica / Avaria</option>
                    <option value="Qualidade / ValidaÃ§Ã£o">Qualidade / ValidaÃ§Ã£o</option>
                    <option value="Comercial / DevoluÃ§Ã£o">Comercial / DevoluÃ§Ã£o</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subcategoria</label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Prioridade SAC</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                  >
                    <option value="CRITICAL">CrÃ­tica (Risco CirÃºrgico)</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">MÃ©dia</option>
                    <option value="LOW">Baixa</option>
                  </select>
                </div>
              </div>

              {/* Regulatory Risk Checkboxes (ANVISA/LGPD) */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>AvaliaÃ§Ã£o do FarmacÃªutico / Resp. TÃ©cnico (ANVISA)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userRiskFlag}
                      onChange={(e) => setUserRiskFlag(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>PossÃ­vel Risco de Dano ao UsuÃ¡rio/Paciente</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adverseEventFlag}
                      onChange={(e) => setAdverseEventFlag(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>NotificaÃ§Ã£o de Evento Adverso / Queixa TÃ©cnica</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={damageFlag}
                      onChange={(e) => setDamageFlag(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>Avaria FÃ­sica na Embalagem/Produto</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readyForCollection}
                      onChange={(e) => setReadyForCollection(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>Produto DisponÃ­vel para Coleta na Unidade</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          {submitError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">{submitError}</div>}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-lg"
              >
                Voltar
              </button>
            ) : <div></div>}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 bg-[#145EDB] hover:bg-[#0f4bb3] font-bold text-white rounded-lg shadow"
              >
                PrÃ³ximo Passo
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#FF8500] hover:bg-[#e07500] disabled:opacity-60 font-bold text-white rounded-lg shadow-md flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando chamado...' : 'Confirmar & Gerar Protocolo SAC'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

