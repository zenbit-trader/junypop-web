/* JUNYPOP DASHBOARD — ผู้เล่น (funnel, retention, channels, gameplay, revenue, per-player timeline) */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, bar } = O;

  const SRC_LABEL = { facebook: 'Facebook (โฆษณา)', meta: 'Meta (fbclid)', google: 'Google', 'google-ads': 'Google Ads', tiktok: 'TikTok', referral: 'ชวนเพื่อน', direct: 'เข้าตรง (มีลิงก์แต่ไม่มี utm)', unknown: 'ไม่ทราบ (เข้าเว็บตรง หรือแอป)' };
  const srcLabel = (s) => SRC_LABEL[s] || (s && s.startsWith('ref:') ? 'ลิงก์จาก ' + s.slice(4) : s);
  const KIND = { lesson: 'บทเรียน', review: 'ทบทวน', boss: 'บอส', speed: 'Speed Run', battle: 'ดวลเพื่อน', tower: 'หอคอย', test: 'ข้อสอบท้ายบท' };
  const METHOD = { email: 'อีเมล', google: 'Google', apple: 'Apple' };
  const HOW = { apple: 'Apple (แน่นอน)', ua: 'user agent (ค่อนข้างแน่)', 'web-signal': 'สัญญาณเว็บ', none: 'ไม่มีสัญญาณ' };
  const DOW = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

  const seg = (name, cur, opts) => '<div class="seg" role="group">' + opts.map(([v, l, dis]) => '<button data-f="' + name + '" data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '"' + (dis ? ' disabled title="' + esc(dis) + '"' : '') + '>' + l + '</button>').join('') + '</div>';
  const params = (p) => ({ d: [1, 7, 30, 90].includes(Number(p.d)) ? Number(p.d) : 7, p: ['web', 'ios', 'na'].includes(p.p) ? p.p : 'all' });

  O.page('players', {
    title: 'ผู้เล่น', icon: 'users', group: 'ผู้ใช้', sub: 'ใครมา มาจากไหน ทำอะไร อยู่ต่อไหม',
    filters(raw) {
      const q = params(raw);
      return seg('p', q.p, [['all', 'ทั้งหมด'], ['web', 'เว็บ'], ['ios', 'iOS'], ['android', 'Android', 'ยังไม่เปิด'], ['na', 'ไม่ระบุ']]) + ' ' + seg('d', q.d, [[1, 'วันนี้'], [7, '7 วัน'], [30, '30 วัน'], [90, '90 วัน']]);
    },
    load: (raw) => { const q = params(raw); return O.rpc('office_players', { p_days: q.d, p_platform: q.p }); },
    render(d) {
      const f = d.funnel || {};
      const rangeTh = d.days === 1 ? 'วันนี้' : d.days + ' วัน';
      let h = '';
      if (d.platform !== 'all') h += '<div class="note"><b>กรอง: ' + esc(O.platLabel(d.platform)) + '</b> · ก่อนแอป v1.2 ระบบเดาแพลตฟอร์มจากสัญญาณอ้อม (Apple IAP / Sign in with Apple / user agent / ร่องรอยเว็บ) — ดูสัดส่วนความมั่นใจด้านล่าง</div>';

      const steps = [['ผู้มาเยือน', f.visitors, null], ['เล่น', f.played, 40], ['จบบทแรก', f.first_lesson, 25], ['เปิดบัญชี', f.signup, 20], ['Plus', f.plus, 2]];
      const funnel = '<div class="funnel">' + steps.map(([l, v, target], i) => {
        const base = i === 0 ? null : i === 2 ? f.visitors : steps[i - 1][1];
        const p = base ? O.pct(v, base) : null;
        return '<div class="step"><div class="v num">' + num(v) + '</div><div class="l">' + l + '</div><div class="p">' + (i === 0 ? '<span class="muted">คนใหม่ใน ' + rangeTh + '</span>' : '<span class="num">' + (p == null ? '—' : p + '%') + '</span>' + (target ? pill('เป้า ≥' + target + '%', p != null && p >= target ? 'good' : 'warn') : '')) + '</div></div>';
      }).join('') + '</div>';
      const byP = d.funnel_by_platform || {};
      const plats = Object.keys(byP).sort();
      const maxFl = Math.max(1, ...plats.map((k) => byP[k].first_lesson || 0));
      const split = d.platform === 'all' && plats.length ? '<div class="bars" style="margin-top:12px">' + plats.map((k) => bar(O.platLabel(k) + ' · จบบทแรก', byP[k].first_lesson, maxFl, k === 'ios' ? 's2' : k === 'na' ? 's3' : '')).join('') + '</div>' : '';
      const how = Object.entries(d.platform_how || {});
      const howTxt = how.length ? '<div class="small muted" style="margin-top:8px">ความมั่นใจของการแยกแพลตฟอร์ม: ' + how.map(([k, n]) => { const [pl, hw] = k.split(':'); return esc(O.platLabel(pl)) + ' จาก ' + esc(HOW[hw] || hw) + ' ' + num(n); }).join(' · ') + (d.bots ? ' · ตัดบอทออก ' + num(d.bots) : '') + '</div>' : '';
      h += card('Funnel · ' + rangeTh, funnel + split + howTxt, { lead: 'คนใหม่ที่มาถึงเกม → เล่น → จบบทแรก → ผูกบัญชี → Plus (% จบบทแรกเทียบผู้มาเยือน)', right: chip('db', 'สด') });

      const cell = (v, e) => v == null ? '<div class="cell empty">' + (e ? '—' : 'ยังไม่ครบ') + '</div>' : '<div class="cell num" style="background:var(--seq-' + (v >= 25 ? 3 : v >= 10 ? 2 : 1) + ')">' + v + '%</div>';
      const ret = d.retention || [];
      const a = d.active || {};
      h += '<div class="grid"><div class="c7">' + card('การกลับมาเล่น (Retention)', (ret.length ? '<div class="tri"><div></div><div class="h">คน</div><div class="h">D1</div><div class="h">D7</div><div class="h">D30</div>' + ret.map((r) =>
        '<div class="rl">สัปดาห์ ' + esc(O.date(r.week)) + '</div><div class="cell empty num">' + num(r.n) + '</div>' + cell(r.d1) + cell(r.d7) + cell(r.d30)).join('') + '</div>' : '<div class="empty">ยังไม่มีข้อมูล</div>') +
        '<div class="kv"><div>DAU<b class="num">' + num(a.dau) + '</b></div><div>WAU<b class="num">' + num(a.wau) + '</b></div><div>MAU<b class="num">' + num(a.mau) + '</b></div><div>DAU/MAU<b class="num">' + (a.mau ? O.pct(a.dau, a.mau) + '%' : '—') + '</b></div></div>' +
        '<div class="small muted" style="margin-top:6px">กลุ่ม = สัปดาห์ที่เล่นครั้งแรก · D1/D7/D30 = กลับมาเล่นในวันที่ 1/7/30 พอดี · "ยังไม่ครบ" = ยังไม่ถึงวันนั้น · GA4 (เว็บ) จะมาเป็นคอลัมน์แยกในเฟส 3</div>', { right: chip('db', 'สด') }) + '</div>' +
        '<div class="c5">' + card('เปิดบัญชีตามวิธี · ' + rangeTh, (() => {
          const sg = Object.entries(d.signups || {}); const mx = Math.max(1, ...sg.map((x) => x[1]));
          return (sg.length ? '<div class="bars">' + sg.map(([k, n]) => bar((METHOD[k] || k) + (k === 'apple' ? ' (= iOS)' : ''), n, mx, k === 'apple' ? 's2' : '')).join('') + '</div>' : '<div class="empty">ยังไม่มีคนผูกบัญชีในช่วงนี้</div>') +
            '<div class="small muted" style="margin-top:8px">ยังเป็น guest ' + num(d.guests) + ' คน · นับจากวันที่ผูกบัญชีจริง</div>';
        })(), { right: chip('db', 'สด') }) + '</div></div>';

      const ch = d.channels || [];
      h += card('มาจากช่องทางไหน · ' + rangeTh, ch.length ? '<div class="tablewrap"><table><thead><tr><th>ที่มา (first touch)</th><th class="r">มาเยือน</th><th class="r">เล่น</th><th class="r">จบบทแรก</th><th class="r">เปิดบัญชี</th><th class="r">Plus</th></tr></thead><tbody>' + ch.map((c) =>
        '<tr><td>' + esc(srcLabel(c.source)) + (c.medium ? '<span class="sub">' + esc(c.medium) + '</span>' : '') + '</td><td class="r num">' + num(c.visitors) + '</td><td class="r num">' + num(c.played) + '</td><td class="r num">' + num(c.first_lessons) + '</td><td class="r num">' + num(c.signups) + '</td><td class="r num">' + num(c.plus) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="small muted" style="margin-top:6px">จาก UTM / ลิงก์ที่มาในครั้งแรก (เก็บเฉพาะเว็บ) · ผู้เล่นแอป iOS จะอยู่ในแถว "ไม่ทราบ"</div>' : '<div class="empty">ยังไม่มีข้อมูล</div>', { right: chip('db', 'สด') });

      const daily = (d.daily || []).slice().reverse();
      h += card('รายวัน 30 วัน', '<div class="tablewrap"><table><thead><tr><th>วัน</th><th class="r">มาเยือน</th>' + (d.platform === 'all' ? '<th class="r">บอท</th>' : '') + '<th class="r">คนเล่น (DAU)</th><th class="r">เล่นจบ</th><th class="r">จบบทแรก</th><th class="r">เปิดบัญชี</th></tr></thead><tbody>' +
        daily.slice(0, 14).map((r) => '<tr><td>' + esc(O.date(r.dd)) + '</td><td class="r num">' + num(r.visitors) + '</td>' + (d.platform === 'all' ? '<td class="r num muted">' + num(r.bots) + '</td>' : '') + '<td class="r num">' + num(r.dau) + '</td><td class="r num">' + num(r.sessions) + '</td><td class="r num">' + num(r.first_lessons) + '</td><td class="r num">' + num(r.signups) + '</td></tr>').join('') + '</tbody></table></div>' +
        (daily.length > 14 ? '<details class="more"><summary>ดูอีก ' + (daily.length - 14) + ' วัน</summary><div class="tablewrap"><table><tbody>' + daily.slice(14).map((r) => '<tr><td>' + esc(O.date(r.dd)) + '</td><td class="r num">' + num(r.visitors) + '</td><td class="r num">' + num(r.dau) + '</td><td class="r num">' + num(r.sessions) + '</td><td class="r num">' + num(r.first_lessons) + '</td><td class="r num">' + num(r.signups) + '</td></tr>').join('') + '</tbody></table></div></details>' : ''), { right: chip('db', 'สด') });

      const hm = {}; let hmMax = 1;
      (d.heatmap || []).forEach((c) => { hm[c.dow + ':' + c.hour] = c.n; hmMax = Math.max(hmMax, c.n); });
      const lvl = (n) => (n ? Math.min(5, 1 + Math.floor((4 * n) / hmMax)) : 0);
      h += card('ช่วงเวลาที่เล่น · 28 วัน', '<div class="tablewrap"><div class="heat"><div></div>' + Array.from({ length: 24 }, (_, i) => '<div class="hh">' + (i % 3 === 0 ? i : '') + '</div>').join('') +
        DOW.map((dn, di) => '<div class="hl">' + dn + '</div>' + Array.from({ length: 24 }, (_, hr) => { const n = hm[(di + 1) + ':' + hr] || 0; return '<div class="hc h' + lvl(n) + '" title="' + dn + ' ' + hr + ':00 · ' + n + ' เซสชัน"></div>'; }).join('')).join('') + '</div></div><div class="small muted" style="margin-top:6px">เวลาไทย · สีเข้ม = เล่นมาก (สูงสุด ' + num(hmMax) + ' เซสชัน/ชั่วโมง)</div>', { right: chip('db', 'สด') });

      const kinds = Object.entries(d.kinds || {}).sort((x, y) => y[1] - x[1]);
      const kmax = Math.max(1, ...kinds.map((k) => k[1]));
      const worlds = d.worlds || [];
      h += '<div class="grid"><div class="c5">' + card('โหมดที่เล่น · ' + rangeTh, kinds.length ? '<div class="bars">' + kinds.map(([k, n]) => bar(KIND[k] || k, n, kmax)).join('') + '</div><div class="small muted" style="margin-top:6px">ข้อสอบท้ายบทยังถูกบันทึกเป็น "บทเรียน" — จะแก้ในแอป v1.2</div>' : '<div class="empty">ยังไม่มีการเล่นในช่วงนี้</div>', { right: chip('db', 'สด') }) + '</div>' +
        '<div class="c7">' + card('แต่ละโลก · ' + rangeTh, worlds.length ? '<div class="tablewrap"><table><thead><tr><th>โลก</th><th class="r">เล่นจบ</th><th class="r">ผู้เล่น</th><th class="r">ตอบถูก</th><th class="r">ดาวเฉลี่ย</th><th class="r">ผ่านบอส</th></tr></thead><tbody>' + worlds.map((w) =>
          '<tr><td>' + esc(w.name || w.world) + '</td><td class="r num">' + num(w.sessions) + '</td><td class="r num">' + num(w.players) + '</td><td class="r num">' + (w.accuracy == null ? '—' : w.accuracy + '%') + '</td><td class="r num">' + num(w.stars, 1) + '</td><td class="r num">' + num(w.boss_clears) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ยังไม่มีข้อมูล</div>', { right: chip('db', 'สด') }) + '</div></div>';

      const hard = d.hardest || [], a30 = d.answers30 || {};
      h += card('คำที่ยากที่สุด · 30 วัน', hard.length ? '<div class="tablewrap"><table><thead><tr><th>คำ</th><th>โลก</th><th class="r">ตอบ</th><th class="r">ถูก</th><th class="r">เวลาเฉลี่ย</th><th class="r">ใช้คำใบ้</th><th class="r">ถูกตอนเจอครั้งแรก</th></tr></thead><tbody>' + hard.map((w) =>
        '<tr><td><b>' + esc(w.word || w.word_id) + '</b><span class="sub">' + esc(w.meaning || '') + '</span></td><td>' + esc(w.world || '') + '</td><td class="r num">' + num(w.n) + '</td><td class="r">' + pill(w.accuracy + '%', w.accuracy < 50 ? 'crit' : w.accuracy < 70 ? 'warn' : 'neutral') + '</td><td class="r num">' + num(w.ms / 1000, 1) + ' วิ</td><td class="r num">' + num(w.hint) + '%</td><td class="r num">' + (w.acc_new == null ? '—' : w.acc_new + '%') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ยังมีคำตอบไม่พอ (ต้องมีอย่างน้อย 8 ครั้งต่อคำ)</div>',
      { lead: 'ทุกคำตอบ ' + num(a30.n) + ' ครั้ง · ถูก ' + (a30.accuracy == null ? '—' : a30.accuracy + '%') + ' · เฉลี่ย ' + num((a30.ms || 0) / 1000, 1) + ' วิ', right: chip('db', 'สด') });

      const t = d.tower || {}, ta = d.tower_attempts || {}, eco = Object.entries(d.economy || {}), r = d.revenue || {};
      const prods = Object.entries(r.apple_by_product || {});
      h += '<div class="grid"><div class="c4">' + card('หอคอยศัพท์ (คนจริงเท่านั้น)', '<div class="kv"><div>ซีซั่น<b class="num">' + esc(t.season) + '</b></div><div>ผู้เล่น<b class="num">' + num(t.players) + '</b></div><div>ชั้นสูงสุด<b class="num">' + num(t.best) + '</b></div><div>มัธยฐาน<b class="num">' + num(t.median) + '</b></div><div>ปีนใน ' + rangeTh + '<b class="num">' + num(ta.n) + '</b></div><div>ผ่าน<b class="num">' + (ta.n ? O.pct(ta.passed, ta.n) + '%' : '—') + '</b></div></div><div class="small muted" style="margin-top:6px">ไม่รวมนักปีนจำลองบนตารางอันดับ</div>', { right: chip('db', 'สด') }) + '</div>' +
        '<div class="c4">' + card('เหรียญที่ใช้ · ' + rangeTh, eco.length ? '<div class="bars">' + eco.map(([k, v]) => bar({ heart_refill: 'เติมหัวใจ', weak_drill: 'ฝึกจุดอ่อน' }[k] || k, v.coins, Math.max(...eco.map((x) => x[1].coins)), '', num(v.n) + ' ครั้ง')).join('') + '</div>' : '<div class="empty">ยังไม่มีการใช้เหรียญ</div>', { right: chip('db', 'สด') }) + '</div>' +
        '<div class="c4">' + card('รายได้ Plus · ' + rangeTh, '<div class="kv"><div>เว็บ (Stripe)<b class="num">' + num(r.stripe_n) + ' · ' + O.baht(r.stripe_thb) + '</b></div><div>App Store ใหม่<b class="num">' + num(r.apple_new) + '</b></div><div>App Store active<b class="num">' + num(r.apple_active) + '</b></div><div>โค้ด<b class="num">' + num(r.codes) + '</b></div><div>สมาชิก Plus ตอนนี้<b class="num">' + num(r.plus_active) + '</b></div></div>' +
          (prods.length ? '<div class="small muted" style="margin-top:6px">App Store: ' + prods.map(([k, n]) => esc(k.replace('junypop_plus_', '')) + ' ' + num(n)).join(' · ') + '</div>' : '') + (r.sandbox ? '<div class="small muted">Sandbox (ทดสอบ) ' + num(r.sandbox) + ' — ไม่นับ</div>' : ''), { right: chip('stripe') + ' ' + chip('iap') }) + '</div></div>';

      const rec = d.recent || [];
      h += card('ผู้เล่นล่าสุด', rec.length ? '<div class="tablewrap"><table><thead><tr><th>รหัส</th><th>แพลตฟอร์ม</th><th>ที่มา</th><th>บัญชี</th><th class="r">เล่นจบ</th><th class="r">XP</th><th>Plus</th><th>ล่าสุด</th></tr></thead><tbody>' + rec.map((p) =>
        '<tr style="cursor:pointer" data-person="' + esc(p.id) + '"><td><code>' + esc(p.id.slice(0, 6)) + '</code></td><td>' + O.plat(p.platform) + (p.how !== 'apple' ? ' <span class="small muted">' + (p.how === 'ua' ? '' : 'ประมาณ') + '</span>' : '') + '</td><td>' + esc(srcLabel(p.source)) + '</td><td>' + esc(METHOD[p.method] || 'guest') + '</td><td class="r num">' + num(p.sessions) + '</td><td class="r num">' + num(p.xp) + '</td><td>' + (p.plus ? pill('Plus', 'brand') : '<span class="muted">—</span>') + '</td><td>' + esc(O.date(p.seen, true)) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="small muted" style="margin-top:6px">รหัสนามแฝง · กดแถวเพื่อดูทุกการกระทำของผู้เล่นคนนั้น · เจ้าของเปิดดูอีเมลได้ทีละคน (บันทึกทุกครั้ง)</div>' : '<div class="empty">ยังไม่มีผู้เล่น</div>', { right: chip('db', 'สด') });
      return h;
    },
  });

  function eventLine(e) {
    const kind = KIND[e.kind] || e.kind;
    switch (e.type) {
      case 'session': return '<b>' + esc(kind) + '</b> ' + esc(e.world || '') + (e.lesson ? ' · ' + esc(e.lesson) : '') + ' · ถูก ' + num(e.correct) + '/' + num(e.total) + ' · ' + '★'.repeat(e.stars || 0) + ' · +' + num(e.xp) + ' XP · ' + num((e.ms || 0) / 1000) + ' วิ';
      case 'tower': return '<b>หอคอย ชั้น ' + num(e.floor) + '</b> ' + (e.passed ? pill('ผ่าน', 'good') : pill('ตก', 'crit')) + ' ถูก ' + num(e.correct) + '/' + num(e.total);
      case 'battle_created': return '<b>สร้างคำท้า</b> ' + esc(e.kind === 'speed' ? 'Speed Run' : 'ดวล');
      case 'battle_played': return '<b>เล่นคำท้า</b> ถูก ' + num(e.correct) + '/' + num(e.total);
      case 'coins_spent': return '<b>ใช้เหรียญ</b> ' + num(e.amount) + ' · ' + esc({ heart_refill: 'เติมหัวใจ', weak_drill: 'ฝึกจุดอ่อน' }[e.reason] || e.reason);
      case 'plus_stripe': return '<b>ซื้อ Plus (เว็บ)</b> ' + O.baht(e.thb) + ' · ' + num(e.days) + ' วัน';
      case 'plus_apple': return '<b>Plus ผ่าน App Store</b> ' + esc(String(e.product || '').replace('junypop_plus_', '')) + ' · ' + esc(e.status) + ' · ' + esc(e.last_event || '') + (e.env !== 'Production' ? ' ' + pill('Sandbox', 'neutral') : '');
      case 'plus_code': return '<b>ใช้โค้ด Plus</b>';
      default: return esc(e.type);
    }
  }

  async function openPerson(id) {
    O.drawer('<div class="dhead"><h2>ผู้เล่น <code>' + esc(id.slice(0, 6)) + '</code></h2><button class="btn sm" data-close-drawer="1">ปิด</button></div><div class="loading">กำลังโหลด…</div>');
    try {
      const t = await O.rpc('office_user_timeline', { p_uid: id });
      const p = t.person || {}, pr = t.profile || {}, w = t.words || {};
      const acq = (pr.acq && pr.acq.first) || {};
      const html = '<div class="dhead"><h2>ผู้เล่น <code>' + esc(id.slice(0, 6)) + '</code> ' + O.plat(p.platform) + '</h2><button class="btn sm" data-close-drawer="1">ปิด</button></div>' +
        '<div class="card"><div class="kv"><div>ชื่อในเกม<b>' + esc(pr.username || '—') + '</b></div><div>บัญชี<b>' + esc(METHOD[p.signup_method] || 'guest') + '</b></div><div>ที่มา<b>' + esc(srcLabel(p.source)) + '</b></div><div>เริ่มเล่น<b>' + esc(O.date(p.created_at, true)) + '</b></div>' +
        '<div>XP<b class="num">' + num(pr.xp) + '</b></div><div>เหรียญ<b class="num">' + num(pr.coins) + '</b></div><div>สตรีค<b class="num">' + num(pr.streak) + ' (สูงสุด ' + num(pr.longest_streak) + ')</b></div><div>ตอบถูก/ผิด<b class="num">' + num(pr.correct) + '/' + num(pr.wrong) + '</b></div>' +
        '<div>คำที่จำแม่น<b class="num">' + num(w.mastered) + ' / ' + num(w.tracked) + '</b></div><div>เวลาเล่นรวม<b class="num">' + num((pr.total_play_ms || 0) / 60000) + ' นาที</b></div><div>Plus ถึง<b>' + esc(pr.plus_until ? O.date(pr.plus_until) : '—') + '</b></div><div>แคมเปญ<b>' + esc(acq.cmp || '—') + '</b></div></div>' +
        (O.me.role === 'owner' ? '<div class="row" style="margin-top:10px"><button class="btn sm" data-reveal="' + esc(id) + '">' + O.ico('lock') + 'ดูอีเมล (บันทึกการเปิดดู)</button><span id="revealed" class="small"></span></div>' : '') + '</div>' +
        O.card('ทุกการกระทำ (ล่าสุดก่อน)', (t.events || []).length ? '<div class="timeline">' + t.events.map((e) => '<div class="tl"><div class="when">' + esc(O.date(e.at, true)) + '</div><div>' + eventLine(e) + '</div></div>').join('') + '</div>' : '<div class="empty">ยังไม่มีการกระทำที่บันทึก</div>', { right: chip('db', 'สด') }) +
        '<div class="small muted">ก่อนแอป v1.2 เห็นเฉพาะการกระทำที่ส่งถึงเซิร์ฟเวอร์ (เล่นจบ หอคอย ดวล เหรียญ การซื้อ) — การเปิดแอป เข้าหน้า เห็นหน้าขาย จะเพิ่มในแอป v1.2</div>';
      document.querySelector('.drawerpanel').innerHTML = html;
    } catch (e) {
      document.querySelector('.drawerpanel .loading').outerHTML = '<div class="errbox">' + esc(O.errText(e)) + '</div>';
    }
  }

  document.addEventListener('click', async (e) => {
    const f = e.target.closest ? e.target.closest('[data-f]') : null;
    if (f && !f.disabled) {
      const q = params(O.state.params);
      q[f.getAttribute('data-f')] = f.getAttribute('data-v');
      O.go('players', { d: q.d, p: q.p });
      return;
    }
    const row = e.target.closest ? e.target.closest('[data-person]') : null;
    if (row) { openPerson(row.getAttribute('data-person')); return; }
    const rv = e.target.closest ? e.target.closest('[data-reveal]') : null;
    if (rv) {
      rv.disabled = true;
      try {
        const email = await O.rpc('office_reveal_email', { p_uid: rv.getAttribute('data-reveal') });
        document.getElementById('revealed').textContent = email || '(ไม่มีอีเมล — ผู้เล่นยังเป็น guest)';
      } catch (err) { O.say(O.errText(err)); rv.disabled = false; }
    }
  });
})();
