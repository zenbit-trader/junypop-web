/*
 * The one place to switch measurement on (docs/MARKETING_PLAN.md, E1).
 *
 * Empty id = that channel is off: no cookie, no third-party script, no
 * consent bar. Paste the ids in when the accounts exist — the Flutter app
 * and the static SEO pages both read this same file.
 */
window.JUNYPOP_ANALYTICS = {
  ga4: 'G-3TGZFNVJ1N', // Google Analytics 4 — property junypop.com, stream "JUNYPOP Web"
  metaPixel: '',  // Meta pixel — 15 digits
  tiktokPixel: '',// TikTok pixel
  debug: false    // true = log every event to the console instead of guessing
};
