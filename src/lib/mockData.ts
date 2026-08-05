import { 
  Tenant, Unit, UserProfile, Customer, Product, Ticket, QualityActionPlan, TechnicalCase, LogisticsCase, AuditLog, ServiceOrder 
} from '../types';

export const mockTenants: Tenant[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'HEALTH CLEAN COMERCIAL LTDA',
    tradeName: 'Procirúrgica',
    document: '48.196.341/0001-00',
    isActive: true,
  }
];

export const mockUnits: Unit[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'MATRIZ-SC',
    name: 'Health Clean Matriz — Itajaí',
    city: 'Itajaí',
    state: 'SC'
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'FILIAL-CE',
    name: 'Health Clean Filial — Fortaleza',
    city: 'Fortaleza',
    state: 'CE'
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    tenantId: '11111111-1111-1111-1111-111111111111',
    code: 'FILIAL-SP',
    name: 'Health Clean Filial — Itapevi',
    city: 'Itapevi',
    state: 'SP'
  }
];

export const mockUsers: UserProfile[] = [
  {
    id: 'u001',
    tenantId: '11111111-1111-1111-1111-111111111111',
    unitId: 'a1111111-1111-1111-1111-111111111111',
    fullName: 'Dra. Patricia Lima',
    email: 'patricia.lima@procirurgica.com.br',
    phone: '(85) 99123-4567',
    roleCode: 'RESPONSAVEL_TECNICA',
    accessScope: 'TENANT',
    isActive: true
  },
  {
    id: 'u002',
    tenantId: '11111111-1111-1111-1111-111111111111',
    unitId: 'a1111111-1111-1111-1111-111111111111',
    fullName: 'Eng. Carlos Eduardo',
    email: 'carlos.eduardo@procirurgica.com.br',
    phone: '(85) 98877-6655',
    roleCode: 'TECNICO',
    accessScope: 'TENANT',
    isActive: true
  },
  {
    id: 'u003',
    tenantId: '11111111-1111-1111-1111-111111111111',
    unitId: 'a2222222-2222-2222-2222-222222222222',
    fullName: 'Mariana Vasconcelos',
    email: 'mariana.v@procirurgica.com.br',
    phone: '(85) 99911-2233',
    roleCode: 'SAC',
    accessScope: 'TENANT',
    isActive: true
  },
  {
    id: 'u004',
    tenantId: '11111111-1111-1111-1111-111111111111',
    unitId: 'a1111111-1111-1111-1111-111111111111',
    fullName: 'Diretor Roberto Albuquerque',
    email: 'roberto@procirurgica.com.br',
    phone: '(85) 3333-4444',
    roleCode: 'DIRETORIA',
    accessScope: 'TENANT',
    isActive: true
  },
  {
    id: 'u005',
    tenantId: '11111111-1111-1111-1111-111111111111',
    unitId: 'a1111111-1111-1111-1111-111111111111',
    fullName: 'Administrador GRIT Global',
    email: 'admin@grit.com.br',
    phone: '(11) 98888-0000',
    roleCode: 'SUPERADMIN',
    accessScope: 'TENANT',
    isActive: true
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    tenantId: '11111111-1111-1111-1111-111111111111',
    type: 'HOSPITAL',
    name: 'Hospital São Mateus Ltda',
    tradeName: 'Hospital São Mateus',
    document: '07.123.456/0001-88',
    email: 'sac@saomateus.com.br',
    phone: '(85) 3456-7890',
    whatsapp: '(85) 99876-5432',
    city: 'Fortaleza',
    state: 'CE',
    address: 'Av. Santos Dumont, 5700 - Papicu',
    lgpdConsent: true
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    tenantId: '11111111-1111-1111-1111-111111111111',
    type: 'CLINIC',
    name: 'Clínica Cirúrgica Monte Sina',
    tradeName: 'Clínica Monte Sina',
    document: '14.987.654/0001-22',
    email: 'compras@montesina.com',
    phone: '(81) 3222-1100',
    whatsapp: '(81) 98888-2211',
    city: 'Recife',
    state: 'PE',
    address: 'Rua do Espinheiro, 420',
    lgpdConsent: true
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    tenantId: '11111111-1111-1111-1111-111111111111',
    type: 'PF',
    name: 'Dr. Roberto Vasconcelos',
    tradeName: 'Dr. Roberto',
    document: '123.456.789-00',
    email: 'dr.roberto@gmail.com',
    phone: '(85) 98765-4321',
    whatsapp: '(85) 98765-4321',
    city: 'Fortaleza',
    state: 'CE',
    address: 'Rua Leonardo Mota, 1100',
    lgpdConsent: true
  }
];

