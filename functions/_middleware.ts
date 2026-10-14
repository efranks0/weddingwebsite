// Access control for every request.
//   /i/<token>, /api/rsvp/*        → open (the token is the credential)
//   /admin*, /api/admin/*          → admin password cookie
//   everything else (front page)   → shared site password cookie (30 days)
import { hasScope } from './_lib/auth';
import type { Env } from './_lib/types';
import { json } from './_lib/util';

const OPEN = ['/_astro/', '/fonts/', '/images/', '/favicon', '/robots.txt', '/login', '/api/login', '/i/', '/api/rsvp/', '/admin/login', '/api/admin/login'];

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname;

  // The invite shell is only ever served through /i/<token>.
  if (path.startsWith('/shell')) return new Response('Not found', { status: 404 });

  let res: Response;
  if (OPEN.some((p) => path.startsWith(p))) {
    res = await ctx.next();
  } else if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/')) {
    if (await hasScope(ctx.request, ctx.env, 'admin')) res = await ctx.next();
    else if (path.startsWith('/api/')) return json({ error: 'unauthorised' }, 401);
    else return Response.redirect(new URL('/admin/login', url).toString(), 303);
  } else {
    if (await hasScope(ctx.request, ctx.env, 'site')) res = await ctx.next();
    else return Response.redirect(new URL(`/login?next=${encodeURIComponent(path + url.search)}`, url).toString(), 303);
  }

  // Nothing on this site should end up in search engines.
  res = new Response(res.body, res);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
};
