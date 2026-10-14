import { makeCookie, safeEqual } from '../_lib/auth';
import type { Env } from '../_lib/types';
import { safeNext } from '../_lib/util';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData();
  const next = safeNext(String(form.get('next') || ''));
  const ok = !!env.SITE_PASSWORD && (await safeEqual(String(form.get('password') || '').trim(), env.SITE_PASSWORD));
  if (!ok) {
    return new Response(null, { status: 303, headers: { Location: `/login?error=1&next=${encodeURIComponent(next)}` } });
  }
  return new Response(null, { status: 303, headers: { Location: next, 'Set-Cookie': await makeCookie(env, 'site') } });
};
