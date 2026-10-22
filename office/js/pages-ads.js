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

  // 0028's office_ads carries `delivering` per row and `totals` from the
  // per-day table; older servers only have the document, so fall back.
  const running = (s) => s.delivering != null ? !!s.delivering : (s.effective_status === 'ACTIVE' && s.adset_status === 'ACTIVE' && (!s.end_time || new Date(s.end_time) > new Date()));
  const stillSpending = (s) => running(s) || ((s.d7 || {}).spend || 0) > 0;
  // Status pill that tells the truth about a finished campaign.
  const stOf = (s) => running(s) ? st(s.effective_status) : s.effective_status === 'PAUSED' || s.adset_status === 'PAUSED' ? pill('หยุดไว้', 'neutral') : pill('จบแล้ว', 'neutral');
  const ruleOf = (d, k, dflt) => { const r = (d.rules || []).find((x) => x.key === k); return r && r.value != null ? Number(r.value) : dflt; };

  // ChatGPT spend from the per-day table (0030 totals) or the sync document.
  function gptSpend(d) {
    const g = (d.doc || {}).chatgpt || null, tot = d.totals || {};
    const pick = (k, dk) => (tot[k] != null ? Number(tot[k]) : g ? Number(g[dk] || 0) : 0);
    const pend = (g && g.pending && g.pending.today) || {};
    return { g, today: pick('chatgpt_today', 'spend_today'), week: pick('chatgpt_7d', 'spend7'), month: pick('chatgpt_month', 'spend_month'), plan: g ? Number(g.plan_today_thb || 0) : 0, pendClicks: pend.clicks || 0, pendEst: pend.est_thb != null ? Number(pend.est_thb) : null };
  }

  function budget(d) {
    const doc = d.doc || {}, ap = doc.apple || null, tot = d.totals || null;
    const fx = (ap && ap.fx_rate_thb_per_usd) || 33.5;
    const cap = ruleOf(d, 'monthly_cap', doc.monthly_cap || 10000);
    const metaMonth = tot ? Number(tot.meta_month) : (doc.spent_month || 0);
    const apMonthUsd = tot ? Number(tot.apple_month_usd) : (ap ? ap.spend_month_usd || 0 : 0);
    const metaToday = tot ? Number(tot.meta_today) : (doc.spend_today || 0);
    const apTodayUsd = tot ? Number(tot.apple_today_usd) : (ap ? (ap.adgroups || []).reduce((t, g) => t + (g.spend_today_usd || 0), 0) : 0);
    const meta7 = tot ? Number(tot.meta_7d) : (doc.spend7 || 0) + (doc.spend_today || 0);
    const ap7Usd = tot ? Number(tot.apple_7d_usd) : (ap ? ap.spend7_usd || 0 : 0);
    const gpt = gptSpend(d);
    const month = metaMonth + apMonthUsd * fx + gpt.month, today = metaToday + apTodayUsd * fx + gpt.today, week = meta7 + ap7Usd * fx + gpt.week;
    const appleRunning = !!(ap && ap.campaign && ap.campaign.serving_status === 'RUNNING');
    const metaPlan = doc.plan_today_thb != null ? Number(doc.plan_today_thb) : (doc.adsets || []).filter((s) => s.status === 'active').reduce((t, s) => t + (s.daily || 0), 0);
    const applePlanUsd = appleRunning ? (ap.campaign.daily_usd || 0) : 0;
    const plan = metaPlan + applePlanUsd * fx + gpt.plan;
    const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const planMonth = plan * dim;
    return card('งบเดือนนี้', '<div class="row"><span class="num" style="font-size:30px;font-weight:800">' + O.baht(month) + '</span><span class="muted">จากเพดาน ' + O.baht(cap) + '/เดือน</span><span class="grow"></span><span class="num">วันนี้ ' + O.baht(today, 2) + '</span><span class="muted">·</span><span class="num">7 วัน (รวมวันนี้) ' + O.baht(week) + '</span></div>' +
      '<div class="meter' + (month > cap * 0.9 ? ' warn' : '') + '" style="margin-top:8px"><span style="width:' + Math.min(100, Math.max(1, (100 * month) / cap)) + '%"></span></div>' +
      '<div class="small muted" style="margin-top:6px">Meta ' + O.baht(metaMonth, 2) + ' (เฉพาะแคมเปญชื่อ JUNYPOP… เพราะบัญชีใช้ร่วมกับธุรกิจอื่น) · Apple ≈' + O.baht(apMonthUsd * fx, 2) + ' (' + num(apMonthUsd, 2) + ' USD × ' + num(fx, 2) + ')' + (gpt.g ? ' · ChatGPT ' + O.baht(gpt.month, 2) + ' (เรียกเก็บแล้ว' + (gpt.pendClicks ? ' + วันนี้ยังไม่เรียกเก็บ ' + num(gpt.pendClicks) + ' คลิก' + (gpt.pendEst != null ? ' ≈' + O.baht(gpt.pendEst) : '') : '') + ')' : '') + (tot ? '' : ' · ตัวเลขจากเอกสารซิงก์ (รัน SQL 0028 เพื่อรวมจากตารางรายวัน)') + '</div>' +
      '<div class="small" style="margin-top:6px">งบที่ตั้งไว้ตอนนี้ <b class="num">' + O.baht(plan) + '/วัน</b> <span class="muted">(Meta ad set ที่วิ่งอยู่ ' + O.baht(metaPlan) + (appleRunning ? ' + Apple $' + num(applePlanUsd, 2) + ' × ' + num(fx, 2) : ' · Apple ไม่ได้แสดง') + (gpt.plan ? ' + ChatGPT ' + O.baht(gpt.plan) : '') + ') ≈ ' + O.baht(planMonth) + '/เดือน</span> ' +
      (plan > 0 && planMonth > cap ? pill('เกินเพดานเดือน — ปรับเพดานในกฎ guardrail ด้านล่าง หรือลดงบ', 'warn') : plan > 0 ? pill('อยู่ในเพดาน', 'good') : pill('ไม่มีโฆษณาวิ่งอยู่', 'neutral')) + '</div>',
    { right: chip('meta', fresh(doc.synced_at)) + ' ' + chip('apple', fresh(ap && ap.synced_at)) + (gpt.g ? ' ' + chip('chatgpt', fresh(gpt.g.synced_at)) : '') });
  }

  // ChatGPT Ads: campaign, click → our game → first lesson, per ad, per day.
  function chatgpt(d) {
    const gpt = gptSpend(d), g = gpt.g;
    const snap = (d.snapshot || []).filter((s) => s.source === 'chatgpt');
    if (!g && !snap.length) return '';
    const db = d.db_chatgpt || null, camps = (g && g.campaigns) || [];
    const life = g ? Number(g.spend_lifetime || 0) : snap.reduce((t, s) => t + ((s.lifetime || {}).spend || 0), 0);
    const clicks = g ? Number(g.clicks_lifetime || 0) : snap.reduce((t, s) => t + ((s.lifetime || {}).clicks || 0), 0);
    const cpaCap = ruleOf(d, 'cpa_cap', 12);
    const fl = db ? db.first_lessons || 0 : 0;
    const cpa = fl ? life / fl : null;
    const cpaWithPending = fl && gpt.pendEst ? (life + gpt.pendEst) / fl : null;
    const camp = (c) => '<div class="node"><div class="head"><span class="statusdot ' + (c.delivering ? '' : 'off') + '"></span><span class="name">' + esc(c.name) + '</span>' + O.plat('web') +
      (c.delivering ? pill('กำลังแสดง', 'good') : pill(c.status === 'paused' ? 'หยุดไว้' : 'ไม่ได้แสดง', 'neutral')) +
      (c.daily_thb ? pill(O.baht(c.daily_thb) + '/วัน', 'money') : c.lifetime_thb ? pill('งบตลอด ' + O.baht(c.lifetime_thb), 'money') : '') +
      (c.objective === 'clicks' ? pill('จ่ายต่อคลิก', 'neutral') : c.objective ? pill(String(c.objective), 'neutral') : '') + '</div>' +
      '<div class="meta"><span>เริ่ม ' + esc(O.date(c.start_time, true)) + (c.end_time ? ' → ' + esc(O.date(c.end_time, true)) : ' · ไม่มีวันสิ้นสุด') + '</span><span class="num">ตั้งแต่เริ่ม ' + O.baht((c.lifetime || {}).spend, 2) + ' · ' + num((c.lifetime || {}).clicks) + ' คลิก</span></div></div>';
    const kv = '<div class="kv" style="margin-top:8px"><div>วันนี้ (เรียกเก็บแล้ว)<b class="num">' + O.baht(gpt.today, 2) + '</b></div>' +
      '<div>วันนี้ยังไม่เรียกเก็บ<b class="num">' + (gpt.pendClicks ? num(gpt.pendClicks) + ' คลิก' + (gpt.pendEst != null ? ' ≈' + O.baht(gpt.pendEst) : '') : '—') + '</b></div>' +
      '<div>7 วัน (รวมวันนี้)<b class="num">' + O.baht(gpt.week, 2) + '</b></div><div>เดือนนี้<b class="num">' + O.baht(gpt.month, 2) + '</b></div>' +
      '<div>ต่อคลิก (ที่เรียกเก็บแล้ว)<b class="num">' + (g && g.cpc_billed != null ? O.baht(g.cpc_billed, 2) : '—') + '</b></div>' +
      '<div>คลิกทั้งหมด<b class="num">' + num(clicks) + '</b></div>' +
      '<div>เปิดเกมได้<b class="num">' + (db ? num(db.visitors) + (clicks ? ' <span class="muted small">(' + O.pct(db.visitors, clicks) + '%)</span>' : '') : '—') + '</b></div>' +
      '<div>เล่น<b class="num">' + (db ? num(db.played) : '—') + '</b></div><div>จบบทแรก<b class="num">' + (db ? num(fl) : '—') + '</b></div>' +
      // Billed spend alone makes today look cheap (OpenAI bills hours late): lead with the estimate.
      '<div>ต่อคนจบบทแรก<b class="num">' + (cpaWithPending != null ? pill('≈' + O.baht(cpaWithPending), cpaWithPending <= cpaCap ? 'good' : 'crit') + ' <span class="muted small">เรียกเก็บแล้ว ' + O.baht(cpa, 2) + '</span>' : cpa == null ? '—' : pill(O.baht(cpa, 2), cpa <= cpaCap ? 'good' : 'crit')) + '</b></div>' +
      '<div>เปิดบัญชี / Plus<b class="num">' + (db ? num(db.signups) + ' / ' + num(db.plus) : '—') + '</b></div></div>';
    const ads = snap.length ? '<div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>โฆษณา</th><th>สถานะ</th><th class="r">คลิกวันนี้</th><th class="r">แสดงผล</th><th class="r">คลิก</th><th class="r">CTR</th><th>ลิงก์</th></tr></thead><tbody>' + snap.map((s) => {
      const L = s.lifetime || {}, T = s.today || {}, rv = s.review || {};
      const eff = s.effective_status;
      return '<tr><td><b>' + esc(rv.title || s.ad_name) + '</b><span class="sub">' + esc(s.ad_name) + ' · ' + esc(s.adset_name || '') + '</span></td><td>' + (eff === 'ACTIVE' ? pill('แสดงอยู่', 'good') : eff === 'REJECTED' ? pill('ถูกปฏิเสธ', 'crit') : eff === 'IN_REVIEW' ? pill('รอตรวจ', 'warn') : pill(eff === 'ENDED' ? 'จบแล้ว' : 'หยุดไว้', 'neutral')) + '</td>' +
        '<td class="r num">' + num(T.clicks) + '</td><td class="r num">' + num(L.impressions) + '</td><td class="r num">' + num(L.clicks) + '</td><td class="r num">' + (L.impressions ? num((100 * L.clicks) / L.impressions, 2) + '%' : '—') + '</td>' +
        '<td class="small">' + esc(String(rv.target_url || '').replace(/^https?:\/\//, '')) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '';
    // Per day: spend + clicks (OpenAI) next to visitors + first lessons (our database).
    const days = {};
    (d.daily || []).filter((r) => r.source === 'chatgpt').forEach((r) => { days[r.day] = Object.assign(days[r.day] || {}, { spend: Number(r.spend) || 0, clicks: r.clicks || 0 }); });
    (d.chatgpt_daily_db || []).forEach((r) => { days[r.day] = Object.assign(days[r.day] || {}, { visitors: r.visitors, fl: r.first_lessons }); });
    const keys = Object.keys(days).sort().reverse();
    const todayKey = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const perDay = keys.length ? '<div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>วัน</th><th class="r">เรียกเก็บแล้ว</th><th class="r">คลิก</th><th class="r divider-col">เปิดเกมได้</th><th class="r">จบบทแรก</th><th class="r">ต่อคนจบบทแรก</th></tr></thead><tbody>' + keys.slice(0, 14).map((k) => {
      const r = days[k];
      const pendEst = k === todayKey && gpt.pendEst ? gpt.pendEst : 0;
      return '<tr><td>' + esc(O.date(k)) + '</td><td class="r num">' + O.baht(r.spend || 0, 2) + (pendEst ? ' <span class="muted small">+≈' + O.baht(pendEst) + '</span>' : '') + '</td><td class="r num">' + num(r.clicks || 0) + '</td><td class="r num divider-col">' + num(r.visitors || 0) + '</td><td class="r num">' + num(r.fl || 0) + '</td><td class="r num">' + (r.fl && (r.spend || pendEst) ? (pendEst ? '≈' : '') + O.baht(((r.spend || 0) + pendEst) / r.fl, 2) : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '';
    return card('ChatGPT Ads · โฆษณาในแชต ChatGPT', (camps.length ? '<div class="tree">' + camps.map(camp).join('') + '</div>' : '') + kv + ads + perDay +
      '<div class="small muted" style="margin-top:6px">OpenAI เรียกเก็บเงินช้ากว่าคลิกหลายชั่วโมง ตัวเลข "เรียกเก็บแล้ว" ของวันนี้จึงต่ำกว่าจริง · "ยังไม่เรียกเก็บ ≈" = คลิกที่ยังไม่เรียกเก็บ × ค่าคลิกที่เรียกเก็บแล้ว ไม่เกินงบรายวัน · ฝั่งฐานข้อมูลเรานับคนที่เข้ามาพร้อมรหัสคลิก oppref (ไม่ต้องใส่ utm ในลิงก์) ไม่นับบอท' +
      (db && db.inferred ? ' · รวม ' + num(db.inferred) + ' คนวันแรก (22 ต.ค.) ที่ติดป้ายแบบประมาณ เพราะตอนนั้นเว็บยังไม่เก็บ oppref' : '') +
      (db ? '' : ' · ฝั่งฐานข้อมูลจะขึ้นหลังรัน SQL 0030') + ' · หยุด/ปรับงบได้ใน ChatGPT Ads Manager (ระบบไม่หยุดโฆษณา ChatGPT เอง)</div>',
    { right: chip('chatgpt', fresh(g && g.synced_at)) + ' ' + chip('db', 'สด') });
  }

  // The funnel the owner cares about, per ad: Meta click → our game → first lesson.
  function adFunnel(snap, dbByAd, cpaCap) {
    const meta = snap.filter((s) => s.source === 'meta');
    if (!meta.length) return '';
    const db = (s) => dbByAd.find((r) => r.campaign === s.utm_campaign && r.content === s.utm_content) || {};
    const row = (s) => {
      const L = s.lifetime || {}, T = s.today || {}, r = db(s);
      const reach = L.clicks ? O.pct(r.visitors || 0, L.clicks) : null;
      const cpa = r.first_lessons ? L.spend / r.first_lessons : null;
      return '<tr><td><b>' + esc(s.ad_name) + '</b><span class="sub">' + esc(s.adset_name || '') + (s.end_time ? ' · ถึง ' + esc(O.date(s.end_time)) : '') + '</span></td><td>' + O.plat(s.platform) + '</td><td>' + stOf(s) + '</td>' +
        '<td class="r num">' + O.baht(T.spend, 2) + '</td><td class="r num">' + O.baht(L.spend, 2) + '</td><td class="r num">' + num(L.impressions) + '</td><td class="r num">' + num(L.clicks) + '</td>' +
        '<td class="r num">' + (L.impressions ? num((100 * L.clicks) / L.impressions, 2) + '%' : '—') + '</td><td class="r num">' + (L.clicks ? O.baht(L.spend / L.clicks, 2) : '—') + '</td>' +
        '<td class="r num divider-col">' + num(r.visitors || 0) + (reach != null ? ' <span class="muted small">(' + reach + '%)</span>' : '') + '</td><td class="r num">' + num(r.played || 0) + '</td><td class="r num">' + num(r.first_lessons || 0) + '</td>' +
        '<td class="r">' + (cpa == null ? '—' : pill(O.baht(cpa, 2), cpa <= cpaCap ? 'good' : 'crit')) + '</td></tr>';
    };
    const head = '<thead><tr><th>โฆษณา</th><th>ไปที่</th><th>สถานะ</th><th class="r">วันนี้</th><th class="r">ใช้ทั้งหมด</th><th class="r">แสดงผล</th><th class="r">คลิกลิงก์</th><th class="r">CTR</th><th class="r">ต่อคลิก</th><th class="r divider-col">เปิดเกมได้</th><th class="r">เล่น</th><th class="r">จบบทแรก</th><th class="r">ต่อคนจบบทแรก</th></tr></thead>';
    const live = meta.filter(stillSpending), done = meta.filter((s) => !stillSpending(s));
    const table = (list) => '<div class="tablewrap"><table>' + head + '<tbody>' + list.map(row).join('') + '</tbody></table></div>';
    return card('จากคลิกโฆษณา ถึงคนจบบทแรก (ตลอดแคมเปญ)', (live.length ? table(live) : '<div class="empty">ไม่มีโฆษณา Meta ที่วิ่งอยู่ตอนนี้</div>') +
      (done.length ? '<details class="more"><summary>โฆษณาที่จบแล้ว / หยุดไว้ (' + done.length + ')</summary>' + table(done) + '</details>' : '') +
      '<div class="small muted" style="margin-top:6px">ซ้ายเส้นประ = Meta · ขวาเส้นประ = ฐานข้อมูลเรา (คนที่เข้ามาด้วย utm ของโฆษณานั้น ไม่ขึ้นกับคุกกี้ ไม่นับบอท) · "เปิดเกมได้" ต่ำกว่าคลิกมาก = คนรอหน้าเกมโหลดไม่ไหว · เพดานต่อคนจบบทแรกมาจากกฎ cpa_cap (' + O.baht(cpaCap) + ') · โฆษณา iOS ส่งคนไปหน้า /app/ ยอดดาวน์โหลดจาก App Store ยังนับไม่ได้</div>',
    { right: chip('meta') + ' ' + chip('db', 'สด') });
  }

  function adCards(snap) {
    const meta = snap.filter((s) => s.source === 'meta');
    if (!meta.length) return '';
    const sets = {};
    meta.forEach((s) => { (sets[s.adset_id] = sets[s.adset_id] || []).push(s); });
    const node = (list) => {
      const s0 = list[0];
      const live = list.some(stillSpending);
      const spent = s0.lifetime_budget != null && s0.budget_remaining != null ? s0.lifetime_budget - s0.budget_remaining : null;
      return '<div class="node"><div class="head"><span class="statusdot ' + (live ? '' : 'off') + '"></span><span class="name">' + esc(s0.adset_name) + '</span>' + O.plat(s0.platform) + (live ? st(s0.adset_status) : stOf(s0)) + st(s0.learning) +
        (s0.lifetime_budget ? pill('งบตลอด ' + O.baht(s0.lifetime_budget), 'money') : s0.daily_budget ? pill(O.baht(s0.daily_budget) + '/วัน', 'money') : '') + '</div>' +
        '<div class="meta">' + (spent != null ? '<span class="num">ใช้ไป ' + O.baht(spent, 2) + ' · เหลือ ' + O.baht(s0.budget_remaining, 2) + '</span>' : '') + '<span>' + esc(O.date(s0.start_time, true)) + ' → ' + esc(O.date(s0.end_time, true)) + '</span><span class="muted">' + esc(s0.campaign_name || '') + '</span></div>' +
        (s0.lifetime_budget && spent != null ? '<div class="meter" style="margin-top:8px;height:8px"><span style="width:' + Math.min(100, (100 * spent) / s0.lifetime_budget) + '%"></span></div>' : '') + '</div>' +
        list.map((a) => {
          const L = a.lifetime || {}, T = a.today || {}, M = a.month || {};
          const fb = a.review && (a.review.feedback || a.review.issues);
          return '<div class="adcard">' + (a.thumbnail ? '<img class="thumb" alt="" loading="lazy" referrerpolicy="no-referrer" src="' + esc(a.thumbnail) + '" style="object-fit:cover">' : '<div class="thumb">โฆษณา</div>') +
            '<div style="min-width:0"><div class="row"><b>' + esc(a.ad_name) + '</b>' + stOf(a) + (a.preview ? '<a class="small" href="' + esc(a.preview) + '" target="_blank" rel="noopener">ดูตัวอย่าง ↗</a>' : '') + '</div>' +
            (fb ? '<div class="small" style="color:var(--crit-ink)">' + esc(JSON.stringify(fb).slice(0, 200)) + '</div>' : '') +
            '<div class="kv"><div>วันนี้<b class="num">' + O.baht(T.spend, 2) + '</b></div><div>เดือนนี้<b class="num">' + (M.spend == null ? '—' : O.baht(M.spend, 2)) + '</b></div><div>ทั้งหมด<b class="num">' + O.baht(L.spend, 2) + '</b></div><div>แสดงผล<b class="num">' + num(L.impressions) + '</b></div><div>เข้าถึง<b class="num">' + num(L.reach) + '</b></div>' +
            '<div>คลิกลิงก์<b class="num">' + num(L.clicks) + '</b></div><div>หน้าโหลดเสร็จ<b class="num">' + num(L.lpv) + '</b></div><div>CPM<b class="num">' + (L.impressions ? O.baht((1000 * L.spend) / L.impressions, 2) : '—') + '</b></div><div>ผลลัพธ์ pixel<b class="num">' + num(L.results) + '</b></div></div></div></div>';
        }).join('');
    };
    const groups = Object.values(sets);
    const live = groups.filter((l) => l.some(stillSpending)), done = groups.filter((l) => !l.some(stillSpending));
    return card('โฆษณาแต่ละชิ้น', (live.length ? '<div class="tree">' + live.map(node).join('') + '</div>' : '<div class="empty">ไม่มี ad set ของ Meta ที่วิ่งอยู่ตอนนี้</div>') +
      (done.length ? '<details class="more"><summary>ad set ที่จบแล้ว / หยุดไว้ (' + done.length + ')</summary><div class="tree">' + done.map(node).join('') + '</div></details>' : '') +
      '<div class="small muted" style="margin-top:6px">"จบแล้ว" = เลยวันสิ้นสุดหรือใช้งบตลอดแคมเปญหมดแล้ว (Meta ยังรายงานว่า ACTIVE อยู่) · "หน้าโหลดเสร็จ" และ "ผลลัพธ์ pixel" มาจาก Meta Pixel ที่ทำงานหลังผู้ชมกดยอมรับคุกกี้เท่านั้น จึงต่ำกว่าความจริง</div>', { right: chip('meta') });
  }

  function apple(doc) {
    const ap = doc.apple;
    if (!ap) return '';
    const c = ap.campaign || {}, fx = ap.fx_rate_thb_per_usd || 33.5;
    const lifeUsd = ap.spend_lifetime_usd, lifeInstalls = ap.installs_lifetime;
    return card('Apple Ads · ค้นหาใน App Store', c.id ? '<div class="tree"><div class="node"><div class="head"><span class="statusdot ' + (c.serving_status === 'RUNNING' ? '' : 'warn') + '"></span><span class="name">' + esc(c.name) + '</span>' + O.plat('ios') + st(c.status) + st(c.serving_status) + pill('$' + num(c.daily_usd, 2) + '/วัน', 'money') + '</div>' +
      '<div class="meta"><span class="num">วันนี้ $' + num(ap.spend_today_usd != null ? ap.spend_today_usd : (ap.adgroups || []).reduce((t, g) => t + (g.spend_today_usd || 0), 0), 2) + '</span><span class="num">7 วัน (รวมวันนี้) $' + num(ap.spend7_usd, 2) + ' ≈' + O.baht((ap.spend7_usd || 0) * fx) + '</span><span class="num">เดือนนี้ $' + num(ap.spend_month_usd, 2) + ' ≈' + O.baht((ap.spend_month_usd || 0) * fx) + '</span>' +
      (lifeUsd != null ? '<span class="num">ตั้งแต่เริ่ม ' + esc(O.date(c.start_time)) + ' $' + num(lifeUsd, 2) + ' ≈' + O.baht(lifeUsd * fx) + ' · ติดตั้ง ' + num(lifeInstalls) + (lifeInstalls ? ' · $' + num(lifeUsd / lifeInstalls, 2) + '/ติดตั้ง' : '') + '</span>' : '') + '</div>' +
      (c.serving_status !== 'RUNNING' ? '<div class="note" style="margin-top:8px">' + esc(ap.note || c.serving_reason) + '</div>' : '') + '</div>' +
      (ap.adgroups || []).map((g) => '<div class="node adset"><div class="head"><span class="name">กลุ่มโฆษณา ' + esc(g.name) + '</span>' + st(g.serving_status) + (g.search_match ? pill('Search Match', 'neutral') : '') + pill('คีย์เวิร์ด ' + num(g.keyword_count), 'neutral') + '</div>' +
        '<div class="kv"><div>วันนี้<b class="num">$' + num(g.spend_today_usd, 2) + '</b></div><div>7 วัน (รวมวันนี้)<b class="num">$' + num(g.spend7_usd, 2) + ' <span class="muted small">≈' + O.baht((g.spend7_usd || 0) * fx) + '</span></b></div><div>แสดงผล<b class="num">' + num(g.impressions7) + '</b></div><div>แตะ<b class="num">' + num(g.taps7) + '</b></div><div>ติดตั้ง (Apple นับ)<b class="num">' + num(g.installs7) + '</b></div><div>ต่อแตะ<b class="num">' + (g.cpt_usd == null ? '—' : '$' + num(g.cpt_usd, 2)) + '</b></div><div>ต่อการติดตั้ง<b class="num">' + (g.cpa_usd == null ? '—' : '$' + num(g.cpa_usd, 2)) + '</b></div><div>เสนอราคาสูงสุด<b class="num">$' + num(g.max_cpt_usd, 2) + '</b></div>' +
        (g.spend_lifetime_usd != null ? '<div>ตั้งแต่เริ่ม<b class="num">$' + num(g.spend_lifetime_usd, 2) + ' · ' + num(g.installs_lifetime) + ' ติดตั้ง' + (g.cpa_lifetime_usd != null ? ' · $' + num(g.cpa_lifetime_usd, 2) + '/ติดตั้ง' : '') + '</b></div>' : '') + '</div></div>').join('') + '</div>'
      : '<div class="empty">ไม่มีแคมเปญ Apple Ads ชื่อ JUNYPOP…</div>', { lead: 'อัตรา ' + num(fx, 2) + ' ฿/$ · ' + (ap.fx_date || '') + ' · "ติดตั้ง" = ที่ Apple นับจากโฆษณาค้นหา ไม่ใช่ผู้เล่นใหม่ในฐานข้อมูลเรา', right: chip('apple', fresh(ap.synced_at)) });
  }

  function daily(d) {
    const days = {};
    const blank = () => ({ meta: 0, apple: 0, chatgpt: 0, clicks: 0, taps: 0, installs: 0 });
    (d.daily || []).forEach((r) => { const k = r.day; days[k] = days[k] || blank(); days[k][r.source] = (days[k][r.source] || 0) + (Number(r.spend) || 0); if (r.source === 'meta') days[k].clicks += r.clicks || 0; if (r.source === 'apple') { days[k].taps += r.clicks || 0; days[k].installs += r.results || 0; } });
    (d.daily_db || []).forEach((r) => { days[r.day] = days[r.day] || blank(); days[r.day].fl = r.first_lessons; });
    const cutoff = new Date(Date.now() - 31 * 864e5 + 7 * 3600e3).toISOString().slice(0, 10);
    const keys = Object.keys(days).filter((k) => k >= cutoff && (days[k].meta || days[k].apple || days[k].chatgpt || days[k].clicks || days[k].fl)).sort().reverse();
    if (!keys.length) return '';
    const fx = (d.doc && d.doc.apple && d.doc.apple.fx_rate_thb_per_usd) || 33.5;
    const hasGpt = keys.some((k) => days[k].chatgpt);
    const row = (k) => {
      const r = days[k];
      // ฿0 ÷ n first lessons is not a ฿0 CPA: those players came from an ad that already stopped.
      return '<tr><td>' + esc(O.date(k)) + '</td><td class="r num">' + O.baht(r.meta, 2) + '</td><td class="r num">$' + num(r.apple, 2) + ' <span class="muted small">≈' + O.baht(r.apple * fx) + '</span></td>' + (hasGpt ? '<td class="r num">' + O.baht(r.chatgpt, 2) + '</td>' : '') + '<td class="r num">' + O.baht(r.meta + r.apple * fx + r.chatgpt) + '</td><td class="r num">' + num(r.clicks) + '</td><td class="r num">' + num(r.taps) + '</td><td class="r num">' + num(r.installs) + '</td><td class="r num divider-col">' + num(r.fl || 0) + '</td><td class="r num">' + (r.fl && r.meta > 0 ? O.baht(r.meta / r.fl, 2) : '—') + '</td></tr>';
    };
    const head = '<thead><tr><th>วัน</th><th class="r">Meta</th><th class="r">Apple</th>' + (hasGpt ? '<th class="r">ChatGPT</th>' : '') + '<th class="r">รวม</th><th class="r">คลิก Meta</th><th class="r">แตะ Apple</th><th class="r">ติดตั้ง Apple</th><th class="r divider-col">จบบทแรกจากโฆษณา Meta</th><th class="r">Meta ต่อคนจบบทแรก</th></tr></thead>';
    return card('รายวัน · เดือนนี้', '<div class="tablewrap"><table>' + head + '<tbody>' + keys.slice(0, 14).map(row).join('') + '</tbody></table></div>' +
      (keys.length > 14 ? '<details class="more"><summary>ดูอีก ' + (keys.length - 14) + ' วัน</summary><div class="tablewrap"><table>' + head + '<tbody>' + keys.slice(14).map(row).join('') + '</tbody></table></div></details>' : '') +
      '<div class="small muted" style="margin-top:6px">วันตามเวลาไทย (บัญชี Meta, Apple Ads และ ChatGPT Ads ตั้งเป็น Asia/Bangkok ทั้งหมด) · "—" ในช่องต่อคนจบบทแรก = วันนั้น Meta ไม่ได้ใช้จ่าย (คนที่จบบทแรกมาจากโฆษณาที่หยุดไปแล้ว)' + (hasGpt ? ' · ChatGPT = ยอดที่ OpenAI เรียกเก็บแล้ว · คนจบบทแรกจาก ChatGPT อยู่ในการ์ด ChatGPT Ads' : '') + '</div>', { right: chip('meta') + ' ' + chip('apple') + (hasGpt ? ' ' + chip('chatgpt') : '') + ' ' + chip('db', 'สด') });
  }

  function rules(d) {
    const list = d.rules || [];
    if (!list.length) return card('กฎ guardrail', O.soon('หลังรัน SQL 0019', 'หยุดโฆษณาเว็บเองเมื่อใช้ ≥฿200 แล้วไม่มีคนจบบทแรก · เตือนงบใกล้เพดาน ใช้เกินแผนรายวัน ค่าคลิกแพง โฆษณาถูกปฏิเสธ'));
    return card('กฎ guardrail', '<div class="tablewrap"><table><thead><tr><th>กฎ</th><th class="r">ค่า</th><th>ทำอะไร</th>' + (O.me.role === 'owner' ? '<th></th>' : '') + '</tr></thead><tbody>' + list.map((r) => {
      const m = RULE_MODE[r.mode] || [r.mode, 'neutral'];
      return '<tr><td style="white-space:normal">' + esc(r.label_th) + '</td><td class="r num">' + num(r.value, 2) + (r.min_n ? ' <span class="muted small">(≥' + num(r.min_n) + ')</span>' : '') + '</td><td>' + pill(m[0], m[1]) + '</td>' + (O.me.role === 'owner' ? '<td><button class="btn sm ghost" data-rule="' + esc(r.key) + '" data-value="' + esc(r.value) + '" data-mode="' + esc(r.mode) + '" data-label="' + esc(r.label_th) + '">แก้</button></td>' : '') + '</tr>';
    }).join('') + '</tbody></table></div><div class="small muted" style="margin-top:6px">ตรวจทุกครั้งที่ซิงก์ · ทำเองได้เฉพาะกฎหยุดโฆษณาเว็บ (ย้อนกลับได้ใน Meta Ads Manager และมีบันทึก) · โฆษณา iOS ไม่ถูกหยุดเองเพราะยังนับยอดดาวน์โหลดไม่ได้ · โฆษณา ChatGPT ใช้กฎเพดานเดือน ใช้เกินแผน ต่อคนจบบทแรก และใช้ถึงเกณฑ์หยุดแล้วไม่มีคนจบบทแรก แบบแจ้งเตือนอย่างเดียว · กฎอื่นแจ้งเตือนเข้าแจ้งเตือน</div>', { right: chip('db') });
  }

  O.page('ads', {
    title: 'โฆษณา', icon: 'ads', group: 'การตลาด', sub: 'Meta + Apple Ads + ChatGPT Ads · ตั้งแต่คลิกจนถึงคนจบบทแรก',
    load: () => O.rpc('office_ads'),
    render(d) {
      const doc = d.doc || {};
      const snap = d.snapshot || [];
      let h = syncBar(d) + budget(d) + chatgpt(d);
      if (snap.length) {
        h += adFunnel(snap, d.db_by_ad || [], ruleOf(d, 'cpa_cap', 12)) + daily(d) + adCards(snap);
      } else {
        const sets = doc.adsets || [];
        h += card('Meta · ad set', sets.length ? '<div class="tablewrap"><table><thead><tr><th>ad set</th><th>สถานะ</th><th class="r">วันนี้</th><th class="r">7 วันก่อนหน้า</th><th class="r">ผลลัพธ์ (pixel)</th></tr></thead><tbody>' + sets.map((s) =>
          '<tr><td><b>' + esc(s.name) + '</b></td><td>' + pill(s.status === 'active' ? 'ACTIVE' : 'PAUSED', s.status === 'active' ? 'good' : 'neutral') + '</td><td class="r num">' + (s.spend_today == null ? '—' : O.baht(s.spend_today, 2)) + '</td><td class="r num">' + O.baht(s.spend7, 2) + '</td><td class="r num">' + num(s.conversions) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ยังไม่มีแคมเปญ JUNYPOP ที่รันอยู่</div>', { right: chip('meta', fresh(doc.synced_at)) });
        const byAd = d.db_by_ad || [];
        if (byAd.length) h += card('ฐานข้อมูลเราเห็นอะไรจากแต่ละโฆษณา', '<div class="tablewrap"><table><thead><tr><th>utm_campaign</th><th>utm_content</th><th class="r">เปิดเกม</th><th class="r">เล่น</th><th class="r">จบบทแรก</th></tr></thead><tbody>' + byAd.map((r) => '<tr><td>' + esc(r.campaign) + '</td><td>' + esc(r.content || '—') + '</td><td class="r num">' + num(r.visitors) + '</td><td class="r num">' + num(r.played) + '</td><td class="r num">' + num(r.first_lessons) + '</td></tr>').join('') + '</tbody></table></div>', { right: chip('db', 'สด') });
      }
      h += apple(doc) + rules(d);
      h += card('แผนปรับปรุงโฆษณา', '<div class="small">ข้อเสนอของ Claude อยู่ในการ์ด "Claude แนะนำ" หน้าภาพรวม (กดอนุมัติแล้วเข้าคิว) · อยากได้รอบใหม่ → หน้าคำสั่งถึง Claude กด "ทบทวนโฆษณาและเสนอปรับ" · การเปลี่ยนงบ/คีย์เวิร์ด Apple ทำผ่านไฟล์ spec ใน tools/marketing/campaigns/ (เป็นบันทึกย้อนหลัง)</div>', { right: chip('claude') });
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
        O.say('กำลังซิงก์ Meta + Apple + ChatGPT…');
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
