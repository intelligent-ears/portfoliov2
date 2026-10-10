/**
 * Page behaviour: mobile nav, list rendering, hand-drawn badges,
 * and the draw-on underline animation.
 *
 * Reads content from window.SITE (data.js). The contact form's submit
 * handling lives in contact.js; the topic chips are wired here because
 * they are a rendering concern.
 */
(function () {
  'use strict';

  var INK = '#161412';
  var CREAM = '#F4EDE0';
  var ORANGE = '#E0482A';
  var MUSTARD = '#E8B021';

  /* ---------------------------------------------------------------------
     Optional flags, mirroring the "Tweaks" the design exposed.
     Set either to false to opt out; prefers-reduced-motion is respected
     regardless (see styles.css).
     --------------------------------------------------------------------- */
  var DEFAULT_FLAGS = { motion: true, grain: true, loader: true, cursorStyle: 'tag' };
  var FLAGS = Object.assign({}, DEFAULT_FLAGS, window.PORTFOLIO_FLAGS || {});

  function applyFlags() {
    var root = document.documentElement;
    root.toggleAttribute('data-still', FLAGS.motion === false);
    root.toggleAttribute('data-nograin', FLAGS.grain === false);
  }

  /* --- mobile nav ------------------------------------------------------ */

  function initNav() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-menu]');
    if (!toggle || !menu) return;

    var label = toggle.querySelector('[data-menu-label]');
    var icon = toggle.querySelector('[data-menu-icon]');

    function setOpen(open) {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
      if (icon) icon.textContent = open ? '×' : '☰';
    }

    toggle.addEventListener('click', function () {
      setOpen(menu.hidden);
    });

    // Any in-menu link closes it.
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    // The design dropped back to the desktop nav at 900px; close the
    // panel on the way up so it can't linger off-screen.
    var wide = window.matchMedia('(min-width: 900px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else wide.addListener(onChange);

    setOpen(false);
  }

  /* --- rendered lists -------------------------------------------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderTools(tools) {
    var host = document.querySelector('[data-tools]');
    if (!host || !tools) return;

    tools.forEach(function (tool) {
      var row = el('div', 'tool');
      row.appendChild(el('span', 'tool__name', tool.name));

      var dots = el('span', 'tool__dots');
      dots.setAttribute('role', 'img');
      dots.setAttribute('aria-label', tool.level + ' out of 5');
      for (var i = 0; i < 5; i++) {
        var dot = el('i');
        if (i < tool.level) dot.setAttribute('data-on', '');
        dots.appendChild(dot);
      }
      row.appendChild(dots);
      host.appendChild(row);
    });
  }

  function renderTimeline(rows) {
    var host = document.querySelector('[data-timeline]');
    if (!host || !rows) return;

    rows.forEach(function (row) {
      var item = el('div', 'tl');
      item.appendChild(el('div', 'tl__when', row.when));
      item.appendChild(el('div', 'tl__role', row.role));
      item.appendChild(el('div', 'tl__org', row.org));
      item.appendChild(el('div', 'tl__note', row.note));
      host.appendChild(item);
    });
  }

  /* Topic chips write the selection into the form's hidden `topic` input,
     which EmailJS picks up with the rest of the fields. */
  function renderTopics(topics) {
    var host = document.querySelector('[data-topics]');
    var hidden = document.querySelector('[data-topic-value]');
    if (!host || !topics) return;

    var buttons = topics.map(function (label, index) {
      var chip = el('button', 'chip', label);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(index === 0));
      chip.addEventListener('click', function () {
        buttons.forEach(function (other) { other.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        if (hidden) hidden.value = label;
      });
      host.appendChild(chip);
      return chip;
    });

    if (hidden && topics.length) hidden.value = topics[0];
  }

  /* --- badges ---------------------------------------------------------- */

  /* These three were React element trees in the design source. They are
     static art, so they are plain SVG strings here — only CSS animates them. */
  var BADGES = {
    /* Broadcast tower, for About. */
    signal: [
      '<svg viewBox="0 0 200 200" style="width:100%;height:100%;display:block;overflow:visible">',
      arc('M70 62 A42 42 0 0 0 70 122', false),
      arc('M130 62 A42 42 0 0 1 130 122', false),
      arc('M46 40 A72 72 0 0 0 46 144', true),
      arc('M154 40 A72 72 0 0 1 154 144', true),
      '<path d="M100 100 L72 190 M100 100 L128 190 M82 158 H118 M88 132 L116 172 M112 132 L84 172" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round" filter="url(#rough)"/>',
      '<circle cx="100" cy="92" r="13" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="5" filter="url(#rough)"/>',
      '<circle cx="100" cy="92" r="4" fill="' + ORANGE + '"/>',
      '</svg>'
    ].join(''),

    /* Floppy disk, for the footer. */
    floppy: [
      '<div class="anim-float" style="width:100%;height:100%">',
      '<svg viewBox="0 0 200 200" style="width:100%;height:100%;display:block;overflow:visible">',
      '<path d="M30 24 H150 L176 50 V176 H30 Z" fill="' + MUSTARD + '" stroke="' + CREAM + '" stroke-width="4" stroke-linejoin="round" filter="url(#rough)"/>',
      '<rect x="62" y="24" width="80" height="50" fill="' + CREAM + '" filter="url(#rough)"/>',
      '<rect x="112" y="32" width="18" height="34" rx="2" fill="' + INK + '"/>',
      '<rect x="48" y="100" width="110" height="64" rx="4" fill="' + CREAM + '" filter="url(#rough)"/>',
      '<path d="M60 122 H146 M60 140 H146" stroke="' + INK + '" stroke-width="2" opacity=".35"/>',
      '<text x="103" y="134" text-anchor="middle" fill="' + INK + '" style="font:500 15px \'DM Mono\', monospace;letter-spacing:2px">arya.bak</text>',
      '<rect x="38" y="160" width="8" height="8" fill="' + INK + '"/>',
      '</svg></div>'
    ].join('')
  };

  function arc(d, delayed) {
    return '<path class="anim-blip' + (delayed ? ' anim-blip--delayed' : '') + '" d="' + d +
      '" fill="none" stroke="' + ORANGE + '" stroke-width="7" stroke-linecap="round" filter="url(#rough)"/>';
  }

  function renderBadges() {
    document.querySelectorAll('[data-badge]').forEach(function (slot) {
      var markup = BADGES[slot.getAttribute('data-badge')];
      if (markup) slot.innerHTML = markup;
    });
  }

  /* --- draw-on underlines ---------------------------------------------- */

  /* Each path[data-draw] starts fully dashed-out and unrolls when it
     scrolls into view. Skipped entirely when motion is off. */
  function setupDraw() {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || FLAGS.motion === false || !('IntersectionObserver' in window)) return;

    var paths = Array.prototype.slice.call(document.querySelectorAll('path[data-draw]'));
    if (!paths.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.strokeDashoffset = '0';
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    paths.forEach(function (path, i) {
      var length = path.getTotalLength ? path.getTotalLength() : 0;
      if (!length) return;
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      path.style.transition =
        'stroke-dashoffset 1.1s cubic-bezier(.65,.05,.25,1) ' + (i % 2 ? '.25s' : '0s');
      io.observe(path);
    });
  }

  /* --- images that may not be present --------------------------------- */

  /* assets/arya-cutout.png is large and may not have been copied yet;
     hide it rather than showing a broken-image glyph over the hero. */
  function guardOptionalImages() {
    document.querySelectorAll('img[data-optional]').forEach(function (img) {
      img.addEventListener('error', function () { img.style.display = 'none'; });
      if (img.complete && img.naturalWidth === 0) img.style.display = 'none';
    });
  }

  /* --- github contribution graph --------------------------------------- */

  /* jogruber's API mirrors the public contribution calendar, so this needs
     no token. Anything that fails here leaves the placeholder dashes and a
     message pointing at the real profile. */
  var GH_USER = 'intelligent-ears';
  var GH_API = 'https://github-contributions-api.jogruber.de/v4/' + GH_USER + '?y=last';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function set(sel, value) {
    var node = document.querySelector(sel);
    if (node) node.textContent = value;
  }

  /* Bucket a flat list of days into calendar weeks, padding the first week so
     column rows line up with Sun..Sat. */
  function toWeeks(days) {
    var weeks = [];
    var week = [];
    var pad = new Date(days[0].date + 'T00:00:00').getDay();
    var monthAt = [];

    for (var i = 0; i < pad; i++) week.push(null);

    days.forEach(function (day) {
      var dt = new Date(day.date + 'T00:00:00');
      if (week.length === 0) monthAt.push(dt.getMonth());
      week.push({
        on: day.count > 0,
        label: day.count + ' contribution' + (day.count === 1 ? '' : 's') +
               ' on ' + dt.toDateString().slice(4),
      });
      if (week.length === 7) { weeks.push(week); week = []; }
    });
    if (week.length) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    // One month label per column, only where the month actually turns over.
    var last = -1;
    return weeks.map(function (w, i) {
      var m = monthAt[i] !== undefined ? monthAt[i] : -1;
      var label = (m !== last && m >= 0 && i < weeks.length - 1) ? MONTHS[m] : '';
      if (m >= 0) last = m;
      return { days: w, month: label };
    });
  }

  function summarise(days) {
    var longest = 0, run = 0, best = { count: 0, date: '' };
    days.forEach(function (d) {
      run = d.count > 0 ? run + 1 : 0;
      if (run > longest) longest = run;
      if (d.count > best.count) best = d;
    });
    // Today may legitimately be empty, so an unbroken streak can end yesterday.
    var i = days.length - 1;
    if (i >= 0 && days[i].count === 0) i--;
    var current = 0;
    for (; i >= 0 && days[i].count > 0; i--) current++;
    return { longest: longest, current: current, best: best };
  }

  function paintGraph(weeks) {
    var months = document.querySelector('[data-gh-months]');
    var host = document.querySelector('[data-gh-weeks]');
    if (!months || !host) return;
    months.textContent = '';
    host.textContent = '';

    weeks.forEach(function (w) {
      months.appendChild(el('span', null, w.month));

      var col = el('div', 'graph__week');
      w.days.forEach(function (day) {
        var cell = el('span', 'graph__day');
        if (!day) {
          cell.setAttribute('data-pad', '');
        } else {
          if (day.on) cell.setAttribute('data-on', '');
          cell.title = day.label;
        }
        col.appendChild(cell);
      });
      host.appendChild(col);
    });
  }

  function emptyYear() {
    var days = [], today = new Date();
    for (var i = 364; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    return days;
  }

  function initGitHub() {
    if (!document.querySelector('[data-gh-weeks]')) return;

    // Draw an empty year immediately so the section never looks broken.
    paintGraph(toWeeks(emptyYear()));

    if (!window.fetch) {
      set('[data-gh-status]', 'See the live graph on github.com/' + GH_USER);
      return;
    }

    fetch(GH_API)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var days = (data && data.contributions) || [];
        if (!days.length) throw new Error('no contributions in response');

        paintGraph(toWeeks(days));

        var stats = summarise(days);
        var total = data.total &&
          (data.total.lastYear != null
            ? data.total.lastYear
            : Object.keys(data.total).reduce(function (a, k) { return a + data.total[k]; }, 0));

        set('[data-gh-total]', total == null ? '—' : total.toLocaleString('en-IN'));
        set('[data-gh-streak]', stats.current);
        set('[data-gh-longest]', stats.longest);
        set('[data-gh-best]', stats.best.count);
        set('[data-gh-best-date]', stats.best.date
          ? new Date(stats.best.date + 'T00:00:00').toDateString().slice(4, 10)
          : '');
        set('[data-gh-status]', 'Live · updates whenever the page loads · hover a dot for the day');
      })
      .catch(function (err) {
        console.warn('[github] ' + err.message);
        set('[data-gh-status]',
          'Couldn’t reach GitHub right now — see the live graph on github.com/' + GH_USER);
      });
  }

  /* --- intro loader ----------------------------------------------------- */

  /* A curtain over the page that plays once, then wipes away. Scroll is locked
     for its duration and always restored, including on the reduced-motion and
     error paths. */
  function runLoader(done) {
    var host = document.querySelector('[data-loader]');
    if (!host || FLAGS.loader === false) { done(); return; }

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                  FLAGS.motion === false;
    var root = document.documentElement;
    var prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    host.style.pointerEvents = 'auto';

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      host.textContent = '';
      host.style.pointerEvents = 'none';
      root.style.overflow = prevOverflow;
      done();
    }

    // Backstop: scroll is locked while the curtain is up, so if an animation
    // never reports finishing the page must not stay stuck.
    setTimeout(finish, 7000);

    var panel = el('div', 'loader__panel');
    var mustard = el('div', 'loader__wipe loader__wipe--mustard');
    var ink = el('div', 'loader__wipe loader__wipe--ink');
    host.appendChild(panel);
    host.appendChild(mustard);
    host.appendChild(ink);

    // Word is built the same way in both paths; only the motion differs.
    var center = el('div', 'loader__center');
    var word = el('div', 'loader__word');
    var glyphs = [];
    'INTEL EARS'.split('').forEach(function (ch, i) {
      var wrap = el('span', ch === ' ' ? 'is-space' : null);
      var inner = el('i', i > 5 ? 'is-accent' : null, ch === ' ' ? ' ' : ch);
      wrap.appendChild(inner);
      word.appendChild(wrap);
      glyphs.push(inner);
    });
    center.appendChild(word);

    if (reduced) {
      glyphs.forEach(function (g) { g.style.transform = 'none'; });
      panel.appendChild(center);
      setTimeout(function () {
        if (!panel.animate) { finish(); return; }
        panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })
          .onfinish = finish;
      }, 500);
      return;
    }

    // Web Animations is required past this point; bail to a plain reveal.
    if (!panel.animate) { finish(); return; }

    var brush = el('div', 'loader__brush');
    brush.innerHTML = '<svg viewBox="0 0 400 34" preserveAspectRatio="none" style="position:absolute;left:-4%;top:0;width:108%;height:100%;overflow:visible">' +
      '<path d="M6 22 C 70 10, 150 28, 230 15 S 350 8, 394 18" fill="none" stroke="' + ORANGE +
      '" stroke-width="13" stroke-linecap="round" filter="url(#brush)"/></svg>';
    var tag = el('div', 'loader__tag', 'SECURITY RESEARCHER · OSS MAINTAINER');
    center.appendChild(brush);
    center.appendChild(tag);
    panel.appendChild(center);

    var status = el('div', 'loader__status');
    status.appendChild(el('i'));
    status.appendChild(el('span', null, 'LOADING'));
    var verb = el('span', 'loader__verb', 'FIND');
    status.appendChild(verb);

    var count = el('div', 'loader__count', '000');
    var bar = el('div', 'loader__bar');
    panel.appendChild(status);
    panel.appendChild(count);
    panel.appendChild(bar);

    var ease = 'cubic-bezier(.2,1.3,.4,1)';
    glyphs.forEach(function (g, i) {
      g.animate(
        [{ transform: 'translateY(110%) rotate(6deg)' }, { transform: 'translateY(0) rotate(0)' }],
        { duration: 700, delay: 150 + i * 70, easing: ease, fill: 'forwards' }
      );
    });

    var path = brush.querySelector('path');
    if (path && path.getTotalLength) {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 700, delay: 750, easing: 'cubic-bezier(.65,.05,.25,1)', fill: 'forwards' });
    }
    tag.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, delay: 1150, fill: 'forwards' });

    var DURATION = 2200;
    var words = ['FIND', 'BREAK', 'REPORT', 'PATCH', 'SHIP'];
    var start = performance.now();
    var raf;

    bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: DURATION, easing: 'cubic-bezier(.6,.05,.3,1)', fill: 'forwards' });

    function exit() {
      var opts = { duration: 1100, easing: 'cubic-bezier(.75,0,.2,1)', fill: 'forwards' };
      var frames = [
        { transform: 'translateY(100%)' },
        { transform: 'translateY(0)', offset: .45 },
        { transform: 'translateY(0)', offset: .55 },
        { transform: 'translateY(-100%)' },
      ];
      mustard.animate(frames, opts);
      ink.animate(frames, {
        duration: opts.duration, easing: opts.easing, fill: 'forwards', delay: 110,
      }).onfinish = finish;
      setTimeout(function () { panel.style.visibility = 'hidden'; }, 560);
    }

    function step() {
      var p = Math.min(1, (performance.now() - start) / DURATION);
      var eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      count.textContent = String(Math.round(eased * 100));
      while (count.textContent.length < 3) count.textContent = '0' + count.textContent;
      verb.textContent = words[Math.min(words.length - 1, Math.floor(p * words.length))];
      if (p < 1) raf = requestAnimationFrame(step); else exit();
    }
    raf = requestAnimationFrame(step);
  }

  /* --- custom cursor ---------------------------------------------------- */

  /* Pointer-fine only: touch and coarse pointers keep the native cursor.
     Modes: 'tag' (default), 'invert', 'ink', 'off'. */
  function initCursor() {
    var host = document.querySelector('[data-cursor-host]');
    var mode = FLAGS.cursorStyle || 'tag';
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!host || !fine || mode === 'off') return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                  FLAGS.motion === false;
    document.documentElement.setAttribute('data-cursor', '');

    var mx = -200, my = -200, tx = -200, ty = -200;
    var hot = false, down = false, onDark = false, hidden = false;

    function probe(target) {
      var closest = function (sel) { return target && target.closest && target.closest(sel); };
      hidden = !!closest('input,textarea');
      onDark = !!closest('[data-dark],nav,footer');
      hot = !!closest('a,button,label,[role=button]');
    }

    var render = function () {};

    if (mode === 'invert') {
      var blob = el('div', 'cursor__blob');
      blob.style.cssText = 'position:absolute;left:0;top:0;width:30px;height:30px;' +
        'margin:-15px 0 0 -15px;border-radius:50%;background:' + CREAM + ';' +
        'mix-blend-mode:difference;opacity:0;transition:width .3s cubic-bezier(.3,1.5,.5,1),' +
        'height .3s cubic-bezier(.3,1.5,.5,1),margin .3s cubic-bezier(.3,1.5,.5,1),opacity .2s';
      host.appendChild(blob);
      render = function () {
        var s = down ? 20 : hot ? 84 : 30;
        blob.style.width = blob.style.height = s + 'px';
        blob.style.margin = (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px';
        blob.style.opacity = hidden ? 0 : 1;
        blob.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      };
    } else if (mode === 'ink') {
      var canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      host.appendChild(canvas);
      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      var sizeCanvas = function () {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      sizeCanvas();
      window.addEventListener('resize', sizeCanvas);

      var nib = el('div');
      nib.style.cssText = 'position:absolute;left:0;top:0;width:10px;height:10px;' +
        'margin:-5px 0 0 -5px;border-radius:50%;background:' + INK +
        ';opacity:0;transition:opacity .2s,background .2s';
      host.appendChild(nib);

      var TRAIL = 420;
      var pts = [];
      render = function () {
        nib.style.opacity = hidden ? 0 : 1;
        nib.style.background = hot ? ORANGE : onDark ? CREAM : INK;
        nib.style.transform = 'translate(' + mx + 'px,' + my + 'px) scale(' +
          (hot ? 2 : down ? .6 : 1) + ')';
        var now = performance.now();
        if (!hidden && !reduced) pts.push({ x: mx, y: my, t: now });
        while (pts.length && now - pts[0].t > TRAIL) pts.shift();
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.lineCap = ctx.lineJoin = 'round';
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], k = 1 - (now - b.t) / TRAIL;
          ctx.strokeStyle = 'rgba(224,72,42,' + (k * .85) + ')';
          ctx.lineWidth = 2 + k * 9;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      };
    } else {
      var tagEl = el('div');
      tagEl.style.cssText = 'position:absolute;left:0;top:0;display:flex;align-items:flex-start;' +
        'gap:2px;opacity:0;transition:opacity .2s;will-change:transform';
      tagEl.innerHTML = '<svg viewBox="0 0 24 24" style="width:30px;height:30px;flex:none;' +
        'overflow:visible;transition:transform .2s"><path d="M3 2 L20 11 L12 13 L9 21 Z" fill="' +
        ORANGE + '" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round" ' +
        'filter="url(#rough)"/></svg>';
      host.appendChild(tagEl);
      var arrow = tagEl.firstChild;
      render = function () {
        tagEl.style.opacity = hidden ? 0 : 1;
        tagEl.style.transform = 'translate(' + (tx - 3) + 'px,' + (ty - 2) + 'px)';
        arrow.style.transform = down ? 'scale(.8)' : hot ? 'scale(1.2) rotate(-8deg)' : 'none';
      };
    }

    var lerp = reduced ? 1 : mode === 'invert' ? .2 : mode === 'tag' ? .35 : 1;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (tx < -100) { tx = mx; ty = my; }
      probe(e.target);
    });
    window.addEventListener('mousedown', function () { down = true; });
    window.addEventListener('mouseup', function () { down = false; });
    document.addEventListener('mouseleave', function () { hidden = true; });
    document.addEventListener('mouseenter', function () { hidden = false; });

    (function tick() {
      tx += (mx - tx) * lerp;
      ty += (my - ty) * lerp;
      render();
      requestAnimationFrame(tick);
    })();
  }

  /* --- boot ------------------------------------------------------------ */

  function init() {
    var site = window.SITE || {};
    applyFlags();
    initNav();
    renderTools(site.tools);
    renderTimeline(site.timeline);
    renderTopics(site.topics);
    renderBadges();
    guardOptionalImages();
    initCursor();
    initGitHub();
    // The curtain covers the page, so hold the draw-on until it lifts.
    runLoader(function () { setTimeout(setupDraw, 150); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
