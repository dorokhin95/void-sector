'use strict';
// ===== VOID SECTOR — мобильная сборка: сенсорное управление =====
// Полностью заменяет WASD и мышь на два виртуальных джойстика (Pointer Events —
// работают и с мышью на ПК, что удобно для отладки). Левый — движение корабля,
// правый — прицел и стрельба. Плюс: подсказка альбомной ориентации, полноэкранный
// режим, крупные кнопки способностей, вибро-отклик, переключатель стабилизации.
// Загружается последним, поверх всей игровой логики и Этапов 2–3.

const MOBILE_DEADZONE=.16;
function mobileAimSpeed(){return Math.min(innerWidth,innerHeight)*2.4}
function mobileStickRadius(){return Math.min(innerWidth,innerHeight)*.16+42}
function vibrate(pattern){try{navigator.vibrate?.(pattern)}catch{}}

// ---------- Виртуальный джойстик на паре Pointer Events ----------
// Возвращает объект состояния {x,y,mag} — направление×магнитуда после мёртвой
// зоны (0 сразу за порогом, не с MOBILE_DEADZONE — иначе именно на границе
// возникает скачок) и её длина; читается каждый тик симуляции, независимо от
// частоты событий указателя.
function createStick(zoneId,stickId,onBegin,onEnd){
 const zone=document.getElementById(zoneId),el=document.getElementById(stickId);
 if(!zone||!el)return{x:0,y:0,mag:0,active:false,reset(){}};
 const thumb=el.querySelector('.thumb');
 const state={x:0,y:0,mag:0,active:false,pointerId:null,ox:0,oy:0,el};
 function begin(e){
  if(state.active)return;
  state.active=true;state.pointerId=e.pointerId;
  const r=zone.getBoundingClientRect(),margin=mobileStickRadius()+14;
  state.ox=clamp(e.clientX,r.left+margin,r.right-margin);
  state.oy=clamp(e.clientY,r.top+margin,r.bottom-margin);
  // .stick — position:absolute внутри .stickZone, поэтому left/top должны быть
  // заданы относительно зоны (r.left/r.top), а не в координатах вьюпорта —
  // иначе кольцо джойстика рисуется со сдвигом от пальца.
  el.style.left=(state.ox-r.left)+'px';el.style.top=(state.oy-r.top)+'px';el.classList.add('show');
  try{zone.setPointerCapture(e.pointerId)}catch{}
  // Явно гасим системный жест (скролл/свайп-закрытие Telegram) прямо на уровне
  // Pointer Events — это надёжнее, чем полагаться только на touch-action, и не
  // требует stopPropagation (который сломал бы что-то ещё в обработке событий).
  if(e.cancelable)e.preventDefault();
  onBegin?.(state);
  track(e);
 }
 function track(e){
  if(!state.active||e.pointerId!==state.pointerId)return;
  const R=mobileStickRadius(),dx=e.clientX-state.ox,dy=e.clientY-state.oy,dist=Math.hypot(dx,dy);
  const raw=Math.min(1,dist/R);
  if(raw<=MOBILE_DEADZONE){state.x=0;state.y=0;state.mag=0}
  else{
   const mag=(raw-MOBILE_DEADZONE)/(1-MOBILE_DEADZONE),ux=dist>0?dx/dist:0,uy=dist>0?dy/dist:0;
   state.x=ux*mag;state.y=uy*mag;state.mag=mag;
  }
  // Визуальный «стик» всегда следует за пальцем 1:1 в пределах кольца (даже в
  // мёртвой зоне) — это отдельно от геймплейного значения выше.
  const visDist=Math.min(dist,R),vx=dist>0?dx/dist*visDist:0,vy=dist>0?dy/dist*visDist:0;
  if(thumb)thumb.style.transform='translate(-50%,-50%) translate('+vx+'px,'+vy+'px)';
  if(e.cancelable)e.preventDefault();
 }
 function end(e){
  if(!state.active||(e&&e.pointerId!==state.pointerId))return;
  state.active=false;state.pointerId=null;state.x=0;state.y=0;state.mag=0;
  el.classList.remove('show');el.classList.remove('firing');
  if(thumb)thumb.style.transform='translate(-50%,-50%)';
  onEnd?.(state);
 }
 zone.addEventListener('pointerdown',begin);
 zone.addEventListener('pointermove',track);
 zone.addEventListener('pointerup',end);
 zone.addEventListener('pointercancel',end);
 zone.addEventListener('lostpointercapture',end);
 state.reset=()=>end({pointerId:state.pointerId});
 return state;
}
const moveStick=createStick('moveZone','moveStick');
// Огонь выключаем синхронно тут же при отпускании/отмене — не дожидаясь
// следующего тика applyMobileAim(), иначе между событием и пересчётом кадра
// остаётся микроскопическое окно, где firing формально ещё true.
const aimStick=createStick('aimZone','aimStick',null,()=>{firing=false});
// Смена вкладки/сворачивание — сбрасываем оба стика и стрельбу, чтобы палец,
// снятый вне страницы, не оставил джойстик залипшим во «нажатом» состоянии.
function resetAllMobileSticks(){moveStick.reset();aimStick.reset();firing=false}
addEventListener('blur',resetAllMobileSticks);
document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAllMobileSticks()});
// Отдельный класс на время боя: включает touch-action:none на html/body (ниже,
// style.css), а не постоянно — иначе снова сломается скролл меню/ангара.
function syncGameplayGestureLock(targetMode=mode){document.documentElement.classList.toggle('gameplay-gesture-lock',targetMode==='play')}
syncGameplayGestureLock();
if(typeof on==='function')on('modeChange',({to})=>syncGameplayGestureLock(to));
// WebView-подстраховка поверх Pointer Events (некоторые версии WebKit всё ещё
// прокручивают страницу по touchmove, даже если preventDefault уже был на
// pointerdown/pointermove) — работает строго только во время боя.
document.addEventListener('touchmove',e=>{if(mode==='play'&&e.cancelable)e.preventDefault()},{passive:false,capture:true});

