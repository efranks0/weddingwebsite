import { guestsFor, householdByToken } from '../../_lib/db';
import { inviteState, validateSubmission } from '../../_lib/invite';
import type { Env } from '../../_lib/types';
import { isLocked, json, TOKEN_RE } from '../../_lib/util';

export const onRequestGet: PagesFunction<Env, 'token'> = async ({ params, env }) => {
  const token = String(params.token);
  const h = TOKEN_RE.test(token) ? await householdByToken(env, token) : null;
  if (!h) return json({ error: 'Not found' }, 404);
  return json(await inviteState(env, h));
};

export const onRequestPost: PagesFunction<Env, 'token'> = async ({ params, env, request }) => {
  const token = String(params.token);
  const h = TOKEN_RE.test(token) ? await householdByToken(env, token) : null;
  if (!h) return json({ error: 'Not found' }, 404);
  if (isLocked(env.RSVP_DEADLINE)) return json({ error: 'The RSVP deadline has passed. Please message us directly.' }, 403);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const guests = await guestsFor(env, h.id);
  const result = validateSubmission(h, guests.map((g) => g.id), body);
  if ('error' in result) return json(result, 400);

  // One transaction: the response row, then its answers pointing at it.
  const latestId = '(SELECT MAX(id) FROM responses WHERE household_id = ?)';
  await env.DB.batch([
    env.DB.prepare('INSERT INTO responses (household_id, notes, user_agent) VALUES (?, ?, ?)')
      .bind(h.id, result.notes, (request.headers.get('User-Agent') || '').slice(0, 300)),
    ...result.rows.map((r) =>
      env.DB.prepare(`INSERT INTO response_answers (response_id, guest_id, extra_slot, event, attending) VALUES (${latestId}, ?, ?, ?, ?)`)
        .bind(h.id, r.guestId, r.extraSlot, r.event, r.attending)),
  ]);
  return json(await inviteState(env, h));
};
