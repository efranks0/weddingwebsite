import { clearCookie } from '../../_lib/auth';

export const onRequestPost: PagesFunction = async () =>
  new Response(null, { status: 303, headers: { Location: '/admin/login', 'Set-Cookie': clearCookie('admin') } });
