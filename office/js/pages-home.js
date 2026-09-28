/* JUNYPOP DASHBOARD — ภาพรวม, โฆษณา, App Store, เสียงลูกค้า */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, metric, bar, ico } = O;

  const fresh = (t) => (t ? O.ago(t) : 'ยังไม่เคยซิงก์');
  const dirOf = (a, b) => (a > b ? 'up' : a < b ? 'down' : 'flat');
  const signed = (d) => (d > 0 ? '+' : '') + num(d);

  // ------------------------------------------------------------------ ภาพรวม
  O.page('overview', {
    title: 'ภาพรวม', icon: 'home', group: 'หลัก',
    sub: 'สรุปวันนี้ · เปิดทุกเช้า 30 วินาที',
    load: () => Promise.all([O.rpc('office_overview'), O.rpc('office_alerts_list', { p_limit: 30 }),
      O.rpc('office_feedback', { p_days: 7, p_limit: 3 }).catch(() => null)]),
    render([ov, al, fb]) {
      O.setBadge('alerts', al.unread);
      O.setBadge('commands', ov.inbox.money_queued);
      const days = ov.days || [];
      const td = days[days.length - 1] || {}, yd = days[days.length - 2] || {};
      const src = ov.sources || {};
      let h = '';

      h += '<div class="inbox" aria-label="งานที่รอคุณ">' +
        '<a class="' + (ov.inbox.alerts_unread ? 'warn' : '') + '" data-go="alerts"><span class="n num">' + num(ov.inbox.alerts_unread) + '</span>แจ้งเตือนยังไม่รับทราบ</a>' +
        '<a class="' + (fb && fb.new_all ? 'warn' : '') + '" data-go="feedback"><span class="n num">' + (fb ? num(fb.new_all) : '—') + '</span>ฟีดแบ็กใหม่</a>' +
        '<a class="' + (ov.inbox.money_queued ? 'money' : '') + '" data-go="commands"><span class="n num">' + num(ov.inbox.money_queued) + '</span>คำสั่งใช้เงินในคิว</a>' +
        '<a data-go="commands"><span class="n num">' + num(ov.inbox.queued) + '</span>คำสั่งรอ Claude</a>' +
        '<span class="small muted" style="align-self:center">Claude ทำงานล่าสุด ' + esc(O.ago(ov.heartbeat)) + '</span></div>';

      const hot = (al.items || []).find((a) => !a.acked_at && a.level !== 'info');
      if (hot) {
        h += '<div class="alertstrip ' + (hot.level === 'urgent' ? '' : 'warn') + '">' + ico('warn') + '<div class="grow"><div>' + esc(hot.title) + '</div><div class="t">' + esc(hot.body || '') + ' · ' + esc(O.ago(hot.created_at)) + ' · ' + chip(hot.source) + '</div></div>' +
          (O.me.role !== 'viewer' ? '<button class="btn sm" data-ack="' + hot.id + '">รับทราบ</button>' : '') + '<button class="btn sm ghost" data-go="alerts">ดูทั้งหมด</button></div>';
      }

      const todos = (ov.notes && ov.notes.todos) || [];
      const recs = todos.length ? '<div class="recs">' + todos.slice(0, 3).map((t, i) =>
        '<div class="rec"><div class="k">' + (i + 1) + '</div><div class="body"><div style="font-weight:700">' + (t.money ? pill('฿ ใช้เงิน', 'money') + ' ' : '') + esc(t.title) + '</div><div class="why">' + esc(t.detail || '') + '</div>' +
        (t.action && O.me.role !== 'viewer' ? '<div class="acts"><button class="btn sm primary" data-enqueue="' + esc(t.action) + '"' + (t.money ? ' data-money="1"' : '') + '>' + ico('check') + (t.money ? 'อนุมัติ (ใช้เงิน)' : 'อนุมัติ') + '</button></div>' : '') + '</div></div>').join('') + '</div>'
        : '<div class="empty">ยังไม่มีข้อเสนอ — Claude เขียนหลังอ่านตัวเลข</div>';

      const hero = ov.hero || {};
      const split = hero.split || {};
      const tot = (split.web || 0) + (split.ios || 0) + (split.na || 0);
      const act = O.pct(hero.first_lessons7, hero.visitors7);
      const heroHtml = '<div class="hero"><div><div class="label">North Star · คนที่เล่นจบบทเรียนแรกวันนี้ ' + chip('db', 'สด') + '</div><div class="value num">' + num(hero.today) + '</div>' +
        '<div class="delta"><span class="' + dirOf(hero.today, hero.yesterday) + '">' + (hero.today >= hero.yesterday ? '▲ ' : '▼ ') + signed(hero.today - hero.yesterday) + '</span><span class="muted">vs เมื่อวาน ' + num(hero.yesterday) + '</span>' +
        (act != null ? pill('เปิดใช้งาน 7 วัน ' + act + '% · เป้า 25%', act >= 25 ? 'good' : 'warn') : '') + '</div></div><div style="width:min(100%,320px)">' + O.spark(hero.series, true) + '<div class="small muted" style="text-align:right">14 วันย้อนหลัง</div></div></div>' +
        (tot ? '<div class="splitbar" role="img" aria-label="แยกแพลตฟอร์ม"><span class="web" style="width:' + (100 * (split.web || 0)) / tot + '%"></span><span class="ios" style="width:' + (100 * (split.ios || 0)) / tot + '%"></span><span class="na" style="width:' + (100 * (split.na || 0)) / tot + '%"></span></div>' +
          '<div class="splitlegend"><span class="web"><i></i>เว็บ ' + num(split.web || 0) + '</span><span class="ios"><i></i>iOS ' + num(split.ios || 0) + '</span><span class="na"><i></i>ไม่ระบุ ' + num(split.na || 0) + '</span><span class="muted">บัญชีใหม่จากแอป v1.2 = แน่นอน · บัญชีเก่า = เดาจากสัญญาณอ้อม · Android — ยังไม่เปิด</span></div>' : '');

      h += '<div class="grid"><div class="c4">' + card('Claude แนะนำ', recs, { lead: ov.notes_at ? 'เขียนเมื่อ ' + O.date(ov.notes_at, true) : '', right: chip('claude') }) + '</div><div class="c8">' + card('จบบทแรกวันนี้', heroHtml) + '</div></div>';

      const now = ov.now || {};
      h += card('ตอนนี้', '<div class="nowrow">' +
        '<div class="now"><div class="v num">' + num(now.playing) + '</div><div class="l">กำลังเล่น (10 นาที)</div><div class="c">' + chip('db', 'สด') + '</div></div>' +
        '<div class="now"><div class="v num">' + num(now.sessions_hour) + '</div><div class="l">เล่นจบ 1 ชม.</div><div class="c">' + chip('db', 'สด') + '</div></div>' +
        '<div class="now"><div class="v num">' + num(now.new_hour) + '</div><div class="l">ผู้มาใหม่ 1 ชม.' + (now.bots_hour ? ' · บอท ' + num(now.bots_hour) : '') + '</div><div class="c">' + chip('db', 'สด') + '</div></div>' +
        '<div class="now"><div class="v">—</div><div class="l">บนเว็บตอนนี้</div><div class="c">' + chip('ga4', 'เชื่อมในเฟส 3', { stale: true }) + '</div></div></div>',
      { lead: 'ฐานข้อมูล = ทุกแพลตฟอร์ม ไม่รวมบอท' });

      const sers = (k) => days.slice(-7).map((d) => d[k]);
      const d1 = ov.d1 || {}, d1r = O.pct(d1.back, d1.base), d1p = O.pct(d1.back_prev, d1.base_prev);
      const pl = ov.plus || {}, plus7 = (pl.stripe7 || 0) + (pl.apple7 || 0) + (pl.code7 || 0);
      const s7 = ov.signups7 || 0, srate = O.pct(s7, ov.first_lessons7_any);
      const ads = ov.ads || {}, spendToday = (ads.meta_today || 0) + (ads.apple_today_thb || 0);
      const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const dailyPlan = (ads.cap || 10000) / dim;
      // Meta's last_7d preset excludes today, so today's spend is added on top.
      const meta7 = (ads.meta_7d || 0) + (ads.meta_today || 0);
      const cpa = ads.paid_first_lessons7 ? meta7 / ads.paid_first_lessons7 : null;
      h += '<div class="tiles">' +
        metric({ label: 'ผู้มาเยือนวันนี้', value: num(td.visitors), delta: signed((td.visitors || 0) - (yd.visitors || 0)), dir: dirOf(td.visitors, yd.visitors), vs: 'vs เมื่อวาน', spark: sers('visitors'), src: 'db', fresh: 'สด', sub: 'ไม่รวมบอท ' + num(td.bots) + ' · ทุกแพลตฟอร์ม', note: 'โปรไฟล์ใหม่ที่เกมสร้างตอนเปิดครั้งแรก ไม่รวมบอท (ดูจาก user agent) และบัญชีผู้ดูแล · คนที่ออกจากระบบแล้วเข้าใหม่ยังนับซ้ำ' }) +
        metric({ label: 'เปิดบัญชี 7 วัน', value: num(s7), delta: srate != null ? srate + '%' : '—', vs: 'ของคนจบบทแรก', pill: ['เป้า 20%', srate >= 20 ? 'good' : 'warn'], spark: sers('signups'), src: 'db', fresh: 'สด', sub: 'สัปดาห์ก่อน ' + num(ov.signups_prev7), note: 'นับวันที่ผูกบัญชีจริง (auth.identities) ไม่ใช่วันที่สร้าง guest' }) +
        metric({ label: 'D1 กลับมา 7 วัน', value: d1r == null ? '—' : d1r + '%', delta: d1p == null ? 'ยังไม่มีสัปดาห์ก่อน' : (d1r - d1p >= 0 ? '+' : '') + (d1r - d1p) + ' pt', dir: d1p == null ? 'flat' : dirOf(d1r, d1p), vs: 'vs สัปดาห์ก่อน', pill: ['เป้า 25%', d1r >= 25 ? 'good' : 'warn'], src: 'db', fresh: 'สด', sub: num(d1.back) + ' จาก ' + num(d1.base) + ' คน', note: 'คนที่เล่นวันแรกแล้วกลับมาเล่นวันถัดไป (นับจากเซสชัน · หลัง v1.2 จะนับการเปิดแอปด้วย)' }) +
        metric({ label: 'Plus ใหม่ 7 วัน', value: num(plus7), delta: signed(plus7 - (pl.prev7 || 0)), dir: dirOf(plus7, pl.prev7), vs: 'vs สัปดาห์ก่อน', pill: ['เป้า 2% ของคนสมัคร', s7 && O.pct(plus7, s7) >= 2 ? 'good' : 'warn'], src: 'stripe', src2: 'iap', sub: 'เว็บ ' + num(pl.stripe7) + ' · App Store ' + num(pl.apple7) + ' · โค้ด ' + num(pl.code7) + ' · สมาชิกอยู่ ' + num(pl.active) + (pl.sandbox7 ? ' · Sandbox ' + num(pl.sandbox7) + ' ไม่นับ' : '') }) +
        metric({ label: 'ใช้เงินโฆษณาวันนี้', value: O.baht(spendToday), delta: 'แผน ' + O.baht(dailyPlan), vs: 'ต่อวัน', pill: [spendToday <= dailyPlan * 1.1 ? 'ในแผน' : 'เกินแผน', spendToday <= dailyPlan * 1.1 ? 'good' : 'crit'], src: 'meta', fresh: fresh(ads.synced_at), src2: 'apple', fresh2: fresh(ads.apple_synced_at), sub: 'Meta ' + O.baht(ads.meta_today, 2) + ' · Apple ≈' + O.baht(ads.apple_today_thb, 2) + ' · เดือนนี้ ' + O.baht((ads.meta_month || 0) + (ads.apple_month_thb || 0)) }) +
        metric({ label: 'CPA 7 วัน (Meta)', value: cpa == null ? '—' : O.baht(cpa, 2), delta: O.baht(meta7, 2) + ' ÷ ' + num(ads.paid_first_lessons7), vs: 'คนจบบทแรกจาก Meta', pill: ['เพดาน ฿12', cpa == null ? 'neutral' : cpa <= 12 ? 'good' : 'crit'], src: 'meta', fresh: fresh(ads.synced_at), src2: 'db', fresh2: 'สด', note: 'ค่าใช้จ่าย Meta 7 วัน (รวมวันนี้) ÷ คนจบบทแรกที่มาจาก utm facebook/meta ในฐานข้อมูลเรา · Apple Ads แยกคิดในหน้าโฆษณา' }) +
        '</div>';

      h += '<div class="grid"><div class="c6">' + card('โฆษณา', '<div class="mini"><div class="big num">' + num(ads.active_meta) + '</div><div class="txt"><div class="t">ad set ของ Meta ที่ ACTIVE · เดือนนี้ ' + O.baht((ads.meta_month || 0) + (ads.apple_month_thb || 0)) + ' / ' + O.baht(ads.cap) + '</div>' +
        '<div class="s">Apple Ads: ' + esc(ads.apple_status || '—') + (ads.apple_reason ? ' (' + esc(ads.apple_reason) + ')' : '') + '</div></div><button class="btn sm" data-go="ads">ดูโฆษณา</button></div><div style="margin-top:8px">' + chip('meta', fresh(ads.synced_at)) + ' ' + chip('apple', fresh(ads.apple_synced_at)) + '</div>') + '</div>' +
        '<div class="c6">' + card('เสียงลูกค้า · 7 วัน', feedbackMini(fb) + '<div style="margin-top:8px"><button class="btn sm" data-go="feedback">ดูทั้งหมด</button></div>', { right: chip('events') }) + '</div></div>';

      const health = [['ฐานข้อมูล', src.db, 'db'], ['Meta Ads', src.meta, 'meta'], ['Apple Ads', src.apple_ads, 'apple'], ['Apple IAP', src.iap, 'iap'], ['Stripe', src.stripe, 'stripe'], ['Claude', src.claude, 'claude'], ['GA4', null, 'ga4'], ['App Store Connect', null, 'asc'], ['อีเวนต์แอป', fb && fb.app ? fb.app.last_event_at : null, 'events']];
      h += '<div class="health"><span>แหล่งข้อมูล:</span>' + health.map(([l, t, k]) => {
        const age = t ? (Date.now() - new Date(t).getTime()) / 3600000 : null;
        const cls = t == null ? 'off' : (k === 'meta' || k === 'apple' || k === 'claude') && age > 24 ? 'warn' : '';
        return '<span class="h ' + cls + '"><i></i>' + esc(l) + ' <span class="muted">' + esc(t == null ? (k === 'iap' || k === 'stripe' ? 'ยังไม่มีรายการ' : k === 'events' ? 'รอแอป v1.2' : 'ยังไม่เชื่อม') : k === 'db' ? 'สด' : O.ago(t)) + '</span></span>';
      }).join('') + '<a data-go="sources" style="cursor:pointer">รายละเอียด →</a></div>';
      return h;
    },
  });

  // ------------------------------------------------------------------ App Store
  O.page('store', {
    title: 'App Store', icon: 'store', group: 'ผู้ใช้', sub: 'สิ่งที่รู้ตอนนี้ฝั่ง iOS · ข้อมูลจาก Apple โดยตรงมาในเฟส 5',
    load: () => O.rpc('office_players', { p_days: 30, p_platform: 'ios' }),
    render(p) {
      const f = p.funnel || {}, r = p.revenue || {};
      const byProd = Object.entries(r.apple_by_product || {});
      let h = '<div class="lagbanner">' + O.ico('info') + '<span>ยังไม่ได้เชื่อม App Store Connect — ดาวน์โหลด, impressions, อัตราแปลง, crash และรีวิวจะมาในเฟส 5 (ต้องใช้ API key ระดับ Admin) · ตัวเลขด้านล่างมาจากฐานข้อมูลเราและ Apple IAP</span></div>';
      h += '<div class="tiles" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
        metric({ label: 'ผู้เล่น iOS ใหม่ 30 วัน', value: num(f.visitors), src: 'db', fresh: 'ประมาณ', sub: 'บัญชีใหม่: แอปบอกเอง · บัญชีเก่า: Sign in with Apple / การซื้อผ่าน Apple / user agent', note: 'บัญชีที่เกิดบนแอป v1.2 ขึ้นไประบุแพลตฟอร์มแน่นอน บัญชีก่อนหน้านั้นเดาจากสัญญาณอ้อม — ดูหน้าแหล่งข้อมูล' }) +
        metric({ label: 'จบบทแรก (iOS) 30 วัน', value: num(f.first_lesson), delta: (O.pct(f.first_lesson, f.visitors) ?? '—') + '%', vs: 'ของผู้เล่นใหม่', src: 'db', fresh: 'ประมาณ' }) +
        metric({ label: 'Plus ผ่าน App Store ที่ active', value: num(r.apple_active), src: 'iap', fresh: 'ทันที', sub: 'ใหม่ 30 วัน ' + num(r.apple_new) + (r.sandbox ? ' · Sandbox ' + num(r.sandbox) + ' ไม่นับ' : '') }) +
        metric({ label: 'ผู้เล่น iOS ที่ active 7 วัน', value: num((p.active || {}).wau), src: 'db', fresh: 'ประมาณ' }) + '</div>';
      h += card('การสมัคร Plus ผ่าน Apple (Production)', byProd.length ? '<div class="bars">' + byProd.map(([k, n]) => O.bar(k.replace('junypop_plus_', '').replace(':', ' · '), n, Math.max.apply(null, byProd.map((x) => x[1])))).join('') + '</div>' : '<div class="empty">ยังไม่มีการซื้อจริงผ่าน App Store</div>', { right: chip('iap', 'ทันที') });
      h += card('สิ่งที่หน้านี้จะแสดงเมื่อเชื่อม App Store Connect', '<ul class="small" style="margin:0;padding-left:18px"><li>สถานะรีลีส/รีวิวของ Apple และ build ล่าสุด</li><li>เรตติ้งหน้าร้านไทย + รีวิวใหม่ (ตอบได้จากแดชบอร์ด)</li><li>Funnel ร้านค้า: impressions → ดูหน้าแอป → ดาวน์โหลด แยกตามแหล่ง (ค้นหา / เว็บ junypop.com / Apple Ads)</li><li>ดาวน์โหลดจริงรายวันจาก Sales & Trends และ crash ตามเวอร์ชัน</li></ul>') +
        card('Google Play', '<div class="empty">ยังไม่เปิด — การ์ดนี้จะใช้เลย์เอาต์เดียวกันเมื่อ Android เปิดตัว</div>', { right: O.plat('android') });
      return h;
    },
  });

  // ------------------------------------------------------------------ เสียงลูกค้า
  const STATUS = { new: ['ใหม่', 'brand'], read: ['อ่านแล้ว', 'neutral'], planned: ['จะทำ', 'warn'], done: ['ทำแล้ว', 'good'], wontfix: ['ไม่ทำ', 'neutral'] };
  const TAG = { fix: ['ต้องแก้', 'crit'], add: ['ควรเพิ่ม', 'brand'], improve: ['ควรปรับ', 'warn'], praise: ['คำชม', 'good'], other: ['อื่นๆ', 'neutral'] };
  const moodPill = (m) => (O.MOOD[m] ? pill(O.MOOD[m][0] + ' ' + O.MOOD[m][1], O.MOOD[m][2]) : pill('💬 ข้อความ', 'neutral'));

  // Small summary for the overview card.
  function feedbackMini(fb) {
    if (!fb) return '<div class="empty">รอรัน SQL 0021 (เฟส 4)</div>';
    const sm = fb.summary || {}, md = sm.mood || {};
    if (!sm.total) return '<div class="empty">ยังไม่มีฟีดแบ็กใน 7 วัน · ปุ่ม "ส่งความคิดเห็น" อยู่ในตั้งค่า และแอปถามหลังจบบทที่ 3</div>';
    return '<div class="mini"><div class="big num">' + num(sm.total) + '</div><div class="txt"><div class="t">😞 ' + num(md['1']) + ' · 😐 ' + num(md['2']) + ' · 😊 ' + num(md['3']) + '</div><div class="s">ใหม่ยังไม่อ่าน ' + num(fb.new_all) + '</div></div></div>' +
      (fb.items || []).filter((i) => i.text).slice(0, 2).map((i) => '<div class="small" style="margin-top:6px">' + (O.MOOD[i.mood] ? O.MOOD[i.mood][0] + ' ' : '') + '“' + esc(String(i.text).slice(0, 120)) + '”</div>').join('');
  }

  const fbParams = (p) => ({ d: [7, 30, 90].includes(Number(p.d)) ? Number(p.d) : 30, s: ['all', 'new', 'planned'].includes(p.s) ? p.s : 'all' });
  const fbSeg = (name, cur, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button data-fbf="' + name + '" data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>';

  O.page('feedback', {
    title: 'เสียงลูกค้า', icon: 'chat', group: 'การตลาด', sub: 'ลูกค้าพูดอะไร ควรแก้ เพิ่ม ปรับอะไร · แอปทำงานดีไหม',
    filters(raw) {
      const q = fbParams(raw);
      return fbSeg('s', q.s, [['all', 'ทั้งหมด'], ['new', 'ยังไม่อ่าน'], ['planned', 'จะทำ']]) + ' ' + fbSeg('d', q.d, [[7, '7 วัน'], [30, '30 วัน'], [90, '90 วัน']]);
    },
    load: (raw) => O.rpc('office_feedback', { p_days: fbParams(raw).d, p_limit: 300 }),
    render(fb, raw) {
      const q = fbParams(raw || O.state.params || {});
      const sm = fb.summary || {}, md = sm.mood || {}, pl = sm.platform || {}, pr = fb.prompts || {}, app = fb.app || {};
      const canEdit = O.me.role !== 'viewer';
      const range = q.d + ' วัน';
      const answered = sm.prompt || 0, shown = pr.shown || 0;
      let h = '';
      h += '<div class="tiles" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
        O.metric({ label: 'ฟีดแบ็ก · ' + range, value: num(sm.total), src: 'events', fresh: 'ทันที', sub: 'มีข้อความ ' + num(sm.with_text) + ' · เว็บ ' + num(pl.web) + ' · iOS ' + num(pl.ios), note: 'ไม่รวมบัญชีทีมงานและบัญชีทดสอบ' }) +
        O.metric({ label: 'ยังไม่อ่าน (ทั้งหมด)', value: num(fb.new_all), src: 'events', pill: fb.new_all ? ['รอคุณ', 'warn'] : ['ว่าง', 'good'] }) +
        O.metric({ label: 'หน้า 😞 / 😐 / 😊', value: num(md['1']) + ' / ' + num(md['2']) + ' / ' + num(md['3']), src: 'events', sub: sm.total ? 'พอใจ ' + O.pct(md['3'], sm.total) + '% · ไม่พอใจ ' + O.pct(md['1'], sm.total) + '%' : '—' }) +
        O.metric({ label: 'ตอบคำถามหลังเล่น', value: shown ? O.pct(answered, shown) + '%' : '—', src: 'events', sub: 'ถาม ' + num(shown) + ' ครั้ง · ตอบ ' + num(answered) + ' · ข้าม ' + num(pr.dismissed), note: 'คำถาม "JUNYPOP เป็นยังไงบ้าง?" บนหน้าผลลัพธ์ หลังจบบทที่ 3 แล้วทุก 10 รอบ (ไม่เกิน 1 ครั้ง/14 วัน)' }) + '</div>';

      let items = fb.items || [];
      if (q.s !== 'all') items = items.filter((i) => i.status === q.s);
      const row = (i) => '<div class="fbitem" style="border-left-color:' + (i.mood === 1 ? 'var(--crit)' : i.mood === 3 ? 'var(--good)' : 'var(--line)') + '">' +
        '<div class="row" style="gap:6px;flex-wrap:wrap">' + moodPill(i.mood) + pill((STATUS[i.status] || [i.status])[0], (STATUS[i.status] || [0, 'neutral'])[1]) + (i.tag ? pill(TAG[i.tag][0], TAG[i.tag][1]) : '') + (i.internal ? pill('ทีมงาน/ทดสอบ', 'neutral') : '') + '</div>' +
        (i.text ? '<div style="margin:8px 0;white-space:pre-wrap">' + esc(i.text) + '</div>' : '<div class="small muted" style="margin:6px 0">เลือกหน้าอย่างเดียว ไม่ได้พิมพ์</div>') +
        '<div class="small muted">' + esc(O.date(i.at, true)) + ' · ' + (i.platform ? O.plat(i.platform) : 'ไม่ระบุ') + (i.v ? ' v' + esc(i.v) : '') + ' · ' + (i.source === 'prompt' ? 'จากคำถามหลังเล่น' : 'จากตั้งค่า') +
        ' · จบ ' + num((i.context || {}).lessons) + ' บท · ' + num((i.context || {}).sessions) + ' รอบ' + ((i.context || {}).plus ? ' · Plus' : '') +
        ' · <a data-person="' + esc(i.user_id) + '" style="cursor:pointer">ผู้เล่น ' + esc(String(i.user_id).slice(0, 6)) + (i.username ? ' (' + esc(i.username) + ')' : '') + '</a></div>' +
        (i.note ? '<div class="small" style="margin-top:4px">📝 ' + esc(i.note) + '</div>' : '') +
        (canEdit ? '<div class="acts" style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
          [['read', 'อ่านแล้ว'], ['planned', 'จะทำ'], ['done', 'ทำแล้ว'], ['wontfix', 'ไม่ทำ']].filter(([k]) => k !== i.status).map(([k, l]) => '<button class="btn sm' + (k === 'planned' ? ' primary' : ' ghost') + '" data-fbset="' + i.id + '" data-status="' + k + '">' + l + '</button>').join('') +
          '<select data-fbtag="' + i.id + '" aria-label="หมวด"><option value="">หมวด…</option>' + Object.entries(TAG).map(([k, [l]]) => '<option value="' + k + '"' + (i.tag === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
          '<button class="btn sm ghost" data-fbnote="' + i.id + '">โน้ต</button></div>' : '') + '</div>';

      const board = ['fix', 'add', 'improve'].map((k) => {
        const list = (fb.items || []).filter((i) => i.tag === k && i.status !== 'wontfix');
        return '<div class="theme"><h3>' + pill(TAG[k][0], TAG[k][1]) + ' <span class="small muted">' + num(list.length) + '</span></h3>' +
          (list.length ? list.slice(0, 5).map((i) => '<div class="small" style="margin-top:4px">' + (i.status === 'done' ? '✅ ' : i.status === 'planned' ? '🛠 ' : '• ') + esc(String(i.text || O.MOOD[i.mood]?.[1] || '').slice(0, 90)) + '</div>').join('') : '<div class="small muted">ยังไม่มี</div>') + '</div>';
      }).join('');

      h += '<div class="grid"><div class="c8">' + card('ข้อความจากผู้เล่น · ' + range + (q.s !== 'all' ? ' · ' + (q.s === 'new' ? 'ยังไม่อ่าน' : 'จะทำ') : ''), items.length ? items.map(row).join('') : '<div class="empty">ยังไม่มีฟีดแบ็กในช่วงนี้ · ผู้เล่นส่งได้จาก ตั้งค่า → ส่งความคิดเห็น และแอปถามหลังจบบทที่ 3</div>', { right: chip('events', 'ทันที') }) + '</div>' +
        '<div class="c4">' + card('บอร์ดทิศทาง', '<div class="themes" style="grid-template-columns:1fr">' + board + '</div><div class="small muted" style="margin-top:8px">ติดหมวดที่ข้อความแต่ละอัน · Claude ช่วยจัดหมวดและสรุปธีมได้ (สั่งในหน้าคำสั่งถึง Claude)</div>', { right: chip('claude') }) +
        card('ช่องทางที่จะตามมา', '<div class="small">' + O.soon('เฟส 5', 'รีวิว App Store: ดึงทุกชั่วโมง แจ้งเตือน 1–3 ดาว Claude ร่างคำตอบให้อนุมัติ') + O.soon('เฟส 6', 'คอมเมนต์ Facebook / Messenger') + '</div>') + '</div></div>';

      // How the app itself is doing (client_events).
      const ev = Object.entries(app.events24 || {}).sort((a, b) => b[1] - a[1]);
      const evMax = Math.max(1, ...ev.map((e) => e[1]));
      const vers = app.versions || [];
      const errs = app.errors || [];
      const p24 = app.platform24 || {};
      h += '<div class="grid"><div class="c6">' + card('แอปทำงานยังไง · 24 ชม.', (ev.length ? '<div class="bars">' + ev.slice(0, 12).map(([k, n]) => O.bar(O.EVENT[k] || k, n, evMax, k === 'error' || k === 'submit_rejected' ? 's3' : '')).join('') + '</div>' : '<div class="empty">ยังไม่มีอีเวนต์ — เริ่มเมื่อผู้เล่นใช้แอป v1.2 (เว็บได้ทันทีหลัง deploy, iOS หลัง Apple อนุมัติ)</div>') +
        '<div class="small muted" style="margin-top:6px">คนที่ส่งอีเวนต์ 24 ชม.: เว็บ ' + num(p24.web) + ' · iOS ' + num(p24.ios) + (p24.android ? ' · Android ' + num(p24.android) : '') + ' · ผลเล่นถูกปฏิเสธ 7 วัน ' + num(app.rejected7) + '</div>', { right: chip('events', app.last_event_at ? O.ago(app.last_event_at) : 'รอ v1.2') }) + '</div>' +
        '<div class="c6">' + card('เวอร์ชันที่ใช้อยู่ · 7 วัน', vers.length ? '<div class="tablewrap"><table><thead><tr><th>แพลตฟอร์ม</th><th>เวอร์ชัน</th><th class="r">ผู้เล่น</th><th>ล่าสุด</th></tr></thead><tbody>' + vers.map((v) => '<tr><td>' + O.plat(v.platform || 'na') + '</td><td>' + esc(v.version || '—') + '</td><td class="r num">' + num(v.players7) + '</td><td>' + esc(O.ago(v.last_seen)) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ยังไม่มีผู้เล่นบนแอป v1.2</div>', { right: chip('events') }) +
        card('ข้อผิดพลาด · 7 วัน', errs.length ? '<div class="tablewrap"><table><thead><tr><th>ข้อความ</th><th class="r">ครั้ง</th><th class="r">คน</th><th>ล่าสุด</th></tr></thead><tbody>' + errs.map((x) => '<tr><td style="white-space:normal">' + (x.kind === 'submit_rejected' ? pill('ผลเล่นถูกปฏิเสธ', 'crit') + ' ' : '') + esc(x.message) + ' <span class="small muted">' + esc(O.platLabel(x.platform || 'na')) + (x.v ? ' v' + esc(x.v) : '') + '</span></td><td class="r num">' + num(x.n) + '</td><td class="r num">' + num(x.players) + '</td><td>' + esc(O.ago(x.last)) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ไม่มีข้อผิดพลาด 🎉</div>', { right: chip('events') }) + '</div></div>';
      return h;
    },
  });

  document.addEventListener('click', async (e) => {
    const f = e.target.closest ? e.target.closest('[data-fbf]') : null;
    if (f) {
      const q = fbParams(O.state.params || {});
      q[f.getAttribute('data-fbf')] = f.getAttribute('data-v');
      O.go('feedback', { d: q.d, s: q.s });
      return;
    }
    const t = e.target.closest ? e.target.closest('[data-fbset],[data-fbnote]') : null;
    if (!t) return;
    t.disabled = true;
    try {
      if (t.hasAttribute('data-fbset')) {
        await O.rpc('office_feedback_set', { p_id: Number(t.getAttribute('data-fbset')), p_status: t.getAttribute('data-status') });
      } else {
        const note = window.prompt('โน้ตภายใน (ผู้เล่นไม่เห็น)');
        if (note == null) { t.disabled = false; return; }
        await O.rpc('office_feedback_set', { p_id: Number(t.getAttribute('data-fbnote')), p_note: note });
      }
      O.refresh();
    } catch (err) { O.say(O.errText(err)); t.disabled = false; }
  });
  document.addEventListener('change', async (e) => {
    const t = e.target.closest ? e.target.closest('[data-fbtag]') : null;
    if (!t) return;
    try {
      await O.rpc('office_feedback_set', { p_id: Number(t.getAttribute('data-fbtag')), p_tag: t.value });
      O.refresh();
    } catch (err) { O.say(O.errText(err)); }
  });

  // Shared buttons used on these pages.
  document.addEventListener('click', async (e) => {
    const t = e.target.closest ? e.target.closest('[data-enqueue],[data-ack]') : null;
    if (!t) return;
    t.disabled = true;
    try {
      if (t.hasAttribute('data-ack')) {
        await O.rpc('office_alert_ack', { p_id: Number(t.getAttribute('data-ack')) });
        O.say('รับทราบแล้ว');
      } else {
        await O.rpc('office_enqueue', { p_text: t.getAttribute('data-enqueue'), p_money: t.hasAttribute('data-money') });
        O.say('ส่งเข้าคิวแล้ว · รอ Claude รันคำสั่ง');
      }
      O.refresh();
    } catch (err) {
      O.say(O.errText(err));
      t.disabled = false;
    }
  });
})();
