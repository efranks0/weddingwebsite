import { DEFAULT_TEMPLATES } from '../../_lib/admin';
import type { Env } from '../../_lib/types';
import { json } from '../../_lib/util';

/** PUT { send_template?: string, reminder_template?: string } */
export const onRequestPut: PagesFunction<Env> = async ({ env, request }) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Invalid request' }, 400);
  const stmts = [];
  for (const key of Object.keys(DEFAULT_TEMPLATES)) {
    const v = body[key];
    if (v === undefined) continue;
    if (typeof v !== 'string' || v.length > 4000) return json({ error: `Invalid ${key}` }, 400);
    stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, v));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
};