export const mockProducts: Product[] = [
  {
    id: 'p1111111-1111-1111-1111-111111111111',
    tenantId: '11111111-1111-1111-1111-111111111111',
    codeSku: 'PRO10000',
    name: 'Cadeira de rodas',
    familyName: 'Mobilidade e Locomoção',
    model: 'PRO10000',
    supplierName: 'Procirúrgica'
  },
  {
    id: 'p2222222-2222-2222-2222-222222222222',
    tenantId: '11111111-1111-1111-1111-111111111111',
    codeSku: 'CATETER-NELATON',
    name: 'Cateter uretral hidrofílico',
    familyName: 'Urologia',
    model: 'Nelaton',
    supplierName: 'Procirúrgica'
  },
  {
    id: 'p3333333-3333-3333-3333-333333333333',
    tenantId: '11111111-1111-1111-1111-111111111111',
    codeSku: 'CPAP-AUTO',
    name: 'CPAP automático',
    familyName: 'Terapia Respiratória',
    model: 'CPAP/APAP 4–20 cmH₂O',
    supplierName: 'Procirúrgica'
  }
];

export const mockTickets: Ticket[] = [
  {
    id: 't001',
    tenantId: '11111111-1111-1111-1111-111111111111',
    protocol: 'SAC.2607.001',
    unitId: 'a1111111-1111-1111-1111-111111111111',
    unitName: 'Procirúrgica Matriz Fortaleza',
    customerId: 'c1111111-1111-1111-1111-111111111111',
    customerName: 'Hospital São Mateus Ltda',
    customerDocument: '07.123.456/0001-88',
    sellerName: 'Fernando Costa',
    invoiceNumber: 'NF-88421',
    purchaseDate: '2026-06-15',
    deliveryDate: '2026-06-18',
    salesChannel: 'Venda Direta Hospitalar',
    description: 'Equipamento apresentando código de erro E-04 no visor digital durante procedimento cirúrgico. Cabo de caneta apresentando mau contato esporádico no conector frontal.',
    category: 'Assistência Técnica',
    subcategory: 'Falha de Funcionamento / Placa Eletrônica',
    classification: 'Defeito Funcional de Fabricação',
    priority: 'CRITICAL',
    urgency: 'HIGH',
    impact: 'HIGH',
    initialProcedency: 'PROCEDENT',
    userRiskFlag: true,
    adverseEventFlag: false,
    damageFlag: false,
    readyForCollection: true,
    status: 'TECHNICAL_ANALYSIS',
    assignedTo: 'u002',
    assignedToName: 'Eng. Carlos Eduardo',
    assignedArea: 'Assistência Técnica',
    slaDueAt: '2026-07-30T18:00:00.000Z',
    firstResponseAt: '2026-07-28T10:15:00.000Z',
    createdBy: 'u003',
    createdByName: 'Mariana Vasconcelos',
    createdAt: '2026-07-28T09:30:00.000Z',
    updatedAt: '2026-07-29T08:00:00.000Z',
    commentsCount: 3,
    attachmentsCount: 2,
    items: [
      {
        id: 'ti001',
        ticketId: 't001',
        productId: 'p1111111-1111-1111-1111-111111111111',
        productName: 'Bisturi Eletrônico Alta Frequência HF-400W',
        sku: 'BIST-ELECT-01',
        quantity: 1,
        serialNumber: 'SN-400W-2026-88',
        lotNumber: 'LOTE-202604',
        expirationDate: '2031-04-30',
        anvisaRegister: '10234567890'
      }
    ]
  },
  {
    id: 't002',
    tenantId: '11111111-1111-1111-1111-111111111111',
    protocol: 'SAC.2607.002',
    unitId: 'a2222222-2222-2222-2222-222222222222',
    unitName: 'Procirúrgica Aldeota',
    customerId: 'c2222222-2222-2222-2222-222222222222',
    customerName: 'Clínica Cirúrgica Monte Sina',
    customerDocument: '14.987.654/0001-22',
    sellerName: 'Juliana Mendes',
    invoiceNumber: 'NF-89012',
    purchaseDate: '2026-07-02',
    deliveryDate: '2026-07-05',
    salesChannel: 'Loja Física Recife',
    description: 'Caixas de luvas cirúrgicas estéreis chegaram com embalagem secundária amassada e rasgada na lateral devido ao transporte. Produto não violado, mas estanqueidade comprometida.',
    category: 'Logística / Avaria',
    subcategory: 'Avaria em Transporte',
    classification: 'Avaria na Embalagem',
    priority: 'MEDIUM',
    urgency: 'MEDIUM',
    impact: 'MEDIUM',
    initialProcedency: 'PROCEDENT',
    userRiskFlag: false,
    adverseEventFlag: false,
    damageFlag: true,
    readyForCollection: true,
    status: 'SENT_TO_LOGISTICS',
    assignedTo: 'u001',
    assignedToName: 'Dra. Patricia Lima',
    assignedArea: 'Qualidade & Logística',
    slaDueAt: '2026-08-01T12:00:00.000Z',
    firstResponseAt: '2026-07-27T14:20:00.000Z',
    createdBy: 'u003',
    createdByName: 'Mariana Vasconcelos',
    createdAt: '2026-07-27T11:00:00.000Z',
    updatedAt: '2026-07-28T16:45:00.000Z',
    commentsCount: 2,
    attachmentsCount: 4,
    items: [
      {
        id: 'ti002',
        ticketId: 't002',
        productId: 'p3333333-3333-3333-3333-333333333333',
        productName: 'Luva Cirúrgica Estéril Par Tam 8.0 (Caixa 50 pares)',
        sku: 'LUVA-STER-80',
        quantity: 10,
        lotNumber: 'L-88229',
        expirationDate: '2029-12-31',
        anvisaRegister: '10112233445'
      }
    ]
  },
  {
    id: 't003',
    tenantId: '11111111-1111-1111-1111-111111111111',
    protocol: 'SAC.2607.003',
    unitId: 'a1111111-1111-1111-1111-111111111111',
    unitName: 'Procirúrgica Matriz Fortaleza',
    customerId: 'c3333333-3333-3333-3333-333333333333',
    customerName: 'Dr. Roberto Vasconcelos',
    customerDocument: '123.456.789-00',
    sellerName: 'Fernando Costa',
    invoiceNumber: 'NF-87110',
    purchaseDate: '2026-05-10',
    deliveryDate: '2026-05-12',
    salesChannel: 'E-commerce B2B',
    description: 'Monitor multiparamétrico apresentando instabilidade de sinal ECG ao conectar eletrodos de sucção. Aparelho liga perfeitamente.',
    category: 'Assistência Técnica',
    subcategory: 'Calibração / Cabo de ECG',
    classification: 'Substituição de Acessório',
    priority: 'LOW',
    urgency: 'LOW',
    impact: 'LOW',
    initialProcedency: 'PROCEDENT',
    userRiskFlag: false,
    adverseEventFlag: false,
    damageFlag: false,
    readyForCollection: false,
    status: 'CLOSED_PROCEDENT',
    assignedTo: 'u002',
    assignedToName: 'Eng. Carlos Eduardo',
    assignedArea: 'Assistência Técnica',
    slaDueAt: '2026-07-25T18:00:00.000Z',
    firstResponseAt: '2026-07-20T09:00:00.000Z',
    resolvedAt: '2026-07-22T15:30:00.000Z',
    closedAt: '2026-07-23T10:00:00.000Z',
    finalOpinion: 'Realizada substituição do cabo paciente de ECG de 5 vias sob garantia. Equipamento testado e calibrado com emissão de laudo técnico de conformidade.',
    finalProcedency: 'PROCEDENT',
    createdBy: 'u003',
    createdByName: 'Mariana Vasconcelos',
    createdAt: '2026-07-19T16:00:00.000Z',
    updatedAt: '2026-07-23T10:00:00.000Z',
    commentsCount: 5,
    attachmentsCount: 1,
    items: [
      {
        id: 'ti003',
        ticketId: 't003',
        productId: 'p2222222-2222-2222-2222-222222222222',
        productName: 'Monitor Multiparamétrico Vitals Touch V-12',
        sku: 'MONIT-PARAM-02',
        quantity: 1,
        serialNumber: 'MN-V12-9931',
        lotNumber: 'L-202601',
        anvisaRegister: '80123456789'
      }
    ]
  }
];

