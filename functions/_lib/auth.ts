// Signed cookies: "<scope>.<expiresEpoch>.<hmac>". No server-side session store needed.
import type { Env } from './types';

export type Scope = 'site' | 'admin';
export const COOKIE = { site: 'etw_site', admin: 'etw_admin' } as const;
const MAX_AGE = { site: 30 * 24 * 3600, admin: 30 * 24 * 3600 };

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Constant-time string comparison (compares HMACs so lengths never leak). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const k = 'cmp';
  const [x, y] = await Promise.all([hmac(k, a), hmac(k, b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0 && a.length === b.length;
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export async function makeCookie(env: Env, scope: Scope): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE[scope];
  const payload = `${scope}.${exp}`;
  const value = `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
  const path = scope === 'admin' ? '/' : '/';
  return `${COOKIE[scope]}=${value}; Path=${path}; Max-Age=${MAX_AGE[scope]}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(scope: Scope): string {
  return `${COOKIE[scope]}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function hasScope(req: Request, env: Env, scope: Scope): Promise<boolean> {
  const raw = getCookie(req, COOKIE[scope]);
  if (!raw || !env.SESSION_SECRET) return false;
  const [s, exp, sig] = raw.split('.');
  if (s !== scope || !exp || !sig) return false;
  if (Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, `${s}.${exp}`));
}
