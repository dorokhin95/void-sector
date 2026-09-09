'use strict';
// ===== VOID SECTOR — интеграция с Telegram Mini Apps =====
// Активна только внутри Telegram (когда страница открыта как Mini App через бота);
// в обычном браузере window.Telegram.WebApp не существует, и весь файл — no-op.
// Поэтому один и тот же мобильный билд одинаково работает и как сайт/PWA, и как
// приложение в Telegram — ничего не нужно собирать отдельно.
(function(){
 // window.Telegram.WebApp существует, даже когда скрипт просто загружен в обычном
 // браузере (тогда platform:'unknown', initData:'') — единственный надёжный признак
 // настоящего запуска внутри Telegram это непустой initData (подписанные параметры
 // запуска). Без этой проверки полноэкранный режим и блокировку свайпов включало бы
 // и на обычном сайте, что там не нужно и может мешать.
 const tg=window.Telegram?.WebApp;
 if(!tg||!tg.initData)return;
 document.documentElement.classList.add('in-telegram');
 try{tg.ready()}catch{}
 try{tg.expand()}catch{}
 // Критично для наших джойстиков: без этого свайп вниз по игровому полю
 // воспринимается Telegram как жест сворачивания мини-приложения.
 try{tg.disableVerticalSwipes?.()}catch{}
 try{tg.disableClosingConfirmation?.()}catch{}
 try{tg.setBackgroundColor?.('#070c17')}catch{}
 try{tg.setHeaderColor?.('#070d19')}catch{}
 try{tg.setBottomBarColor?.('#070c17')}catch{}
 // Полноэкранный режим и альбомная ориентация — Bot API 8.0+, старые клиенты просто
 // проигнорируют вызов (методов не будет, optional chaining не даст упасть).
 function goImmersive(){try{tg.requestFullscreen?.()}catch{}try{tg.lockOrientation?.('landscape')}catch{}}
 goImmersive();
 document.addEventListener('click',e=>{if(e.target.closest('#start,#loadCampaign,#retryLevel,#restart,#fullscreen'))goImmersive()});
 // Telegram меняет размер вьюпорта не всегда через обычный window resize — досчитываем сами.
 tg.onEvent?.('viewportChanged',()=>dispatchEvent(new Event('resize')));
 tg.onEvent?.('fullscreenChanged',()=>dispatchEvent(new Event('resize')));
 // Безопасные отступы Telegram (собственная шапка/жесты) поверх обычных env(safe-area-inset-*),
 // см. --tg-safe-* в style.css.
 function applySafeArea(){
  const s=tg.safeAreaInset||{},c=tg.contentSafeAreaInset||{},root=document.documentElement.style;
  root.setProperty('--tg-safe-top',Math.max(s.top||0,c.top||0)+'px');
  root.setProperty('--tg-safe-right',Math.max(s.right||0,c.right||0)+'px');
  root.setProperty('--tg-safe-bottom',Math.max(s.bottom||0,c.bottom||0)+'px');
  root.setProperty('--tg-safe-left',Math.max(s.left||0,c.left||0)+'px');
 }
 applySafeArea();
 tg.onEvent?.('safeAreaChanged',applySafeArea);
 tg.onEvent?.('contentSafeAreaChanged',applySafeArea);
 // Аппаратная кнопка «назад» Telegram работает как Esc на ПК: пауза в бою, скрыта в меню.
 tg.BackButton?.onClick?.(()=>{try{if(typeof pause==='function'&&(mode==='play'||mode==='pause'))pause()}catch{}});
 if(typeof on==='function')on('modeChange',({to})=>{try{(to==='play'||to==='pause')?tg.BackButton?.show?.():tg.BackButton?.hide?.()}catch{}});
})();
