/**
 * Builds the writing section from posts/*.md.
 *
 *   posts/2026-02-14-some-title.md  ->  writing/some-title/index.html
 *
 * Also writes the archive at writing/index.html, an RSS feed at feed.xml,
 * and injects the newest three cards into index.html between the
 * <!-- posts:start --> / <!-- posts:end --> markers.
 *
 * Nav, footer and the SVG filter defs are lifted out of index.html rather
 * than duplicated here, so the chrome stays in one place.
 *
 * Run via `npm run build:posts` (part of `npm run build`).
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT_DIR = path.join(ROOT, 'writing');
/* Canonical links and the feed need an absolute origin. Prefer an explicit
   SITE_URL; otherwise take Vercel's stable production domain, which it sets
   for every build. Guessing a domain is worse than failing loudly — a wrong
   canonical points search engines at someone else's site. */
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '');
  }
  console.warn(
    '[posts] Neither SITE_URL nor VERCEL_PROJECT_PRODUCTION_URL is set — ' +
    'canonical links and feed URLs will be relative to the site root.'
  );
  return '';
}

const SITE_URL = siteUrl();
const WORDS_PER_MINUTE = 200;
const HOMEPAGE_COUNT = 3;

/* --- helpers ---------------------------------------------------------- */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* Frontmatter is a small key: value subset — enough for these fields, and
   it avoids a YAML dependency. */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const eq = line.indexOf(':');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) meta[key] = value;
  }
  return { meta, body: match[2] };
}

function readingTime(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* Pull a balanced block out of index.html by its opening tag. */
function extract(html, startMarker, tag) {
  const start = html.indexOf(startMarker);
  if (start === -1) throw new Error('Could not find "' + startMarker + '" in index.html');
  // One pass over both delimiters, so lastIndex always advances past the
  // match that was just counted. Comments are matched first and skipped —
  // the defs block has comments that mention <svg>, which would otherwise
  // count as opening tags.
  const re = new RegExp('<!--[\\s\\S]*?-->|<' + tag + '[\\s/>]|</' + tag + '>', 'g');
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0].slice(0, 4) === '<!--') continue;
    if (m[0].charAt(1) === '/') {
      depth--;
      if (depth === 0) return html.slice(start, m.index + m[0].length);
    } else {
      depth++;
    }
  }
  throw new Error('Unbalanced <' + tag + '> from "' + startMarker + '"');
}

/* On a sub-page the chrome's same-page anchors have to point back home.
   Only <a href="#..."> is rewritten — <use href="#logomark"> must not be. */
