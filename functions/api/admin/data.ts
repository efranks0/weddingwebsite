import { loadAll } from '../../_lib/admin';
import type { Env } from '../../_lib/types';
import { json } from '../../_lib/util';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => json(await loadAll(env));
