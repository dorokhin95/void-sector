'use strict';
// ===== VOID SECTOR MOBILE — service worker для озвучки диалогов =====
// Намеренно НЕ полноценный app-shell/offline SW (его в проекте раньше не
// было вовсе) — только то, что требуется для voice pack (391 mp3, ~10 МБ):
// не прекэшировать всё при установке (тяжело для первого запуска
// Telegram/PWA), а кэшировать по требованию (Cache First) только реально
// проигранные реплики. voice-manifest.js маленький и прекэшируется сразу.
// Всё остальное (game.js, story.js, style.css и т.д.) идёт напрямую в сеть,
// как и раньше — этот SW их не перехватывает.
const CACHE='void-sector-voice-v2';
const PRECACHE=['voice-manifest.js'];

self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).catch(()=>{}));
 self.skipWaiting();
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 // Только собственные voice-ассеты — content-hashed имена файлов, значит
 // они immutable и безопасны для Cache First (никогда не меняются под тем
 // же именем).
 if(url.origin!==location.origin||!/\/assets\/voice\/ru\//.test(url.pathname))return;
 e.respondWith(
  caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
   if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}
   return res;
  }).catch(()=>cached))
 );
});
