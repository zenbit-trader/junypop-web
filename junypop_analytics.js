/*
 * JUNYPOP — web measurement layer (E1 of docs/MARKETING_PLAN.md).
 *
 * One file, no dependencies, safe to ship before any account exists:
 * with every id in JUNYPOP_ANALYTICS left empty it sets no cookie, loads
 * no third-party script and shows no consent bar — it only remembers where
 * the visitor came from in first-party localStorage so the app can attach
 * that to their profile.
 *
 * Fill the ids in index.html and the same events start flowing to GA4,
 * Meta and TikTok. Event names are the ones in the marketing plan:
 * page_view, play_start, lesson_complete, signup, d1_return, plus_purchase.
 */
(function () {
  'use strict';

  var CFG = window.JUNYPOP_ANALYTICS || {};
  var GA4 = CFG.ga4 || '';
  var META = CFG.metaPixel || '';
  var TIKTOK = CFG.tiktokPixel || '';
  var DEBUG = !!CFG.debug;
  var NEEDS_CONSENT = !!(GA4 || META || TIKTOK);

  var K_FIRST = 'jp_acq';       // first touch — never overwritten
  var K_LAST = 'jp_acq_last';   // most recent touch
  var K_CONSENT = 'jp_consent'; // 'yes' | 'no'
  var K_SEEN = 'jp_seen';       // yyyy-mm-dd of the previous visit (d1_return)

  function ls(key, value) {
    try {
      if (arguments.length === 1) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* private window, blocked storage — measurement is never critical */
    }
    return null;
  }

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[junypop]'].concat([].slice.call(arguments)));
  }

  // ---------------------------------------------------------------- source

  var PARAMS = {
    utm_source: 'src', utm_medium: 'med', utm_campaign: 'cmp',
    utm_content: 'cnt', utm_term: 'trm',
    gclid: 'gclid', fbclid: 'fbclid', ttclid: 'ttclid',
    ref: 'ref' // junypop.com/?ref=<invite code>
  };

  function readTouch() {
    var q = new URLSearchParams(window.location.search);
    var out = {};
    for (var key in PARAMS) {
      var v = q.get(key);
      if (v) out[PARAMS[key]] = v.slice(0, 120);
    }
    var host = '';
    try {
      host = document.referrer ? new URL(document.referrer).hostname : '';
    } catch (e) { /* malformed referrer */ }
    if (host && host !== window.location.hostname) out.rf = host;
    if (!Object.keys(out).length) return null;
    out.lp = window.location.pathname.slice(0, 120);
    out.ts = new Date().toISOString();
    return out;
  }

  var touch = readTouch();
  if (touch) {
    var json = JSON.stringify(touch);
    if (!ls(K_FIRST)) ls(K_FIRST, json);
    ls(K_LAST, json);
    log('source', touch);
  }

  function acquisition() {
    var first = ls(K_FIRST);
    var last = ls(K_LAST);
    if (!first && !last) return null;
    var out = {};
    try { if (first) out.first = JSON.parse(first); } catch (e) { /* corrupt */ }
    try { if (last) out.last = JSON.parse(last); } catch (e) { /* corrupt */ }
    out.ua = navigator.userAgent.slice(0, 200);
    out.lang = navigator.language || '';
    return out;
  }

  /** The invite code from ?ref=, for the referral loop (E5). */
  function inviteCode() {
    var q = new URLSearchParams(window.location.search);
    var code = q.get('ref');
    if (code) return code.slice(0, 32);
    try {
      var first = JSON.parse(ls(K_FIRST) || '{}');
      return first.ref || '';
    } catch (e) { return ''; }
  }

  // ---------------------------------------------------------------- vendors

  var loaded = false;

  function addScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function loadVendors() {
    if (loaded) return;
    loaded = true;

    if (GA4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA4, { send_page_view: false });
      addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4));
    }

    if (META) {
      /* Meta pixel bootstrap (official snippet, reformatted) */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', META);
    }

    if (TIKTOK) {
      /* TikTok pixel bootstrap (official snippet, reformatted) */
      (function (w, d, t) {
        w.TiktokAnalyticsObject = t;
        var ttq = w[t] = w[t] || [];
        ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
          'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
        ttq.setAndDefer = function (obj, method) {
          obj[method] = function () { obj.push([method].concat([].slice.call(arguments, 0))); };
        };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (id) {
          var inst = ttq._i[id] || [];
          for (var j = 0; j < ttq.methods.length; j++) ttq.setAndDefer(inst, ttq.methods[j]);
          return inst;
        };
        ttq.load = function (id, opts) {
          var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
          ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = url;
          ttq._t = ttq._t || {}; ttq._t[id] = +new Date();
          ttq._o = ttq._o || {}; ttq._o[id] = opts || {};
          var s = d.createElement('script');
          s.type = 'text/javascript'; s.async = true; s.src = url + '?sdkid=' + id + '&lib=' + t;
          var first = d.getElementsByTagName('script')[0];
          first.parentNode.insertBefore(s, first);
        };
        ttq.load(TIKTOK);
        ttq.page();
      })(window, document, 'ttq');
    }

    log('vendors loaded', { ga4: !!GA4, meta: !!META, tiktok: !!TIKTOK });
  }

  // ---------------------------------------------------------------- events

  // name -> [meta standard event or null, tiktok standard event or null]
  var STANDARD = {
    // Meta's own PageView, not a custom copy of it: retargeting audiences
    // ("everyone who visited the site") are built from the standard event.
    page_view: ['PageView', null],
    play_start: [null, 'ClickButton'],
    lesson_complete: [null, 'CompleteRegistration'],
    signup: ['CompleteRegistration', 'Subscribe'],
    plus_purchase: ['Purchase', 'CompletePayment'],
    d1_return: [null, null]
  };

  var queue = [];
  var consent = ls(K_CONSENT);

  function send(name, params) {
    params = params || {};
    if (window.gtag) window.gtag('event', name, params);
    if (window.fbq) {
      var std = (STANDARD[name] || [])[0];
      if (std) window.fbq('track', std, params);
      else window.fbq('trackCustom', name, params);
    }
    if (window.ttq) {
      var tt = (STANDARD[name] || [])[1];
      if (tt) window.ttq.track(tt, params);
    }
    log('event', name, params);
  }

  function track(name, params) {
    if (!name) return;
    if (typeof params === 'string') {
      try { params = JSON.parse(params); } catch (e) { params = {}; }
    }
    if (!NEEDS_CONSENT) { log('event (no tracker configured)', name, params); return; }
    if (consent !== 'yes') {
      if (consent !== 'no' && queue.length < 50) queue.push([name, params]);
      return;
    }
    send(name, params);
  }

  function flush() {
    loadVendors();
    var pending = queue.splice(0, queue.length);
    for (var i = 0; i < pending.length; i++) send(pending[i][0], pending[i][1]);
  }

  // ---------------------------------------------------------------- consent

  function styleBar(el) {
    el.style.cssText = [
      'position:fixed', 'left:12px', 'right:12px',
      'bottom:calc(12px + env(safe-area-inset-bottom, 0px))',
      'z-index:99999', 'max-width:560px', 'margin:0 auto',
      'background:#1E1B33', 'color:#fff', 'border-radius:16px',
      'padding:14px 16px', 'box-shadow:0 10px 30px rgba(0,0,0,.28)',
      'font-family:Sarabun,\'Segoe UI\',Tahoma,sans-serif', 'font-size:14px',
      'line-height:1.55', 'display:flex', 'flex-wrap:wrap', 'gap:10px',
      'align-items:center', 'justify-content:space-between'
    ].join(';');
  }

  function button(label, primary) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = [
      'border:0', 'border-radius:999px', 'padding:8px 18px', 'cursor:pointer',
      'font-family:inherit', 'font-size:14px', 'font-weight:600',
      primary ? 'background:#4ADE80' : 'background:rgba(255,255,255,.14)',
      primary ? 'color:#12321F' : 'color:#fff'
    ].join(';');
    return b;
  }

  function showConsentBar() {
    var bar = document.createElement('div');
    styleBar(bar);
    var text = document.createElement('div');
    text.style.cssText = 'flex:1 1 240px;min-width:200px';
    text.innerHTML = 'เราใช้คุกกี้เพื่อดูว่าเกมช่วยให้จำศัพท์ได้จริงไหม ' +
      '<a href="/privacy.html" style="color:#8AD0FF">นโยบายความเป็นส่วนตัว</a>';
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex:0 0 auto';
    var no = button('ไม่ใช้', false);
    var yes = button('ยอมรับ', true);
    no.onclick = function () { ls(K_CONSENT, 'no'); consent = 'no'; queue.length = 0; bar.remove(); };
    yes.onclick = function () { ls(K_CONSENT, 'yes'); consent = 'yes'; bar.remove(); flush(); };
    actions.appendChild(no);
    actions.appendChild(yes);
    bar.appendChild(text);
    bar.appendChild(actions);
    document.body.appendChild(bar);
  }

  // ---------------------------------------------------------------- boot

  function today() { return new Date().toISOString().slice(0, 10); }

  function markVisit() {
    var prev = ls(K_SEEN);
    var now = today();
    if (prev && prev !== now) {
      var days = Math.round((Date.parse(now) - Date.parse(prev)) / 86400000);
      track('d1_return', { days_since_last: days });
    }
    ls(K_SEEN, now);
  }

  /**
   * Take the static boot screen down. Fired by the engine's own
   * `flutter-first-frame` event, and again from Dart after the first frame,
   * so a Dart-side failure can never leave the game hidden behind it.
   */
  function bootDone() {
    var boot = document.getElementById('jp-boot');
    if (boot) boot.remove();
    document.documentElement.classList.add('jp-ready');
  }

  window.addEventListener('flutter-first-frame', bootDone);

  window.junypop = {
    track: track,
    acquisition: function () { var a = acquisition(); return a ? JSON.stringify(a) : ''; },
    inviteCode: inviteCode,
    bootDone: bootDone,
    consentState: function () { return NEEDS_CONSENT ? (consent || 'ask') : 'off'; }
  };

  if (NEEDS_CONSENT && consent === 'yes') loadVendors();
  track('page_view', { path: window.location.pathname });
  markVisit();

  if (NEEDS_CONSENT && consent !== 'yes' && consent !== 'no') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showConsentBar);
    } else {
      showConsentBar();
    }
  }
})();
