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
  var FLAGS = window.PORTFOLIO_FLAGS || { motion: true, grain: true };

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

    /* Beetle, for Research. The wrapper carries the crawl animation. */
    bug: [
      '<div class="anim-crawl" style="width:100%;height:100%">',
      '<svg viewBox="0 0 200 200" style="width:100%;height:100%;display:block;overflow:visible">',
      [
        'M66 92 L40 78 L28 58', 'M62 118 L34 118 L20 108', 'M66 146 L42 162 L34 184',
        'M134 92 L160 78 L172 58', 'M138 118 L166 118 L180 108', 'M134 146 L158 162 L166 184',
        'M90 44 L78 20 L66 16', 'M110 44 L122 20 L134 16'
      ].map(function (d) {
        return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#rough)"/>';
      }).join(''),
      '<circle cx="100" cy="58" r="20" fill="' + INK + '" filter="url(#rough)"/>',
      '<ellipse cx="100" cy="122" rx="42" ry="56" fill="' + INK + '" stroke="' + CREAM + '" stroke-width="3" filter="url(#rough)"/>',
      '<path d="M100 70 V176" stroke="' + CREAM + '" stroke-width="3"/>',
      '<circle cx="80" cy="108" r="8" fill="' + MUSTARD + '"/>',
      '<circle cx="120" cy="132" r="9" fill="' + MUSTARD + '"/>',
      '<circle cx="82" cy="150" r="6" fill="' + MUSTARD + '"/>',
      '<circle cx="118" cy="98" r="5" fill="' + MUSTARD + '"/>',
      '</svg></div>'
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
    // Let layout and fonts settle before measuring path lengths.
    setTimeout(setupDraw, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
