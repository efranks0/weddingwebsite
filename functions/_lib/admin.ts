import { eventsFor } from './db';
import type { Env, EventKey, Household } from './types';
import { EVENTS } from './types';

// Placeholders: {name} = household greeting, {link} = their personal link.
export const DEFAULT_TEMPLATES = {
  send_template:
    'Dear {name},\n\nEmilios and Theodora are finally getting married! Here is your personal invitation, where you can also RSVP:\n{link}\n\nWith love,\nEmilios & Theodora',
  reminder_template:
    'Hi {name}! A gentle reminder to RSVP for our wedding before mid-December. It only takes a minute:\n{link}\n\nEmilios & Theodora',
};
export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

export interface AdminGuestRow {
  householdId: number;
  household: string;
  guestId: number | null;   // null = plus-one slot
  guest: string;
  side: string;
  listOwner: string;
  invited: Record<EventKey, boolean>;
  answer: Record<EventKey, boolean | null>; // null = no reply yet
}

/** One flat load of everything; the dataset is a few hundred rows at most. */
export async function loadAll(env: Env) {
  const [hh, gg, rr, aa, tpl] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM households WHERE active = 1 ORDER BY side, list_owner, name'),
    env.DB.prepare('SELECT id, household_id, name, sort FROM guests WHERE active = 1 ORDER BY household_id, sort, id'),
    env.DB.prepare('SELECT id, household_id, created_at, notes FROM latest_responses'),
    env.DB.prepare('SELECT a.* FROM response_answers a JOIN latest_responses r ON r.id = a.response_id'),
    env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE '%_template'"),
  ]);
  const households = hh.results as unknown as Household[];
  const guests = gg.results as { id: number; household_id: number; name: string }[];
  const responses = new Map((rr.results as { id: number; household_id: number; created_at: string; notes: string }[]).map((r) => [r.household_id, r]));
  const answers = aa.results as { response_id: number; guest_id: number | null; extra_slot: number | null; event: EventKey; attending: number }[];
  const templates = { ...DEFAULT_TEMPLATES };
  for (const t of tpl.results as { key: string; value: string }[]) if (t.key in templates) templates[t.key as TemplateKey] = t.value;

  const base = env.SITE_URL.replace(/\/$/, '');
  const rows: AdminGuestRow[] = [];
  const hhOut = households.map((h) => {
    const inv = Object.fromEntries(EVENTS.map((e) => [e, eventsFor(h).includes(e)])) as Record<EventKey, boolean>;
    const resp = responses.get(h.id);
    const mine = resp ? answers.filter((a) => a.response_id === resp.id) : [];
    const pick = (g: number | null, x: number | null, e: EventKey): boolean | null => {
      if (!resp || !inv[e]) return null;
      const a = mine.find((m) => m.event === e && (g != null ? m.guest_id === g : m.extra_slot === x));
      return a ? !!a.attending : (g == null ? false : null);
    };
    const people: [number | null, number | null, string][] = [
      ...guests.filter((g) => g.household_id === h.id).map((g) => [g.id, null, g.name] as [number, null, string]),
      ...Array.from({ length: h.max_extra }, (_, i) => [null, i + 1, `${h.name} +${i + 1}`] as [null, number, string]),
    ];
    for (const [g, x, name] of people) {
      rows.push({
        householdId: h.id, household: h.name, guestId: g, guest: name, side: h.side, listOwner: h.list_owner,
        invited: inv, answer: Object.fromEntries(EVENTS.map((e) => [e, pick(g, x, e)])) as Record<EventKey, boolean | null>,
      });
    }
    return {
      id: h.id, key: h.key, name: h.name, side: h.side, listOwner: h.list_owner, phone: h.phone,
      warmup: h.warmup, ceremony: !!h.ceremony, dinner: !!h.dinner, maxExtra: h.max_extra,
      link: `${base}/i/${h.token}`,
      respondedAt: resp?.created_at ?? null, notes: resp?.notes ?? '',
      guestCount: people.length,
      sentAt: h.invite_sent_at,
    };
  });
  return { households: hhOut, rows, templates, deadline: env.RSVP_DEADLINE };
}
