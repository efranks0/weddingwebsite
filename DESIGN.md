# Design handoff: Figma → etwedding.io

The guest-facing site is built in Astro to match the Figma file exactly. Until the file arrives, the site runs on a neutral placeholder style: black and white, Georgia and the system sans font. Nothing in that style needs to be kept.

## Timeline

| When | What |
|---|---|
| ~30 Oct | First pass of the **mobile** personal invite page, for an early fit check |
| **6 Nov** | Final Figma file (2 weeks before send, to allow for build and phone testing) |
| 6–18 Nov | Build to match, QA on real phones, fixes |
| **20 Nov** | Invitations sent. **Design frozen.** Only copy fixes after this. |

## Scope

**Designed in Figma (mobile first):** everything guests see. Most guests tap the link in WhatsApp, so it opens on a phone, often inside WhatsApp's own browser.

**Not designed:** these stay plain and use their own stylesheet, so the design never touches them:
- the password screen of the shared front page
- `/admin`, including the WhatsApp **Send** tab
- the 404 page

## Frames needed

Mobile frame at **390 wide**; it must also hold at 360. Desktop frame at **1440 wide**; the layout should hold from 768 upwards.

1. **Personal invite page** (`/i/<token>`). Sections, top to bottom:
   - Header: logo or name, RSVP link, Menu button
   - Cover: first full screen, "It's Happening!"
   - Hero: "Dear {household}", the title, date, venue and dress-code line
   - Intro: optional
   - The Day: warm-up drinks, ceremony, dinner, each with a Location button
   - Dress code
   - Photo album: text, QR code, button
   - FAQ: 7 questions
   - RSVP
   - Footer
2. **Public front page** (`/`, behind the shared password). Same as the personal page, except:
   - no "Dear …" greeting
   - no warm-up
   - the RSVP section is a single line of text pointing people to their personal link
3. **Menu open**.
4. **RSVP states.** Each one is a separate block in the code:

   | State | When the guest sees it |
   |---|---|
   | **Form: first visit** | Yes/No grid, one card per guest, one row per event, nothing selected |
   | **Form: prefilled** | They replied before. Same grid with their answers selected and the line "You replied on {date}…" |
   | **Form: error** | They pressed Send with a Yes/No missing ("Please answer Yes or No for everyone.") |
   | **Sending** | Send button disabled, label "Sending…" |
   | **Sent** | "Thank you!", a summary of their answers and notes, and a "Change my answer" button |
   | **Closed (with reply)** | After the deadline: "RSVPs are closed", read-only summary |
   | **Closed (no reply)** | After the deadline: "We didn't receive a reply from you…" |

5. **Component states:**
   - Yes/No: unselected, selected, keyboard focus
   - Buttons: default and pressed
   - FAQ item: open and closed
   - Header over the cover vs. on the page (it currently turns transparent over the cover)

## Content and edge cases to design for

- **Household greeting** runs from one name ("Giorgos") to about 40 characters ("Sophia, Alex & Mia").
- **Guests per household:** 1 to 6. On top of that, up to 2 plus-one rows, labelled "Plus-one" (or "Plus-one 1" / "Plus-one 2").
- **Guest names** can be up to about 35 characters, e.g. "Alexandros Konstantinidis-Georgiou".
- **Events per household:** 1 to 3.
  - Warm-up only appears for some households, in one of two versions: Emilios 15:00, or Theodora 15:30.
  - Some households are invited to the ceremony only.
- **Notes** field: free text, up to 1000 characters.
- All wording is final and lives in `src/content/site.ts`, including every RSVP message.

The preview page `/preview/rsvp` shows every RSVP state with these extremes filled in (see QA below).

## What to deliver

1. **Colour styles**, named.
2. **Text styles.** Ideally exactly these seven: **Display, H1, H2, H3, Label, Body, Small**. For each one:
   - font family and weight
   - size on mobile and on desktop
   - line height
   - letter spacing
   - case (as typed, or ALL CAPS)

   If he uses other names, a one-line mapping to these seven is enough.
3. **Fonts:** Google Fonts names, or `.woff2` files with a **web licence**. A desktop licence for a commercial font isn't enough to use it on a website.
4. **Spacing:**
   - the spacing scale
   - page side margins on mobile and desktop
   - maximum text width
   - space between sections
5. **Shapes:**
   - corner radii and border width
   - button height and Yes/No height (at least 44 px, for thumbs)
6. **Artwork:**
   - logos, marks and line art as **SVG**
   - photos as JPG or WebP at 2× (cover about 2000 px wide for desktop, about 1200 px for mobile, under ~300 KB each), plus a separate mobile crop if needed
7. *(Optional)* A favicon and a 1200×630 share image (shown as the WhatsApp link preview).
8. **Motion and behaviour notes**, if any: menu, header over the cover, hover and pressed states. Keep motion minimal.

## How Figma maps to the code

| Figma | Code |
|---|---|
| Colour styles | `--color-*` in `src/styles/tokens.css` |
| Text styles | `--type-<style>-*` in `tokens.css`. Elements carry the class `t-display`, `t-h1`, `t-h2`, `t-h3`, `t-label`, `t-body` or `t-small` |
| Mobile vs desktop sizes | mobile values first in `tokens.css`, desktop overrides in its `@media (min-width: 48rem)` block |
| Spacing, margins, widths | `--space-*`, `--gutter`, `--section-pad`, `--content-width` |
| Radii, borders, button heights | `--radius-*`, `--border-width`, `--button-height`, `--choice-height` |
| Fonts | files in `public/fonts/`, `@font-face` in `src/styles/fonts.css` |
| Artwork | files in `public/images/`. Referenced from `src/content/site.ts` (`artwork.*`, `album.qrImage`) or from `tokens.css` (`--cover-image`) |
| Section layout (order, columns, alignment) | `src/components/*.astro` and `src/styles/sections.css` |
| RSVP states | `src/components/RsvpPersonal.astro` (blocks marked `data-when="form \| sent \| closed"`) and `src/styles/rsvp.css` |

Rules that keep the restyle a swap, not a rebuild:
- Components use only tokens and `t-*` text-style classes, never raw colours or sizes.
- The RSVP script (`src/scripts/rsvp.ts`) contains no markup or styling. It fills `<template>`s defined in the component.

## QA

- **`/preview/rsvp`** shows every RSVP state side by side with sample data (behind the site password; sending there is simulated).
- Real personal links on the pages.dev test site, with sample households: with and without warm-up, ceremony-only, with plus-ones.
- Check on:
  - iPhone Safari
  - Android Chrome
  - **WhatsApp's in-app browser**, by tapping the link inside a WhatsApp chat on both platforms
