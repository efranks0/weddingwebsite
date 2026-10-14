// CSV, one row per person. Columns are meant to paste straight into the
// guest sheet of Emilios_Theodora_Wedding_v2.xlsx.
import { loadAll } from '../../_lib/admin';
import type { Env, EventKey } from '../../_lib/types';

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  // Quote everything; neutralise spreadsheet formula injection.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const yn = (invited: boolean, a: boolean | null) => (!invited ? '' : a == null ? 'Pending' : a ? 'Yes' : 'No');

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { households, rows } = await loadAll(env);
  const byId = new Map(households.map((h) => [h.id, h]));
  const header = ['Household', 'Guest', 'Plus-one', 'Side', 'List', 'Warm-up group', 'Warm-up', 'Ceremony', 'Dinner', 'Dietary / notes', 'Replied at', 'Phone', 'Link'];
  const lines = [header.map(cell).join(',')];
  for (const r of rows) {
    const h = byId.get(r.householdId)!;
    const ev = (e: EventKey) => yn(r.invited[e], r.answer[e]);
    lines.push([
      r.household, r.guest, r.guestId == null ? 'Yes' : '', r.side === 'bride' ? 'Bride' : 'Groom', r.listOwner,
      h.warmup === 'none' ? '' : h.warmup, ev('warmup'), ev('ceremony'), ev('dinner'),
      h.notes, h.respondedAt ?? '', h.phone ?? '', h.link,
    ].map(cell).join(','));
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rsvps-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