// ---------- Движение: аналоговый джойстик транслируется в цифровые WASD-флаги,
// как в оригинальной схеме управления (тяга постоянна, направление — по стику). ----------
function applyMobileMove(){
 if(moveStick.mag>0){
  keys.KeyD=moveStick.x>.25;keys.KeyA=moveStick.x<-.25;keys.KeyW=moveStick.y<-.25;keys.KeyS=moveStick.y>.25;
 }else{
  keys.KeyD=keys.KeyA=keys.KeyW=keys.KeyS=false;
 }
}
// ---------- Прицел и огонь: правый стик задаёт СКОРОСТЬ смещения прицела, а не
// абсолютную позицию от опорной точки. Это убирает скачки в принципе: сколько бы
// раз ни отпускали и не перехватывали стик (даже удерживая одновременно левый),
// прицел просто продолжает копить смещение с текущего места — прыгать ему некуда,
// потому что нет «опорной точки», которая могла бы сама сместиться. Не зависит от
// движения корабля, поэтому манёвр и стрельба не мешают друг другу. ----------
function applyMobileAim(dt){
 if(mode!=='play'){aimStick.el?.classList.remove('firing');return}
 if(aimStick.mag>0){
  const speed=mobileAimSpeed();
  mx=clamp(mx+aimStick.x*speed*dt,0,innerWidth);
  my=clamp(my+aimStick.y*speed*dt,0,innerHeight);
  firing=true;aimStick.el?.classList.add('firing');
 }else{
  firing=false;aimStick.el?.classList.remove('firing');
 }
}
// Оборачиваем update() тем же приёмом, что использует весь остальной код (game.js →
// stage1.js → events.js уже переопределяют update по цепочке).
(function wrapUpdate(){
 const baseUpdate=update;
 update=function(dt){
  applyMobileMove();applyMobileAim(dt);
  baseUpdate(dt);
  syncMobileHUD();
 };
})();

// ---------- Переключатель стабилизации полёта (аналог клавиши C) ----------
const stabBtn=document.getElementById('stab');
if(stabBtn)stabBtn.onclick=()=>{if(mode!=='play')return;assist=!assist;notify(assist?'СТАБИЛИЗАЦИЯ ВКЛЮЧЕНА':'СВОБОДНЫЙ ДРЕЙФ');vibrate(8)};
function syncMobileHUD(){
 if(!stabBtn)return;
 stabBtn.setAttribute('aria-pressed',String(!!assist));
 const st=document.getElementById('stabstatus');if(st)st.textContent=assist?'ВКЛ':'ВЫКЛ';
}