export const mockQualityPlans: QualityActionPlan[] = [
  {
    id: 'q001',
    ticketId: 't001',
    protocol: 'SAC.2607.001',
    title: 'Ação Corretiva: Falha de Solda do Conector Frontal HF-400W',
    rootCause: 'Solda fria identificada na placa mãe da série 202604 do fornecedor Wem.',
    whatAction: 'Substituição completa do módulo conector e alinhamento com fornecedor sobre controle de qualidade de lote.',
    whyReason: 'Garantir estabilidade de alta frequência e prevenir acidentes cirúrgicos em hospitais clientes.',
    whereLocation: 'Laboratório de Assistência Técnica Procirúrgica Fortaleza',
    whenDeadline: '2026-08-05',
    whoResponsible: 'Dra. Patricia Lima & Eng. Carlos Eduardo',
    howMethod: 'Envio de laudo ao fabricante e inspeção preditiva de 100% dos lotes estocados.',
    howMuchCost: 1250.00,
    status: 'IN_PROGRESS'
  },
  {
    id: 'q002',
    ticketId: 't002',
    protocol: 'SAC.2607.002',
    title: 'Ação Preventiva: Reforço de Embalagem para Transporte Terrestre',
    rootCause: 'Falta de cantoneiras de proteção nas caixas mestre em fretes de longa distância.',
    whatAction: 'Exigir paletização com filme stretch e cantoneiras de papelão rígido em todas as coletas da transportadora.',
    whyReason: 'Evitar avarias físicas nas caixas de luvas cirúrgicas estéreis.',
    whereLocation: 'Centro de Distribuição Procirúrgica',
    whenDeadline: '2026-08-10',
    whoResponsible: 'Gestor de Logística & Transportadora TransNordeste',
    howMethod: 'Auditoria visual de despacho no CD.',
    howMuchCost: 350.00,
    status: 'PENDING'
  }
];

