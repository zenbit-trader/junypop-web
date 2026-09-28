/* JUNYPOP DASHBOARD — โฆษณา (phase 2: per-ad view from ads_snapshot, rules, sync now) */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, ico } = O;

  const fresh = (t) => (t ? O.ago(t) : 'ยังไม่เคยซิงก์');
  const STATUS = { ACTIVE: 'good', ENABLED: 'good', RUNNING: 'good', PAUSED: 'neutral', CAMPAIGN_PAUSED: 'neutral', ADSET_PAUSED: 'neutral', PENDING_REVIEW: 'warn', IN_PROCESS: 'warn', NOT_RUNNING: 'warn', DISAPPROVED: 'crit', WITH_ISSUES: 'crit', LEARNING: 'brand', SUCCESS: 'good', FAIL: 'warn' };
  const st = (s) => (s ? pill(s, STATUS[s] || 'neutral') : '');
  const RULE_MODE = { auto: ['ทำเอง', 'crit'], alert: ['แจ้งเตือน', 'warn'], off: ['ปิด', 'neutral'] };
  const canAct = () => O.me && O.me.role !== 'viewer';

  function syncBar(d) {
    const last = (d.sync || []).find((l) => l.source === 'all');
    const failed = (d.sync || []).filter((l) => l.source !== 'all' && l.ok === false)[0];
    const cron = d.cron || {};
    const job = (cron.jobs || []).find((j) => j.name === 'office-sync');
    const auto = job && job.active;
    let h = '<div class="' + (auto ? 'note' : 'lagbanner') + '" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + ico(auto ? 'refresh' : 'info') + '<span style="flex:1;min-width:200px">';
    if (auto) h += '<b>ซิงก์อัตโนมัติทุก 15 นาที</b> · ล่าสุด ' + esc(fresh(last && (last.finished_at || last.started_at))) + (last && last.ok === false ? ' ' + pill('มีปัญหา', 'crit') : '');
    else if (d.snapshot) h += '<b>ยังไม่ได้เปิดซิงก์อัตโนมัติ</b> — Supabase → Database → Extensions เปิด pg_cron และ pg_net แล้วรันไฟล์ 0019 อีกครั้ง · ตอนนี้อัปเดตเมื่อกดซิงก์เท่านั้น';
    else h += 'ตัวเลขโฆษณาอัปเดตเมื่อ Claude สั่งซิงก์ · รัน SQL 0019 เพื่อเปิดซิงก์อัตโนมัติทุก 15 นาที';
    if (failed) h += ' · ' + esc(failed.source) + ' ล้มเหลว ' + esc(O.ago(failed.finished_at)) + ': ' + esc(String(failed.error || '').slice(0, 120));
    h += '</span>' + (canAct() && d.snapshot ? ' <button class="btn sm" data-syncnow="1">' + ico('refresh') + 'ซิงก์ตอนนี้</button>' : '') + '</div>';
    return h;
  }

  function budget(doc) {
    const ap = doc.apple || null;
    const fx = (ap && ap.fx_rate_thb_per_usd) || 33.5;
    const apMonth = ap ? (ap.spend_month_usd || 0) * fx : 0;
    const month = (doc.spent_month || 0) + apMonth, cap = doc.monthly_cap || 10000;
    const apToday = ap ? (ap.adgroups || []).reduce((t, g) => t + (g.spend_today_usd || 0), 0) * fx : 0;
    return card('งบเดือนนี้', '<div class="row"><span class="num" style="font-size:30px;font-weight:800">' + O.baht(month) + '</span><span class="muted">จากเพดาน ' + O.baht(cap) + '/เดือน</span><span class="grow"></span><span class="num">วันนี้ ' + O.baht((doc.spend_today || 0) + apToday, 2) + '</span></div>' +
      '<div class="meter' + (month > cap * 0.9 ? ' warn' : '') + '" style="margin-top:8px"><span style="width:' + Math.min(100, Math.max(1, (100 * month) / cap)) + '%"></span></div>' +
      '<div class="small muted" style="margin-top:6px">Meta ' + O.baht(doc.spent_month, 2) + ' (เฉพาะแคมเปญชื่อ JUNYPOP… เพราะบัญชีใช้ร่วมกับธุรกิจอื่น) · Apple ≈' + O.baht(apMonth, 2) + ' (' + num(ap ? ap.spend_month_usd : 0, 2) + ' USD × ' + num(fx, 2) + ')</div>',
    { right: chip('meta', fresh(doc.synced_at)) + ' ' + chip('apple', fresh(ap && ap.synced_at)) });
  }

  // The funnel the owner cares about, per ad: Meta click → our game → first lesson.
  function adFunnel(snap, dbByAd) {
    const meta = snap.filter((s) => s.source === 'meta');
    if (!meta.length) return '';
    const db = (s) => dbByAd.find((r) => r.campaign === s.utm_campaign && r.content === s.utm_content) || {};
    const rows = meta.map((s) => {
      const L = s.lifetime || {}, T = s.today || {}, r = db(s);
      const reach = L.clicks ? O.pct(r.visitors || 0, L.clicks) : null;
      const cpa = r.first_lessons ? L.spend / r.first_lessons : null;
      return '<tr><td><b>' + esc(s.ad_name) + '</b><span class="sub">' + esc(s.adset_name || '') + '</span></td><td>' + O.plat(s.platform) + '</td><td>' + st(s.effective_status) + '</td>' +
        '<td class="r num">' + O.baht(T.spend, 2) + '</td><td class="r num">' + O.baht(L.spend, 2) + '</td><td class="r num">' + num(L.impressions) + '</td><td class="r num">' + num(L.clicks) + '</td>' +
        '<td class="r num">' + (L.impressions ? num((100 * L.clicks) / L.impressions, 2) + '%' : '—') + '</td><td class="r num">' + (L.clicks ? O.baht(L.spend / L.clicks, 2) : '—') + '</td>' +
        '<td class="r num divider-col">' + num(r.visitors || 0) + (reach != null ? ' <span class="muted small">(' + reach + '%)</span>' : '') + '</td><td class="r num">' + num(r.played || 0) + '</td><td class="r num">' + num(r.first_lessons || 0) + '</td>' +
        '<td class="r">' + (cpa == null ? '—' : pill(O.baht(cpa, 2), cpa <= 12 ? 'good' : 'crit')) + '</td></tr>';
    }).join('');
    return card('จากคลิกโฆษณา ถึงคนจบบทแรก (ตลอดแคมเปญ)', '<div class="tablewrap"><table><thead><tr><th>โฆษณา</th><th>ไปที่</th><th>สถานะ</th><th class="r">วันนี้</th><th class="r">ใช้ทั้งหมด</th><th class="r">แสดงผล</th><th class="r">คลิกลิงก์</th><th class="r">CTR</th><th class="r">ต่อคลิก</th><th class="r divider-col">เปิดเกมได้</th><th class="r">เล่น</th><th class="r">จบบทแรก</th><th class="r">ต่อคนจบบทแรก</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="small muted" style="margin-top:6px">ซ้ายเส้นประ = Meta · ขวาเส้นประ = ฐานข้อมูลเรา (คนที่เข้ามาด้วย utm ของโฆษณานั้น ไม่ขึ้นกับคุกกี้) · "เปิดเกมได้" ต่ำกว่าคลิกมาก = คนรอหน้าเกมโหลดไม่ไหว · โฆษณา iOS ส่งคนไปหน้า /app/ ยอดดาวน์โหลดจาก App Store ยังนับไม่ได้</div>',
    { right: chip('meta') + ' ' + chip('db', 'สด') });
  }

  function adCards(snap) {
    const meta = snap.filter((s) => s.source === 'meta');
    if (!meta.length) return '';
    const sets = {};
    meta.forEach((s) => { (sets[s.adset_id] = sets[s.adset_id] || []).push(s); });
    return card('โฆษณาแต่ละชิ้น', '<div class="tree">' + Object.values(sets).map((list) => {
      const s0 = list[0];
      const spent = s0.lifetime_budget != null && s0.budget_remaining != null ? s0.lifetime_budget - s0.budget_remaining : null;
      return '<div class="node"><div class="head"><span class="statusdot ' + (s0.adset_status === 'ACTIVE' ? '' : 'off') + '"></span><span class="name">' + esc(s0.adset_name) + '</span>' + O.plat(s0.platform) + st(s0.adset_status) + st(s0.learning) +
        (s0.lifetime_budget ? pill('งบตลอด ' + O.baht(s0.lifetime_budget), 'money') : s0.daily_budget ? pill(O.baht(s0.daily_budget) + '/วัน', 'money') : '') + '</div>' +
        '<div class="meta">' + (spent != null ? '<span class="num">ใช้ไป ' + O.baht(spent, 2) + ' · เหลือ ' + O.baht(s0.budget_remaining, 2) + '</span>' : '') + '<span>' + esc(O.date(s0.start_time, true)) + ' → ' + esc(O.date(s0.end_time, true)) + '</span><span class="muted">' + esc(s0.campaign_name || '') + '</span></div>' +
        (s0.lifetime_budget && spent != null ? '<div class="meter" style="margin-top:8px;height:8px"><span style="width:' + Math.min(100, (100 * spent) / s0.lifetime_budget) + '%"></span></div>' : '') + '</div>' +
        list.map((a) => {
          const L = a.lifetime || {}, T = a.today || {};
          const fb = a.review && (a.review.feedback || a.review.issues);
          return '<div class="adcard">' + (a.thumbnail ? '<img class="thumb" alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(a.thumbnail) + '" style="object-fit:cover">' : '<div class="thumb">โฆษณา</div>') +
            '<div style="min-width:0"><div class="row"><b>' + esc(a.ad_name) + '</b>' + st(a.effective_status) + (a.preview ? '<a class="small" href="' + esc(a.preview) + '" target="_blank" rel="noopener">ดูตัวอย่าง ↗</a>' : '') + '</div>' +
            (fb ? '<div class="small" style="color:var(--crit-ink)">' + esc(JSON.stringify(fb).slice(0, 200)) + '</div>' : '') +
            '<div class="kv"><div>วันนี้<b class="num">' + O.baht(T.spend, 2) + '</b></div><div>ทั้งหมด<b class="num">' + O.baht(L.spend, 2) + '</b></div><div>แสดงผล<b class="num">' + num(L.impressions) + '</b></div><div>เข้าถึง<b class="num">' + num(L.reach) + '</b></div>' +
            '<div>คลิกลิงก์<b class="num">' + num(L.clicks) + '</b></div><div>หน้าโหลดเสร็จ<b class="num">' + num(L.lpv) + '</b></div><div>CPM<b class="num">' + (L.impressions ? O.baht((1000 * L.spend) / L.impressions, 2) : '—') + '</b></div><div>ผลลัพธ์ pixel<b class="num">' + num(L.results) + '</b></div></div></div></div>';
        }).join('');
    }).join('') + '</div><div class="small muted" style="margin-top:6px">"หน้าโหลดเสร็จ" และ "ผลลัพธ์ pixel" มาจาก Meta Pixel ที่ทำงานหลังผู้ชมกดยอมรับคุกกี้เท่านั้น จึงต่ำกว่าความจริง</div>', { right: chip('meta') });
  }

  function apple(doc) {
    const ap = doc.apple;
    if (!ap) return '';
    const c = ap.campaign || {}, fx = ap.fx_rate_thb_per_usd || 33.5;
    return card('Apple Ads · ค้นหาใน App Store', c.id ? '<div class="tree"><div class="node"><div class="head"><span class="statusdot ' + (c.serving_status === 'RUNNING' ? '' : 'warn') + '"></span><span class="name">' + esc(c.name) + '</span>' + O.plat('ios') + st(c.status) + st(c.serving_status) + pill('$' + num(c.daily_usd, 2) + '/วัน', 'money') + '</div>' +
      (c.serving_status !== 'RUNNING' ? '<div class="note" style="margin-top:8px">' + esc(ap.note || c.serving_reason) + '</div>' : '') + '</div>' +
      (ap.adgroups || []).map((g) => '<div class="node adset"><div class="head"><span class="name">กลุ่มโฆษณา ' + esc(g.name) + '</span>' + st(g.serving_status) + (g.search_match ? pill('Search Match', 'neutral') : '') + pill('คีย์เวิร์ด ' + num(g.keyword_count), 'neutral') + '</div>' +
        '<div class="kv"><div>วันนี้<b class="num">$' + num(g.spend_today_usd, 2) + '</b></div><div>7 วัน<b class="num">$' + num(g.spend7_usd, 2) + ' <span class="muted small">≈' + O.baht((g.spend7_usd || 0) * fx) + '</span></b></div><div>แสดงผล<b class="num">' + num(g.impressions7) + '</b></div><div>แตะ<b class="num">' + num(g.taps7) + '</b></div><div>ติดตั้ง (Apple นับ)<b class="num">' + num(g.installs7) + '</b></div><div>ต่อแตะ<b class="num">' + (g.cpt_usd == null ? '—' : '$' + num(g.cpt_usd, 2)) + '</b></div><div>ต่อการติดตั้ง<b class="num">' + (g.cpa_usd == null ? '—' : '$' + num(g.cpa_usd, 2)) + '</b></div><div>เสนอราคาสูงสุด<b class="num">$' + num(g.max_cpt_usd, 2) + '</b></div></div></div>').join('') + '</div>'
      : '<div class="empty">ไม่มีแคมเปญ Apple Ads ชื่อ JUNYPOP…</div>', { lead: 'อัตรา ' + num(fx, 2) + ' ฿/$ · ' + (ap.fx_date || ''), right: chip('apple', fresh(ap.synced_at)) });
  }

  function daily(d) {
    const days = {};
    (d.daily || []).forEach((r) => { const k = r.day; days[k] = days[k] || { meta: 0, apple: 0, clicks: 0 }; days[k][r.source] += Number(r.spend) || 0; if (r.source === 'meta') days[k].clicks += r.clicks || 0; });
    (d.daily_db || []).forEach((r) => { days[r.day] = days[r.day] || { meta: 0, apple: 0, clicks: 0 }; days[r.day].fl = r.first_lessons; });
    const cutoff = new Date(Date.now() - 14 * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
    const keys = Object.keys(days).filter((k) => k >= cutoff && (days[k].meta || days[k].apple || days[k].clicks || days[k].fl)).sort().reverse();
    if (!keys.length) return '';
    const fx = (d.doc && d.doc.apple && d.doc.apple.fx_rate_thb_per_usd) || 33.5;
    return card('รายวัน · 14 วัน', '<div class="tablewrap"><table><thead><tr><th>วัน</th><th class="r">Meta</th><th class="r">Apple</th><th class="r">คลิกลิงก์ (Meta)</th><th class="r divider-col">จบบทแรกจาก Meta</th><th class="r">ต่อคนจบบทแรก</th></tr></thead><tbody>' + keys.map((k) => {
      const r = days[k];
      return '<tr><td>' + esc(O.date(k)) + '</td><td class="r num">' + O.baht(r.meta, 2) + '</td><td class="r num">$' + num(r.apple, 2) + ' <span class="muted small">≈' + O.baht(r.apple * fx) + '</span></td><td class="r num">' + num(r.clicks) + '</td><td class="r num divider-col">' + num(r.fl || 0) + '</td><td class="r num">' + (r.fl ? O.baht(r.meta / r.fl, 2) : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>', { right: chip('meta') + ' ' + chip('apple') + ' ' + chip('db', 'สด') });
  }

  function rules(d) {
    const list = d.rules || [];
    if (!list.length) return card('กฎ guardrail', O.soon('หลังรัน SQL 0019', 'หยุดโฆษณาเว็บเองเมื่อใช้ ≥฿200 แล้วไม่มีคนจบบทแรก · เตือนงบใกล้เพดาน ใช้เกินแผนรายวัน ค่าคลิกแพง โฆษณาถูกปฏิเสธ'));
    return card('กฎ guardrail', '<div class="tablewrap"><table><thead><tr><th>กฎ</th><th class="r">ค่า</th><th>ทำอะไร</th>' + (O.me.role === 'owner' ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map((r) => {
      const m = RULE_MODE[r.mode] || [r.mode, 'neutral'];
      return '<tr><td style="white-space:normal">' + esc(r.label_th) + '</td><td class="r num">' + num(r.value, 2) + (r.min_n ? ' <span class="muted small">(≥' + num(r.min_n) + ')</span>' : '') + '</td><td>' + pill(m[0], m[1]) + '</td>' + (O.me.role === 'owner' ? '<td><button class="btn sm ghost" data-rule="' + esc(r.key) + '" data-value="' + esc(r.value) + '" data-mode="' + esc(r.mode) + '" data-label="' + esc(r.label_th) + '">แก้</button></td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div><div class="small muted" style="margin-top:6px">ตรวจทุกครั้งที่ซิงก์ · ทำเองได้เฉพาะกฎหยุดโฆษณาเว็บ (ย้อนกลับได้ใน Meta Ads Manager และมีบันทึก) · โฆษณา iOS ไม่ถูกหยุดเองเพราะยังนับยอดดาวน์โหลดไม่ได้ · กฎอื่นแจ้งเตือนเข้าแจ้งเตือน</div>', { right: chip('db') });
  }

  O.page('ads', {
    title: 'โฆษณา', icon: 'ads', group: 'การตลาด', sub: 'Meta + Apple Ads · ตั้งแต่คลิกจนถึงคนจบบทแรก',
    load: () => O.rpc('office_ads'),
    render(d) {
      const doc = d.doc || {};
      const snap = d.snapshot || [];
      let h = syncBar(d) + budget(doc);
      if (snap.length) {
        h += adFunnel(snap, d.db_by_ad || []) + daily(d) + adCards(snap);
      } else {
        const sets = doc.adsets || [];
        h += card('Meta · ad set', sets.length ? '<div class="tablewrap"><table><thead><tr><th>ad set</th><th>สถานะ</th><th class="r">วันนี้</th><th class="r">7 วันก่อนหน้า</th><th class="r">ผลลัพธ์ (pixel)</th></tr></thead><tbody>' + sets.map((s) =>
          '<tr><td><b>' + esc(s.name) + '</b></td><td>' + pill(s.status === 'active' ? 'ACTIVE' : 'PAUSED', s.status === 'active' ? 'good' : 'neutral') + '</td><td class="r num">' + (s.spend_today == null ? '—' : O.baht(s.spend_today, 2)) + '</td><td class="r num">' + O.baht(s.spend7, 2) + '</td><td class="r num">' + num(s.conversions) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ยังไม่มีแคมเปญ JUNYPOP ที่รันอยู่</div>', { right: chip('meta', fresh(doc.synced_at)) });
        const byAd = d.db_by_ad || [];
        if (byAd.length) h += card('ฐานข้อมูลเราเห็นอะไรจากแต่ละโฆษณา', '<div class="tablewrap"><table><thead><tr><th>utm_campaign</th><th>utm_content</th><th class="r">เปิดเกม</th><th class="r">เล่น</th><th class="r">จบบทแรก</th></tr></thead><tbody>' + byAd.map((r) => '<tr><td>' + esc(r.campaign) + '</td><td>' + esc(r.content || '—') + '</td><td class="r num">' + num(r.visitors) + '</td><td class="r num">' + num(r.played) + '</td><td class="r num">' + num(r.first_lessons) + '</td></tr>').join('') + '</tbody></table></div>', { right: chip('db', 'สด') });
      }
      h += apple(doc) + rules(d);
      h += card('แผนปรับปรุงโฆษณา', '<div class="small">ข้อเสนอของ Claude อยู่ในการ์ด "Claude แนะนำ" หน้าภาพรวม (กดอนุมัติแล้วเข้าคิว) · แผนแบบมีเวอร์ชันและ diff จะตามมาหลังทดสอบ ฿500 จบ 1 ต.ค.</div>', { right: chip('claude') });
      return h;
    },
  });

  document.addEventListener('click', async (e) => {
    const t = e.target.closest ? e.target.closest('[data-syncnow],[data-rule],[data-rulesave]') : null;
    if (!t) return;
    if (t.hasAttribute('data-rule')) {
      const mode = t.getAttribute('data-mode'), key = t.getAttribute('data-rule');
      O.modal('<h2>แก้กฎ</h2><p class="small muted" style="margin:0">' + esc(t.getAttribute('data-label')) + '</p>' +
        '<div class="field"><label for="rv">ค่า</label><input id="rv" type="number" step="any" value="' + esc(t.getAttribute('data-value')) + '"></div>' +
        '<div class="field"><label for="rm">ทำอะไร</label><select id="rm"><option value="alert"' + (mode === 'alert' ? ' selected' : '') + '>แจ้งเตือน</option>' + (key === 'kill_spend' ? '<option value="auto"' + (mode === 'auto' ? ' selected' : '') + '>ทำเอง (หยุดโฆษณา)</option>' : '') + '<option value="off"' + (mode === 'off' ? ' selected' : '') + '>ปิด</option></select></div>' +
        '<div class="row"><button class="btn primary" data-rulesave="' + esc(key) + '">บันทึก</button><button class="btn ghost" data-closemodal="1">ยกเลิก</button></div>');
      return;
    }
    t.disabled = true;
    try {
      if (t.hasAttribute('data-rulesave')) {
        await O.rpc('office_rules_set', { p_key: t.getAttribute('data-rulesave'), p_value: Number(document.getElementById('rv').value), p_mode: document.getElementById('rm').value });
        O.closeModal(); O.say('บันทึกกฎแล้ว'); O.refresh();
      } else {
        O.say('กำลังซิงก์ Meta + Apple…');
        const { error } = await O.sb.functions.invoke('office-sync', { body: {} });
        if (error) {
          let code = 'network';
          try { code = (await error.context.json()).error || code; } catch (_) { /* no body */ }
          throw new Error(code === 'too_soon' ? 'เพิ่งซิงก์ไปเมื่อไม่ถึงนาที ลองใหม่อีกครู่' : code);
        }
        O.say('ซิงก์เสร็จแล้ว'); O.refresh(); t.disabled = false;
      }
    } catch (err) {
      O.say(O.errText(err));
      t.disabled = false;
    }
  });
})();
