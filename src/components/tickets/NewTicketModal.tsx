import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Sparkles, AlertTriangle, ShieldCheck, Upload, FileText, CheckCircle 
} from 'lucide-react';
import { Customer, Product, Ticket, TicketPriority } from '../../types';
import { apiService } from '../../services/apiService';

interface NewTicketModalProps {
  customers: Customer[];
  products: Product[];
  currentTenantId: string;
  onClose: () => void;
  onTicketCreated: (ticket: Ticket) => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  customers,
  products,
  currentTenantId,
  onClose,
  onTicketCreated
}) => {
  // Step State
  const [step, setStep] = useState<number>(1);
  const [isClassifying, setIsClassifying] = useState<boolean>(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [sellerName, setSellerName] = useState<string>('Fernando Costa');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('NF-88902');
  const [salesChannel, setSalesChannel] = useState<string>('Venda Direta Hospitalar');

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
      productName: products[0]?.name || 'Bisturi Eletrônico',
      quantity: 1,
      serialNumber: '',
      lotNumber: ''
    }
  ]);

  // Occurrence State
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Assistência Técnica');
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
    const customer = customers.find(c => c.id === selectedCustomerId) || customers[0];

    const newTicketData = {
      tenantId: currentTenantId,
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      sellerName,
      invoiceNumber,
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
      createdBy: 'u001',
      createdByName: 'Atendente SAC Procirúrgica',
      attachmentsCount: 1,
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
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-[#0B2343] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Abertura de Novo Chamado SAC</h2>
            <p className="text-xs text-slate-300">Geração automática de protocolo único SAC.2607.XXX</p>
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
            <span>Ocorrência & Regulatório</span>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* STEP 1: CLIENTE E COMERCIAL */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#10233F]">Dados do Cliente & Venda Comercial</h3>
              
              <div>
                <label className="block text-slate-700 font-bold mb-1">Selecione o Cliente / Unidade Médica *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:border-[#145EDB] outline-none"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.document}) - {c.city}/{c.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nota Fiscal</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:border-[#145EDB] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vendedor / Representante</label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:border-[#145EDB] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Canal de Venda</label>
                  <select
                    value={salesChannel}
                    onChange={(e) => setSalesChannel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-900 focus:border-[#145EDB] outline-none"
                  >
                    <option value="Venda Direta Hospitalar">Venda Direta Hospitalar</option>
                    <option value="Loja Física Aldeota">Loja Física Aldeota</option>
                    <option value="Loja Física Recife">Loja Física Recife</option>
                    <option value="E-commerce B2B">E-commerce B2B</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRODUTOS DO CHAMADO */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#10233F]">Itens e Produtos Envolvidos na Ocorrência</h3>
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
                          <label className="block text-slate-600 font-semibold mb-1">Nº Série</label>
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

          {/* STEP 3: OCORRÊNCIA E REGULATÓRIO */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#10233F]">Relato da Ocorrência & Classificação Regulatório</h3>
                
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
                  placeholder="Descreva o problema relatado pelo cliente em detalhes (código de erro, avaria, defeito, condições de cirurgia...)"
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
                    <option value="Assistência Técnica">Assistência Técnica</option>
                    <option value="Logística / Avaria">Logística / Avaria</option>
                    <option value="Qualidade / Validação">Qualidade / Validação</option>
                    <option value="Comercial / Devolução">Comercial / Devolução</option>
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
                    <option value="CRITICAL">Crítica (Risco Cirúrgico)</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Média</option>
                    <option value="LOW">Baixa</option>
                  </select>
                </div>
              </div>

              {/* Regulatory Risk Checkboxes (ANVISA/LGPD) */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Avaliação do Farmacêutico / Resp. Técnico (ANVISA)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userRiskFlag}
                      onChange={(e) => setUserRiskFlag(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>Possível Risco de Dano ao Usuário/Paciente</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adverseEventFlag}
                      onChange={(e) => setAdverseEventFlag(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>Notificação de Evento Adverso / Queixa Técnica</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={damageFlag}
                      onChange={(e) => setDamageFlag(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>Avaria Física na Embalagem/Produto</span>
                  </label>

                  <label className="flex items-center space-x-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={readyForCollection}
                      onChange={(e) => setReadyForCollection(e.target.checked)}
                      className="rounded text-[#145EDB] focus:ring-0"
                    />
                    <span>Produto Disponível para Coleta na Unidade</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
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
                Próximo Passo
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#FF8500] hover:bg-[#e07500] font-bold text-white rounded-lg shadow-md flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar & Gerar Protocolo SAC</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
