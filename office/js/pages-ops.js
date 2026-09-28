/* JUNYPOP DASHBOARD — แจ้งเตือน, คอนเทนต์, คำสั่งถึง Claude, ผู้ดูแล, แหล่งข้อมูล */
(function () {
  'use strict';
  const O = window.O;
  if (!O || !O.page) return;
  const { esc, num, card, chip, pill, ico } = O;
  const canAct = () => O.me && O.me.role !== 'viewer';
  const LEVEL = { urgent: ['ด่วน', 'crit'], warn: ['เตือน', 'warn'], info: ['ข้อมูล', 'neutral'] };
  const SEV = { urgent: 'crit', warn: 'warn', info: 'info' };

  // ------------------------------------------------------------------ แจ้งเตือน
  O.page('alerts', {
    title: 'แจ้งเตือน', icon: 'bell', group: 'การตลาด', sub: 'ทุกเรื่องที่เกิดขึ้น · กดรับทราบได้จากทุกเครื่อง',
    load: () => O.rpc('office_alerts_list', { p_limit: 200 }),
    render(d) {
      O.setBadge('alerts', d.unread);
      const startToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })).setHours(0, 0, 0, 0);
      const groups = [['วันนี้', []], ['7 วันที่ผ่านมา', []], ['ก่อนหน้า', []]];
      (d.items || []).forEach((a) => {
        const age = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
        (new Date(a.created_at).getTime() >= startToday - 7 * 3600000 && age < 1 ? groups[0] : age < 7 ? groups[1] : groups[2])[1].push(a);
      });
      const row = (a) => {
        const lv = LEVEL[a.level] || LEVEL.info;
        const snoozed = a.snoozed_until && new Date(a.snoozed_until) > new Date();
        return '<div class="alert ' + SEV[a.level] + '"><div class="sev"></div><div class="body"><div class="t">' + pill(lv[0], lv[1]) + esc(a.title) + (!a.acked_at && !snoozed ? pill('ยังไม่รับทราบ', 'warn') : '') + (snoozed ? pill('ปิดเสียงถึง ' + O.time(a.snoozed_until), 'neutral') : '') + '</div>' +
          (a.body ? '<div class="s">' + esc(a.body) + '</div>' : '') +
          '<div class="dl">' + chip(a.source) + '<span>' + esc(O.date(a.created_at, true)) + '</span>' + (a.acked_at ? '<span>รับทราบโดย ' + esc(a.acked_name || '—') + ' ' + esc(O.date(a.acked_at, true)) + '</span>' : '') + '</div>' +
          (!a.acked_at && canAct() ? '<div class="acts"><button class="btn sm primary" data-ack="' + a.id + '">รับทราบ</button><button class="btn sm ghost" data-snooze="' + a.id + '">ปิดเสียง 24 ชม.</button>' + (a.link ? '<button class="btn sm ghost" data-go="' + esc(String(a.link).replace(/^#/, '').split('/')[0]) + '">ดูข้อมูล →</button>' : '') + '</div>' : '') + '</div></div>';
      };
      const linked = !!O.me.line_linked;
      const lineCard = card('LINE ของฉัน', linked
        ? '<div class="row">' + pill('ผูกแล้ว', 'good') + '<span class="small">เรื่องด่วนเด้งเข้า LINE ทันที</span></div>' +
          '<ul class="small" style="margin:8px 0 0;padding-left:18px"><li>เรื่องเตือน (สีเหลือง) รอพ้นช่วงเงียบ 23:00–07:00</li><li>สรุปทุกเช้า 08:00</li><li>พิมพ์ "สถิติ" ในแชท JUNYPOP Office เพื่อดูตัวเลขวันนี้</li></ul>' +
          '<div style="margin-top:10px"><button class="btn sm ghost" data-lineunlink="1">เลิกผูก LINE</button></div>'
        : '<ol class="small" style="margin:0;padding-left:18px"><li>แอดเพื่อน <a href="https://line.me/R/ti/p/@793ymief" target="_blank" rel="noopener"><b>JUNYPOP Office</b> (@793ymief)</a></li><li>กดปุ่มด้านล่างเพื่อรับรหัส 6 หลัก</li><li>ส่งรหัสนั้นในแชท JUNYPOP Office</li></ol>' +
          '<div style="margin-top:10px"><button class="btn sm primary" data-linecode="1">ขอรหัส 6 หลัก</button></div>',
      { right: chip('db', null, { label: 'LINE' }) });
      let h = '<div class="note">แจ้งเตือนด่วนและสรุปเช้า 08:00 ส่งเข้า <b>LINE</b> ของผู้ดูแลที่ผูกบัญชีแล้ว · ระบบสร้างแจ้งเตือนเองจากการซื้อ Plus, Apple คืนเงิน/ยกเลิก, โฆษณา (ทุก 15 นาที), เว็บล่ม (ทุก 5 นาที) และเรื่องที่ Claude เพิ่ม</div>';
      h += '<div class="grid"><div class="c8">' + groups.map(([t, items]) => items.length ? card(t, items.map(row).join('')) : '').join('') +
        ((d.items || []).length ? '' : card('ยังไม่มีแจ้งเตือน', '<div class="empty">เมื่อมีเหตุการณ์ (ซื้อ Plus, คืนเงิน, โฆษณามีปัญหา) จะขึ้นที่นี่</div>')) + '</div>' +
        '<div class="c4">' + lineCard + card('กฎที่ทำงานอยู่ตอนนี้', '<div class="tablewrap"><table><tbody>' +
          [['เว็บ junypop.com เปิดไม่ได้ 2 ครั้งติด', 'urgent'], ['โฆษณาถูกปฏิเสธ / มีปัญหา', 'urgent'], ['ใช้เงินโฆษณาวันนี้เกินแผน / ครบเพดานเดือน', 'urgent'], ['หยุดโฆษณาเว็บอัตโนมัติ (กฎ ฿200)', 'urgent'], ['App Store คืนเงิน/เพิกถอน', 'urgent'],
           ['งบเดือนใช้ไป 90%', 'warn'], ['Apple Ads ไม่แสดง / ค่าคลิกแพง', 'warn'], ['Plus หมดอายุ/ยกเลิก', 'warn'], ['Plus ใหม่ (เว็บ/App Store)', 'info'], ['เรื่องที่ Claude เพิ่มเอง', 'ตามเรื่อง']]
            .map(([n, l]) => '<tr><td>' + esc(n) + '</td><td>' + (LEVEL[l] ? pill(LEVEL[l][0], LEVEL[l][1]) : pill(l, 'neutral')) + '</td></tr>').join('') +
          '</tbody></table></div><div class="small muted" style="margin-top:6px">ด่วน = เข้า LINE ทันทีแม้กลางคืน · เตือน = เข้า LINE นอกช่วงเงียบ 23:00–07:00 · ข้อมูล = ในหน้านี้เท่านั้น · แก้เกณฑ์โฆษณาได้ในหน้าโฆษณา</div>') + '</div></div>';
      return h;
    },
  });

  // ------------------------------------------------------------------ คอนเทนต์
  O.page('content', {
    title: 'คอนเทนต์', icon: 'film', group: 'งานประจำ', sub: 'คลิปจากโรงงานคลิป · หน้า SEO',
    load: () => O.rpc('office_content'),
    render(d) {
      const clips = d.clips || [];
      let h = card('คลิป', clips.length ? '<div class="tablewrap"><table><thead><tr><th>คลิป</th><th>รูปแบบ</th><th>โลก</th><th class="r">ยาว</th><th>สถานะ</th><th></th></tr></thead><tbody>' + clips.map((c) =>
        '<tr><td><b>' + esc(c.title) + '</b>' + (c.caption ? '<span class="sub">' + esc(String(c.caption).slice(0, 80)) + '…</span>' : '') + '</td><td>' + esc(c.format) + '</td><td>' + esc(c.world || '—') + '</td><td class="r num">' + num(c.seconds) + ' วิ</td><td>' + (c.status === 'posted' ? pill('โพสต์แล้ว ' + O.date(c.posted_at), 'good') : pill('พร้อมโพสต์', 'neutral')) + '</td><td>' +
        (canAct() ? '<button class="btn sm ghost" data-posted="' + esc(c.id) + '" data-v="' + (c.status === 'posted' ? '0' : '1') + '">' + (c.status === 'posted' ? 'ยกเลิกโพสต์' : 'โพสต์แล้ว') + '</button>' : '') + (c.caption ? ' <button class="btn sm ghost" data-copy="' + esc(c.caption) + '">' + ico('copy') + 'แคปชัน</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="small muted" style="margin-top:6px">ไฟล์คลิปอยู่บนเครื่องที่ Claude ใช้ผลิต (app/build/clips/…) · ขอไฟล์ได้ทางแชท</div>' : '<div class="empty">ยังไม่มีคลิป</div>', { right: chip('db') });
      if (canAct()) {
        h += card('ขอคลิปใหม่', '<div class="form"><div class="row"><div class="field" style="flex:1;min-width:140px"><label for="cf">รูปแบบ</label><select id="cf"><option value="five-words">5 คำ (five-words)</option><option value="mistake">คำที่คนไทยพลาดบ่อย (mistake)</option></select></div>' +
          '<div class="field" style="width:110px"><label for="cn">จำนวน</label><select id="cn"><option>1</option><option selected>3</option><option>5</option></select></div>' +
          '<div class="field" style="flex:1;min-width:140px"><label for="cw">โลก (เว้นว่าง = สุ่ม)</label><input id="cw" placeholder="เช่น food, travel"></div></div>' +
          '<div><button class="btn primary sm" data-clipreq="1">ส่งเข้าคิวให้ Claude</button> <span class="small muted">ต้นทุน ฿0 · ใช้ภาพและเสียงที่มีอยู่</span></div></div>');
      }
      h += card('หน้า SEO', O.soon('เฟส 3', 'จำนวนหน้า เวลาสร้างล่าสุด และคนที่เข้ามาจากหน้า /word/ /w/ /quiz/ (จาก GA4)'), { right: chip('ga4', 'เฟส 3', { stale: true }) });
      const notes = d.notes || {};
      if ((notes.alerts || []).length) h += card('บันทึกจาก Claude', (notes.alerts || []).map((a) => '<div class="note" style="margin-bottom:6px"><b>' + esc(a.title) + '</b> ' + esc(a.detail || '') + '</div>').join(''), { right: chip('claude', O.ago(d.notes_at)) });
      return h;
    },
  });

  // ------------------------------------------------------------------ คำสั่งถึง Claude
  const STATUS = { queued: ['รอ Claude', 'warn'], working: ['กำลังทำ', 'brand'], done: ['เสร็จ', 'good'], cancelled: ['ยกเลิก', 'neutral'], blocked: ['ติดขัด', 'crit'] };
  O.page('commands', {
    title: 'คำสั่งถึง Claude', icon: 'term', group: 'งานประจำ', sub: 'ทุกปุ่มอนุมัติมาลงที่นี่ · Claude ทำแล้วรายงานกลับ',
    load: () => O.rpc('office_commands', { p_limit: 100 }),
    render(d) {
      const items = d.items || [];
      O.setBadge('commands', items.filter((c) => c.status === 'queued' && c.money).length);
      const old = !d.heartbeat || Date.now() - new Date(d.heartbeat).getTime() > 86400000;
      let h = '<div class="' + (old ? 'lagbanner' : 'note') + '">' + ico('info') + ' <span><b>Claude ทำงานล่าสุด ' + esc(O.ago(d.heartbeat)) + '</b> · ตัวเลขและแจ้งเตือนทำงานเองตลอด แต่คำสั่งในคิวจะถูกทำเมื่อ Claude เข้ามาอ่านคิว' + (old ? ' — เกิน 24 ชม. แล้ว เปิด Claude แล้วพิมพ์ "ทำคิวคำสั่ง"' : '') + '</span></div>';
      if (canAct()) {
        h += card('เขียนคำสั่ง', '<div class="form"><div class="field"><label for="ct">บอก Claude ว่าต้องทำอะไร</label><input id="ct" maxlength="1000" placeholder="เช่น สรุปฟีดแบ็กสัปดาห์นี้ / ปรับงบเว็บเป็น ฿300 ต่อวัน"></div>' +
          '<div class="row">' + ['สรุปตัวเลขสัปดาห์นี้', 'ผลิตคลิป 3 คลิป', 'ทบทวนโฆษณาและเสนอปรับ', 'ads-sync + apple-sync'].map((t) => '<button class="btn sm" data-tpl="' + esc(t) + '">' + esc(t) + '</button>').join('') +
          '<span class="grow"></span>' + (O.me.role === 'owner' ? '<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="cm"> ใช้เงิน</label>' : '') + '<button class="btn primary sm" data-send="1">ส่งเข้าคิว</button></div></div>');
      }
      h += card('คิวคำสั่ง', items.length ? items.map((c) => {
        const st = STATUS[c.status] || [c.status, 'neutral'];
        return '<div class="cmd"><div class="body"><div>' + (c.money ? pill('฿ ใช้เงิน', 'money') + ' ' : '') + '<b>' + esc(c.text) + '</b></div><div class="m">โดย ' + esc(c.requested_name || 'หน้าเดิม /cc') + ' · ' + esc(O.date(c.created_at, true)) + (c.done_at ? ' · เสร็จ ' + esc(O.date(c.done_at, true)) : '') + '</div>' + (c.result ? '<div class="small" style="margin-top:4px">' + esc(c.result) + '</div>' : '') + '</div>' +
          pill(st[0], st[1]) + (c.status === 'queued' && canAct() && (!c.money || O.me.role === 'owner') ? ' <button class="btn sm ghost" data-cancel="' + c.id + '">ยกเลิก</button>' : '') + '</div>';
      }).join('') : '<div class="empty">ยังไม่มีคำสั่ง</div>', { right: chip('db', 'สด') });
      return h;
    },
  });

  // ------------------------------------------------------------------ ผู้ดูแล
  O.page('staff', {
    title: 'ผู้ดูแล', icon: 'shield', group: 'ระบบ', sub: 'ใครเข้าหลังบ้านได้ ระดับไหน · ความปลอดภัยของบัญชีคุณ',
    load: async () => {
      const [staff, factors, audit] = await Promise.all([
        O.me.role === 'viewer' ? Promise.resolve(null) : O.rpc('office_staff_list'),
        O.sb.auth.mfa.listFactors().then((r) => r.data),
        O.me.role === 'owner' ? O.rpc('office_audit_list', { p_limit: 60 }) : Promise.resolve(null),
      ]);
      return { staff, factors, audit };
    },
    render(d) {
      const owner = O.me.role === 'owner';
      const ROLE = { owner: ['เจ้าของ', 'brand'], admin: ['แอดมิน', 'neutral'], viewer: ['ดูอย่างเดียว', 'neutral'] };
      let h = '';
      if (d.staff) {
        h += card('ผู้ดูแลระบบ', '<div class="tablewrap"><table><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>TOTP</th><th>LINE</th><th>เข้าล่าสุด</th><th>สถานะ</th>' + (owner ? '<th></th>' : '') + '</tr></thead><tbody>' + d.staff.items.map((s) => {
          const r = ROLE[s.role] || [s.role, 'neutral'];
          const self = s.user_id === O.me.user_id;
          return '<tr><td><b>' + esc(s.display_name || '—') + '</b>' + (self ? ' <span class="small muted">(คุณ)</span>' : '') + '</td><td>' + esc(s.email || '—') + '</td><td>' + pill(r[0], r[1]) + '</td><td>' + (s.mfa ? pill('เปิด', 'good') : pill('ยังไม่ตั้ง', 'warn')) + '</td><td>' + (s.line ? pill('ผูกแล้ว', 'good') : '<span class="muted small">—</span>') + '</td><td>' + esc(s.last_seen_at ? O.date(s.last_seen_at, true) : 'ยังไม่เคยเข้า') + '</td><td>' +
            (s.disabled ? pill('ระงับ', 'crit') : s.must_change_password ? pill('รอเปลี่ยนรหัส', 'warn') : pill('ใช้งาน', 'good')) + '</td>' +
            (owner ? '<td style="white-space:nowrap">' + (s.role !== 'owner' ? '<button class="btn sm" data-staff="reset" data-id="' + s.user_id + '">ออกรหัสใหม่</button> <button class="btn sm ghost" data-staff="role" data-id="' + s.user_id + '" data-role="' + s.role + '">' + (s.role === 'admin' ? 'ลดเป็นดูอย่างเดียว' : 'ตั้งเป็นแอดมิน') + '</button> <button class="btn sm ' + (s.disabled ? '' : 'danger') + '" data-staff="disable" data-id="' + s.user_id + '" data-v="' + (s.disabled ? '0' : '1') + '">' + (s.disabled ? 'เปิดใช้' : 'ระงับ') + '</button> <button class="btn sm ghost" data-staff="delete" data-id="' + s.user_id + '" data-name="' + esc(s.display_name || s.email) + '">ลบ</button>' : '') + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div><div class="small muted" style="margin-top:6px">เจ้าของ = ทุกอย่าง (ออกรหัส อนุมัติเงิน ดูอีเมลผู้เล่น) · แอดมิน = ทุกหน้า รับทราบแจ้งเตือน สั่งงานที่ไม่ใช้เงิน · ดูอย่างเดียว = อ่านได้ ไม่เห็นอีเมล · ระงับมีผลทันที</div>', { right: chip('db') });
      }
      if (owner) {
        h += card('ออกรหัสผ่านให้ผู้ดูแลใหม่', '<div class="form"><div class="row"><div class="field" style="flex:1;min-width:150px"><label for="sn">ชื่อ</label><input id="sn" maxlength="60"></div><div class="field" style="flex:2;min-width:200px"><label for="se">อีเมล (ต้องไม่ใช่บัญชีผู้เล่น)</label><input id="se" type="email"></div>' +
          '<div class="field" style="width:170px"><label for="sr">บทบาท</label><select id="sr"><option value="admin">แอดมิน</option><option value="viewer">ดูอย่างเดียว</option></select></div></div>' +
          '<div><button class="btn primary" data-staff="create">' + ico('lock') + 'สร้างบัญชีและออกรหัสครั้งเดียว</button></div><div class="small muted">ระบบแสดงรหัสผ่านครั้งเดียว → ส่งให้ทาง LINE → เข้าครั้งแรกต้องเปลี่ยนรหัสก่อนเห็นหน้าอื่น (บังคับฝั่งเซิร์ฟเวอร์)</div></div>');
      }
      const verified = ((d.factors && d.factors.totp) || []).filter((f) => f.status === 'verified');
      h += card('ความปลอดภัยของฉัน', '<div class="kv"><div>บัญชี<b>' + esc(O.me.email || '—') + '</b></div><div>บทบาท<b>' + esc((ROLE[O.me.role] || [O.me.role])[0]) + '</b></div><div>รหัส 6 หลัก (TOTP)<b>' + (verified.length ? pill('เปิดแล้ว · ' + verified.length + ' อุปกรณ์', 'good') : pill(owner ? 'ต้องตั้ง' : 'ยังไม่ตั้ง', 'warn')) + '</b></div><div>ระดับเซสชัน<b>' + esc(O.me.aal === 'aal2' ? 'ยืนยัน 2 ขั้นแล้ว' : 'รหัสผ่านอย่างเดียว') + '</b></div></div>' +
        '<div class="row" style="margin-top:10px"><button class="btn sm" data-mypw="1">เปลี่ยนรหัสผ่าน</button>' + (!verified.length && !owner ? '<button class="btn sm" data-enroll="1">ตั้งรหัส 6 หลัก</button>' : '') + '</div>' +
        (!owner ? '<div class="small muted" style="margin-top:6px">แอดมินต้องตั้งรหัส 6 หลักก่อนอนุมัติรายการที่ใช้เงิน</div>' : ''), { right: chip('db', null, { label: 'Supabase Auth' }) });
      if (d.audit) {
        h += card('บันทึกตรวจสอบ', d.audit.length ? '<div class="tablewrap"><table><thead><tr><th>เวลา</th><th>ใคร</th><th>ทำอะไร</th><th>รายละเอียด</th></tr></thead><tbody>' + d.audit.map((a) =>
          '<tr><td class="num">' + esc(O.date(a.created_at, true)) + '</td><td>' + pill(a.actor_name || a.actor_kind, a.actor_kind === 'claude' ? 'brand' : a.actor_kind === 'staff' ? 'good' : 'neutral') + '</td><td>' + esc(a.action) + '</td><td style="white-space:normal" class="small">' + esc([a.entity, a.entity_id && String(a.entity_id).slice(0, 8), a.detail ? JSON.stringify(a.detail).slice(0, 120) : ''].filter(Boolean).join(' · ')) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">ยังไม่มีบันทึก</div>', { lead: 'ทุกการกระทำของผู้ดูแล Claude และระบบอัตโนมัติ', right: chip('db') });
      }
      return h;
    },
  });

  function oneTimePasswordModal(title, email, password) {
    O.modal('<h2>' + esc(title) + '</h2><p class="small muted" style="margin:0">รหัสนี้แสดงครั้งเดียว ปิดหน้าต่างแล้วดูอีกไม่ได้ · ส่งให้ทาง LINE พร้อมลิงก์ junypop.com/office</p>' +
      (email ? '<div class="kv"><div>อีเมล<b>' + esc(email) + '</b></div></div>' : '') +
      '<div class="otp"><code>' + esc(password) + '</code><button class="btn sm" data-copy="' + esc(password) + '">' + ico('copy') + 'คัดลอก</button></div>' +
      '<button class="btn primary" data-closemodal="1" style="justify-content:center">ส่งให้แล้ว ปิดหน้าต่าง</button>');
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest ? e.target.closest('[data-snooze],[data-posted],[data-clipreq],[data-tpl],[data-send],[data-cancel],[data-staff],[data-closemodal],[data-mypw],[data-enroll],[data-confirm],[data-linecode],[data-lineunlink]') : null;
    if (!t) return;
    if (t.hasAttribute('data-closemodal')) { O.closeModal(); O.refresh(); return; }
    if (t.hasAttribute('data-linecode')) {
      t.disabled = true;
      try {
        const r = await O.rpc('office_line_code');
        O.modal('<h2>รหัสผูก LINE</h2><div class="otp"><code>' + esc(r.code) + '</code><button class="btn sm" data-copy="' + esc(r.code) + '">' + ico('copy') + 'คัดลอก</button></div>' +
          '<ol class="small" style="margin:0;padding-left:18px"><li>เปิดแชท <a href="https://line.me/R/ti/p/@793ymief" target="_blank" rel="noopener">JUNYPOP Office</a> ใน LINE (แอดเพื่อนก่อนถ้ายังไม่ได้แอด)</li><li>ส่งรหัส 6 หลักนี้ในแชท</li><li>บอทจะตอบว่า "ผูกบัญชีแล้ว"</li></ol>' +
          '<div class="small muted">รหัสใช้ได้ 30 นาที ครั้งเดียว</div><button class="btn primary" data-closemodal="1" style="justify-content:center">ส่งแล้ว</button>');
      } catch (err) { O.say(O.errText(err)); }
      t.disabled = false;
      return;
    }
    if (t.hasAttribute('data-lineunlink')) {
      t.disabled = true;
      try { await O.rpc('office_line_unlink'); O.me.line_linked = false; O.say('เลิกผูก LINE แล้ว'); O.refresh(); } catch (err) { O.say(O.errText(err)); t.disabled = false; }
      return;
    }
    if (t.hasAttribute('data-tpl')) { const i = document.getElementById('ct'); if (i) { i.value = t.getAttribute('data-tpl'); i.focus(); } return; }
    if (t.hasAttribute('data-enroll')) { O.say('ออกจากระบบแล้วเข้าใหม่ ระบบจะพาตั้งรหัส 6 หลัก'); return; }
    if (t.hasAttribute('data-mypw')) {
      O.modal('<h2>เปลี่ยนรหัสผ่าน</h2><div class="field"><label for="p1">รหัสผ่านใหม่ (อย่างน้อย 10 ตัว)</label><input id="p1" type="password" autocomplete="new-password"></div><div class="field"><label for="p2">ยืนยัน</label><input id="p2" type="password" autocomplete="new-password"></div><div class="row"><button class="btn primary" data-confirm="pw">บันทึก</button><button class="btn ghost" data-closemodal="1">ยกเลิก</button></div>');
      return;
    }
    t.disabled = true;
    try {
      if (t.hasAttribute('data-confirm') && t.getAttribute('data-confirm') === 'pw') {
        const a = document.getElementById('p1').value, b = document.getElementById('p2').value;
        if (a.length < 10) throw new Error('weak_password');
        if (a !== b) throw new Error('รหัสผ่านสองช่องไม่ตรงกัน');
        const { error } = await O.sb.auth.updateUser({ password: a });
        if (error) throw error;
        O.closeModal(); O.say('เปลี่ยนรหัสผ่านแล้ว');
      } else if (t.hasAttribute('data-confirm')) {
        const [act, id] = t.getAttribute('data-confirm').split(':');
        await O.admin({ action: act, user_id: id });
        O.closeModal(); O.say('ลบบัญชีแล้ว'); O.refresh();
      } else if (t.hasAttribute('data-snooze')) {
        await O.rpc('office_alert_ack', { p_id: Number(t.getAttribute('data-snooze')), p_snooze_hours: 24 });
        O.say('ปิดเสียง 24 ชม.'); O.refresh();
      } else if (t.hasAttribute('data-posted')) {
        await O.rpc('office_clip_posted', { p_id: t.getAttribute('data-posted'), p_posted: t.getAttribute('data-v') === '1' });
        O.refresh();
      } else if (t.hasAttribute('data-clipreq')) {
        const w = document.getElementById('cw').value.trim();
        await O.rpc('office_enqueue', { p_text: 'ผลิตคลิป --format ' + document.getElementById('cf').value + ' --count ' + document.getElementById('cn').value + (w ? ' --world ' + w : ''), p_money: false });
        O.say('ส่งเข้าคิวแล้ว · รอ Claude'); t.disabled = false;
      } else if (t.hasAttribute('data-send')) {
        const i = document.getElementById('ct'), m = document.getElementById('cm');
        if (!i.value.trim()) throw new Error('พิมพ์คำสั่งก่อน');
        await O.rpc('office_enqueue', { p_text: i.value.trim(), p_money: !!(m && m.checked) });
        O.say('ส่งเข้าคิวแล้ว'); O.refresh();
      } else if (t.hasAttribute('data-cancel')) {
        await O.rpc('office_command_cancel', { p_id: Number(t.getAttribute('data-cancel')) });
        O.refresh();
      } else if (t.hasAttribute('data-staff')) {
        const act = t.getAttribute('data-staff'), id = t.getAttribute('data-id');
        if (act === 'create') {
          const email = document.getElementById('se').value.trim();
          const r = await O.admin({ action: 'create', email, name: document.getElementById('sn').value.trim(), role: document.getElementById('sr').value });
          oneTimePasswordModal('สร้างบัญชีแล้ว', email, r.password);
        } else if (act === 'reset') {
          const r = await O.admin({ action: 'reset', user_id: id });
          oneTimePasswordModal('รหัสผ่านใหม่ (ครั้งเดียว)', null, r.password);
        } else if (act === 'disable') {
          await O.admin({ action: 'disable', user_id: id, disabled: t.getAttribute('data-v') === '1' });
          O.say(t.getAttribute('data-v') === '1' ? 'ระงับแล้ว — มีผลทันที' : 'เปิดใช้แล้ว'); O.refresh();
        } else if (act === 'role') {
          await O.rpc('office_staff_set', { p_uid: id, p_role: t.getAttribute('data-role') === 'admin' ? 'viewer' : 'admin' });
          O.refresh();
        } else if (act === 'delete') {
          O.modal('<h2>ลบบัญชี ' + esc(t.getAttribute('data-name')) + '?</h2><p class="small muted" style="margin:0">ลบการเข้าสู่ระบบถาวร บันทึกตรวจสอบยังอยู่</p><div class="row"><button class="btn danger" data-confirm="delete:' + esc(id) + '">ลบถาวร</button><button class="btn ghost" data-closemodal="1">ยกเลิก</button></div>');
          t.disabled = false;
        }
      }
    } catch (err) {
      O.say(O.errText(err));
      t.disabled = false;
    }
  });

  // ------------------------------------------------------------------ แหล่งข้อมูล
  const DEFS = [
    ['db', 'ฐานข้อมูล (Supabase)', 'ทุกอย่างที่เกมบันทึกจริง: โปรไฟล์ เซสชัน คำตอบรายคำ XP เหรียญ หอคอย ดวล การซื้อ', 'ยังไม่รู้แพลตฟอร์มแน่นอนจนถึงแอป v1.2 (ตอนนี้เดาจาก Apple / user agent / ร่องรอยเว็บ) · ผลเล่นที่ส่งไม่สำเร็จถูกทิ้งเงียบ ๆ (แก้ใน v1.2)', 'ทุกแพลตฟอร์ม', 'สด'],
    ['events', 'อีเวนต์แอป', 'เปิดแอป เข้าหน้า เห็นหน้าขาย แชร์ ตั้งค่า ข้อผิดพลาด พร้อมแพลตฟอร์มและเวอร์ชัน', 'เริ่มเก็บเมื่อแอป v1.2 ออก', 'เว็บ · iOS · Android', 'เฟส 4'],
    ['meta', 'Meta Ads', 'สถานะโฆษณา งบ การแสดงผล คลิก ค่าใช้จ่าย conversion จาก pixel', 'นับเฉพาะแคมเปญชื่อ JUNYPOP… · conversion แก้ย้อนหลังได้ 28 วัน · Meta รีเฟรชเองทุก ~15 นาที', 'ตาม ad set', 'ทุก 15 นาที (หลังรัน SQL 0019)'],
    ['apple', 'Apple Ads', 'โฆษณาค้นหาใน App Store: สถานะ งบ แตะ ติดตั้ง ต่อคีย์เวิร์ด', 'บัญชีเป็น USD แปลงเป็นบาทโดยประมาณ · ติดตั้งที่ Apple นับ = เฉพาะจากโฆษณาค้นหา', 'iOS', 'ทุก 15 นาที (หลังรัน SQL 0019)'],
    ['iap', 'Apple IAP', 'ซื้อ/ต่ออายุ/ยกเลิก/คืนเงิน Plus บน iOS', 'Sandbox แยกออก ไม่นับรายได้', 'iOS', 'ทันที'],
    ['stripe', 'Stripe', 'การซื้อ Plus บนเว็บ', '—', 'เว็บ', 'ทันที'],
    ['ga4', 'GA4 · เว็บ', 'ผู้ใช้ออนไลน์ตอนนี้ ที่มา อุปกรณ์ หน้า landing', 'นับเฉพาะคนกดยอมรับคุกกี้ · ล่าช้า 2–6 ชม.', 'เว็บ', 'เฟส 3'],
    ['asc', 'App Store Connect', 'ดาวน์โหลด impressions อัตราแปลง crash รีวิว', 'ข้อมูลรวม ล่าช้า 2–5 วัน · ต้อง API key ระดับ Admin', 'iOS', 'เฟส 5'],
  ];
  O.page('sources', {
    title: 'แหล่งข้อมูล', icon: 'db', group: 'ระบบ', sub: 'ตัวเลขแต่ละตัวมาจากไหน เชื่อได้แค่ไหน',
    load: async () => { const [s, i] = await Promise.all([O.rpc('office_sources'), O.rpc('office_internal_list').catch(() => null)]); s.internal = i; return s; },
    render(d) {
      const t = d.times || {};
      const at = { db: t.db, events: null, meta: t.meta, apple: t.apple_ads, iap: t.iap, stripe: t.stripe, ga4: null, asc: null };
      let h = '<div class="note">ทุกตัวเลขในแดชบอร์ดมีป้ายบอกที่มา (กดที่ป้ายเพื่อดูคำอธิบาย) · หน้านี้บอกว่าแต่ละแหล่ง <b>นับอะไร ไม่นับอะไร ช้าแค่ไหน</b> และอัปเดตล่าสุดเมื่อไร</div>';
      h += '<div class="srcgrid">' + DEFS.map(([k, n, def, miss, plat, cad]) => {
        const connected = !['events', 'ga4', 'asc'].includes(k);
        const st = !connected ? pill('ยังไม่เชื่อม', 'neutral') : at[k] ? pill('มีข้อมูล', 'good') : pill('ยังไม่มีรายการ', 'warn');
        return '<div class="srccard"><div class="h">' + chip(k, null, { label: n }) + st + '</div><p><b>นับ:</b> ' + esc(def) + '</p><p><b>ข้อจำกัด:</b> ' + esc(miss) + '</p><div class="row">' + pill(plat, 'neutral') + '<span class="muted">' + esc(cad) + '</span><span class="grow"></span><span class="muted">ล่าสุด ' + esc(k === 'db' ? 'สด' : at[k] ? O.ago(at[k]) : '—') + '</span></div></div>';
      }).join('') + '</div>';
      const sync = d.sync || [];
      const jobs = (d.cron && d.cron.jobs) || [];
      const cronNote = d.cron && d.cron.installed === false
        ? 'ยังไม่ได้เปิด pg_cron — Supabase → Database → Extensions เปิด pg_cron และ pg_net แล้วรัน SQL 0019 อีกครั้ง'
        : 'ยังไม่ได้รัน SQL 0019';
      const jobHtml = jobs.length
        ? '<div class="kv">' + jobs.map((j) => '<div>' + esc(j.name) + '<b>' + esc(j.schedule) + ' ' + (j.active ? pill('ทำงาน', 'good') : pill('ปิด', 'neutral')) + '</b><span class="small muted">' + esc(j.last ? (j.last.status + ' · ' + O.ago(j.last.at)) : 'ยังไม่เคยรัน') + '</span></div>').join('') + '</div>'
        : '<div class="small muted">' + cronNote + '</div>';
      const logHtml = sync.length
        ? '<div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>เวลา</th><th>แหล่ง</th><th>ผล</th><th class="r">แถว</th><th>หมายเหตุ</th></tr></thead><tbody>' + sync.slice(0, 12).map((l) => '<tr><td>' + esc(O.date(l.started_at, true)) + '</td><td>' + esc(l.source) + ' <span class="muted small">' + esc(l.trigger) + '</span></td><td>' + (l.ok ? pill('สำเร็จ', 'good') : l.ok === false ? pill('ล้มเหลว', 'crit') : pill('กำลังทำ', 'neutral')) + '</td><td class="r num">' + num(l.rows) + '</td><td class="small" style="white-space:normal">' + esc(String(l.error || '').slice(0, 160)) + '</td></tr>').join('') + '</tbody></table></div>'
        : '';
      h += card('การซิงก์อัตโนมัติ', jobHtml + logHtml, { right: chip('db') });
      const internal = d.internal || [];
      if (internal.length) {
        h += card('บัญชีที่ไม่นับในสถิติ', '<div class="tablewrap"><table><thead><tr><th>ผู้เล่น</th><th>หมายเหตุ</th><th>โดย</th><th></th></tr></thead><tbody>' + internal.map((u) => '<tr><td><code>' + esc(String(u.user_id).slice(0, 6)) + '</code> ' + esc(u.username || '') + '</td><td class="small">' + esc(u.note || '') + '</td><td class="small">' + esc(u.added_by || '') + ' · ' + esc(O.date(u.added_at)) + '</td><td>' + (O.me.role !== 'viewer' ? '<button class="btn sm ghost" data-internal="' + esc(u.user_id) + '" data-v="0">นับกลับ</button>' : '') + '</td></tr>').join('') + '</tbody></table></div><div class="small muted" style="margin-top:6px">บัญชีทดสอบหรือทีมงาน ไม่ถูกนับเป็นผู้เล่น ผู้มาเยือน หรือ DAU</div>', { right: chip('db') });
      }
      const rows = d.rows || {};
      const mb = (d.db_bytes || 0) / 1048576;
      h += '<div class="grid"><div class="c6">' + card('ขนาดข้อมูล', '<div class="small" style="display:flex;justify-content:space-between"><span>ฐานข้อมูล</span><b class="num">' + num(mb, 1) + ' / 500 MB</b></div><div class="meter' + (mb > 400 ? ' warn' : '') + '"><span style="width:' + Math.min(100, Math.max(1, mb / 5)) + '%"></span></div><div class="small muted" style="margin:4px 0 10px">แผน Free · เตือนที่ 400 MB</div>' +
        '<div class="kv">' + Object.entries(rows).map(([k, v]) => '<div>' + esc(k) + '<b class="num">' + num(v) + '</b></div>').join('') + '</div>', { right: chip('db') }) + '</div>' +
        '<div class="c6">' + card('การแยกแพลตฟอร์มตอนนี้', '<p class="small" style="margin:0 0 8px">ระบบเดาแพลตฟอร์มของผู้เล่นแต่ละคนตามลำดับความมั่นใจ: ซื้อผ่าน Apple หรือ Sign in with Apple → iOS แน่นอน · user agent ของครั้งแรกที่เข้า (แอป = iOS, เบราว์เซอร์ = เว็บ, crawler = บอท) · ร่องรอยเว็บ (Stripe / โค้ด / UTM) → เว็บ · นอกนั้น "ไม่ระบุ"</p>' +
          '<div>' + (d.ua_available ? pill('ใช้ user agent ได้', 'good') : pill('โปรเจกต์นี้ไม่มี user agent — ใช้สัญญาณอื่นอย่างเดียว', 'warn')) + '</div><p class="small muted" style="margin:8px 0 0">บัญชีโฆษณา Meta ใช้ร่วมกับธุรกิจอื่นของคุณ จึงนับเฉพาะแคมเปญชื่อ JUNYPOP… · บอทและบัญชีผู้ดูแลไม่ถูกนับเป็นผู้เล่น</p>') + '</div></div>';
      return h;
    },
  });
})();
