/**
 * Contact form -> EmailJS.
 *
 * Config comes from env.generated.js (built from .env by build-env.js).
 * Your EmailJS template should reference these variables:
 *   from_name   the sender's name
 *   reply_to    the sender's email  (set the template's Reply-To to this)
 *   topic       which chip they picked
 *   message     the body
 */
(function () {
  'use strict';

  var MAX_MESSAGE = 5000;

  function env(key) {
    return (window.__ENV && window.__ENV[key]) || '';
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function init() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var status = form.querySelector('[data-contact-status]');
    var submit = form.querySelector('button[type="submit"]');
    var label = form.querySelector('[data-submit-label]');
    var idleLabel = label ? label.textContent : '';

    var publicKey = env('EMAILJS_PUBLIC_KEY');
    var serviceId = env('EMAILJS_SERVICE_ID');
    var templateId = env('EMAILJS_TEMPLATE_ID');
    var fallback = env('CONTACT_FALLBACK_EMAIL');

    function setStatus(text, state) {
      if (!status) return;
      if (!text) {
        status.hidden = true;
        status.textContent = '';
        status.removeAttribute('data-state');
        return;
      }
      status.hidden = false;
      status.textContent = text;
      status.setAttribute('data-state', state);
    }

    function fallbackNote() {
      return fallback ? ' Email me directly at ' + fallback + '.' : ' Email me directly.';
    }

    if (!publicKey || !serviceId || !templateId) {
      if (submit) submit.disabled = true;
      setStatus('Form not configured yet.' + fallbackNote(), 'error');
      console.warn('[contact] Missing EmailJS config. Fill .env, then run `npm run build:env`.');
      return;
    }

    if (!window.emailjs) {
      if (submit) submit.disabled = true;
      setStatus('Mail service failed to load.' + fallbackNote(), 'error');
      console.error('[contact] emailjs SDK missing — check the CDN script tag in index.html.');
      return;
    }

    window.emailjs.init({ publicKey: publicKey });

    var sending = false;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (sending) return;

      // Honeypot — a real person never sees this field, so a value means a bot.
      // Report success so the bot has nothing to learn from the response.
      var trap = form.elements.company_site;
      if (trap && trap.value) {
        form.reset();
        setStatus('✓ Sent — talk soon.', 'sent');
        return;
      }

      var data = new FormData(form);
      var name = (data.get('from_name') || '').toString().trim();
      var email = (data.get('reply_to') || '').toString().trim();
      var message = (data.get('message') || '').toString().trim();

      if (!name || !email || !message) {
        setStatus('Name, email and a message, please.', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus('That email address looks off.', 'error');
        return;
      }
      if (message.length > MAX_MESSAGE) {
        setStatus('Keep it under ' + MAX_MESSAGE + ' characters?', 'error');
        return;
      }

      sending = true;
      if (submit) submit.disabled = true;
      if (label) label.textContent = 'Sending…';
      setStatus(null);

      window.emailjs
        .sendForm(serviceId, templateId, form, { publicKey: publicKey })
        .then(function () {
          form.reset();
          // form.reset() clears the hidden topic input; restore the default.
          var hidden = form.querySelector('[data-topic-value]');
          var chips = form.querySelectorAll('.chip');
          if (hidden && chips.length) {
            hidden.value = chips[0].textContent;
            chips.forEach(function (chip, i) {
              chip.setAttribute('aria-pressed', String(i === 0));
            });
          }
          setStatus('✓ Sent — talk soon.', 'sent');
        })
        .catch(function (error) {
          console.error('[contact] send failed', error);
          setStatus('Couldn’t send — try again, or' + fallbackNote().toLowerCase(), 'error');
        })
        .then(function () {
          sending = false;
          if (submit) submit.disabled = false;
          if (label) label.textContent = idleLabel;
        });
    });
  });
})();