// ---------- Ракеты по удержанию: тап — один залп (уже работает через onclick из
// stage1.js), удержание — повторные залпы, пока цели захвачены (как ПКМ на ПК). ----------
(function wireRocketHold(){
 const btn=document.getElementById('rocket');if(!btn)return;
 btn.addEventListener('pointerdown',()=>{rocketHeld=true});
 const release=()=>{rocketHeld=false};
 btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);btn.addEventListener('pointerleave',release);
})();
// Тактильный отклик нажатия для всех кнопок способностей.
(function wirePressFeedback(){
 for(const id of ['rocket','dash','pulse','stab']){
  const btn=document.getElementById(id);if(!btn)continue;
  const press=()=>btn.classList.add('pressed'),release=()=>btn.classList.remove('pressed');
  btn.addEventListener('pointerdown',press);btn.addEventListener('pointerup',release);
  btn.addEventListener('pointercancel',release);btn.addEventListener('pointerleave',release);
 }
})();

// ---------- Показ/скрытие джойстиков вместе с игровым режимом ----------
if(typeof on==='function')on('modeChange',({to})=>{
 const tc=document.getElementById('touchControls');
 if(tc)tc.hidden=to!=='play';
 if(to!=='play'){moveStick.reset();aimStick.reset()}
});

// ---------- Полноэкранный режим ----------
// iOS Safari не поддерживает Fullscreen API для произвольных элементов вообще
// (только для <video>), поэтому кнопку нельзя прятать по факту отсутствия API —
// иначе она пропадает именно у большинства владельцев iPhone. Вместо этого при
// отсутствии поддержки кнопка объясняет единственный реальный способ получить
// полноэкранный режим на iOS — установку на экран «Домой».
const fsBtn=document.getElementById('fullscreen');
if(fsBtn){
 const root=document.documentElement;
 // window.Telegram.WebApp существует даже вне Telegram (заглушка с platform:'unknown'),
 // поэтому считаем себя внутри Telegram только при непустом initData — см. telegram-integration.js.
 const tg=()=>{const t=window.Telegram?.WebApp;return t&&t.initData?t:null};
 const reqFn=root.requestFullscreen||root.webkitRequestFullscreen||root.webkitEnterFullscreen;
 const exitFn=document.exitFullscreen||document.webkitExitFullscreen;
 const isFullscreen=()=>!!(tg()?.isFullscreen||document.fullscreenElement||document.webkitFullscreenElement);
 const isStandalone=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
 fsBtn.onclick=()=>{
  // Внутри Telegram у полноэкранного режима свой API (Bot API 8.0+), в приоритете.
  if(tg()){
   if(isFullscreen()){try{tg().exitFullscreen?.()}catch{}return}
   if(tg().requestFullscreen){try{tg().requestFullscreen()}catch{notify('ОБНОВИ TELEGRAM ДЛЯ ПОЛНОГО ЭКРАНА')}}
   else notify('ОБНОВИ TELEGRAM ДЛЯ ПОЛНОГО ЭКРАНА');
   return;
  }
  if(isFullscreen()){try{const p=exitFn?.call(document);p?.catch?.(()=>{})}catch{}return}
  if(reqFn){
   try{const p=reqFn.call(root);if(p?.catch)p.catch(()=>notify('ПОЛНОЭКРАННЫЙ РЕЖИМ НЕДОСТУПЕН'))}
   catch{notify('ПОЛНОЭКРАННЫЙ РЕЖИМ НЕДОСТУПЕН')}
  }else if(isStandalone()){
   notify('УЖЕ БЕЗ ПАНЕЛЕЙ БРАУЗЕРА');
  }else{
   notify('ДОБАВЬ ИГРУ НА ЭКРАН «ДОМОЙ» ДЛЯ ПОЛНОГО ЭКРАНА');
  }
 };
 document.addEventListener('fullscreenchange',()=>fsBtn.setAttribute('aria-pressed',String(isFullscreen())));
 document.addEventListener('webkitfullscreenchange',()=>fsBtn.setAttribute('aria-pressed',String(isFullscreen())));
 tg()?.onEvent?.('fullscreenChanged',()=>fsBtn.setAttribute('aria-pressed',String(isFullscreen())));
}
// Попытка автоматически перейти в альбомную ориентацию при запуске миссии
// (лучшее из возможного: срабатывает только внутри жеста пользователя и не
// поддерживается всеми браузерами — ошибки молча игнорируются).
document.addEventListener('click',e=>{
 if(!e.target.closest('#start,#loadCampaign,#retryLevel,#restart'))return;
 try{screen.orientation?.lock?.('landscape').catch(()=>{})}catch{}
});

