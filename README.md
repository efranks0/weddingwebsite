# etwedding.io

Wedding website for Emilios & Theodora. Built with Astro (static pages), Cloudflare Pages Functions and Cloudflare D1.

| URL | Who | Access |
| --- | --- | --- |
| `/` | everyone | shared password, cookie lasts 30 days |
| `/i/<12-char token>` | one household | no password, the link itself is the key |
| `/admin` | the two of you | separate admin password |

## How it fits together

```
src/                    Astro → static HTML/CSS in dist/
  content/site.ts       ALL visible copy (edit text here only)
  styles/tokens.css     ALL colours, fonts, sizes (designer edits here)
  styles/*.css          section/form/admin styles, using tokens only
  components/           one file per section
  pages/index.astro     public front page
  pages/shell/invite    template for personal pages (never served directly)
  pages/admin/          dashboard (data loaded from /api/admin/*)
functions/              Cloudflare Pages Functions
  _middleware.ts        password gate for /, /admin
  i/[token].ts          personal page: fills the template for one household,
                        strips sections they aren't invited to (on the server)
  api/rsvp/[token].ts   GET state / POST answers (append-only, latest wins)
  api/admin/*           data, CSV export, message templates, "sent" ticks
migrations/             D1 schema
scripts/seed.mjs        guest list (JSON/CSV) → SQL, keeps tokens on re-run
```

**What each household sees.** Each household has a `warmup` value (`none`, `emilios` or `theo`) and two flags, `ceremony` and `dinner`. Timeline items in `site.ts` are tagged with `show`. The `/i/<token>` function removes any item the household isn't invited to before the HTML leaves the server. The RSVP form only asks about those same events.

**RSVP rules.**
- One Yes/No per person per event, plus one dietary/notes field per household.
- `max_extra` adds that many "Plus-one" rows. They count as "No" unless ticked.
- Every submission is a new row. The latest one is the answer that counts.
- After `RSVP_DEADLINE` (in `wrangler.toml`) the page becomes read-only and the API refuses changes.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars        # local passwords: guests / admin
npm run db:migrate:local
npm run seed:local                     # 6 sample households
npm run preview                        # build + wrangler pages dev → http://localhost:8788
```

Personal links for the sample households appear in `/admin` under the **Send** tab.
`npm run dev` (Astro only) is handy for styling, but it has no passwords, D1 or personal pages.

Checks: `npm test` tests the seed script and `npm run check` type-checks the functions.

## First deploy (to *.pages.dev)

1. `npx wrangler login`
2. `npx wrangler d1 create wedding`, then paste the `database_id` it prints into `wrangler.toml`.
3. `npm run db:migrate:remote`
4. In the Cloudflare dashboard, create a Pages project connected to this GitHub repo:
   - build command `npm run build`
   - output directory `dist`
   - The D1 binding comes from `wrangler.toml`.
5. Set the secrets under Pages project → Settings → Variables and Secrets, or with `npx wrangler pages secret put NAME`:
   - `SITE_PASSWORD`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET` (any long random string; changing it signs everybody out)
6. Set `SITE_URL` in `wrangler.toml` to the real pages.dev URL. Admin links and the CSV use it.

## Loading the real guest list

Point the existing extraction script's output at this format. Use either JSON (see `data/guests.sample.json`) or a CSV with one row per guest:

```
household_key,household_name,guest_name,side,list,phone,warmup,ceremony,dinner,max_extra
zoe-014,Maria & Nikos,Maria Papadopoulou,Bride,Zoe,+30 690 123 4567,theo,yes,yes,0
zoe-014,,Nikos Papadopoulos,,,,,,,
```

- `household_key` must stay the same between runs. That is what keeps each household's link the same.
- `list` is one of: Zoe / Athena & Costas / Family / Couple.
- `warmup` is one of: none / emilios / theo.
- `ceremony` and `dinner` default to yes. `max_extra` defaults to 0.

```sh
node scripts/seed.mjs data/guests.json          # writes data/seed.sql and prints warnings
npx wrangler d1 execute wedding --remote --file data/seed.sql
```

The script warns about missing or odd phone numbers, duplicate names and shared phones. It is safe to re-run after edits: links and RSVPs survive. Anyone dropped from the file is deactivated (link stops working), not deleted.
`data/guests.json`, `data/seed.sql` and `*.xlsx` are git-ignored, so real names and phone numbers never get committed.

## Admin

The dashboard at `/admin` has five tabs:
- **Overview**: invited / replied / yes / no / pending for each event, split by side (Bride/Groom) and by list owner. "+N" means plus-ones who are coming.
- **Not replied**: households with no answer yet, each with a WhatsApp **Remind** button.
- **Dietary**: every household's notes.
- **Send**: edit the invitation and reminder messages (`{name}` and `{link}` are filled in for each household). Each household gets a tap-to-open WhatsApp button, which also ticks "sent".
- **All guests**: everyone, with a filter box.

**Export CSV** gives one row per person: household, guest, side, list, each event's answer, notes, phone and link. The columns are ready to paste into `Emilios_Theodora_Wedding_v2.xlsx`.

## Go-live on etwedding.io

1. Pages project → Custom domains → add `etwedding.io`.
2. Change `SITE_URL` to `https://etwedding.io` and redeploy. The tokens don't change, so links are only "wrong" if they were already sent with the pages.dev host. Switch the domain **before** 20 Nov sends.

## For the designer

- Colours, fonts, spacing and button shapes are CSS variables in `src/styles/tokens.css`. The values match the Bliss & Bone site: colours were sampled from screenshots.
- Fonts are self-hosted via `@fontsource` (`src/layouts/Fonts.astro`):
  - Bodoni Moda for titles
  - Inter for text
  - Herr Von Muellerhoff for the script logo, as the closest free match. Swap in the original logo file if you have it.
- Section styles in `src/styles/sections.css` and `rsvp.css` use only those variables and plain BEM-style class names.
- Copy lives in `src/content/site.ts`, so markup and text can change independently.

## Still to fill in (`TODO` in the code)

- Intro text. The section stays hidden until it has text.
- The real day-of contact. The B&B site still says "AAAA, +35700000000".
- The Wedibox album URL and the QR image in `public/images/`. The button and QR stay hidden until set.
- Check the LOCATION links. They are Google Maps searches built from the addresses.
