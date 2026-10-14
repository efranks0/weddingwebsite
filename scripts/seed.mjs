#!/usr/bin/env node
// Turns a guest list into SQL for D1.
//
//   node scripts/seed.mjs data/guests.json            → writes data/seed.sql
//   wrangler d1 execute wedding --remote --file data/seed.sql
//
// Input: .json (see data/guests.sample.json) or .csv with one row per guest:
//   household_key,household_name,guest_name,side,list,phone,warmup,ceremony,dinner,max_extra
// (household-level columns only need filling on the household's first row).
//
// Safe to re-run: households/guests are upserted on `key`, so personal-link
// tokens and existing RSVPs survive. Anyone missing from the new file is
// deactivated (link stops working, hidden from admin), not deleted.
import { randomInt } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [input = 'data/guests.sample.json', output = 'data/seed.sql'] = process.argv.slice(2);
const LISTS = ['Zoe', 'Athena & Costas', 'Family', 'Couple'];
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // no 0/O/1/l/I

export function token() {
  let t = '';
  for (let i = 0; i < 12; i++) t += ALPHABET[randomInt(ALPHABET.length)];
  return t;
}

const warnings = [];
const warn = (m) => warnings.push(m);

export function normPhone(raw, who) {
  if (!raw) return null;
  let s = String(raw).trim();
  const intl = s.startsWith('+') || s.startsWith('00');
  s = s.replace(/\D/g, '').replace(/^00/, '');
  if (!intl) {
    if (/^69\d{8}$/.test(s)) s = '30' + s; // Greek mobile without country code
    else warn(`${who}: phone "${raw}" has no country code; check it`);
  }
  if (s.length < 9 || s.length > 15) warn(`${who}: phone "${raw}" looks wrong`);
  return s;
}

const bool = (v, dflt) => (v === undefined || v === '' || v === null ? dflt : /^(1|true|yes|y|x)$/i.test(String(v).trim()));
const normSide = (v, who) => {
  const s = String(v || '').trim().toLowerCase();
  if (s.startsWith('b')) return 'bride';
  if (s.startsWith('g')) return 'groom';
  throw new Error(`${who}: side must be Bride or Groom, got "${v}"`);
};
const normWarmup = (v) => {
  const s = String(v || '').trim().toLowerCase();
  if (!s || s === 'none' || s === 'no') return 'none';
  if (s.startsWith('e')) return 'emilios';
  if (s.startsWith('t')) return 'theo';
  throw new Error(`warm-up must be none, emilios or theo, got "${v}"`);
};
const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

function fromCsv(text) {
  const byKey = new Map();
  for (const r of parseCsv(text.replace(/^﻿/, ''))) {
    const key = r.household_key;
    if (!key) throw new Error(`Row for "${r.guest_name}" has no household_key`);
    let h = byKey.get(key);
    if (!h) byKey.set(key, (h = { key, guests: [] }));
    for (const [col, prop] of [['household_name', 'name'], ['side', 'side'], ['list', 'list'], ['phone', 'phone'], ['warmup', 'warmup'], ['ceremony', 'ceremony'], ['dinner', 'dinner'], ['max_extra', 'max_extra']]) {
      if (r[col] && h[prop] === undefined) h[prop] = r[col];
    }
    if (r.guest_name) h.guests.push(r.guest_name);
  }
  return { households: [...byKey.values()] };
}

export function normalise(data) {
  const seenGuest = new Map();
  const seenPhone = new Map();
  const keys = new Set();
  return data.households.map((h, i) => {
    const who = h.name || h.key || `household #${i + 1}`;
    if (!h.key) throw new Error(`${who}: missing key`);
    if (keys.has(h.key)) throw new Error(`Duplicate household key ${h.key}`);
    keys.add(h.key);
    if (!h.name) throw new Error(`${h.key}: missing name`);
    const list = LISTS.find((l) => l.toLowerCase() === String(h.list || '').trim().toLowerCase());
    if (!list) throw new Error(`${who}: list must be one of ${LISTS.join(' / ')}, got "${h.list}"`);
    const guests = (h.guests || []).map((g, j) => {
      const name = (typeof g === 'string' ? g : g.name).trim();
      const key = (typeof g === 'object' && g.key) || `${h.key}/${slug(name)}`;
      const prev = seenGuest.get(name.toLowerCase());
      if (prev) warn(`Possible duplicate guest "${name}" in ${prev} and ${h.key}`);
      seenGuest.set(name.toLowerCase(), h.key);
      return { key, name, sort: j };
    });
    if (!guests.length) throw new Error(`${who}: no guests`);
    const phone = normPhone(h.phone, who);
    if (!phone) warn(`${who}: no phone number`);
    if (phone && seenPhone.has(phone)) warn(`Same phone for ${seenPhone.get(phone)} and ${h.key}`);
    if (phone) seenPhone.set(phone, h.key);
    const maxExtra = Number(h.max_extra ?? 0);
    if (!Number.isInteger(maxExtra) || maxExtra < 0 || maxExtra > 5) throw new Error(`${who}: max_extra must be 0–5`);
    return {
      key: h.key, name: h.name.trim(), side: normSide(h.side, who), list, phone,
      warmup: normWarmup(h.warmup), ceremony: bool(h.ceremony, true), dinner: bool(h.dinner, true), maxExtra, guests,
    };
  });
}

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

export function toSql(households, makeToken = token) {
  const out = [
    '-- Generated by scripts/seed.mjs. Do not commit (contains guest data).',
    'UPDATE households SET active = 0;',
    'UPDATE guests SET active = 0;',
  ];
  for (const h of households) {
    out.push(
      `INSERT INTO households (key, token, name, side, list_owner, phone, warmup, ceremony, dinner, max_extra, active) VALUES (` +
      [h.key, makeToken(), h.name, h.side, h.list, h.phone, h.warmup, h.ceremony ? 1 : 0, h.dinner ? 1 : 0, h.maxExtra, 1].map(q).join(', ') +
      `) ON CONFLICT(key) DO UPDATE SET name = excluded.name, side = excluded.side, list_owner = excluded.list_owner, phone = excluded.phone, ` +
      `warmup = excluded.warmup, ceremony = excluded.ceremony, dinner = excluded.dinner, max_extra = excluded.max_extra, active = 1;`,
    );
    for (const g of h.guests) {
      out.push(
        `INSERT INTO guests (household_id, key, name, sort, active) VALUES ((SELECT id FROM households WHERE key = ${q(h.key)}), ${q(g.key)}, ${q(g.name)}, ${g.sort}, 1) ` +
        `ON CONFLICT(key) DO UPDATE SET household_id = excluded.household_id, name = excluded.name, sort = excluded.sort, active = 1;`,
      );
    }
  }
  return out.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const text = readFileSync(input, 'utf8');
    const data = input.endsWith('.csv') ? fromCsv(text) : JSON.parse(text);
    const households = normalise(data);
    writeFileSync(output, toSql(households));
    const guests = households.reduce((n, h) => n + h.guests.length, 0);
    console.log(`${households.length} households, ${guests} guests → ${output}`);
    for (const w of warnings) console.warn(`warning: ${w}`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
