import { eventsFor, guestsFor, latestResponse } from './db';
import type { Env, EventKey, Household } from './types';
import { isLocked } from './util';

/** Everything the personal page needs. Never includes phone, side, or list owner. */
export async function inviteState(env: Env, h: Household) {
  const [guests, response] = await Promise.all([guestsFor(env, h.id), latestResponse(env, h.id)]);
  return {
    name: h.name,
    warmup: h.warmup,
    events: eventsFor(h),
    maxExtra: h.max_extra,
    guests: guests.map((g) => ({ id: g.id, name: g.name })),
    response: response && {
      at: response.created_at,
      notes: response.notes,
      answers: response.answers.map((a) => ({
        guestId: a.guest_id, extraSlot: a.extra_slot, event: a.event, attending: !!a.attending,
      })),
    },
    deadline: env.RSVP_DEADLINE,
    locked: isLocked(env.RSVP_DEADLINE),
  };
}

export interface SubmittedAnswer { guestId?: number | null; extraSlot?: number | null; event: EventKey; attending: boolean }

/** Validates a submission against the household. Returns an error message or the clean rows. */
export function validateSubmission(
  h: Household, guestIds: number[], body: unknown,
): { error: string } | { notes: string; rows: { guestId: number | null; extraSlot: number | null; event: EventKey; attending: 0 | 1 }[] } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request' };
  const { answers, notes } = body as { answers?: unknown; notes?: unknown };
  if (!Array.isArray(answers)) return { error: 'Invalid request' };
  const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, 1000) : '';
  const events = eventsFor(h);
  const seen = new Map<string, 0 | 1>();
  const rows: { guestId: number | null; extraSlot: number | null; event: EventKey; attending: 0 | 1 }[] = [];

  for (const a of answers as SubmittedAnswer[]) {
    if (!a || !events.includes(a.event) || typeof a.attending !== 'boolean') return { error: 'Invalid answer' };
    const isGuest = a.guestId != null;
    if (isGuest && !guestIds.includes(Number(a.guestId))) return { error: 'Unknown guest' };
    if (!isGuest && !(Number.isInteger(a.extraSlot) && a.extraSlot! >= 1 && a.extraSlot! <= h.max_extra)) return { error: 'Invalid plus-one' };
    const k = isGuest ? `g${a.guestId}:${a.event}` : `x${a.extraSlot}:${a.event}`;
    if (seen.has(k)) return { error: 'Duplicate answer' };
    seen.set(k, a.attending ? 1 : 0);
    rows.push({ guestId: isGuest ? Number(a.guestId) : null, extraSlot: isGuest ? null : Number(a.extraSlot), event: a.event, attending: a.attending ? 1 : 0 });
  }
  // Every named guest must answer every event they're invited to. Plus-ones default to "no".
  for (const id of guestIds) for (const e of events) if (!seen.has(`g${id}:${e}`)) return { error: 'Please answer for everyone' };
  return { notes: cleanNotes, rows };
}
