import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessAdmin,canCreateTicket,canOperateTicket,canWriteTechnical,normalizedScope,operationalViewsByRole } from '../src/security/accessControl';

test('gerente abre e acompanha SAC sem operações privilegiadas',()=>{
  assert.equal(canCreateTicket('GERENTE_LOJA'),true);
  assert.equal(canOperateTicket('GERENTE_LOJA'),false);
  assert.equal(canWriteTechnical('GERENTE_LOJA'),false);
  assert.equal(canAccessAdmin('GERENTE_LOJA'),false);
  assert.deepEqual(operationalViewsByRole.GERENTE_LOJA,['tickets','knowledge']);
  assert.equal(normalizedScope('GERENTE_LOJA','TENANT'),'OWN');
});

test('técnico acessa somente chamados, técnica e conhecimento',()=>{
  assert.deepEqual(operationalViewsByRole.TECNICO,['tickets','technical','knowledge']);
  assert.equal(canCreateTicket('TECNICO'),false);
  assert.equal(canWriteTechnical('TECNICO'),true);
});

test('logística não recebe acesso técnico ou administrativo',()=>{
  assert.deepEqual(operationalViewsByRole.LOGISTICA,['tickets','logistics','knowledge']);
  assert.equal(canWriteTechnical('LOGISTICA'),false);
  assert.equal(canAccessAdmin('LOGISTICA'),false);
});

test('SAC pode abrir e operar chamados sem administrar usuários',()=>{
  assert.equal(canCreateTicket('SAC'),true);
  assert.equal(canOperateTicket('SAC'),true);
  assert.equal(canAccessAdmin('SAC'),false);
});
