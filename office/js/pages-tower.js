/* JUNYPOP DASHBOARD — หอคอย (per-floor funnel of the ranked tower: who stands where, which floor stops people, bug signals) */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, bar } = O;

  const ZONES = ['', 'ประตูหอคอย', 'ห้องสมุด', 'ห้องเสียง', 'ห้องสะกด', 'ห้องประโยค', 'ห้องจับคู่', 'ห้องคัดแยก', 'ห้องสายฟ้า', 'ห้องเงา', 'ยอดหอคอย', 'ยอดฟ้า'];
  const zoneOf = (f) => (f >= 101 ? 11 : Math.floor((f - 1) / 10) + 1);
  const isBoss = (f) => f <= 100 && (f % 10 === 0 || f >= 91);
  const EVENT = { error: 'ข้อผิดพลาดในแอป', submit_rejected: 'server ปฏิเสธผลชั้น', play_quit: 'ออกกลางชั้น' };
  const ATLAS = 'https://claude.ai/artifact/En4fmrG1X1FjiEUDusF7xE';

  const seg = (cur, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button data-tf="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>';
  const days = (p) => ([7, 30, 90].includes(Number(p.d)) ? Number(p.d) : 30);
  const rateTone = (p) => (p == null ? 'neutral' : p >= 60 ? 'good' : p >= 35 ? 'warn' : 'crit');

  function ladder(d) {
    const zones = d.zones || [];
    if (!zones.length) return card('นักปีนอยู่โซนไหน', '<div class="empty">ยังไม่มีใครผ่านชั้น 1 ในซีซั่นนี้</div>', { right: chip('db', 'สด') });
    const max = Math.max(1, ...zones.map((z) => z.n));
    return card('นักปีนอยู่โซนไหน (ชั้นสูงสุดของแต่ละคน)', '<div class="bars">' + zones.map((z) => bar('โซน ' + z.zone + ' · ' + ZONES[z.zone], z.n, max, z.zone >= 10 ? 's2' : '')).join('') + '</div>' +
      '<div class="small muted" style="margin-top:6px">ซีซั่น ' + esc(d.season) + ' · ' + num(d.players) + ' คนผ่านอย่างน้อย 1 ชั้น จาก ' + num(d.tried) + ' คนที่ลองปีน · ชั้นสูงสุด ' + num(d.best) + ' · ค่ากลาง ' + num(d.median) + '</div>', { right: chip('db', 'สด') });
  }

  function floors(d, range) {
    const rows = {};
    (d.floors || []).forEach((f) => { rows[f.floor] = f; });
    (d.parked || []).forEach((p) => { rows[p.floor] = rows[p.floor] || { floor: p.floor, attempts: 0, passed: 0, players: 0 }; rows[p.floor].parked = p.n; });
    const keys = Object.keys(rows).map(Number).sort((a, b) => a - b);
    if (!keys.length) return card('ทีละชั้น · ' + range, '<div class="empty">ยังไม่มีการปีนในช่วงนี้</div>', { right: chip('db', 'สด') });
    let lastZone = 0;
    const body = keys.map((k) => {
      const f = rows[k];
      const z = zoneOf(k);
      const rate = f.attempts ? O.pct(f.passed, f.attempts) : null;
      let h = '';
      if (z !== lastZone) { lastZone = z; h += '<tr class="grouprow"><td colspan="8"><b>โซน ' + z + ' · ' + esc(ZONES[z]) + '</b></td></tr>'; }
      h += '<tr' + (rate != null && rate < 35 && f.attempts >= 5 ? ' class="hot"' : '') + '><td class="num"><b>' + (isBoss(k) ? '👑 ' : '') + k + '</b></td>' +
        '<td class="r num">' + num(f.attempts) + '</td><td class="r num">' + num(f.passed) + '</td>' +
        '<td class="r">' + (rate == null ? '—' : pill(rate + '%', rateTone(rate))) + '</td>' +
        '<td class="r num">' + num(f.players) + '</td>' +
        '<td class="r num">' + (f.median_s == null ? '—' : num(f.median_s) + ' วิ') + '</td>' +
        '<td class="r num">' + (f.accuracy == null ? '—' : num(f.accuracy) + '%') + '</td>' +
        '<td class="r num">' + (f.parked ? pill(num(f.parked) + ' คน', f.parked >= 3 ? 'warn' : 'neutral') : '—') + '</td></tr>';
      return h;
    }).join('');
    return card('ทีละชั้น · ' + range, '<div class="tablewrap"><table><thead><tr><th>ชั้น</th><th class="r">ปีน</th><th class="r">ผ่าน</th><th class="r">อัตราผ่าน</th><th class="r">ผู้เล่น</th><th class="r">เวลา (ค่ากลาง)</th><th class="r">ตอบถูก</th><th class="r">หยุดอยู่ที่นี่</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="small muted" style="margin-top:6px">"หยุดอยู่ที่นี่" = ชั้นสูงสุดของคนที่ไม่ได้ปีนมา 3 วันขึ้นไป (ไม่ขึ้นกับช่วงเวลาที่เลือก) · แถวที่ผ่านต่ำกว่า 35% จาก 5 ครั้งขึ้นไปจะถูกเน้น · กติกาและคำถามของทุกชั้นอยู่ใน <a href="' + ATLAS + '" target="_blank" rel="noopener">สารบัญชั้น ↗</a> (เปิดได้เฉพาะบัญชี Claude ของเจ้าของ)</div>',
    { right: chip('db', 'สด') });
  }

  function events(d, range) {
    const list = d.events || [];
    const ec = d.event_counts || {};
    const head = 'สัญญาณบั๊ก · ' + range;
    if (!list.length && !d.unknown_words) return card(head, '<div class="empty">ไม่มี error, ผลชั้นที่ถูกปฏิเสธ หรือคำที่ server ไม่รู้จัก</div>', { right: chip('events', 'ทันที') });
    let h = '';
    if (d.unknown_words) h += '<div class="lagbanner" style="margin-bottom:10px"><b>server ไม่รู้จักคำที่หอคอยสุ่ม ' + num(d.unknown_words) + ' คำตอบ</b> — แอปมีคำใหม่กว่า seed: รัน supabase/seed/parts ใน SQL Editor (คะแนนยังนับ แต่คำพวกนี้ยังไม่เข้าระบบทบทวน)</div>';
    if (list.length) {
      h += '<div class="tablewrap"><table><thead><tr><th>เมื่อ</th><th>อะไร</th><th>ที่ไหน</th><th>รายละเอียด</th></tr></thead><tbody>' + list.map((e) => {
        const p = e.props || {};
        const detail = p.message || p.code || p.where || '';
        return '<tr><td class="num">' + esc(O.date(e.at, true)) + '</td><td>' + pill(EVENT[e.name] || e.name, e.name === 'error' ? 'crit' : 'warn') + '</td><td>' + O.plat(e.platform) + ' <span class="muted small">' + esc(e.app_version || '') + '</span></td><td style="white-space:normal">' + esc(String(detail).slice(0, 160)) + (p.answers != null ? ' <span class="muted small">(' + num(p.answers) + ' ข้อ)</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    h += '<div class="small muted" style="margin-top:6px">error ' + num(ec.error || 0) + ' · server ปฏิเสธ ' + num(ec.submit_rejected || 0) + ' · ออกกลางชั้น ' + num(ec.play_quit || 0) + ' (ออกกลางชั้น = ตกชั้นตามกติกา ไม่ใช่บั๊ก) · แสดง 30 รายการล่าสุด · เฉพาะแอป v1.2 ขึ้นไปที่ส่งอีเวนต์</div>';
    return card(head, h, { right: chip('events', 'ทันที') });
  }

  O.page('tower', {
    title: 'หอคอย', icon: 'tower', group: 'ผู้ใช้', sub: 'ซีซั่นนี้ใครปีนถึงไหน ชั้นไหนคนตก ชั้นไหนมีบั๊ก',
    filters(raw) { return seg(days(raw), [[7, '7 วัน'], [30, '30 วัน'], [90, '90 วัน']]); },
    load: (raw) => O.rpc('office_tower', { p_days: days(raw) }),
    render(d) {
      const range = d.days + ' วัน';
      const a = d.attempts || {};
      const ec = d.event_counts || {};
      const rate = a.n ? O.pct(a.passed, a.n) : null;
      const bugs = (ec.error || 0) + (ec.submit_rejected || 0) + (d.unknown_words || 0);
      let h = '<div class="tiles" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
        O.metric({ label: 'นักปีนซีซั่นนี้', value: num(d.players), src: 'db', fresh: 'สด', sub: 'ผ่านอย่างน้อย 1 ชั้น · ลองปีน ' + num(d.tried) + ' คน', note: 'ไม่รวมทีมงาน บัญชีทดสอบ และบอท' }) +
        O.metric({ label: 'ชั้นสูงสุด · ค่ากลาง', value: num(d.best) + ' · ' + num(d.median), src: 'db', fresh: 'สด', sub: 'ชั้นสูงสุดที่มีคนถึง · ค่ากลางของทุกนักปีน' }) +
        O.metric({ label: 'ปีนใน ' + range, value: num(a.n), src: 'db', fresh: 'สด', pill: a.n ? ['ผ่าน ' + rate + '%', rateTone(rate)] : null, spark: (d.daily || []).map((x) => x.attempts), sub: num(a.players) + ' คน · ผ่าน ' + num(a.passed) + ' ครั้ง' }) +
        O.metric({ label: 'สัญญาณบั๊ก · ' + range, value: num(bugs), src: 'events', fresh: 'ทันที', pill: bugs ? ['ดูด้านล่าง', d.unknown_words ? 'crit' : 'warn'] : ['ปกติ', 'good'], sub: 'error ' + num(ec.error || 0) + ' · ปฏิเสธ ' + num(ec.submit_rejected || 0) + ' · คำที่ server ไม่รู้จัก ' + num(d.unknown_words || 0) }) +
        '</div>';
      h += '<div class="grid"><div class="c5">' + ladder(d) + '</div><div class="c7">' + events(d, range) + '</div></div>';
      h += floors(d, range);
      return h;
    },
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target.closest('[data-tf]') : null;
    if (!t) return;
    O.go('tower', { d: t.getAttribute('data-tf') });
  });
})();
