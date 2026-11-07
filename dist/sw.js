// Cache only the public offline illustration. Never cache API, account data or authenticated HTML.
const CACHE='farm-off-offline-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.add('/offline.html'))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('farm-off-offline-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate'&&event.request.method==='GET')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))});
