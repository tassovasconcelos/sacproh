import { UserAccessScope, UserRole } from '../types';

export type OperationalView='dashboard'|'tickets'|'quality'|'technical'|'logistics'|'knowledge'|'reports';

export const operationalViewsByRole:Record<UserRole,OperationalView[]>={
  SUPERADMIN:['dashboard','tickets','quality','technical','logistics','knowledge','reports'],
  ADMIN_EMPRESA:['dashboard','tickets','quality','technical','logistics','knowledge','reports'],
  DIRETORIA:['dashboard','tickets','quality','technical','logistics','knowledge','reports'],
  RESPONSAVEL_TECNICA:['dashboard','tickets','quality','technical','knowledge','reports'],
  TECNICO:['tickets','technical','knowledge'],GERENTE_LOJA:['tickets','knowledge'],
  SAC:['dashboard','tickets','knowledge','reports'],LOGISTICA:['tickets','logistics','knowledge']
};

export const canCreateTicket=(role:UserRole)=>['SUPERADMIN','ADMIN_EMPRESA','GERENTE_LOJA','SAC'].includes(role);
export const canOperateTicket=(role:UserRole)=>['SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','SAC'].includes(role);
export const canWriteTechnical=(role:UserRole)=>['SUPERADMIN','ADMIN_EMPRESA','RESPONSAVEL_TECNICA','TECNICO'].includes(role);
export const canAccessAdmin=(role:UserRole)=>['SUPERADMIN','ADMIN_EMPRESA','DIRETORIA','RESPONSAVEL_TECNICA'].includes(role);
export const normalizedScope=(role:UserRole,scope?:UserAccessScope):UserAccessScope=>role==='GERENTE_LOJA'&&scope==='TENANT'?'OWN':scope||(role==='GERENTE_LOJA'?'OWN':'TENANT');
