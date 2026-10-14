import { defineConfig } from 'astro/config';

// Static build. Dynamic bits (password gate, personal RSVP pages, admin API)
// live in /functions as Cloudflare Pages Functions and talk to D1.
export default defineConfig({
  // Absolute URL for the share image. Update together with SITE_URL in wrangler.toml at go-live.
  site: 'https://etwedding.pages.dev',
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
