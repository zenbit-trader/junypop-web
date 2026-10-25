/* JUNYPOP DASHBOARD — บันได 5,000 คำ (who climbs, where they stand, which steps they miss, which pictures they report as unclear) */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, bar } = O;

  const seg = (cur, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button data-lf="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>';
  const days = (p) => ([7, 30, 90].includes(Number(p.d)) ? Number(p.d) : 30);

  // Free-world pictures ship inside the web build, Plus ones are streamed
  // from /images/words: try the first, fall back to the second.
  const thumb = (id) => '<img class="ladthumb" alt="" loading="lazy" src="../assets/assets/images/words/' + esc(id) + '.webp" onerror="if(!this.dataset.f){this.dataset.f=1;this.src=\'../images/words/' + esc(id) + '.webp\'}else{this.style.visibility=\'hidden\'}">';

  function standing(d) {
    const bands = d.bands || [];
    if (!d.climbers) return card('ผู้เล่นอยู่ช่วงไหนของบันได', '<div class="empty">ยังไม่มีใครไต่บันได</div>', { right: chip('db', 'สด') });
    const max = Math.max(1, ...bands.map((b) => b.n));
    return card('ผู้เล่นอยู่ช่วงไหนของบันได (ข้อที่ยืนอยู่ตอนนี้)', '<div class="bars">' + bands.map((b) => bar('ข้อ ' + b.label, b.n, max, '')).join('') + '</div>' +
      '<div class="small muted" style="margin-top:6px">' + num(d.climbers) + ' คนอยู่บนบันได · ข้อสูงสุดที่มีคนถึง ' + num(d.best) + ' จาก ' + num(d.length) + ' · ค่ากลาง ' + num(Math.round(d.median)) + '</div>', { right: chip('db', 'สด') });
  }

  function reports(d, range) {
    const list = d.reports || [];
    const head = 'ภาพที่ผู้เล่นแจ้งว่าดูไม่ออก · ' + range;
    if (!list.length) return card(head, '<div class="empty">ยังไม่มีใครแจ้งภาพ</div>', { right: chip('events', 'ทันที') });
    return card(head, '<div class="tablewrap"><table><thead><tr><th></th><th>คำ</th><th class="r">ข้อ</th><th class="r">คนแจ้ง</th><th class="r">ล่าสุด</th></tr></thead><tbody>' + list.map((r) =>
      '<tr' + (r.players >= 3 ? ' class="hot"' : '') + '><td>' + thumb(r.word_id) + '</td><td style="white-space:normal"><b>' + esc(r.word || r.word_id) + '</b> <span class="muted small">' + esc(r.meaning || '') + '</span></td>' +
      '<td class="r num">' + (r.step ? num(r.step) : '—') + '</td><td class="r">' + pill(num(r.players) + ' คน', r.players >= 3 ? 'warn' : 'neutral') + '</td><td class="r num">' + esc(O.date(r.last_at, true)) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="small muted" style="margin-top:6px">จากปุ่ม "ภาพนี้ดูไม่ออก? แจ้งเรา" ในเกม · แถวที่มี 3 คนขึ้นไปถูกเน้น — วาดใหม่ด้วย <code>tools/art run words --only &lt;id&gt; --force</code></div>',
    { right: chip('events', 'ทันที') });
  }

  function missed(d, range) {
    const list = d.missed || [];
    const head = 'ข้อที่คนตอบผิดบ่อย · ' + range;
    if (!list.length) return card(head, '<div class="empty">ยังไม่มีคำตอบผิดในช่วงนี้</div>', { right: chip('db', 'สด') });
    return card(head, '<div class="tablewrap"><table><thead><tr><th></th><th>คำ</th><th class="r">ข้อ</th><th class="r">ผิด / ตอบ</th></tr></thead><tbody>' + list.map((m) => {
      const rate = O.pct(m.misses, m.tries);
      return '<tr><td>' + thumb(m.word_id) + '</td><td style="white-space:normal"><b>' + esc(m.word || m.word_id) + '</b> <span class="muted small">' + esc(m.meaning || '') + '</span></td>' +
        '<td class="r num">' + (m.step ? num(m.step) : '—') + '</td><td class="r">' + num(m.misses) + ' / ' + num(m.tries) + ' ' + pill(rate + '%', rate >= 60 ? 'crit' : rate >= 35 ? 'warn' : 'neutral') + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
      '<div class="small muted" style="margin-top:6px">ผิดบ่อยอาจแปลว่าคำยาก หรือภาพทำให้เข้าใจผิด — ดูคู่กับรายการภาพที่ถูกแจ้ง</div>',
    { right: chip('db', 'สด') });
  }

  O.page('ladder', {
    title: 'บันได', icon: 'ladder', group: 'ผู้ใช้', sub: 'บันได 5,000 คำ: ใครไต่ถึงไหน ข้อไหนคนพลาด ภาพไหนดูไม่ออก',
    filters(raw) { return seg(days(raw), [[7, '7 วัน'], [30, '30 วัน'], [90, '90 วัน']]); },
    load: (raw) => O.rpc('office_ladder', { p_days: days(raw) }),
    render(d) {
      const range = d.days + ' วัน';
      const rep = (d.reports || []).reduce((s, r) => s + r.players, 0);
      let h = '<div class="tiles" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
        O.metric({ label: 'อยู่บนบันได', value: num(d.climbers), src: 'db', fresh: 'สด', sub: 'เคยเล่น ' + num(d.started) + ' คน', note: 'ไม่รวมทีมงาน บัญชีทดสอบ และบอท' }) +
        O.metric({ label: 'ข้อสูงสุด · ค่ากลาง', value: num(d.best) + ' · ' + num(Math.round(d.median)), src: 'db', fresh: 'สด', sub: 'จาก ' + num(d.length) + ' ข้อ' }) +
        O.metric({ label: 'คำตอบใน ' + range, value: num(d.answers), src: 'db', fresh: 'สด', pill: d.answers ? ['ถูก ' + num(d.accuracy) + '%', d.accuracy >= 70 ? 'good' : 'warn'] : null, spark: (d.daily || []).map((x) => x.answers), sub: num(d.players) + ' คนเล่น' }) +
        O.metric({ label: 'ภาพที่ถูกแจ้ง · ' + range, value: num((d.reports || []).length), src: 'events', fresh: 'ทันที', pill: rep ? [num(rep) + ' ครั้ง', 'warn'] : ['ไม่มี', 'good'], sub: 'กดแจ้งจากในเกม' }) +
        '</div>';
      h += '<div class="grid"><div class="c5">' + standing(d) + '</div><div class="c7">' + reports(d, range) + '</div></div>';
      h += missed(d, range);
      return h;
    },
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest ? e.target.closest('[data-lf]') : null;
    if (!t) return;
    O.go('ladder', { d: t.getAttribute('data-lf') });
  });
})();
