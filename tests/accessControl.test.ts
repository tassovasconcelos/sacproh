import assert from 'node:assert/strict';
import test from 'node:test';
import { canCreateTicket, canOperateTicket, normalizedScope } from '../src/security/accessControl';

test('gerente abre e acompanha somente os próprios SACs por padrão', () => {
  assert.equal(canCreateTicket('GERENTE_LOJA'), true);
  assert.equal(canOperateTicket('GERENTE_LOJA'), false);
  assert.equal(normalizedScope('GERENTE_LOJA', 'TENANT'), 'OWN');
});

test('SAC pode abrir e operar chamados', () => {
  assert.equal(canCreateTicket('SAC'), true);
  assert.equal(canOperateTicket('SAC'), true);
});