function absolutiseAnchors(html) {
  return html.replace(/<a href="#/g, '<a href="/#');
}

/* --- load posts -------------------------------------------------------- */

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs.readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      // 2026-02-14-some-title.md -> some-title
      const slug = meta.slug || file.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');

      if (!meta.title) throw new Error(file + ': missing "title" in frontmatter');
      if (!meta.date) throw new Error(file + ': missing "date" in frontmatter');

      // The page template already renders the title as the <h1>, so a leading
      // H1 in the body would be a duplicate.
      const text = body.replace(/^\s*#\s+.*(\r?\n)+/, '');

      // Local images are copied next to the generated page, so the relative
      // src in the markdown keeps working untouched.
      const assets = [];
      const img = /!\[[^\]]*\]\(([^)\s]+)/g;
      let m;
      while ((m = img.exec(text)) !== null) {
        const ref = m[1];
        if (/^(https?:)?\/\//.test(ref) || ref.startsWith('/') || ref.startsWith('data:')) continue;
        const name = decodeURIComponent(ref);
        if (!assets.includes(name)) assets.push(name);
      }

      return {
        file,
        slug,
        title: meta.title,
        date: meta.date,
        dateLabel: formatDate(meta.date),
        tag: meta.tag || 'WRITING',
        summary: meta.summary || '',
        medium: meta.medium || '',
        draft: String(meta.draft).toLowerCase() === 'true',
        minutes: readingTime(text),
        assets,
        html: marked.parse(text),
      };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/* --- card art ---------------------------------------------------------- */

/* Three treatments from the design, cycled so a run of posts keeps the
   original visual rhythm. */
const ART = [
  function ink(n) {
    return '<div class="post__art" style="background:#161412">' +
      '<svg viewBox="0 0 100 100" style="position:absolute;left:50%;top:50%;width:190px;transform:translate(-50%,-50%) rotate(12deg);color:#E8B021" aria-hidden="true"><use href="#logomark"/></svg>' +
      '<div class="post__no">NO. ' + n + '</div></div>';
  },
  function olive(n) {
    return '<div class="post__art" style="background:#5E6B45">' +
      '<svg viewBox="0 0 100 60" preserveAspectRatio="none" style="position:absolute;inset:26px 0 40px;width:100%;height:calc(100% - 66px)" aria-hidden="true">' +
      '<path d="M0 12 C 8 2, 17 2, 25 12 S 42 22, 50 12 S 67 2, 75 12 S 92 22, 100 12 M0 32 C 8 22, 17 22, 25 32 S 42 42, 50 32 S 67 22, 75 32 S 92 42, 100 32 M0 52 C 8 42, 17 42, 25 52 S 42 62, 50 52 S 67 42, 75 52 S 92 62, 100 52" fill="none" stroke="#F4EDE0" stroke-width="2.4" filter="url(#rough)"/></svg>' +
      '<div class="post__no">NO. ' + n + '</div></div>';
  },
  function orange(n) {
    return '<div class="post__art" style="background:#E0482A">' +
      '<div style="position:absolute;inset:0;background-image:radial-gradient(#161412 1.6px,transparent 1.9px);background-size:16px 16px;opacity:.5"></div>' +
      '<div style="position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;background:#F4EDE0;border:2px solid #161412;filter:url(#rough)"></div>' +
      '<div class="post__no post__no--ink">NO. ' + n + '</div></div>';
  },
];

function card(post, index) {
  const n = String(index + 1).padStart(2, '0');
  return '      <a class="post lift" href="/writing/' + post.slug + '/">\n' +
    '        ' + ART[index % ART.length](n) + '\n' +
    '        <div class="post__body">\n' +
    '          <div class="post__meta"><span>' + escapeHtml(post.tag) + '</span>' +
    '<span class="post__read">' + post.minutes + ' MIN READ</span></div>\n' +
    '          <div class="post__title">' + escapeHtml(post.title) + '</div>\n' +
    (post.summary ? '          <p class="post__summary">' + escapeHtml(post.summary) + '</p>\n' : '') +
    '        </div>\n' +
    '      </a>';
}

/* --- page shell -------------------------------------------------------- */

function shell(opts) {
  const { title, description, bodyClass, content, chrome, canonical } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="twitter:card" content="summary_large_image">

<link rel="alternate" type="application/rss+xml" title="K Arya Sekhar Das — Writing" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&amp;family=Bungee&amp;family=DM+Mono:wght@400;500&amp;family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&amp;family=Instrument+Serif:ital@0;1&amp;display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">

${chrome.defs}

<div class="page">

${chrome.nav}

<main>
${content}
</main>

${chrome.footer}

</div>

<script>window.PORTFOLIO_FLAGS = { loader: false };</script>
<script src="/data.js"></script>
<script src="/main.js"></script>
</body>
</html>
`;
}

/* --- renderers --------------------------------------------------------- */

function articlePage(post, chrome) {
  const canonical = SITE_URL + '/writing/' + post.slug + '/';
  const mediumLink = post.medium
    ? '<a class="pill pill--sm pill--outline" href="' + escapeHtml(post.medium) +
      '" target="_blank" rel="noopener">Read on Medium<span class="pill__glyph" aria-hidden="true">&#8599;</span></a>'
    : '';

  const content = `<article class="article">
  <div class="article__head">
    <a class="article__back" href="/writing/">&larr; All writing</a>
    <p class="eyebrow">${escapeHtml(post.tag)}</p>
    <h1 class="article__title">${escapeHtml(post.title)}</h1>
    <p class="article__meta">
      <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.dateLabel)}</time>
      <span aria-hidden="true">&middot;</span>
      <span>${post.minutes} min read</span>
    </p>
    ${mediumLink ? '<div class="article__actions">' + mediumLink + '</div>' : ''}
  </div>

  <div class="prose">
${post.html}
  </div>

  <div class="article__foot">
    <a class="pill pill--ink" href="/writing/">More writing<span class="pill__glyph" aria-hidden="true">&rarr;</span></a>
    ${mediumLink}
  </div>
</article>`;

  return shell({
    title: post.title + ' — K Arya Sekhar Das',
    description: post.summary || post.title,
    bodyClass: 'is-article',
    content,
    chrome,
    canonical,
  });
}

function archivePage(posts, chrome) {
  const cards = posts.length
    ? posts.map(card).join('\n')
    : '      <p class="archive__empty">Nothing published yet.</p>';

  const content = `<section class="writing section--anchor" id="writing" aria-labelledby="archive-title">
  <svg class="deco" viewBox="0 0 100 24" style="right:5%;top:6%;width:130px;transform:rotate(-6deg);color:#E0482A;stroke-width:4" aria-hidden="true"><use href="#squiggle"/></svg>
  <div class="dots" style="left:1%;bottom:6%;width:120px;height:120px;opacity:.3;background-size:13px 13px"></div>

  <div class="shell">
    <div class="section-head">
      <div>
        <p class="eyebrow">WRITING</p>
        <h2 class="h2 writing__h2" id="archive-title">Everything I've <em>written.</em></h2>
      </div>
      <a class="pill pill--sm pill--outline" href="/feed.xml">RSS<span class="pill__glyph" aria-hidden="true">&rarr;</span></a>
    </div>

    <div class="grid writing__grid">
${cards}
    </div>
  </div>
</section>`;

  return shell({
    title: 'Writing — K Arya Sekhar Das',
    description: 'Write-ups on security research, supply-chain tooling and CTFs.',
    bodyClass: 'is-archive',
    content,
    chrome,
    canonical: SITE_URL + '/writing/',
  });
}

function feed(posts) {
  const items = posts.map((p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${SITE_URL}/writing/${p.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/writing/${p.slug}/</guid>
      <pubDate>${new Date(p.date + 'T00:00:00Z').toUTCString()}</pubDate>
      <description>${escapeHtml(p.summary || p.title)}</description>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>K Arya Sekhar Das — Writing</title>
    <link>${SITE_URL}/writing/</link>
    <description>Write-ups on security research, supply-chain tooling and CTFs.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

/* --- build ------------------------------------------------------------- */

function build() {
  const indexPath = path.join(ROOT, 'index.html');
  let index = fs.readFileSync(indexPath, 'utf8');
  const original = index;

  const chrome = {
    defs: extract(index, '<svg class="defs"', 'svg'),
    nav: absolutiseAnchors(extract(index, '<div class="nav-wrap">', 'div')),
    footer: absolutiseAnchors(extract(index, '<footer class="footer">', 'footer')),
  };

  const posts = loadPosts();

  // Article pages
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let copied = 0;
  for (const post of posts) {
    const dir = path.join(OUT_DIR, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), articlePage(post, chrome));

    for (const name of post.assets) {
      const from = path.join(POSTS_DIR, name);
      if (!fs.existsSync(from)) {
        console.warn("  " + post.file + ": image not found -> " + name);
        continue;
      }
      fs.copyFileSync(from, path.join(dir, path.basename(name)));
      copied++;
    }
  }

  // Archive + feed
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), archivePage(posts, chrome));
  fs.writeFileSync(path.join(ROOT, 'feed.xml'), feed(posts));

  // Newest three onto the homepage
  // The "All writing" link only earns its place once the archive holds more
  // than the homepage already shows — otherwise it leads to the same cards.
  // This runs first: it changes the length of index, so the post markers
  // must be located afterwards or their offsets go stale.
  const MORE_START = '<!-- morelink:start -->';
  const MORE_END = '<!-- morelink:end -->';
  const ms = index.indexOf(MORE_START);
  const me = index.indexOf(MORE_END);
  if (ms !== -1 && me !== -1) {
    const link = posts.length > HOMEPAGE_COUNT
      ? '<a class="pill pill--sm pill--outline" href="/writing/">All writing' +
        '<span class="pill__glyph" aria-hidden="true">&rarr;</span></a>'
      : '';
    index = index.slice(0, ms + MORE_START.length) + link + index.slice(me);
  }

  const START = '<!-- posts:start -->';
  const END = '<!-- posts:end -->';
  const s = index.indexOf(START);
  const e = index.indexOf(END);
  if (s === -1 || e === -1) {
    throw new Error('index.html is missing the ' + START + ' / ' + END + ' markers');
  }

  if (!posts.length) {
    // Never replace hand-written cards with nothing — while every post is
    // still a draft the existing markup stays exactly as it is.
    console.log('No published posts; left the homepage cards untouched');
  } else {
    const cards = posts.slice(0, HOMEPAGE_COUNT).map(card).join('\n');
    index = index.slice(0, s + START.length) + '\n' + cards + '\n      ' + index.slice(e);
  }

  if (index !== original) {
    fs.writeFileSync(indexPath, index);
    console.log('Updated the homepage');
  }

  console.log('Built ' + posts.length + ' post' + (posts.length === 1 ? '' : 's') +
    ' and copied ' + copied + ' image' + (copied === 1 ? '' : 's') + ' -> writing/, feed.xml');
  if (!posts.length) console.warn('No markdown found in posts/ — the writing section will be empty.');
}

build();
