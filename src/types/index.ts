export type UserRole = 
  | 'SUPERADMIN' 
  | 'DIRETORIA' 
  | 'RESPONSAVEL_TECNICA' 
  | 'TECNICO' 
  | 'GERENTE_LOJA' 
  | 'SAC' 
  | 'LOGISTICA' 
  | 'ADMIN_EMPRESA';

export interface Tenant {
  id: string;
  name: string;
  tradeName?: string;
  document: string;
  isActive: boolean;
}

export interface Unit {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  city: string;
  state: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  unitId?: string;
  fullName: string;
  email: string;
  phone?: string;
  roleCode: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  lastAccessAt?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  type: 'PF' | 'PJ' | 'CLINIC' | 'HOSPITAL';
  name: string;
  tradeName?: string;
  document: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  address?: string;
  lgpdConsent: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  codeSku: string;
  name: string;
  familyId?: string;
  familyName?: string;
  model?: string;
  anvisaRegister?: string;
  supplierName?: string;
  countryOrigin?: string;
}

export type TicketStatus = 
  | 'NEW' 
  | 'TRIAGE' 
  | 'WAITING_DOCS' 
  | 'TECHNICAL_ANALYSIS' 
  | 'SENT_TO_TECHNICAL' 
  | 'SENT_TO_LOGISTICS' 
  | 'WAITING_SUPPLIER' 
  | 'WAITING_CARRIER' 
  | 'WAITING_CUSTOMER' 
  | 'CORRECTIVE_ACTION' 
  | 'SOLUTION_PROPOSED' 
  | 'WAITING_CONFIRMATION' 
  | 'CLOSED_PROCEDENT' 
  | 'CLOSED_NON_PROCEDENT' 
  | 'CANCELLED' 
  | 'REOPENED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TicketItem {
  id: string;
  ticketId: string;
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  serialNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
  anvisaRegister?: string;
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  previousStatus?: TicketStatus;
  newStatus: TicketStatus;
  changedBy: string;
  changedByName: string;
  notes?: string;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  isInternal: boolean;
  content: string;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  tenantId: string;
  protocol: string; // e.g. SAC.2607.001
  unitId?: string;
  unitName?: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  
  // Commercial
  sellerName?: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  deliveryDate?: string;
  salesChannel?: string;
  
  // Occurrence
  description: string;
  category: string;
  subcategory?: string;
  classification?: string;
  priority: TicketPriority;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  initialProcedency: 'PROCEDENT' | 'NON_PROCEDENT' | 'UNDETERMINED';
  
  // Risk & Regulatory
  userRiskFlag: boolean;
  adverseEventFlag: boolean;
  damageFlag: boolean;
  readyForCollection: boolean;
  
  // Status
  status: TicketStatus;
  assignedTo?: string;
  assignedToName?: string;
  assignedArea?: string;
  
  // SLA
  slaDueAt?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Final Resolution
  finalOpinion?: string;
  finalProcedency?: 'PROCEDENT' | 'NON_PROCEDENT' | 'CANCELLED';
  
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  
  // Embedded
  items: TicketItem[];
  commentsCount?: number;
  attachmentsCount?: number;
}

export interface QualityActionPlan {
  id: string;
  ticketId?: string;
  protocol?: string;
  title: string;
  rootCause: string;
  whatAction: string;
  whyReason: string;
  whereLocation: string;
  whenDeadline: string;
  whoResponsible: string;
  howMethod: string;
  howMuchCost: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}

export interface TechnicalCase {
  id: string;
  ticketId: string;
  subprotocol: string; // SAC.2607.001-AT01
  technicianId?: string;
  technicianName?: string;
  diagnosticReport: string;
  replacedParts?: string;
  visitDate?: string;
  status: 'IN_ANALYSIS' | 'WAITING_PARTS' | 'VISIT_SCHEDULED' | 'CONCLUDED';
  cost: number;
}

export interface LogisticsCase {
  id: string;
  ticketId: string;
  subprotocol: string; // SAC.2607.001-LOG01
  carrierName: string;
  trackingCode?: string;
  type: 'COLLECTION' | 'RETURN' | 'SHIPMENT';
  freightCost: number;
  scheduledDate?: string;
  completedDate?: string;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COLLECTED' | 'DELIVERED' | 'FAILED';
}

export interface SatisfactionSurvey {
  ticketId: string;
  npsScore: number;
  satisfactionLevel: 'VERY_SATISFIED' | 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED';
  speedRating: number;
  comments?: string;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  tenantId?: string;
  unitId?: string;
  categoryId?: string;
  priority?: string;
  status?: string;
}

export interface GeminiClassificationResult {
  suggested_category: string;
  suggested_subcategory: string;
  suggested_priority: TicketPriority;
  suggested_severity: string;
  summary: string;
  possible_root_causes: string[];
  missing_information: string[];
  confidence: number;
}

export interface ServiceOrder {
  id: string;
  osNumber: string; // e.g. OS-2026-001
  ticketId: string;
  protocol: string;
  customerName: string;
  equipmentName: string;
  serialNumber?: string;
  lotNumber?: string;
  technicianId: string;
  technicianName: string;
  serviceType: 'CORRECTIVE_MAINTENANCE' | 'PREVENTIVE_MAINTENANCE' | 'CALIBRATION' | 'INSTALLATION';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  diagnostic: string;
  partsReplaced?: string;
  estimatedCost: number;
  status: 'OPEN' | 'IN_ATTENDANCE' | 'WAITING_PARTS' | 'TESTING' | 'COMPLETED' | 'CANCELLED';
  openedAt: string;
  closedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  createdAt: string;
}
