'use strict';
// ===== VOID SECTOR — мобильная сборка: сенсорное управление =====
// Полностью заменяет WASD и мышь на два виртуальных джойстика (Pointer Events —
// работают и с мышью на ПК, что удобно для отладки). Левый — движение корабля,
// правый — прицел и стрельба. Плюс: подсказка альбомной ориентации, полноэкранный
// режим, крупные кнопки способностей, вибро-отклик, переключатель стабилизации.
// Загружается последним, поверх всей игровой логики и Этапов 2–3.

// Мёртвая зона движения — только у левого джойстика (правый больше не стик,
// см. createAimTouchpad ниже).
const MOVE_DEADZONE=.16;
function mobileStickRadius(){return Math.min(W,H)*.16+42}
function vibrate(pattern){try{navigator.vibrate?.(pattern)}catch{}}

// ---------- Виртуальный джойстик на паре Pointer Events ----------
// Возвращает объект состояния {x,y,mag} — направление×магнитуда после мёртвой
// зоны (0 сразу за порогом, не с deadzone — иначе именно на границе возникает
// скачок) и её длина; читается каждый тик симуляции, независимо от частоты
// событий указателя.
function createStick(zoneId,stickId,opts={}){
 const{deadzone=MOVE_DEADZONE,radius,onBegin,onEnd}=opts;
 const zone=document.getElementById(zoneId),el=document.getElementById(stickId);
 if(!zone||!el)return{x:0,y:0,mag:0,active:false,reset(){}};
 const thumb=el.querySelector('.thumb');
 const getR=radius||mobileStickRadius;
 const state={x:0,y:0,mag:0,active:false,pointerId:null,ox:0,oy:0,el};
 function begin(e){
  if(state.active)return;
  state.active=true;state.pointerId=e.pointerId;
  const r=zone.getBoundingClientRect(),margin=getR()+14;
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
  const R=getR(),dx=e.clientX-state.ox,dy=e.clientY-state.oy,dist=Math.hypot(dx,dy);
  const raw=Math.min(1,dist/R);
  state.raw=raw;state.R=R;
  if(raw<=deadzone){state.x=0;state.y=0;state.mag=0}
  else{
   const mag=(raw-deadzone)/(1-deadzone),ux=dist>0?dx/dist:0,uy=dist>0?dy/dist:0;
   state.x=ux*mag;state.y=uy*mag;state.mag=mag;
  }
  // Визуальный «стик» всегда следует за пальцем 1:1 в пределах кольца (даже в
  // мёртвой зоне) — это отдельно от геймплейного значения выше, и использует
  // тот же R, что и геймплей (иначе визуальный и рабочий радиус разъезжаются).
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
const moveStick=createStick('moveZone','moveStick',{deadzone:MOVE_DEADZONE});

// ---------- Прицел: relative touchpad (не джойстик) ----------
// Правая половина экрана ведёт себя как тачпад ноутбука: pointerdown НИЧЕГО не
// переносит и не запоминает, кроме стартовой точки пальца; pointermove двигает
// прицел РОВНО на дельту движения пальца (1 CSS px пальца ≈ AIM_TOUCH_SENSITIVITY
// px прицела) — без деадзоны, без радиуса, без скорости/dt, без кривой отклика и
// без возврата к центру. Отпустили — прицел остаётся там, где был; коснулись в
// другом месте — палец просто начинает новый отсчёт дельты оттуда, прицел не
// прыгает. Стрельба идёт всё время, пока палец на экране, независимо от того,
// движется он или нет.
const AIM_TOUCH_SENSITIVITY=1.0; // после теста на устройстве допустимы только 0.85 / 1.0 / 1.15
function createAimTouchpad(zoneId){
 const zone=document.getElementById(zoneId);
 const state={active:false,pointerId:null,lastX:0,lastY:0};
 function begin(e){
  if(mode!=='play'||state.active)return;
  state.active=true;state.pointerId=e.pointerId;
  // КРИТИЧНО: только запоминаем позицию пальца, mx/my здесь не меняем —
  // никакого «прыжка» прицела к месту касания.
  state.lastX=e.clientX;state.lastY=e.clientY;
  try{zone.setPointerCapture(e.pointerId)}catch{}
  firing=true;
  if(e.cancelable)e.preventDefault();
 }
 function move(e){
  if(!state.active||e.pointerId!==state.pointerId)return;
  const dx=e.clientX-state.lastX,dy=e.clientY-state.lastY;
  state.lastX=e.clientX;state.lastY=e.clientY;
  mx=clamp(mx+dx*AIM_TOUCH_SENSITIVITY,0,W);
  my=clamp(my+dy*AIM_TOUCH_SENSITIVITY,0,H);
  if(e.cancelable)e.preventDefault();
 }
 function end(e){
  if(!state.active||(e&&e.pointerId!==state.pointerId))return;
  state.active=false;state.pointerId=null;
  firing=false;
 }
 zone.addEventListener('pointerdown',begin);
 zone.addEventListener('pointermove',move);
 zone.addEventListener('pointerup',end);
 zone.addEventListener('pointercancel',end);
 zone.addEventListener('lostpointercapture',end);
 state.reset=()=>{state.active=false;state.pointerId=null;firing=false};
 return state;
}
const aimPad=createAimTouchpad('aimZone');

// Смена вкладки/сворачивание — сбрасываем оба стика и стрельбу, чтобы палец,
// снятый вне страницы, не оставил джойстик залипшим во «нажатом» состоянии.
function resetAllMobileSticks(){moveStick.reset();aimPad.reset();firing=false}
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
// Прицел (mx,my) больше не пересчитывается каждый тик симуляции — touchpad
// выше двигает его напрямую из pointermove, синхронно с событием. update()
// оборачиваем тем же приёмом, что использует весь остальной код (game.js →
// stage1.js → events.js уже переопределяют update по цепочке), но теперь здесь
// только движение корабля.
(function wrapUpdate(){
 const baseUpdate=update;
 update=function(dt){
  applyMobileMove();
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
 if(to!=='play'){moveStick.reset();aimPad.reset()}
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
 // Нулевой/мусорный размер (страница открылась в фоне, WebView ещё не измерил
 // окно) не публикуем: иначе --app-height:0px схлопнет #menu/#modal/ангар до
 // следующего resize. Оставляем прежнее значение (или CSS-fallback 100vh) и
 // дождёмся реального события — см. visibilitychange ниже.
 if(!(v.width>0&&v.height>0))return;
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleSyncMobileViewport()});
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
