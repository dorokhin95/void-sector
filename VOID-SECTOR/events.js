'use strict';
// ===== VOID SECTOR — Этап 3: шина игровых событий =====
// Оборачивает игровые функции и публикует события для графики, звука и сюжета.
// Подписка: on('enemyKilled', e => ...). Публикация: emit('name', data).
const eventListeners={};
function on(name,fn){(eventListeners[name]??=[]).push(fn);return fn}
function off(name,fn){const l=eventListeners[name];if(l){const i=l.indexOf(fn);if(i>=0)l.splice(i,1)}}
function emit(name,data={}){const l=eventListeners[name];if(l)for(const fn of l){try{fn(data)}catch(err){console.warn('event '+name,err)}}const any=eventListeners['*'];if(any)for(const fn of any){try{fn(name,data)}catch(err){console.warn('event *',err)}}}
// Состояние, отслеживаемое опросом каждый тик.
const eventState={bossPhases:new Map(),lowHull:false,shieldDown:false,overheated:false,warning:false,leech:false,level:-1,mode:'menu',combat:false,lockReady:false,heatWarned:false};
(function wrapGameplay(){
 const wrap=(name,fn)=>{const base=globalThis[name];if(typeof base!=='function'){console.warn('events: нет функции '+name);return}globalThis[name]=fn(base)};
 wrap('start',base=>function(saved=null){base(saved);emit('start',{saved:!!saved,gameMode});emit('levelBegin',{level:wave,mission,gameMode});eventState.level=wave});
 wrap('nextWave',base=>function(){const was=mode;base();if(was==='shop'&&mode==='play'){emit('nextWave',{level:wave});emit('levelBegin',{level:wave,mission,gameMode});eventState.level=wave}});
 wrap('finish',base=>function(win,reason=''){const was=mode;base(win,reason);if(was==='play'&&mode!=='play')emit('finish',{win,reason,level:wave,gameMode})});
 wrap('pause',base=>function(){const was=mode;base();if(mode!==was)emit('pause',{paused:mode==='pause'})});
 wrap('enterStage',base=>function(stage){base(stage);emit('stage',{stage,mission,level:wave});if(stage===4)emit('levelComplete',{level:wave,mission})});
 wrap('prepareWave',base=>function(){base();if(gameMode==='endless')emit('waveBegin',{wave,bossWave})});
 wrap('fireGuns',base=>function(){const n=bullets.length;base();if(bullets.length>n)emit('gun',{count:bullets.length-n,heat,critical:bullets.slice(n).some(b=>b.critical)});if(!eventState.overheated&&overheated){eventState.overheated=true;emit('overheat',{})}if(eventState.overheated&&!overheated)eventState.overheated=false});
 wrap('launchMissile',base=>function(){const n=missiles.length;base();if(missiles.length>n)emit('missileLaunch',{count:missiles.length-n,targets:missiles.slice(n).map(m=>m.target)})});
 wrap('explode',base=>function(x,y,z,radius=7,secondary=false){base(x,y,z,radius,secondary);emit('explode',{x,y,z,radius:radius+levels.blastRadius*.8,secondary})});
 wrap('hit',base=>function(d,kind='shot'){const sb=shieldEnergy,hb=health;base(d,kind);if(shieldEnergy!==sb||health!==hb){emit('playerHit',{damage:d,kind,shieldBefore:sb,shieldAfter:shieldEnergy,hullBefore:hb,hullAfter:health,shieldBroken:sb>0&&shieldEnergy<=0,hullDamage:hb-health});if(hb-health>0)emit('hullHit',{damage:hb-health,kind});if(sb>0&&shieldEnergy<=0){eventState.shieldDown=true;emit('shieldDown',{})}}});
 wrap('dash',base=>function(){const cd=dashCD;base();if(dashCD!==cd)emit('dash',{})});
 wrap('pulse',base=>function(){const cd=pulseCD;base();if(pulseCD!==cd)emit('emp',{x:px,y:py,z:3,r:empRadius()})});
 wrap('damageEnemy',base=>function(e,d,kind='gun',projectile=null){const sh=e?.shield||0,barrier=e?.barrier>0;const actual=base(e,d,kind,projectile);if(e&&actual>0)emit('enemyHit',{e,damage:actual,kind,at:projectile,shieldHit:sh>0,barrier,boss:bossFleet.includes(e)});else if(e&&actual===0&&e.hp>0)emit('enemyBlocked',{e,kind});return actual});
 wrap('hostileShot',base=>function(e,kind='bolt',offset=0){const n=shots.length;base(e,kind,offset);if(shots.length>n)emit('hostileShot',{e,kind,shot:shots[shots.length-1]})});
 wrap('spawnBoss',base=>function(kind,options={}){const b=base(kind,options);emit('bossSpawn',{b,kind});eventState.bossPhases.set(b,1);return b});
 wrap('spawnMini',base=>function(kind,x){const e=base(kind,x);emit('miniSpawn',{e,kind,name:e.name});return e});
 wrap('spawnEnemy',base=>function(type,options={}){const e=base(type,options);emit('enemySpawn',{e,type,elite:e.elite});return e});
 wrap('spawnMine',base=>function(x,y,z,magnetic=false){const n=mines.length;base(x,y,z,magnetic);if(mines.length>n)emit('mineSpawn',{mine:mines[mines.length-1]})});
 wrap('cleanupHostiles',base=>function(){
  const deadEnemies=enemies.filter(e=>e.hp<=0),deadBosses=bossFleet.filter(b=>b.hp<=0),deadStructures=structures.filter(s=>s.hp<=0),deadMines=mines.filter(m=>m.hp<=0),deadModules=bossFleet.flatMap(b=>b.modules.filter(m=>m.hp<=0&&!m.destroyed));
  base();
  for(const e of deadEnemies)emit(e.escaped?'enemyEscaped':'enemyKilled',{e,type:e.type,elite:e.elite,mini:e.mini,decoy:e.decoy,size:(enemyDefs[e.type]||enemyDefs.fighter).size*(e.mini?1.3:1)});
  for(const b of deadBosses)emit('bossKilled',{b,kind:b.kind});
  for(const s of deadStructures)emit('structureDestroyed',{s});
  for(const m of deadMines)emit('mineDestroyed',{m});
  for(const m of deadModules)emit('moduleDestroyed',{m,kind:m.kind});
 });
 wrap('collectLoot',base=>function(p){base(p);emit('pickup',{p,type:p.type})});
 wrap('buyUpgrade',base=>function(id){const ok=base(id);if(ok)emit('purchase',{id,level:levels[id]});return ok});
 wrap('notify',base=>function(s){base(s);emit('notify',{text:s})});
 wrap('wreck',base=>function(x,y,z,count=14){base(x,y,z,count);emit('wreck',{x,y,z,count})});
 wrap('burst',base=>function(x,y,z,color,count=25){base(x,y,z,color,count);emit('burst',{x,y,z,color,count})});
 // Опрос состояния каждый тик симуляции.
 wrap('update',base=>function(dt){
  base(dt);
  if(mode!==eventState.mode){emit('modeChange',{from:eventState.mode,to:mode});if(mode==='shop')emit('shopOpen',{level:wave});if(mode==='menu')emit('exit',{});eventState.mode=mode}
  if(mode!=='play')return;
  for(const b of bossFleet){const prev=eventState.bossPhases.get(b)||1;if(b.phase!==prev){eventState.bossPhases.set(b,b.phase);emit('bossPhase',{b,kind:b.kind,phase:b.phase,prev})}}
  const low=health/maxHealth()<.3;if(low&&!eventState.lowHull){eventState.lowHull=true;emit('lowHull',{health})}if(!low&&health/maxHealth()>.5)eventState.lowHull=false;
  if(eventState.shieldDown&&shieldEnergy>maxShield()*.25){eventState.shieldDown=false;emit('shieldRestored',{})}
  const warn=!!mission?.warning;if(warn!==eventState.warning){eventState.warning=warn;if(warn)emit('anomalyWarning',{})}
  if(leechDrain!==eventState.leech){eventState.leech=leechDrain;emit(leechDrain?'leechStart':'leechEnd',{})}
  const combat=enemies.length>0||bossFleet.length>0;if(combat!==eventState.combat){eventState.combat=combat;emit(combat?'combatStart':'combatEnd',{})}
  const ready=locks.some(l=>l.time>=lockSeconds());if(ready!==eventState.lockReady){eventState.lockReady=ready;if(ready)emit('lockAcquired',{count:locks.length})}
  const hot=heat>=80;if(hot!==eventState.heatWarned){eventState.heatWarned=hot;if(hot&&!overheated)emit('heatWarning',{heat})}
 });
})();
