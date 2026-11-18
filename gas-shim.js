/**
 * gas-shim.js — ทำให้โค้ดหน้าเว็บเดิมที่ใช้ google.script.run ทำงานได้นอก Apps Script
 * แปลงทุกคำสั่ง google.script.run.xxx(...) เป็นการเรียก Apps Script ผ่านอินเทอร์เน็ต (fetch → doPost)
 */
(function () {
  var READ_ONLY = ['getPublicEvents', 'getTournamentData', 'getEventImages', 'getEventFileData', 'getAdminContact'];
  function call(fn, args) {
    var api = window.GOLFPRO_API || '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]{20,}\/exec$/.test(api)) {
      return Promise.reject(new Error('ยังไม่ได้ตั้งค่า config.js — วางลิงก์ Web App ของ Apps Script (ลงท้ายด้วย /exec)'));
    }
    // มือถือ (โดยเฉพาะ iPhone) ตัดการเชื่อมต่อบ่อยตอนสัญญาณอ่อน/สลับแอป → คำสั่ง "อ่านอย่างเดียว" ลองใหม่อัตโนมัติ 2 ครั้ง
    // v2.4.1: ลองใหม่ 1 ครั้ง (เว้นช่วงสุ่ม 1.5-3 วินาที กันทุกเครื่องยิงพร้อมกันตอนระบบหนัก) + ตัดคำขอที่ค้างเกิน 45 วินาที
    var tries = READ_ONLY.indexOf(fn) >= 0 ? 2 : 1;
    function once(n) {
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 45000) : null;
      return fetch(api, { method: 'POST', redirect: 'follow', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ fn: fn, args: args }), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('เซิร์ฟเวอร์ตอบกลับผิดปกติ (' + r.status + ')'); return r.json(); })
        .then(function (o) { if (timer) clearTimeout(timer); if (o && o.sv) { try { window.dispatchEvent(new CustomEvent('gp-sv', { detail: o.sv })); } catch (x) {} } return o; })
        .catch(function (e) {
          if (timer) clearTimeout(timer);
          if (e && e.name === 'AbortError') e = new Error('เซิร์ฟเวอร์ตอบช้าเกินไป — ลองใหม่อีกครั้ง');
          if (n > 1) return new Promise(function (ok) { setTimeout(ok, 1500 + Math.random() * 1500); }).then(function () { return once(n - 1); });
          throw e;
        });
    }
    return once(tries)
      .catch(function (e) { throw new Error(e && /JSON|Failed to fetch|NetworkError|Load failed/.test(e.message) ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต หรือลิงก์ใน config.js' : (e.message || String(e))); })
      .then(function (o) { if (!o || !o.ok) throw new Error((o && o.err) || 'เกิดข้อผิดพลาด'); return o.v; });
  }
  function runner(h) {
    return new Proxy({}, { get: function (_, k) {
      if (k === 'withSuccessHandler') return function (f) { return runner(Object.assign({}, h, { s: f })); };
      if (k === 'withFailureHandler') return function (f) { return runner(Object.assign({}, h, { f: f })); };
      if (k === 'withUserObject') return function (u) { return runner(Object.assign({}, h, { u: u })); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        call(String(k), args).then(function (v) { if (h.s) h.s(v, h.u); }, function (e) { if (h.f) h.f(e, h.u); else console.error(e); });
      };
    } });
  }
  window.google = window.google || {};
  window.google.script = { run: runner({}), host: { close: function () {} } };
})();
