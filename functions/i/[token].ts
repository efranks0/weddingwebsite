// Personal invite page. Serves the static invite shell with this household's
// data injected, and strips sections they are not invited to (so e.g. warm-up
// details never reach households that aren't on that list).
import { householdByToken } from '../_lib/db';
import { inviteState } from '../_lib/invite';
import type { Env, Household } from '../_lib/types';
import { TOKEN_RE } from '../_lib/util';

function visible(h: Household, show: string): boolean {
  return show.split(/\s+/).some((s) =>
    s === 'warmup' ? h.warmup !== 'none'
    : s === 'warmup-emilios' ? h.warmup === 'emilios'
    : s === 'warmup-theo' ? h.warmup === 'theo'
    : s === 'ceremony' ? !!h.ceremony
    : s === 'dinner' ? !!h.dinner
    : false);
}

const notFound = (env: Env, url: string) => env.ASSETS.fetch(new URL('/404.html', url)).then(
  (r) => new Response(r.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));

export const onRequestGet: PagesFunction<Env, 'token'> = async ({ params, env, request }) => {
  const token = String(params.token);
  const h = TOKEN_RE.test(token) ? await householdByToken(env, token) : null;
  if (!h) return notFound(env, request.url);

  const [shell, state] = await Promise.all([
    env.ASSETS.fetch(new URL('/shell/invite/', request.url)),
    inviteState(env, h),
  ]);
  const data = JSON.stringify({ token, ...state }).replace(/</g, '\\u003c');

  const out = new HTMLRewriter()
    .on('[data-show]', { element(el) { if (!visible(h, el.getAttribute('data-show') || '')) el.remove(); } })
    .on('[data-slot="household-name"]', { element(el) { el.setInnerContent(h.name); } })
    .on('[data-rsvp]', { element(el) { el.setAttribute('data-state', state.locked ? 'closed' : 'form'); } })
    .on('script[data-invite]', { element(el) { el.setInnerContent(data, { html: true }); } })
    .transform(shell);

  return new Response(out.body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' },
  });
};
