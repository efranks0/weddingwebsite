import { makeCookie, safeEqual } from '../../_lib/auth';
import type { Env } from '../../_lib/types';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const form = await request.formData();
  const ok = !!env.ADMIN_PASSWORD && (await safeEqual(String(form.get('password') || ''), env.ADMIN_PASSWORD));
  if (!ok) return new Response(null, { status: 303, headers: { Location: '/admin/login?error=1' } });
  return new Response(null, { status: 303, headers: { Location: '/admin/', 'Set-Cookie': await makeCookie(env, 'admin') } });
};
