/* JUNYPOP DASHBOARD — เงิน Plus: App Store and web (Stripe) side by side.
 * One question per column: how many people saw Plus, how many tried to pay,
 * how many actually paid, and what happened to the rest. Money is what the
 * customer paid (before Apple's cut / Stripe's fee). Data: office_money (0031). */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, bar } = O;

  const RANGES = [[7, '7 วัน'], [30, '30 วัน'], [90, '90 วัน'], [0, 'ทั้งหมด']];
  const params = (p) => ({ d: RANGES.some(([v]) => String(v) === String(p.d)) ? Number(p.d) : 30 });
  const rangeTh = (d) => (d ? d + ' วัน' : 'ทั้งหมด');

  // Apple: where a subscription stands now (apple_sub_state in 0031).
  const STATE = {
    trial: ['ทดลองฟรี', 'brand'], paid: ['จ่ายจริง', 'good'],
    retry: ['ตัดเงินไม่ผ่าน · Apple ยังลอง', 'crit'], grace: ['ตัดเงินไม่ผ่าน · ยังใช้ได้', 'warn'],
    failed: ['ตัดเงินไม่ผ่าน · จบแล้ว', 'crit'], cancelled: ['ยกเลิกเอง', 'neutral'],
    refunded: ['คืนเงิน', 'crit'], lapsed: ['หมดอายุ (รอ Apple แจ้ง)', 'neutral'], expired: ['หมดอายุ', 'neutral'],
  };
  // Stripe decline codes worth a Thai word; anything else is shown as Stripe sent it.
  const DECLINE = {
    insufficient_funds: 'เงินในบัตรไม่พอ', card_declined: 'ธนาคารปฏิเสธ', generic_decline: 'ธนาคารปฏิเสธ (ไม่บอกเหตุผล)',
    do_not_honor: 'ธนาคารไม่อนุมัติ', expired_card: 'บัตรหมดอายุ', incorrect_cvc: 'CVC ไม่ถูกต้อง', incorrect_number: 'เลขบัตรไม่ถูกต้อง',
    processing_error: 'ระบบธนาคารขัดข้อง', transaction_not_allowed: 'บัตรไม่เปิดซื้อออนไลน์', card_not_supported: 'บัตรไม่รองรับ',
    authentication_required: 'ยืนยันตัวตน (3D Secure) ไม่ผ่าน', payment_intent_authentication_failure: 'ยืนยันตัวตน (3D Secure) ไม่ผ่าน',
    lost_card: 'บัตรถูกแจ้งหาย', stolen_card: 'บัตรถูกแจ้งขโมย', fraudulent: 'ระบบกันโกงปฏิเสธ', currency_not_supported: 'บัตรไม่รับสกุลเงินนี้',
  };
  const FAIL_TYPE = {
    'payment_intent.payment_failed': ['บัตรไม่ผ่าน', 'crit'], 'checkout.session.async_payment_failed': ['จ่ายช้าไม่ผ่าน', 'crit'],
    'checkout.session.expired': ['เปิดหน้าจ่ายแล้วไม่จ่าย', 'neutral'], 'charge.refunded': ['คืนเงิน', 'warn'],
  };

  const plan = (p) => (String(p || '').includes('year') ? 'รายปี' : 'รายเดือน');
  const money = (amount, cur) => {
    const c = String(cur || 'THB').toUpperCase();
    return c === 'THB' ? O.baht(amount, amount % 1 ? 2 : 0) : c + ' ' + num(amount, 2);
  };
  const moneyList = (rows) => (rows && rows.length ? rows.map((r) => money(r.amount, r.currency)).join(' + ') : O.baht(0));
  const who = (uid, name) => (uid ? '<a data-person="' + esc(uid) + '" style="cursor:pointer">' + esc(name && name !== 'น้องป็อป' ? name : String(uid).slice(0, 6)) + '</a>' : '<span class="muted">บัญชีถูกลบ</span>');
  const played = (t) => (t ? esc(O.ago(t)) : '<span class="muted">ไม่เคยเล่น</span>');
  const step = (label, value, max, cls, sub) => bar(label, value, max, cls) + (sub ? '<div class="small muted" style="margin:-4px 0 2px">' + sub + '</div>' : '');

  function appleColumn(a, d) {
    const f = a.funnel || {}, o = f.outcome || {}, now = a.now || {}, m = a.money || {};
    const finished = (o.paid || 0) + (o.retrying || 0) + (o.declined || 0) + (o.cancelled || 0) + (o.refunded || 0) + (o.ended || 0);
    const conv = finished ? O.pct(o.paid || 0, finished) : null;
    const top = Math.max(1, f.viewers || 0, f.trials || 0);
    let h = '<div class="storehead apple"><div><div class="t">App Store (iOS)</div><div class="s">ทดลองฟรี 7 วัน แล้ว Apple ตัดเงินเองทุกรอบ · เงินผ่าน Apple</div></div>' + chip('iap', 'ทันที') + '</div>';

    h += card('เงินที่ลูกค้าจ่าย', '<div class="kv"><div>' + esc(rangeTh(d)) + '<b class="num">' + esc(moneyList(m.range)) + '</b></div><div>เดือนนี้<b class="num">' + esc(moneyList(m.month)) + '</b></div><div>ทั้งหมด<b class="num">' + esc(moneyList(m.all)) + '</b></div></div>' +
      '<div class="small muted" style="margin-top:8px">ครั้งแรก ' + num(m.first) + ' · ต่ออายุ ' + num(m.renewals) + ' · คืนเงิน ' + num(m.refunds) + ' · ราคาที่ลูกค้าจ่าย ก่อน Apple หักส่วนแบ่ง (15–30%) และภาษี</div>');

    h += card('จากหน้า Plus ถึงเงินจริง · ' + rangeTh(d), '<div class="bars">' +
      step('เห็นหน้า Plus (คน)', f.viewers, top, 's2') +
      step('กดสมัคร (ครั้ง)', f.starts, top, 's2', f.starts ? '' : 'เริ่มนับในแอป 1.2.5') +
      step('เริ่มทดลองฟรี', f.trials, top, '') +
      '</div><div class="outcomes">' +
      '<div class="small muted" style="margin:10px 0 6px">ผลของคนที่เริ่มทดลองในช่วงนี้</div><div class="bars">' +
      step('จ่ายจริง', o.paid || 0, Math.max(1, f.trials), 'good') +
      step('ตัดเงินไม่ผ่าน · Apple ยังลอง', o.retrying || 0, Math.max(1, f.trials), 'bad', o.retrying ? 'Apple ลองตัดใหม่เองได้ถึง 60 วัน ถ้าผ่านจะกลายเป็นจ่ายจริง' : '') +
      step('ตัดเงินไม่ผ่าน · จบแล้ว', o.declined || 0, Math.max(1, f.trials), 'bad') +
      step('ยกเลิกเองก่อนครบ', o.cancelled || 0, Math.max(1, f.trials), 'mute') +
      step('ยังทดลองอยู่', o.in_trial || 0, Math.max(1, f.trials), 's2') +
      ((o.refunded || o.ended) ? step('อื่นๆ (คืนเงิน/หมดอายุ)', (o.refunded || 0) + (o.ended || 0), Math.max(1, f.trials), 'mute') : '') +
      '</div></div>' +
      '<div class="kv"><div>ครบทดลองแล้ว<b class="num">' + num(finished) + ' คน</b></div><div>จ่ายจริง<b class="num">' + (conv == null ? '—' : conv + '%') + '</b></div><div>ตัดเงินไม่ผ่าน<b class="num">' + (finished ? O.pct((o.retrying || 0) + (o.declined || 0), finished) + '%' : '—') + '</b></div><div>ซื้อเลยไม่ทดลอง<b class="num">' + num(f.direct) + '</b></div></div>');

    h += card('สมาชิกตอนนี้', '<div class="kv"><div>จ่ายจริงอยู่<b class="num">' + num(now.paid) + '</b></div><div>ทดลองฟรีอยู่<b class="num">' + num(now.trial) + (now.trial_off ? ' <span class="small muted">(ปิดต่ออายุ ' + num(now.trial_off) + ')</span>' : '') + '</b></div><div>Apple กำลังลองตัด<b class="num">' + num((now.retry || 0) + (now.grace || 0)) + '</b></div><div>ต่ออายุไม่ผ่าน (เคยจ่าย)<b class="num">' + num(now.renew_fail) + '</b></div></div>' +
      (a.sandbox ? '<div class="small muted" style="margin-top:6px">Sandbox (ทดสอบ) ' + num(a.sandbox) + ' — ไม่นับ</div>' : ''));

    const subs = a.subs || [];
    h += card('การสมัครทั้งหมด (' + num(subs.length) + ')', subs.length ? '<div class="tablewrap"><table><thead><tr><th>เริ่ม</th><th>สถานะ</th><th>ครบรอบ</th><th class="r">จ่ายแล้ว</th><th>เล่นล่าสุด</th><th>ผู้เล่น</th></tr></thead><tbody>' + subs.map((s) => {
      const st = STATE[s.state] || [s.state, 'neutral'];
      const due = s.state === 'trial' ? 'ครบ ' + O.date(s.trial_ends_at, true)
        : s.state === 'retry' || s.state === 'grace' ? 'Apple ลองถึง ' + O.date(s.retry_until)
        : s.state === 'paid' ? (s.auto_renew ? 'ต่ออายุ ' : 'หมด ') + O.date(s.expires_at) : O.date(s.expires_at);
      return '<tr><td>' + esc(O.date(s.started_at)) + '<span class="sub">' + esc(plan(s.product)) + '</span></td><td style="white-space:normal">' + pill(st[0], st[1]) +
        (s.state === 'trial' && !s.auto_renew ? ' ' + pill('ปิดต่ออายุแล้ว', 'warn') : '') + '</td><td>' + esc(due) + '</td><td class="r num">' +
        (Number(s.paid) ? esc(money(Number(s.paid), s.currency)) : '<span class="muted">—</span>') + '</td><td>' + played(s.last_play) + '</td><td>' + who(s.user_id, s.username) + '</td></tr>';
    }).join('') + '</tbody></table></div><div class="small muted" style="margin-top:6px">เล่นล่าสุด = คนที่ยังเล่นอยู่คือคนที่การ์ด "อัปเดตวิธีชำระเงิน" ในแอป 1.2.5 ช่วยได้ · กดชื่อเพื่อดูทุกการกระทำ</div>'
      : '<div class="empty">ยังไม่มีการสมัครผ่าน App Store</div>', { right: chip('iap', 'ทันที') });
    return h;
  }

  function stripeColumn(s, d) {
    const f = s.funnel || {}, now = s.now || {}, m = s.money || {};
    const top = Math.max(1, f.viewers || 0, f.starts || 0, f.paid || 0);
    const recording = !!s.recording_since;
    let h = '<div class="storehead stripe"><div><div class="t">เว็บ (Stripe)</div><div class="s">จ่ายครั้งเดียวต่อรอบ (30 / 365 วัน) ไม่ต่ออายุเอง · ไม่มีทดลองฟรี</div></div>' + chip('stripe', 'ทันที') + '</div>';

    h += card('เงินที่ลูกค้าจ่าย', '<div class="kv"><div>' + esc(rangeTh(d)) + '<b class="num">' + O.baht((m.range || {}).amount) + '</b></div><div>เดือนนี้<b class="num">' + O.baht((m.month || {}).amount) + '</b></div><div>ทั้งหมด<b class="num">' + O.baht((m.all || {}).amount) + '</b></div></div>' +
      '<div class="small muted" style="margin-top:8px">' + num((m.range || {}).n) + ' รายการในช่วงนี้ · คืนเงิน ' + O.baht((m.refunded || {}).amount) + ' · ก่อนค่าธรรมเนียม Stripe</div>');

    h += card('จากหน้า Plus ถึงเงินจริง · ' + rangeTh(d), (recording ? '' : '<div class="lagbanner" style="margin-bottom:10px">' + O.ico('info') + '<span>ตอนนี้ Stripe ส่งมาเฉพาะการจ่ายสำเร็จ — บัตรไม่ผ่านและคนที่ปิดหน้าจ่ายจะเริ่มนับเมื่อเปิดอีเวนต์เพิ่มใน Stripe</span></div>') +
      '<div class="bars">' +
      step('เห็นหน้า Plus (คน)', f.viewers, top, 's2') +
      step('กดซื้อ (เปิดหน้า Stripe)', f.starts, top, 's2', f.starts ? '' : 'เริ่มนับหลัง deploy เว็บรอบนี้') +
      step('จ่ายสำเร็จ', f.paid, top, 'good') +
      step('บัตรไม่ผ่าน', recording ? f.declined : 0, top, 'bad', recording ? '' : 'รอเปิดอีเวนต์ใน Stripe') +
      step('เปิดหน้าจ่ายแล้วไม่จ่าย', recording ? f.abandoned : 0, top, 'mute', recording ? 'Stripe ปิดหน้าจ่ายที่ค้างเกิน 24 ชม.' : 'รอเปิดอีเวนต์ใน Stripe') +
      (f.async_failed ? step('จ่ายช้าไม่ผ่าน (PromptPay ฯลฯ)', f.async_failed, top, 'bad') : '') +
      '</div>' + (recording ? '<div class="small muted" style="margin-top:6px">นับบัตรไม่ผ่าน/ปิดหน้าจ่ายตั้งแต่ ' + esc(O.date(s.recording_since, true)) + '</div>' : ''));

    h += card('สมาชิกเว็บตอนนี้', '<div class="kv"><div>ใช้อยู่<b class="num">' + num(now.active) + '</b></div><div>หมดใน 7 วัน<b class="num">' + num(now.ending7) + '</b></div><div>หมดแล้วไม่ซื้อต่อ<b class="num">' + num(now.lapsed) + '</b></div><div>ซื้อซ้ำ (ต่ออายุเอง)<b class="num">' + num(now.repeat) + '</b></div></div>' +
      '<div class="small muted" style="margin-top:6px">เว็บไม่ตัดเงินอัตโนมัติ — ครบ 30 วันแล้วผู้เล่นต้องกดซื้อใหม่เอง</div>');

    const pays = s.payments || [];
    h += card('การจ่ายทั้งหมด (' + num(pays.length) + ')', pays.length ? '<div class="tablewrap"><table><thead><tr><th>วันที่</th><th class="r">ยอด</th><th>ครั้งที่</th><th>ใช้ได้ถึง</th><th>เล่นล่าสุด</th><th>ผู้เล่น</th></tr></thead><tbody>' + pays.map((p) =>
      '<tr><td>' + esc(O.date(p.at, true)) + '</td><td class="r num">' + esc(money(p.amount, p.currency)) + '<span class="sub">' + esc(p.days >= 365 ? 'รายปี' : p.days + ' วัน') + '</span></td><td>' + (p.nth > 1 ? pill('ครั้งที่ ' + p.nth, 'good') : 'ครั้งแรก') + '</td><td>' +
      (p.plus_until ? (new Date(p.plus_until) > new Date() ? esc(O.date(p.plus_until)) : '<span class="muted">หมดแล้ว ' + esc(O.date(p.plus_until)) + '</span>') : '—') + '</td><td>' + played(p.last_play) + '</td><td>' + who(p.user_id, p.username) + '</td></tr>').join('') + '</tbody></table></div>'
      : '<div class="empty">ยังไม่มีการจ่ายผ่านเว็บ</div>', { right: chip('stripe', 'ทันที') });

    const fails = s.failures || [];
    h += card('จ่ายไม่ผ่าน / ไม่จ่าย / คืนเงิน · ' + rangeTh(d), fails.length ? '<div class="tablewrap"><table><thead><tr><th>เวลา</th><th>อะไร</th><th class="r">ยอด</th><th>เหตุผล</th><th>บัตร</th><th>ผู้เล่น</th></tr></thead><tbody>' + fails.map((x) => {
      const t = FAIL_TYPE[x.type] || [x.type, 'neutral'];
      return '<tr><td>' + esc(O.date(x.at, true)) + '</td><td>' + pill(t[0], t[1]) + '</td><td class="r num">' + esc(money(x.amount, x.currency)) + '</td><td style="white-space:normal">' + esc(DECLINE[x.reason] || x.reason || '—') + '</td><td>' + esc(x.card || x.method || '—') + '</td><td>' + who(x.user_id) + '</td></tr>';
    }).join('') + '</tbody></table></div>'
      : '<div class="empty">' + (recording ? 'ไม่มีในช่วงนี้' : 'จะเริ่มแสดงเมื่อเปิดอีเวนต์เพิ่มใน Stripe') + '</div>', { right: chip('stripe') });
    return h;
  }

  O.page('money', {
    title: 'เงิน Plus', icon: 'coin', group: 'ผู้ใช้',
    sub: 'App Store กับเว็บแยกกัน · ทดลองฟรีไม่ใช่เงิน · เงินจริงคือที่ตัดผ่านแล้ว',
    filters(raw) {
      const q = params(raw);
      return '<div class="seg" role="group" aria-label="ช่วงเวลา">' + RANGES.map(([v, l]) => '<button data-moneyd="' + v + '" aria-pressed="' + (q.d === v) + '">' + l + '</button>').join('') + '</div>';
    },
    load: (raw) => O.rpc('office_money', { p_days: params(raw).d }),
    render(data, raw) {
      const d = params(raw || O.state.params || {}).d;
      let h = '<div class="grid moneycols"><div class="c6">' + appleColumn(data.apple || {}, d) + '</div><div class="c6">' + stripeColumn(data.stripe || {}, d) + '</div></div>';
      h += card('เงินจะเข้าบัญชีเมื่อไร', '<div class="grid"><div class="c6"><b>App Store</b><div class="small" style="margin-top:4px">Apple โอนให้ภายใน 45 วันหลังจบเดือนการเงินของ Apple ที่ขายได้ และต่อเมื่อยอดถึงขั้นต่ำและข้อมูลธนาคาร/ภาษีครบ ถ้าไม่ถึง Apple ยกยอดไปเดือนถัดไป · ยอดจริงหลังหักส่วนแบ่งดูใน App Store Connect → Payments and Financial Reports</div></div>' +
        '<div class="c6"><b>เว็บ (Stripe)</b><div class="small" style="margin-top:4px">Stripe โอนตามรอบที่ตั้งไว้ในบัญชี (Stripe Dashboard → Balance → Payouts) หลังหักค่าธรรมเนียม</div></div></div>');
      return h;
    },
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('[data-moneyd]') : null;
    if (b) O.go('money', { d: b.getAttribute('data-moneyd') });
  });
})();
