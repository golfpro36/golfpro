// service worker: เปิดเร็วขึ้น + เปิดหน้าเว็บได้แม้สัญญาณหาย (ข้อมูลผลการแข่งขันยังต้องใช้อินเทอร์เน็ต)
// ใช้ "เน็ตก่อน แล้วค่อยของในเครื่อง" → แก้ไฟล์บน GitHub แล้วผู้ใช้เห็นของใหม่เอง ไม่ต้องเปลี่ยนเลขเวอร์ชัน
const CACHE = 'golfpro36-shell';
const SHELL = ['./', 'index.html', 'event.html', 'config.js', 'gas-shim.js', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // Apps Script / CDN ไม่ยุ่ง
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
