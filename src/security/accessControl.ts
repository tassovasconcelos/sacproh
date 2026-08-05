import { UserAccessScope, UserRole } from '../types';

export const canCreateTicket = (role: UserRole) =>
  ['SUPERADMIN','ADMIN_EMPRESA','GERENTE_LOJA','SAC'].includes(role);

export const canOperateTicket = (role: UserRole) =>
  ['SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','SAC'].includes(role);

export const normalizedScope = (role: UserRole, scope?: UserAccessScope): UserAccessScope =>
  role === 'GERENTE_LOJA' && scope === 'TENANT' ? 'OWN' : scope || (role === 'GERENTE_LOJA' ? 'OWN' : 'TENANT');