export const mockTechnicalCases: TechnicalCase[] = [
  {
    id: 'tc001',
    ticketId: 't001',
    subprotocol: 'SAC.2607.001-AT01',
    technicianId: 'u002',
    technicianName: 'Eng. Carlos Eduardo',
    diagnosticReport: 'Diagnóstico técnico realizado em bancada. Constatado erro E-04 proveniente de oxidação nos pinos do conector da caneta monopolar. Necessária troca da placa da interface frontal.',
    replacedParts: 'Placa Interface Frontal HF-400W (SKU: PLC-FR-WEM)',
    visitDate: '2026-07-29T10:00:00.000Z',
    status: 'IN_ANALYSIS',
    cost: 850.00
  }
];

export const mockLogisticsCases: LogisticsCase[] = [
  {
    id: 'lc001',
    ticketId: 't002',
    subprotocol: 'SAC.2607.002-LOG01',
    carrierName: 'TransNordeste Cargas Rápidas',
    trackingCode: 'TN-883921-CE',
    type: 'COLLECTION',
    freightCost: 180.00,
    scheduledDate: '2026-07-30',
    status: 'SCHEDULED'
  }
];

export const mockServiceOrders: ServiceOrder[] = [
  {
    id: 'os001',
    osNumber: 'OS-2026-0001',
    ticketId: 't001',
    protocol: 'SAC.2607.001',
    customerName: 'Hospital São Mateus Ltda',
    equipmentName: 'Bisturi Eletrônico Alta Frequência HF-400W',
    serialNumber: 'SN-400W-2026-88',
    lotNumber: 'LOTE-202604',
    technicianId: 'u002',
    technicianName: 'Eng. Carlos Eduardo',
    serviceType: 'CORRECTIVE_MAINTENANCE',
    urgency: 'CRITICAL',
    diagnostic: 'Aparelho com oscilação na saída monopolar e erro E-04. Necessário reparo em bancada e substituição de placa de alta voltagem.',
    partsReplaced: 'Placa Interface Frontal HF-400W (SKU: PLC-FR-WEM)',
    estimatedCost: 850.00,
    status: 'IN_ATTENDANCE',
    openedAt: '2026-07-28T10:30:00.000Z'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'al001',
    userId: 'u003',
    userEmail: 'mariana.v@procirurgica.com.br',
    action: 'TICKET_CREATED',
    entity: 'TICKET',
    entityId: 't001',
    details: 'Abertura do chamado SAC.2607.001 para o cliente Hospital São Mateus Ltda com 1 item (Bisturi Eletrônico).',
    createdAt: '2026-07-28T09:30:00.000Z'
  },
  {
    id: 'al002',
    userId: 'u001',
    userEmail: 'patricia.lima@procirurgica.com.br',
    action: 'STATUS_CHANGED',
    entity: 'TICKET',
    entityId: 't001',
    details: 'Status alterado de EM TRIAGEM para EM ANÁLISE TÉCNICA. Risco ao usuário assinalado como SIM.',
    createdAt: '2026-07-28T10:15:00.000Z'
  }
];
