import type { Env, EventKey, Guest, Household } from './types';
import { EVENTS } from './types';

export async function householdByToken(env: Env, token: string): Promise<Household | null> {
  return env.DB.prepare('SELECT * FROM households WHERE token = ? AND active = 1').bind(token).first<Household>();
}

export async function guestsFor(env: Env, householdId: number): Promise<Guest[]> {
  const r = await env.DB.prepare('SELECT id, household_id, name, sort FROM guests WHERE household_id = ? AND active = 1 ORDER BY sort, id')
    .bind(householdId).all<Guest>();
  return r.results;
}

/** Events this household is invited to, in display order. */
export function eventsFor(h: Household): EventKey[] {
  return EVENTS.filter((e) => (e === 'warmup' ? h.warmup !== 'none' : e === 'ceremony' ? !!h.ceremony : !!h.dinner));
}

export interface AnswerRow { guest_id: number | null; extra_slot: number | null; event: EventKey; attending: number }

export async function latestResponse(env: Env, householdId: number) {
  const resp = await env.DB.prepare('SELECT id, created_at, notes FROM responses WHERE household_id = ? ORDER BY id DESC LIMIT 1')
    .bind(householdId).first<{ id: number; created_at: string; notes: string }>();
  if (!resp) return null;
  const answers = await env.DB.prepare('SELECT guest_id, extra_slot, event, attending FROM response_answers WHERE response_id = ?')
    .bind(resp.id).all<AnswerRow>();
  return { ...resp, answers: answers.results };
}
