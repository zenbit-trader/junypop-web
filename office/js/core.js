/* JUNYPOP DASHBOARD — core: helpers, Supabase client, sign-in gate, shell, router.
 * Pages register themselves with O.page(id, {...}) in pages-*.js.
 * Every number on screen goes through O.metric / O.chip so it always carries
 * its source and freshness (docs/OFFICE_PLAN.html §3). */
(function () {
  'use strict';
  const O = (window.O = {});
  const CFG = window.JUNYPOP_CC || {};
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ helpers
  const esc = (O.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 016 5"/>',
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v11H3z"/><path d="M9 20v-6h6v6"/>',
    ads: '<path d="M3 11l14-6v14L3 13z"/><path d="M17 8a4 4 0 010 8"/>',
    chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1.1-4.4A8 8 0 1121 12z"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21a2 2 0 004 0"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    check: '<path d="M5 12l4 4L19 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
    out: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  };
  const ico = (O.ico = (n, cls) => '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>');
  const num = (O.num = (v, d) => (v == null || v === '' || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d })));
  O.baht = (v, d) => (v == null ? '—' : '฿' + num(v, d == null ? 0 : d));
  O.pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
  const TZ = { timeZone: 'Asia/Bangkok' };
  O.date = (t, withTime) => (t ? new Date(t).toLocaleString('th-TH', Object.assign({ day: 'numeric', month: 'short' }, withTime ? { hour: '2-digit', minute: '2-digit' } : {}, TZ)) : '—');
  O.time = (t) => (t ? new Date(t).toLocaleTimeString('th-TH', Object.assign({ hour: '2-digit', minute: '2-digit' }, TZ)) : '—');
  O.ago = (t) => {
    if (!t) return 'ยังไม่มีข้อมูล';
    const m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
    if (m < 1) return 'เมื่อสักครู่';
    if (m < 60) return m + ' นาทีที่แล้ว';
    if (m < 60 * 24) return Math.round(m / 60) + ' ชม.ที่แล้ว';
    return Math.round(m / 1440) + ' วันที่แล้ว';
  };

  // Sources: what each chip means (shown on tap) — docs/OFFICE_PLAN.html §3.
  const SRC = (O.SRC = {
    db: { label: 'ฐานข้อมูล', note: 'สิ่งที่เกมบันทึกจริงใน Supabase (ทุกแพลตฟอร์ม) · ไม่รวมบัญชีผู้ดูแลและบอท' },
    meta: { label: 'Meta Ads', note: 'ตัวเลขจาก Meta Marketing API เฉพาะแคมเปญชื่อ JUNYPOP… · Meta รีเฟรชเองทุก ~15 นาที และแก้ conversion ย้อนหลังได้ 28 วัน · ตอนนี้ซิงก์เมื่อ Claude รัน ads-sync (อัตโนมัติในเฟส 2)' },
    apple: { label: 'Apple Ads', note: 'โฆษณาค้นหาใน App Store · บัญชีเป็น USD แปลงเป็นบาทโดยประมาณ · ซิงก์เมื่อ Claude รัน apple-sync (อัตโนมัติในเฟส 2)' },
    iap: { label: 'Apple IAP', note: 'การซื้อ/ต่ออายุ/คืนเงิน JUNYPOP Plus บน iOS ที่ Apple แจ้งเข้าระบบเราทันที · Sandbox (ทดสอบ) ไม่นับ' },
    stripe: { label: 'Stripe', note: 'การซื้อ Plus บนเว็บ แจ้งเข้าระบบทันที' },
    ga4: { label: 'GA4 · เว็บ', note: 'Google Analytics นับเฉพาะผู้ที่กดยอมรับคุกกี้บนเว็บ · เชื่อมในเฟส 3' },
    asc: { label: 'App Store Connect', note: 'ดาวน์โหลด impressions รีวิว จาก Apple (ช้า 2–5 วัน) · เชื่อมในเฟส 5' },
    claude: { label: 'Claude', note: 'ข้อเสนอที่ Claude เขียนหลังอ่านตัวเลข · ทำงานเมื่อ Claude เข้ามาอ่านคิว' },
    events: { label: 'อีเวนต์แอป', note: 'เปิดแอป เข้าหน้า เห็นหน้าขาย แชร์ ฯลฯ ระบุแพลตฟอร์มทุกแถว · เริ่มเก็บเมื่อแอป v1.2 ออก' },
  });
  O.chip = (src, fresh, opts) => {
    opts = opts || {};
    const s = SRC[src] || { label: src, note: '' };
    const label = opts.label || s.label;
    return '<span class="chip ' + esc(src) + (opts.stale ? ' stale' : '') + '" tabindex="0" role="note" title="' + esc(opts.note || s.note) + '" data-note="' + esc(label + ' — ' + (opts.note || s.note)) + '"><i></i>' + esc(label) + (fresh ? ' <span class="fresh">· ' + esc(fresh) + '</span>' : '') + '</span>';
  };
  O.pill = (t, cls) => '<span class="pill ' + (cls || 'neutral') + '">' + esc(t) + '</span>';
  const PLAT = { web: 'เว็บ', ios: 'iOS', android: 'Android', na: 'ไม่ระบุ', bot: 'บอท' };
  O.platLabel = (p) => PLAT[p] || p;
  O.plat = (p) => '<span class="plat ' + esc(p) + '">' + esc(PLAT[p] || p) + '</span>';
  O.spark = (series, big) => {
    const s = (series || []).map((v) => Number(v) || 0);
    if (s.length < 2) return '';
    const w = 120, h = big ? 64 : 34, pad = 3;
    let max = Math.max.apply(null, s), min = Math.min.apply(null, s);
    if (max === min) { max = min + 1; }
    const pts = s.map((v, i) => [(pad + (i * (w - pad * 2)) / (s.length - 1)).toFixed(1), (h - pad - ((v - min) * (h - pad * 2)) / (max - min)).toFixed(1)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    const last = pts[pts.length - 1];
    return '<svg class="spark' + (big ? ' big' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="' + d + ' L' + last[0] + ' ' + (h - 1) + ' L' + pts[0][0] + ' ' + (h - 1) + ' Z"/><path d="' + d + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.5"/></svg>';
  };
  O.bar = (label, value, max, cls, display) => {
    const p = max ? Math.max(value ? 2 : 0, Math.round((100 * (value || 0)) / max)) : 0;
    return '<div class="bar"><span>' + esc(label) + '</span><div class="track"><div class="fill ' + (cls || '') + '" style="width:' + p + '%"></div></div><span class="n num">' + esc(display == null ? num(value) : display) + '</span></div>';
  };
  O.card = (title, body, opts) => {
    opts = opts || {};
    return '<section class="card ' + (opts.cls || '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '><h2>' + esc(title) + (opts.lead ? ' <span class="lead">' + esc(opts.lead) + '</span>' : '') + (opts.right ? '<span class="right">' + opts.right + '</span>' : '') + '</h2>' + body + '</section>';
  };
  // A number that cannot be drawn without its source (the <Metric> contract).
  O.metric = (m) => {
    if (!m || !m.src) return '<div class="tile"><div class="l">' + esc(m && m.label) + '</div><div class="v">—</div><div class="small muted">ไม่มีแหล่งข้อมูล</div></div>';
    const dir = m.dir || 'flat';
    return '<div class="tile"><div class="l">' + esc(m.label) + '</div><div class="v num">' + esc(m.value) + '</div>' +
      (m.delta != null ? '<div class="d"><span class="' + dir + '">' + (dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•') + ' ' + esc(m.delta) + '</span>' + (m.vs ? '<span class="muted">' + esc(m.vs) + '</span>' : '') + '</div>' : '') +
      (m.spark ? O.spark(m.spark) : '') +
      '<div class="foot">' + (m.pill ? O.pill(m.pill[0], m.pill[1]) : '') + O.chip(m.src, m.fresh, { note: m.note }) + (m.src2 ? O.chip(m.src2, m.fresh2) : '') + '</div>' +
      (m.sub ? '<div class="small muted">' + esc(m.sub) + '</div>' : '') + '</div>';
  };
  O.say = (text) => {
    let t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(O.say._t); O.say._t = setTimeout(() => { t.hidden = true; }, 3200);
  };
  O.copy = (text) => {
    const done = () => O.say('คัดลอกแล้ว');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => O.say('คัดลอกไม่ได้ — กดค้างที่ข้อความแล้วคัดลอกเอง'));
    else O.say('คัดลอกไม่ได้ — กดค้างที่ข้อความแล้วคัดลอกเอง');
  };
  O.modal = (html) => {
    O.closeModal();
    const w = document.createElement('div');
    w.className = 'modalwrap'; w.id = 'modal';
    w.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    w.addEventListener('click', (e) => { if (e.target === w) O.closeModal(); });
    document.body.appendChild(w);
    const f = w.querySelector('input,button'); if (f) f.focus();
    return w;
  };
  O.closeModal = () => { const m = $('modal'); if (m) m.remove(); };
  O.drawer = (html) => {
    O.closeDrawer();
    const w = document.createElement('div');
    w.className = 'overlay'; w.id = 'drawer';
    w.innerHTML = '<aside class="drawerpanel" role="dialog" aria-modal="true">' + html + '</aside>';
    w.addEventListener('click', (e) => { if (e.target === w || e.target.closest('[data-close-drawer]')) O.closeDrawer(); });
    document.body.appendChild(w);
  };
  O.closeDrawer = () => { const d = $('drawer'); if (d) d.remove(); };
  O.soon = (phase, what) => '<div class="soon"><b>มาใน' + esc(phase) + '</b> — ' + esc(what) + '</div>';

  // ------------------------------------------------------------------ Supabase
  if (!CFG.url || !CFG.anonKey || !window.supabase) {
    document.getElementById('root').innerHTML = '<div class="gate"><div class="gatebox"><h2>ตั้งค่าไม่ครบ</h2><p>ไม่พบการตั้งค่าเชื่อมต่อ (cc/config.js) — แจ้ง Claude</p></div></div>';
    return;
  }
  const sb = (O.sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { storageKey: 'junypop-office', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }));
  O.rpc = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) {
      const msg = String(error.message || error.code || 'error');
      const e = new Error(msg);
      e.code = msg.startsWith('office:') ? msg.slice(7) : error.code || msg;
      if (['mfa_required', 'must_change_password', 'forbidden'].includes(e.code)) setTimeout(() => O.boot(), 0);
      throw e;
    }
    return data;
  };
  O.admin = async (body) => {
    const { data, error } = await sb.functions.invoke('office-admin', { body });
    if (error) {
      let code = 'network';
      try { code = (await error.context.json()).error || code; } catch (_) { /* no body */ }
      const e = new Error(code); e.code = code; throw e;
    }
    return data;
  };
  const ERR = {
    bad_code: 'รหัสตั้งค่าไม่ถูกต้อง (หรือถูกล็อกหลังผิด 10 ครั้ง)', email_exists: 'อีเมลนี้มีบัญชีอยู่แล้ว (อาจเป็นบัญชีผู้เล่น) — ใช้อีเมลอื่น เช่น ชื่อ+office@gmail.com',
    weak_password: 'รหัสผ่านต้องยาวอย่างน้อย 10 ตัว', bad_email: 'อีเมลไม่ถูกต้อง', already_claimed: 'มีเจ้าของแล้ว',
    mfa_required: 'ต้องยืนยันรหัส 6 หลักก่อน', owner_only: 'เฉพาะเจ้าของเท่านั้น', admin_only: 'สิทธิ์ดูอย่างเดียวทำรายการนี้ไม่ได้',
    cannot_change_owner: 'เปลี่ยนบัญชีเจ้าของไม่ได้', not_signed_in: 'กรุณาเข้าสู่ระบบใหม่', network: 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง',
    password_unchanged: 'ต้องตั้งรหัสใหม่ที่ไม่ใช่รหัสชั่วคราว', forbidden: 'บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน',
  };
  O.errText = (e) => ERR[e && e.code] || ERR[e && e.message] || (e && e.message) || 'เกิดข้อผิดพลาด';

  // ------------------------------------------------------------------ sign-in gate
  const root = document.getElementById('root');
  const brand = '<div class="brand"><div class="mark">J</div><div><div class="t1">JUNYPOP</div><div class="t2">DASHBOARD</div></div></div>';
  const gate = (inner) => { root.innerHTML = '<div class="gate"><form class="gatebox" id="gateform" novalidate>' + brand + inner + '</form></div>'; const f = root.querySelector('input'); if (f) f.focus(); };
  const field = (id, label, type, extra) => '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + type + '" ' + (extra || '') + '></div>';
  const busy = (on, msg) => { const b = root.querySelector('button[type=submit]'); if (b) { b.disabled = on; if (msg) b.textContent = msg; } };
  const showErr = (text) => { let e = root.querySelector('.err'); if (!e) { e = document.createElement('div'); e.className = 'err'; root.querySelector('.gatebox').insertBefore(e, root.querySelector('.gatebox button[type=submit]')); } e.textContent = text; };
  const onSubmit = (fn) => { $('gateform').addEventListener('submit', async (ev) => { ev.preventDefault(); try { await fn(); } catch (e) { showErr(O.errText(e)); busy(false); } }); };

  function loginScreen() {
    gate('<p class="small muted" style="margin:0">หลังบ้าน junypop.com/office · เฉพาะผู้ดูแลที่ได้รับสิทธิ์</p>' +
      field('em', 'อีเมล', 'email', 'autocomplete="username" required') + field('pw', 'รหัสผ่าน', 'password', 'autocomplete="current-password" required') +
      '<button class="btn primary" type="submit" style="justify-content:center">' + ico('lock') + 'เข้าสู่ระบบ</button>' +
      '<div class="small muted">เข้าครั้งแรกด้วยรหัสที่เจ้าของส่งให้? ใช้ช่องด้านบนได้เลย · ลืมรหัส → ขอให้เจ้าของออกรหัสใหม่จากหน้า ผู้ดูแล</div>' +
      '<div class="small muted">ยังไม่มีเจ้าของระบบ? <button type="button" class="linkbtn" id="toboot">ตั้งค่าเจ้าของครั้งแรก</button></div>');
    $('toboot').onclick = bootstrapScreen;
    onSubmit(async () => {
      busy(true, 'กำลังเข้าสู่ระบบ…');
      const { error } = await sb.auth.signInWithPassword({ email: $('em').value.trim(), password: $('pw').value });
      if (error) throw new Error(/invalid/i.test(error.message) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message);
      await O.boot();
    });
  }
  function bootstrapScreen() {
    gate('<h2>ตั้งค่าเจ้าของครั้งแรก</h2><p class="small muted" style="margin:0">ใช้รหัสตั้งค่าที่ขึ้นหลังรัน SQL 0018 · ทำได้ครั้งเดียว · ใช้อีเมลที่ไม่ใช่บัญชีผู้เล่น (เช่น ชื่อ+office@gmail.com)</p>' +
      field('bn', 'ชื่อที่แสดง', 'text', 'value="Guy" maxlength="60"') + field('be', 'อีเมลสำหรับเข้าหลังบ้าน', 'email', 'autocomplete="username" required') +
      field('bp', 'ตั้งรหัสผ่าน (อย่างน้อย 10 ตัว)', 'password', 'autocomplete="new-password" minlength="10" required') + field('bp2', 'ยืนยันรหัสผ่าน', 'password', 'autocomplete="new-password" required') +
      field('bc', 'รหัสตั้งค่าเจ้าของ', 'text', 'autocomplete="off" required style="text-transform:uppercase"') +
      '<button class="btn primary" type="submit" style="justify-content:center">สร้างบัญชีเจ้าของ</button><button type="button" class="linkbtn" id="tologin">กลับไปหน้าเข้าสู่ระบบ</button>');
    $('tologin').onclick = loginScreen;
    onSubmit(async () => {
      if ($('bp').value !== $('bp2').value) throw new Error('รหัสผ่านสองช่องไม่ตรงกัน');
      if ($('bp').value.length < 10) throw new Error(ERR.weak_password);
      busy(true, 'กำลังสร้าง…');
      await O.admin({ action: 'bootstrap', code: $('bc').value.trim(), email: $('be').value.trim(), password: $('bp').value, name: $('bn').value.trim() });
      const { error } = await sb.auth.signInWithPassword({ email: $('be').value.trim(), password: $('bp').value });
      if (error) throw error;
      await O.boot();
    });
  }
  function deniedScreen(me) {
    gate('<h2>บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน</h2><p class="small muted" style="margin:0">' + (me && me.disabled ? 'บัญชีถูกระงับโดยเจ้าของ' : 'ขอให้เจ้าของเพิ่มคุณจากหน้า ผู้ดูแล') + '</p><button class="btn" type="submit">ออกจากระบบ</button>');
    onSubmit(async () => { await sb.auth.signOut(); loginScreen(); });
  }
  function newPasswordScreen() {
    gate('<h2>ตั้งรหัสผ่านใหม่ก่อนใช้งาน</h2><p class="small muted" style="margin:0">รหัสที่ได้รับเป็นรหัสชั่วคราว ระบบจะเปิดหน้าอื่นเมื่อเปลี่ยนแล้วเท่านั้น</p>' +
      field('n1', 'รหัสผ่านใหม่ (อย่างน้อย 10 ตัว)', 'password', 'autocomplete="new-password" required') + field('n2', 'ยืนยันรหัสผ่าน', 'password', 'autocomplete="new-password" required') +
      '<button class="btn primary" type="submit" style="justify-content:center">บันทึกและเข้าใช้งาน</button>');
    onSubmit(async () => {
      if ($('n1').value.length < 10) throw new Error(ERR.weak_password);
      if ($('n1').value !== $('n2').value) throw new Error('รหัสผ่านสองช่องไม่ตรงกัน');
      busy(true, 'กำลังบันทึก…');
      const { error } = await sb.auth.updateUser({ password: $('n1').value });
      if (error) throw error;
      await sb.rpc('office_clear_must_change');
      await sb.auth.refreshSession();
      await O.boot();
    });
  }
  async function enrollScreen() {
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of (list && list.all) || []) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'JUNYPOP DASHBOARD ' + new Date().toISOString().slice(0, 10) });
    if (error) { gate('<div class="err">' + esc(error.message) + '</div><button class="btn" type="submit">ลองใหม่</button>'); onSubmit(() => O.boot()); return; }
    const qr = data.totp.qr_code.startsWith('data:') ? data.totp.qr_code : 'data:image/svg+xml;utf8,' + encodeURIComponent(data.totp.qr_code);
    gate('<h2>ตั้งรหัส 6 หลัก (ครั้งเดียว)</h2><p class="small muted" style="margin:0">เปิดแอป Google Authenticator หรือ 1Password บน iPhone → เพิ่มบัญชี → สแกน QR นี้ แล้วใส่รหัส 6 หลักที่เห็น · เจ้าของต้องใส่รหัสนี้ทุกครั้งที่เข้า</p>' +
      '<div class="qrimg"><img alt="QR สำหรับแอปยืนยันตัวตน" src="' + esc(qr) + '"></div><div class="small muted">สแกนไม่ได้? พิมพ์รหัสนี้แทน</div><div class="secret">' + esc(data.totp.secret) + '</div>' +
      field('tc', 'รหัส 6 หลัก', 'text', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="codeinput" required') +
      '<button class="btn primary" type="submit" style="justify-content:center">ยืนยัน</button>');
    onSubmit(async () => {
      busy(true, 'กำลังตรวจ…');
      const { error: e2 } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: $('tc').value.trim() });
      if (e2) throw new Error('รหัสไม่ถูกต้อง ลองรหัสล่าสุดในแอปอีกครั้ง');
      await O.boot();
    });
  }
  async function totpScreen() {
    const { data } = await sb.auth.mfa.listFactors();
    const f = ((data && data.totp) || []).find((x) => x.status === 'verified');
    if (!f) return enrollScreen();
    gate('<h2>ยืนยันรหัส 6 หลัก</h2><p class="small muted" style="margin:0">จากแอป Google Authenticator / 1Password ของคุณ</p>' +
      field('tc', 'รหัส 6 หลัก', 'text', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="codeinput" required') +
      '<button class="btn primary" type="submit" style="justify-content:center">เข้าสู่ระบบ</button><button type="button" class="linkbtn" id="signout">ออกจากระบบ</button>');
    $('signout').onclick = async () => { await sb.auth.signOut(); loginScreen(); };
    onSubmit(async () => {
      busy(true, 'กำลังตรวจ…');
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: $('tc').value.trim() });
      if (error) throw new Error('รหัสไม่ถูกต้อง ลองรหัสล่าสุดในแอปอีกครั้ง');
      await O.boot();
    });
  }

  // The whole state machine: session → staff? → password → TOTP → app.
  O.boot = async () => {
    const { data } = await sb.auth.getSession();
    if (!data.session) return loginScreen();
    const { data: me, error } = await sb.rpc('office_me');
    if (error) { gate('<div class="err">เชื่อมต่อไม่ได้: ' + esc(error.message) + '</div><button class="btn" type="submit">ลองใหม่</button>'); onSubmit(() => O.boot()); return; }
    O.me = me;
    if (!me || !me.staff) return deniedScreen(me);
    if (me.must_change_password) return newPasswordScreen();
    if (me.mfa_required && !me.mfa_enrolled) return enrollScreen();
    if (me.mfa_required && me.aal !== 'aal2') return totpScreen();
    startApp();
  };

  // ------------------------------------------------------------------ shell + router
  const PAGES = (O.PAGES = []);
  O.page = (id, def) => PAGES.push(Object.assign({ id }, def));
  const TABS = ['overview', 'players', 'ads', 'feedback'];
  O.state = { page: 'overview', params: {}, cache: {}, badges: {} };
  let theme = 'system';
  try { theme = localStorage.getItem('jp-office-theme') || 'system'; } catch (_) { /* storage blocked */ }
  const applyTheme = () => { if (theme === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme); };
  applyTheme();

  function parseHash() {
    const h = (location.hash || '#overview').slice(1);
    const [id, qs] = h.split('?');
    const params = {};
    new URLSearchParams(qs || '').forEach((v, k) => { params[k] = v; });
    return { id: PAGES.some((p) => p.id === id) ? id : 'overview', params };
  }
  O.go = (id, params) => {
    const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    if (location.hash !== '#' + id + qs) location.hash = id + qs; else render(true);
  };
  const byId = (id) => PAGES.find((p) => p.id === id);
  function nav() {
    const groups = [];
    PAGES.forEach((p) => { if (!groups.includes(p.group)) groups.push(p.group); });
    return groups.map((g) => '<div class="navgroup">' + esc(g) + '</div><nav class="nav">' + PAGES.filter((p) => p.group === g).map((p) => {
      const b = O.state.badges[p.id];
      return '<button data-go="' + p.id + '"' + (O.state.page === p.id ? ' aria-current="page"' : '') + '>' + ico(p.icon) + esc(p.title) + (b ? '<span class="badge">' + b + '</span>' : '') + '</button>';
    }).join('') + '</nav>').join('');
  }
  function tabs() {
    return '<nav class="tabs" role="tablist" aria-label="ส่วนหลัก">' + TABS.map((id) => {
      const p = byId(id); const b = O.state.badges[id];
      return '<button class="tab" role="tab" data-go="' + id + '" aria-selected="' + (O.state.page === id) + '">' + ico(p.icon) + esc(p.title) + (b ? '<span class="badge">' + b + '</span>' : '') + '</button>';
    }).join('') + '<button class="tab" role="tab" data-more="1" aria-selected="' + !TABS.includes(O.state.page) + '">' + ico('more') + 'เพิ่มเติม</button></nav>';
  }
  function shell() {
    const me = O.me;
    const roleTh = { owner: 'เจ้าของ', admin: 'แอดมิน', viewer: 'ดูอย่างเดียว' }[me.role] || me.role;
    root.innerHTML = '<div class="shell"><aside class="rail">' + brand + '<div id="nav">' + nav() + '</div>' +
      '<div class="railfoot"><div class="avatar">' + esc((me.display_name || me.email || '?').slice(0, 1).toUpperCase()) + '</div><div style="min-width:0"><div>' + esc(me.display_name || me.email) + '</div><div class="role">' + esc(roleTh) + (me.mfa_enrolled ? ' · TOTP' : '') + '</div></div>' +
      '<button class="btn sm ghost" data-signout="1" style="margin-left:auto;color:var(--rail-muted)" title="ออกจากระบบ">' + ico('out') + '</button></div></aside>' +
      '<div class="main"><header class="topbar"><div class="ttl"><h1 id="ptitle"></h1><div class="sub" id="psub"></div></div><div id="pfilters"></div>' +
      '<div class="tools"><span class="live" id="live"><i></i><span id="livet">…</span></span>' +
      '<button class="iconbtn" data-refresh="1" title="โหลดใหม่" aria-label="โหลดใหม่">' + ico('refresh') + '</button>' +
      '<button class="iconbtn" data-go="alerts" title="แจ้งเตือน" aria-label="แจ้งเตือน">' + ico('bell') + '<span class="dot" id="belldot" hidden></span></button>' +
      '<button class="iconbtn desktop-only" data-theme-cycle="1" title="สลับธีม" aria-label="สลับธีม">' + ico('sun') + '</button>' +
      '<button class="avatar" data-go="staff" title="บัญชีของฉัน" aria-label="บัญชีของฉัน">' + esc((me.display_name || me.email || '?').slice(0, 1).toUpperCase()) + '</button></div></header>' +
      '<main class="content" id="content"></main></div><div id="tabs">' + tabs() + '</div></div>';
  }
  O.setBadge = (id, n) => {
    O.state.badges[id] = n || 0;
    const nv = $('nav'); if (nv) nv.innerHTML = nav();
    const tb = $('tabs'); if (tb) tb.innerHTML = tabs();
    if (id === 'alerts') { const d = $('belldot'); if (d) { d.hidden = !n; d.textContent = n; } }
  };

  let seq = 0;
  async function render(keepScroll) {
    const { id, params } = parseHash();
    const p = byId(id);
    O.state.page = id; O.state.params = params;
    const nv = $('nav'); if (nv) nv.innerHTML = nav();
    const tb = $('tabs'); if (tb) tb.innerHTML = tabs();
    $('ptitle').textContent = p.title;
    $('psub').textContent = p.sub || '';
    $('pfilters').innerHTML = p.filters ? p.filters(params) : '';
    const content = $('content');
    const mine = ++seq;
    if (!O.state.cache[id + location.hash]) content.innerHTML = '<div class="loading">กำลังโหลด…</div>';
    else content.style.opacity = '.6';
    try {
      const data = p.load ? await p.load(params) : null;
      if (mine !== seq) return;
      O.state.cache[id + location.hash] = true;
      content.innerHTML = p.render(data, params);
      content.style.opacity = '';
      $('livet').textContent = 'อัปเดต ' + O.time(new Date());
      $('live').querySelector('i').style.background = '';
      if (p.after) p.after(data, params);
      if (!keepScroll) window.scrollTo(0, 0);
    } catch (e) {
      if (mine !== seq) return;
      content.style.opacity = '';
      $('live').querySelector('i').style.background = 'var(--crit)';
      $('livet').textContent = 'เชื่อมต่อไม่ได้';
      content.insertAdjacentHTML('afterbegin', '<div class="errbox">โหลดไม่สำเร็จ: ' + esc(O.errText(e)) + ' <button class="btn sm" data-refresh="1">ลองใหม่</button></div>');
      if (content.querySelector('.loading')) content.querySelector('.loading').remove();
    }
  }
  O.refresh = () => render(true);

  async function badges() {
    try {
      const a = await O.rpc('office_alerts_list', { p_limit: 1 });
      O.setBadge('alerts', a.unread);
    } catch (_) { /* shown by the page itself */ }
  }

  let started = false;
  const ORDER = ['overview', 'players', 'store', 'ads', 'feedback', 'alerts', 'content', 'commands', 'staff', 'sources'];
  function startApp() {
    PAGES.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
    shell();
    if (!started) {
      started = true;
      window.addEventListener('hashchange', () => render(false));
      setInterval(() => { if (!document.hidden && !$('modal') && !$('drawer')) { render(true); badges(); } }, 60000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && $('content')) { render(true); badges(); } });
      listenAlerts();
    }
    render(false);
    badges();
  }
  async function listenAlerts() {
    try {
      const { data } = await sb.auth.getSession();
      if (data.session) sb.realtime.setAuth(data.session.access_token);
      sb.channel('office:alerts', { config: { private: true } })
        .on('broadcast', { event: 'alert' }, (m) => {
          const a = (m && m.payload) || {};
          O.say((a.level === 'urgent' ? 'ด่วน: ' : 'แจ้งเตือน: ') + (a.title || ''));
          badges();
          if (['overview', 'alerts'].includes(O.state.page)) render(true);
        })
        .subscribe();
    } catch (_) { /* polling still covers it */ }
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest ? e.target.closest('[data-go],[data-more],[data-close-sheet],[data-refresh],[data-theme-cycle],[data-signout],[data-copy],[data-note]') : null;
    if (!t) return;
    if (t.hasAttribute('data-go')) { e.preventDefault(); const s = document.querySelector('.sheet'); if (s) { s.remove(); const sc = document.querySelector('.scrim'); if (sc) sc.remove(); } O.go(t.getAttribute('data-go')); return; }
    if (t.hasAttribute('data-more')) { const rest = PAGES.filter((p) => !TABS.includes(p.id)); document.body.insertAdjacentHTML('beforeend', '<div class="scrim" data-close-sheet="1"></div><div class="sheet" role="dialog" aria-label="เพิ่มเติม"><div class="grabber"></div><div class="list">' + rest.map((p) => '<button data-go="' + p.id + '">' + ico(p.icon) + esc(p.title) + '</button>').join('') + '</div></div>'); return; }
    if (t.hasAttribute('data-close-sheet')) { const s = document.querySelector('.sheet'); if (s) s.remove(); t.remove(); return; }
    if (t.hasAttribute('data-refresh')) { O.refresh(); badges(); return; }
    if (t.hasAttribute('data-theme-cycle')) { theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'; try { localStorage.setItem('jp-office-theme', theme); } catch (_) { /* ignore */ } applyTheme(); O.say('ธีม: ' + { light: 'สว่าง', dark: 'มืด', system: 'ตามระบบ' }[theme]); return; }
    if (t.hasAttribute('data-signout')) { await sb.auth.signOut(); location.hash = ''; O.boot(); return; }
    if (t.hasAttribute('data-copy')) { O.copy(t.getAttribute('data-copy')); return; }
    if (t.hasAttribute('data-note') && t.classList.contains('chip')) { O.say(t.getAttribute('data-note')); }
  });

  window.addEventListener('DOMContentLoaded', () => O.boot());
})();
