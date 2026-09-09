'use strict';
// ===== VOID SECTOR — мобильная сборка: сенсорное управление =====
// Полностью заменяет WASD и мышь на два виртуальных джойстика (Pointer Events —
// работают и с мышью на ПК, что удобно для отладки). Левый — движение корабля,
// правый — прицел и стрельба. Плюс: подсказка альбомной ориентации, полноэкранный
// режим, крупные кнопки способностей, вибро-отклик, переключатель стабилизации.
// Загружается последним, поверх всей игровой логики и Этапов 2–3.

const MOBILE_DEADZONE=.16;
function mobileAimRadius(){return Math.min(420,Math.min(innerWidth,innerHeight)*.6)}
function mobileStickRadius(){return Math.min(innerWidth,innerHeight)*.16+42}
function vibrate(pattern){try{navigator.vibrate?.(pattern)}catch{}}

// ---------- Виртуальный джойстик на паре Pointer Events ----------
// Возвращает объект состояния {x,y,mag} — нормализованный вектор -1..1 и его длина
// после мёртвой зоны; используется каждый тик симуляции, независимо от частоты
// событий указателя.
function createStick(zoneId,stickId,onBegin){
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
  el.style.left=state.ox+'px';el.style.top=state.oy+'px';el.classList.add('show');
  try{zone.setPointerCapture(e.pointerId)}catch{}
  onBegin?.(state);
  track(e);
 }
 function track(e){
  if(!state.active||e.pointerId!==state.pointerId)return;
  const R=mobileStickRadius();let dx=e.clientX-state.ox,dy=e.clientY-state.oy,dist=Math.hypot(dx,dy);
  if(dist>R){dx=dx/dist*R;dy=dy/dist*R;dist=R}
  const mag=dist/R;
  if(mag>MOBILE_DEADZONE){state.x=dx/R;state.y=dy/R;state.mag=mag}else{state.x=0;state.y=0;state.mag=0}
  if(thumb)thumb.style.transform='translate(-50%,-50%) translate('+dx+'px,'+dy+'px)';
 }
 function end(e){
  if(!state.active||(e&&e.pointerId!==state.pointerId))return;
  state.active=false;state.pointerId=null;state.x=0;state.y=0;state.mag=0;
  el.classList.remove('show');el.classList.remove('firing');
  if(thumb)thumb.style.transform='translate(-50%,-50%)';
 }
 zone.addEventListener('pointerdown',begin);
 zone.addEventListener('pointermove',track);
 zone.addEventListener('pointerup',end);
 zone.addEventListener('pointercancel',end);
 state.reset=()=>end({pointerId:state.pointerId});
 return state;
}
const moveStick=createStick('moveZone','moveStick');
// Точка отсчёта прицела фиксируется в момент касания (а не пересчитывается каждый
// кадр), иначе при одновременном манёвре корабль сдвигается на экране и прицел
// «плывёт» вместе с ним. Обновляется заново только на новое касание.
const aimStick=createStick('aimZone','aimStick',state=>{state.anchor=project(px,py,3)});

// ---------- Движение: аналоговый джойстик транслируется в цифровые WASD-флаги,
// как в оригинальной схеме управления (тяга постоянна, направление — по стику). ----------
function applyMobileMove(){
 if(moveStick.mag>0){
  keys.KeyD=moveStick.x>.25;keys.KeyA=moveStick.x<-.25;keys.KeyW=moveStick.y<-.25;keys.KeyS=moveStick.y>.25;
 }else{
  keys.KeyD=keys.KeyA=keys.KeyW=keys.KeyS=false;
 }
}
// ---------- Прицел и огонь: правый стик двигает виртуальный прицел относительно
// точки, зафиксированной при касании, и включает стрельбу, пока отклонён дальше
// мёртвой зоны. Движение к цели сглажено, чтобы повторное касание в чуть иной
// точке экрана не давало видимый скачок прицела. ----------
function applyMobileAim(dt){
 if(mode!=='play'){aimStick.el?.classList.remove('firing');return}
 if(aimStick.mag>0){
  const anchor=aimStick.anchor||project(px,py,3),R=mobileAimRadius();
  const tx=anchor.x+aimStick.x*R,ty=anchor.y+aimStick.y*R;
  const k=1-Math.exp(-16*dt);mx+=(tx-mx)*k;my+=(ty-my)*k;
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
addEventListener('resize',updateRotateHint);
addEventListener('orientationchange',()=>setTimeout(updateRotateHint,80));
updateRotateHint();

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
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
