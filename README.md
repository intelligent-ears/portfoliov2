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

## Missing asset

`assets/arya-cutout.png` (the cut-out portrait in the hero) could not be pulled
from the design project — it exceeds the 256 KiB transfer cap on that API. Every
other asset is here.

Download it from the design project and drop it at `assets/arya-cutout.png`.
Until then the hero hides the image rather than showing a broken-image icon; the
torn mustard backdrop and the surrounding doodles still render.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | All markup, plus the SVG filter defs and reusable marks |
| `styles.css` | Every style; design tokens are CSS custom properties on `:root` |
| `data.js` | Skills, timeline and contact topics — **edit content here** |
| `main.js` | Mobile nav, list rendering, badges, draw-on underlines |
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
- the **MAKERCHIP-ATLAS** work card is marked `LINK TBD` and links to `#work`
- the HTB footer link points at the HTB users index, not your profile
- the Minder timeline entry reads `[START DATE] – NOW`

## Motion and grain

Two opt-outs, mirroring the "Tweaks" the design exposed. Define them before
`main.js` runs:

```html
<script>window.PORTFOLIO_FLAGS = { motion: false, grain: false };</script>
```

`motion: false` stops all animation and skips the draw-on underlines;
`grain: false` removes the paper-grain overlay. `prefers-reduced-motion` is
honoured regardless.

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
- skills, timeline and the three SVG badges render from data
- with no keys set, the submit button disables and the form explains why

Not verified: an actual send through EmailJS, which needs real credentials.
