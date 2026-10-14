import { defineConfig } from 'astro/config';

// Static build. Dynamic bits (password gate, personal RSVP pages, admin API)
// live in /functions as Cloudflare Pages Functions and talk to D1.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
