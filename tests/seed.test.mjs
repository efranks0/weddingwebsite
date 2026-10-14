import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalise, normPhone, toSql, token } from '../scripts/seed.mjs';

test('tokens are 12 unambiguous characters', () => {
  for (let i = 0; i < 200; i++) assert.match(token(), /^[A-HJ-NP-Za-km-z2-9]{12}$/);
});

test('phones normalise to wa.me digits', () => {
  assert.equal(normPhone('+30 690 000 0001', 'x'), '306900000001');
  assert.equal(normPhone('0044 7700 900001', 'x'), '447700900001');
  assert.equal(normPhone('6900000001', 'x'), '306900000001');
  assert.equal(normPhone('', 'x'), null);
});

test('normalise applies defaults and validates', () => {
  const [h] = normalise({ households: [{ key: 'a', name: 'A', side: 'Bride', list: 'zoe', phone: '+30 6900000001', guests: ['Ann'] }] });
  assert.equal(h.side, 'bride');
  assert.equal(h.list, 'Zoe');
  assert.equal(h.warmup, 'none');
  assert.equal(h.ceremony, true);
  assert.equal(h.maxExtra, 0);
  assert.throws(() => normalise({ households: [{ key: 'b', name: 'B', side: 'x', list: 'Zoe', guests: ['B'] }] }), /side/);
  assert.throws(() => normalise({ households: [{ key: 'c', name: 'C', side: 'groom', list: 'Nobody', guests: ['C'] }] }), /list/);
});

test('SQL upserts keep existing tokens and escape quotes', () => {
  const sql = toSql(normalise({ households: [{ key: 'k', name: "O'Brien", side: 'groom', list: 'Family', guests: ["Seán O'Brien"] }] }), () => 'TOKENTOKEN12');
  assert.match(sql, /'O''Brien'/);
  assert.match(sql, /ON CONFLICT\(key\) DO UPDATE SET name = excluded.name/);
  assert.doesNotMatch(sql.split('ON CONFLICT')[1], /token = /);
  assert.match(sql, /'k\/sean-o-brien'/);
});
