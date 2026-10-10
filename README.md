# Arya — Portfolio

Personal site for K Arya Sekhar Das. Static HTML, CSS and vanilla JS — no build
step beyond a three-line script that copies `.env` into the page.

Built from the Claude Design source `Arya Portfolio.dc.html`. The design's
template DSL (`<sc-if>`, `<sc-for>`, `{{ bindings }}`, `style-hover`, React
badge components) has been converted to plain HTML, CSS and DOM code.

## Setup

1. Create an EmailJS service and template at <https://dashboard.emailjs.com>.
   The template should reference these variables:

   | Variable | Contents |
   | --- | --- |
   | `from_name` | sender's name |
   | `reply_to` | sender's email — set the template's **Reply-To** to this |
   | `topic` | which chip they picked |
   | `message` | the body |

2. Fill in `.env`:

   ```
   EMAILJS_PUBLIC_KEY=...
   EMAILJS_SERVICE_ID=...
   EMAILJS_TEMPLATE_ID=...
   CONTACT_FALLBACK_EMAIL=24uec247@lnmiit.ac.in   # optional
   ```

3. Run it:

   ```
   npm start
   ```

   That regenerates `env.generated.js` from `.env` and serves the folder at
   <http://localhost:3000>.

Until the three EmailJS values are set, the send button stays disabled and the
form says so instead of failing silently.

### About those keys

EmailJS client credentials are **public by design** — they ship to the browser,
so `env.generated.js` and anything you deploy will contain them. `.env` keeps
them out of source control, not out of the bundle. Restrict abuse with
**Allowed Origins** in the EmailJS dashboard. Never put a private API key here.

The form also carries a hidden `company_site` honeypot; submissions that fill it
are dropped silently.

## GitHub activity

The Activity section pulls the last year of contributions for `intelligent-ears`
from `github-contributions-api.jogruber.de` on page load. No token, no key —
it reads the same public calendar the profile page shows.

If the request fails the section still renders: an empty year of dots, dashes in
the stat cards, and a line pointing at the real profile. Nothing blocks the rest
of the page.

To point it at a different account, change `GH_USER` at the top of the GitHub
block in `main.js`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | All markup, plus the SVG filter defs and reusable marks |
| `styles.css` | Every style; design tokens are CSS custom properties on `:root` |
| `data.js` | Skills, timeline and contact topics — **edit content here** |
| `main.js` | Nav, list rendering, badges, draw-on, GitHub graph, loader, cursor |
| `contact.js` | Validation and EmailJS submit |
| `build-env.js` | Reads `.env`, writes `env.generated.js` (`window.__ENV`) |
| `.env` | Your keys — gitignored |
| `assets/` | Images |

`env.generated.js` is generated output and is gitignored; run `npm run build:env`
after cloning or after editing `.env`.

## Editing content

Most copy lives in `index.html` as ordinary markup. Two lists are data-driven —
change them in `data.js` and the page re-renders them on load:

- `tools` — the skill rows. `level` is out of 5 and fills that many dots.
- `timeline` — the experience column.
- `topics` — the contact form's subject chips. The first is selected by default.

Placeholders left deliberately, to fill in when you have the content:

- the three **Writing** cards say `[ Article title — pull from Medium ]`
- the **MAKERCHIP-ATLAS** work card links to `#work`, not a repo
- the HTB footer link points at the HTB users index, not your profile
- the Minder timeline entry reads `[START DATE] – NOW`

## Behaviour flags

Mirrors the "Tweaks" the design exposes. Define before `main.js` runs:

```html
<script>
  window.PORTFOLIO_FLAGS = { motion: true, grain: true, loader: true, cursorStyle: 'tag' };
</script>
```

| Flag | Effect |
| --- | --- |
| `motion: false` | Stops all animation and skips the draw-on underlines |
| `grain: false` | Removes the paper-grain overlay |
| `loader: false` | Skips the intro curtain entirely |
| `cursorStyle` | `'tag'` (default), `'invert'`, `'ink'`, or `'off'` |

`prefers-reduced-motion` is honoured regardless: the loader collapses to a brief
static title card and the cursor stops easing.

The custom cursor only engages on `(hover: hover) and (pointer: fine)`, so touch
devices keep the native one. The native cursor is hidden via `html[data-cursor]`,
which JS sets — if scripts fail, the normal cursor stays.

The loader locks scrolling while it plays and has a 7s backstop that force-clears
it, so a stalled animation cannot leave the page unscrollable.

## Deploying

`env.generated.js` is gitignored, so it is **not** in the repo — the host has to
generate it at build time. `build-env.js` reads real environment variables
first and falls back to `.env`, so this works on any host that injects config.

### Vercel

`vercel.json` is already set up: `buildCommand` runs `node build-env.js` and the
site is served from the repo root.

1. Import the repo in the Vercel dashboard. Leave the framework preset as
   **Other** — `vercel.json` supplies the build settings.
2. Add these under **Settings → Environment Variables** (all environments):

   ```
   EMAILJS_PUBLIC_KEY
   EMAILJS_SERVICE_ID
   EMAILJS_TEMPLATE_ID
   CONTACT_FALLBACK_EMAIL   (optional)
   ```

3. Deploy. If the variables are missing the build still succeeds — the contact
   form just renders disabled with an explanation, and you can add them and
   redeploy later.

Then set **Allowed Origins** in the EmailJS dashboard to your Vercel domain,
since the keys ship to the browser.

### Anywhere else

Run `npm run build:env` and publish the folder as-is — it is plain static files.

## What was verified

Rendered in headless Edge at desktop (1440px) and mobile (390px):

- all sections lay out correctly and no element overflows horizontally
- the mobile menu opens, closes on link click, and reports correct ARIA state
- topic chips switch and write into the hidden `topic` field
- skills, timeline and both SVG badges render from data
- with no keys set, the submit button disables and the form explains why
- the GitHub graph renders live data, and the graph scrolls on narrow screens
- the loader composes and the wipe-out begins

Not verified: an actual send through EmailJS, which needs real credentials; and
the loader's exit wipe end-to-end — headless virtual time does not advance the
Web Animations clock far enough to watch it land.
