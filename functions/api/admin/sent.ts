import type { Env } from '../../_lib/types';
import { json } from '../../_lib/util';

/** POST { id: number, sent: boolean } — tick/untick "invitation sent" for a household. */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = (await request.json().catch(() => null)) as { id?: unknown; sent?: unknown } | null;
  if (!body || !Number.isInteger(body.id)) return json({ error: 'Invalid request' }, 400);
  const at = body.sent === false ? null : new Date().toISOString();
  await env.DB.prepare('UPDATE households SET invite_sent_at = ? WHERE id = ?').bind(at, body.id).run();
  return json({ ok: true, sentAt: at });
};
