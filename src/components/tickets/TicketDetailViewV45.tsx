import React from 'react';
import type { ServiceOrder, Ticket, TicketStatus, UserProfile, UserRole } from '../../types';
import { ProductMasterEditor } from '../products/ProductMasterEditor';
import { TicketDetailView as TicketDetailViewV44 } from './TicketDetailViewV44';

interface Props {
  ticket: Ticket;
  currentUser: UserProfile;
  userRole: UserRole;
  users: UserProfile[];
  onBack: () => void;
  onUpdateStatus: (ticketId: string, newStatus: TicketStatus, notes: string) => void;
  onDispatch: (ticketId: string, assignedArea: string, assignedToId?: string, assignedToName?: string, notes?: string) => void;
  onCreateOS: (osData: Omit<ServiceOrder, 'id' | 'osNumber' | 'openedAt'>) => void;
  onUpdateTicket: (ticket: Ticket, changes: Partial<Ticket>) => Promise<void>;
  onDeleteTicket: (ticket: Ticket, reason: string) => Promise<void>;
}

export const TicketDetailView:React.FC<Props>=(props)=><div className="space-y-5">
  <ProductMasterEditor ticket={props.ticket} currentUser={props.currentUser}/>
  <TicketDetailViewV44 {...props}/>
</div>;
