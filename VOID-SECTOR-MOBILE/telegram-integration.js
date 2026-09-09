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
 // Свайп-сворачивание блокируем только во время боя — вне боя Telegram сам
 // рекомендует enableVerticalSwipes, если собственные жесты приложения не
 // конфликтуют с ним (у нас конфликт только в gameplay, где палец тянет джойстик
 // вертикально). disableVerticalSwipes появился в Bot API 7.7 вместе с
 // isVersionAtLeast — если метода определения версии нет, метода блокировки
 // жестов тоже не будет, дальше можно не проверять отдельно.
 function syncTelegramSwipeBehavior(targetMode=mode){
  try{
   if(tg.isVersionAtLeast&&!tg.isVersionAtLeast('7.7'))return;
   if(targetMode==='play')tg.disableVerticalSwipes?.();
   else tg.enableVerticalSwipes?.();
  }catch{}
 }
 syncTelegramSwipeBehavior();
 try{tg.disableClosingConfirmation?.()}catch{}
 try{tg.setBackgroundColor?.('#070c17')}catch{}
 try{tg.setHeaderColor?.('#070d19')}catch{}
 try{tg.setBottomBarColor?.('#070c17')}catch{}
 // Полноэкранный режим и альбомная ориентация — Bot API 8.0+, старые клиенты просто
 // проигнорируют вызов (методов не будет, optional chaining не даст упасть). Блокировку
 // жестов не привязываем к успеху fullscreen — на Telegram iOS requestFullscreen может
 // не сработать, а жесты во время боя должны быть заблокированы в любом случае.
 function goImmersive(){
  try{tg.requestFullscreen?.()}catch{}
  try{tg.lockOrientation?.('landscape')}catch{}
  syncTelegramSwipeBehavior();
 }
 goImmersive();
 document.addEventListener('click',e=>{if(e.target.closest('#start,#loadCampaign,#retryLevel,#restart,#fullscreen'))goImmersive()});
 // Telegram сообщает актуальный размер вьюпорта своими событиями — синхронизируем
 // через единый syncMobileViewport() (mobile-controls.js), а не просто dispatch
 // обычного resize: у getAppViewport() он и так в приоритете читает
 // viewportStableHeight/viewportHeight, но лишь когда мы уверены, что размер уже
 // стабилен (isStateStable), чтобы не пересчитывать кадр на промежуточных кадрах
 // анимации разворачивания/сворачивания. Заодно на каждом из этих событий сверяем
 // состояние блокировки свайпов — Telegram может сбросить его сам при переходах
 // fullscreen/активации.
 function syncViewportSafe(){try{syncMobileViewport?.()}catch{}}
 tg.onEvent?.('viewportChanged',event=>{if(event?.isStateStable!==false){syncTelegramSwipeBehavior();syncViewportSafe()}});
 tg.onEvent?.('fullscreenChanged',()=>{syncTelegramSwipeBehavior();syncViewportSafe()});
 tg.onEvent?.('activated',()=>{syncTelegramSwipeBehavior();syncViewportSafe()});
 // deactivated — мини-приложение временно ушло в фон (например, свернули штатным
 // способом через шапку Telegram и снова открыли). Сбрасываем оба джойстика и
 // стрельбу — как при blur/visibilitychange в mobile-controls.js — чтобы палец,
 // «оставшийся нажатым» с точки зрения Pointer Events, не залипал.
 tg.onEvent?.('deactivated',()=>{try{resetAllMobileSticks?.()}catch{}});
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
 tg.onEvent?.('safeAreaChanged',()=>{applySafeArea();syncViewportSafe()});
 tg.onEvent?.('contentSafeAreaChanged',()=>{applySafeArea();syncViewportSafe()});
 // Первичная синхронизация сразу после ready()/expand() — не ждать первого
 // внешнего события, чтобы стартовый кадр уже был с верным --app-height и классом.
 syncViewportSafe();
 // Аппаратная кнопка «назад» Telegram работает как Esc на ПК: пауза в бою, скрыта в меню.
 tg.BackButton?.onClick?.(()=>{try{if(typeof pause==='function'&&(mode==='play'||mode==='pause'))pause()}catch{}});
 if(typeof on==='function')on('modeChange',({to})=>{
  syncTelegramSwipeBehavior(to);
  try{(to==='play'||to==='pause')?tg.BackButton?.show?.():tg.BackButton?.hide?.()}catch{}
 });
})();
