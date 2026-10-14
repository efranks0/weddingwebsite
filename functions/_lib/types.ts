export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SITE_PASSWORD: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  RSVP_DEADLINE: string;
  SITE_URL: string;
}

export type EventKey = 'warmup' | 'ceremony' | 'dinner';
export const EVENTS: EventKey[] = ['warmup', 'ceremony', 'dinner'];

export interface Household {
  id: number;
  key: string;
  token: string;
  name: string;
  side: 'bride' | 'groom';
  list_owner: string;
  phone: string | null;
  warmup: 'none' | 'emilios' | 'theo';
  ceremony: number;
  dinner: number;
  max_extra: number;
  invite_sent_at: string | null;
}

export interface Guest {
  id: number;
  household_id: number;
  name: string;
  sort: number;
}