// ---------- Подсказка «поверни телефон» ----------
let mobileDismissedPortrait=false,mobileWasPortrait=null;
function updateRotateHint(){
 const hint=document.getElementById('rotateHint');if(!hint)return;
 const portrait=innerHeight>innerWidth,small=Math.min(innerWidth,innerHeight)<560;
 if(mobileWasPortrait===true&&!portrait)mobileDismissedPortrait=false;
 mobileWasPortrait=portrait;
 hint.hidden=!(portrait&&small&&!mobileDismissedPortrait);
}
const rotateContinueBtn=document.getElementById('rotateContinue');
if(rotateContinueBtn)rotateContinueBtn.onclick=()=>{mobileDismissedPortrait=true;updateRotateHint()};

// ---------- Единый пересчёт вьюпорта ----------
// Один источник правды вместо цепочки таймеров и хаков: получаем реальный
// размер (getAppViewport() — см. game.js, учитывает Telegram), публикуем его в
// --app-height (её же читает style.css для #menu и т.п.), включаем/выключаем
// компактную вёрстку боя классом (html.compact-landscape в style.css — не
// зависит от того, сработал ли у браузера @media сам по себе), пересчитываем
// canvas и восстанавливаем относительную позицию прицела, чтобы поворот или
// смена полноэкранного режима не сдвигали её резко.
function syncMobileViewport(){
 const v=getAppViewport();
 try{document.documentElement.style.setProperty('--app-height',v.height+'px')}catch{}
 document.documentElement.classList.toggle('compact-landscape',v.width>v.height&&v.height<=650);
 const nx=W?mx/W:.5,ny=H?my/H:.5;
 try{gfx.resize()}catch{}
 mx=nx*W;my=ny*H;
 updateRotateHint();
}
let mobileViewportRaf=null;
function scheduleSyncMobileViewport(){
 if(mobileViewportRaf)return;
 mobileViewportRaf=requestAnimationFrame(()=>{mobileViewportRaf=null;syncMobileViewport()});
}
addEventListener('resize',scheduleSyncMobileViewport);
addEventListener('orientationchange',scheduleSyncMobileViewport);
addEventListener('pageshow',scheduleSyncMobileViewport);
if(window.visualViewport)visualViewport.addEventListener('resize',scheduleSyncMobileViewport);
syncMobileViewport();

// ---------- Вибро-отклик на ключевые события боя ----------
if(typeof on==='function'){
 on('dash',()=>vibrate(12));
 on('lockAcquired',()=>vibrate(10));
 on('playerHit',d=>vibrate(d.hullDamage>0?[0,26]:14));
 on('shieldDown',()=>vibrate([0,40,30,40]));
 on('bossPhase',()=>vibrate([0,20,40,20]));
 on('bossKilled',()=>vibrate([0,30,50,30,70]));
 on('levelComplete',()=>vibrate([0,15,30,15,30]));
 on('pickup',()=>vibrate(8));
 on('purchase',()=>vibrate(8));
 on('finish',d=>vibrate(d.win?[0,20,40,20,40,60]:[0,70]));
}

// ---------- Предохранители от системных жестов, мешающих управлению ----------
// Глобального preventDefault на touchmove здесь больше нет: он блокировал
// прокрутку #menu/#shop. Джойстики и canvas защищены собственным touch-action:
// none (style.css), этого достаточно, чтобы палец на них не скроллил страницу.
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
