'use strict';
const baseRender=render,baseRenderEnemy=renderEnemy,baseEnemyDetail=enemyDetail;
function resetBattle(){
 enemies=[];bossFleet=[];boss=null;structures=[];mines=[];shots=[];bullets=[];missiles=[];sparks=[];trails=[];debris=[];blasts=[];beams=[];locks=[];lockTarget=null;lockTime=0;pickups=[];empWaves=[];
 px=0;py=-2;vx=0;vy=0;bank=0;pitch=0;rollVelocity=0;pitchVelocity=0;keys={};firing=false;rocketHeld=false;fireCD=0;missileCD=0;reload=0;dashCD=0;dashActive=0;pulseCD=0;inv=2;heat=0;overheated=false;shieldEnergy=maxShield();damageAge=99;empSuppressed=0;ammo=maxAmmo();shake=0;assist=true;
}
start=function(saved=null){
 if(!saved||saved.version!==6)saved=null;
 resetSystems();credits=0;score=0;kills=0;elapsed=0;wave=0;lastBossKind=null;lastEncounterBosses=[];bossHistory=[];directorReport=null;pickupSerial=0;entityId=0;
 if(saved){gameMode='campaign';Object.assign(levels,saved.levels);wave=saved.nextLevel;credits=saved.credits;score=saved.score;kills=saved.kills;elapsed=saved.elapsed;health=clamp(saved.health,1,maxHealth())}
 resetBattle();mode='play';$('menu').hidden=true;$('location').hidden=true;$('modal').hidden=true;$('shop').hidden=true;$('hud').hidden=false;$('bossHud').hidden=true;document.body.classList.add('playing');
 prepareWave();runCheckpoint=gameMode==='campaign'?snapshot(wave):null;updateHUD();
};
finish=function(win,reason=''){
 if(mode!=='play')return;
 mode=win?'win':'lose';firing=false;rocketHeld=false;keys={};$('modal').hidden=false;$('resume').hidden=true;$('retryLevel').hidden=win||gameMode!=='campaign';
 $('modalLabel').textContent=win?'КАМПАНИЯ ЗАВЕРШЕНА':'ОПЕРАЦИЯ ПРЕРВАНА';$('modalTitle').textContent=win?'БЕЗДНА МОЛЧИТ.':'СИГНАЛ ПОТЕРЯН';
 $('modalText').textContent=(win?'Архонт Бездны уничтожен. Все 20 уровней пройдены. Эвакуационный коридор открыт.':reason||'Корабль потерян.')+' Счёт: '+score.toLocaleString('ru')+' · '+(gameMode==='campaign'?'Уровень ':'Волна ')+(wave+1)+'.';
 if(win){checkpointAvailable=null;try{localStorage.removeItem('void-sector-campaign-v6')}catch{}}tone(win?700:100,.7);
};
function updateBullets(dt){
 for(const p of bullets){let old={x:p.x,y:p.y,z:p.z};p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt;
 let intersections=[];for(const t of [...targets(),...rocks]){if(t.id&&p.hitIds.has(t.id))continue;let h=sweep(old,p,t,t.r);if(h!==null)intersections.push({h,t})}intersections.sort((a,b)=>a.h-b.h);
 for(const {h,t} of intersections){const at={x:old.x+(p.x-old.x)*h,y:old.y+(p.y-old.y)*h,z:old.z+(p.z-old.z)*h};
 if(t.hp!==undefined){damageEnemy(t,p.damage,'gun',at);p.hitIds.add(t.id);if(p.pierce>0)p.pierce--;else p.life=-1;}
 else {t.hpRock=(t.hpRock??Math.ceil(t.r*4))-p.damage;if(t.hpRock<=0){wreck(t.x,t.y,t.z,6);t.z=-230;t.hpRock=undefined}p.life=-1;}
 burst(at.x,at.y,at.z,p.critical?cyan:orange,3);if(p.life<0)break;
 }
 }bullets=bullets.filter(p=>p.life>0);
}
function updateShots(dt){
 for(const s of shots){const old={x:s.x,y:s.y,z:s.z};if(s.homing){let target=s.target&&s.target.hp>0?s.target:{x:px,y:py,z:3},dx=target.x-s.x,dy=target.y-s.y,dz=target.z-s.z,l=Math.max(.001,Math.hypot(dx,dy,dz)),blend=1-Math.exp(-.85*dt);s.vx+=(dx/l*30-s.vx)*blend;s.vy+=(dy/l*30-s.vy)*blend;s.vz+=(dz/l*30-s.vz)*blend;s.trail=(s.trail||0)-dt;if(s.trail<=0){s.trail=.07;trails.push({x:s.x,y:s.y,z:s.z,life:.65,color:s.color})}}
 s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.life-=dt;
 const player={x:px,y:py,z:3,r:1.1,player:true};let candidates=[player,...rocks];if(mission?.ally)candidates.push(mission.ally);
 let impact=null,nearest=2;for(const t of candidates){let h=sweep(old,s,t,t.r);if(h!==null&&h<nearest){nearest=h;impact=t}}
 if(impact){s.life=-1;if(impact.player)hit(s.damage,s.kind==='emp'?'emp':'shot');else if(impact===mission?.ally){impact.hp=Math.max(0,impact.hp-s.damage*.65)}burst(s.x,s.y,s.z,s.color,5);if(s.homing)blasts.push({x:s.x,y:s.y,z:s.z,life:1.9,r:3})}
 }shots=shots.filter(s=>s.life>0&&s.z<24);
}
function updateHazards(dt){
 for(const r of rocks){r.z+=dt*(dashActive>0?28:11);r.x+=(r.vx||0)*dt;r.y+=(r.vy||0)*dt;if(r.z>23){r.z=-230;r.x=(Math.random()-.5)*100;r.hpRock=undefined;r.vx=0;r.vy=0}
 let dx=px-r.x,dy=py-r.y,dz=3-r.z,dist=Math.hypot(dx,dy,dz),radius=r.r+1;if(dist<radius){let nx=dx/Math.max(.01,dist),ny=dy/Math.max(.01,dist),nz=dz/Math.max(.01,dist),rv=vx*nx+vy*ny-11*nz;if(rv<0){let impulse=-1.3*rv;vx+=nx*impulse;vy+=ny*impulse;hit(clamp(Math.abs(rv),5,24),'collision')}px+=nx*(radius-dist);py+=ny*(radius-dist)}}
 for(const m of mines){m.age+=dt;m.life-=dt;m.stun=Math.max(0,(m.stun||0)-dt);if(m.hp<=0||m.stun>0)continue;m.z+=dt*5;let dx=px-m.x,dy=py-m.y,dz=3-m.z,d=Math.hypot(dx,dy,dz);if(m.magnetic&&d<11&&d>.01){m.x+=dx/d*4*dt;m.y+=dy/d*4*dt;m.z+=dz/d*4*dt}if(d<2){hit(15*m.damageScale,'emp');m.hp=0}if(m.z>18)m.life=0;}
 for(const e of enemies){e.contact=Math.max(0,(e.contact||0)-dt);if(Math.hypot(e.x-px,e.y-py,e.z-3)<e.r+1&&e.contact<=0){hit(10*e.damageScale,'collision');e.contact=1;vx+=(px-e.x)*2;vy+=(py-e.y)*2}if(e.decoy&&e.age>7)e.hp=0}
 if(mission?.environment==='anomaly'&&mission.stage>0&&mission.stage<4){const a=mission.time%12;mission.warning=a<2;if(a>=2&&a<3.2){vx+=Math.sin(mission.time*.6)*17*dt;vy+=Math.cos(mission.time*.5)*13*dt}}
 if(mission?.environment==='star')mission.coverX=Math.sin(mission.time*.12)*7;
}
update=function(dt){
 if(mode==='menu'){time+=dt;return}if(mode!=='play')return;
 time+=dt;elapsed+=dt;fireCD-=dt;dashCD=Math.max(0,dashCD-dt);pulseCD=Math.max(0,pulseCD-dt);inv=Math.max(0,inv-dt);noticeTime-=dt;shake=Math.max(0,shake-dt);$('flash').style.opacity=shake*.5;if(noticeTime<=0)$('notice').textContent='';
 updateSystems(dt);physics(dt);updatePickups(dt);
 if((rocketHeld||keys.KeyR)&&locks.some(l=>l.time>=lockSeconds())&&ammo>0&&missileCD<=0)launchMissile();fireGuns();
 if(!mission||mission.stage>0&&mission.stage<4){updateEnemies(dt);updateBullets(dt);updateShots(dt);updateHazards(dt);cleanupHostiles()}
 if(mode!=='play')return;
 if(gameMode==='campaign')campaignDirector(dt);else endlessDirector(dt);updateHUD();
};
updateHUD=function(){
 const bossHP=bossFleet.reduce((s,b)=>s+b.hp+b.modules.reduce((t,m)=>t+Math.max(0,m.hp),0),0),bossMax=bossFleet.reduce((s,b)=>s+b.maxHp+b.modules.reduce((t,m)=>t+m.maxHp,0),0);
 $('bossHud').hidden=!bossFleet.length;$('bossName').textContent=bossFleet.map(b=>b.name+' · ФАЗА '+b.phase+(bossProtected(b)?' · ЩИТ':'')).join(' + ');$('bossbar').style.width=(bossMax?bossHP/bossMax*100:0)+'%';
 $('phase').textContent=mission?'АКТ '+mission.act+' / 4 · УРОВЕНЬ '+(wave+1)+' / 20':'БЕСКОНЕЧНОСТЬ · ВОЛНА '+(wave+1);
 let objective=mission?mission.name:'Уничтожь все силы противника',detail='';
 if(mission){let special=mission.stage===2;detail=stageNames[mission.stage];if(special){if(['survive','escort','station'].includes(mission.goal))objective='Удержаться: '+Math.max(0,Math.ceil(25-mission.stageTime))+' с';else if(['objects','generators','blockade'].includes(mission.goal))objective='Уничтожить узлы: '+mission.objectsDestroyed+' / 3';else if(mission.goal==='convoy')objective='Конвой: осталось '+enemies.filter(e=>e.objective).length+' / 3';else if(mission.goal==='chase')objective='Перехват: '+Math.max(0,Math.ceil(60-(enemies.find(e=>e.chase)?.age||0)))+' с';}
 if(mission.goal==='blockade'&&special&&mission.gate)objective='Пролети через открытый проход';if(mission.goal==='chase'&&special)detail+=' · СБЛИЖЕНИЕ '+Math.round((mission.pursuit||0)/47*100)+'%';if(mission.stage===0)objective=mission.name;else if(mission.stage!==4&&!special)objective=mission.boss&&mission.stage===3?'Уничтожь '+bossDefs[mission.boss].name:'Уничтожь силы противника';
 detail+=' · '+mission.name;if(mission.ally)detail+=' · '+(mission.ally.station?'СТАНЦИЯ':'СОЮЗНИК')+' '+Math.ceil(mission.ally.hp)+' / '+mission.ally.maxHp;
 $('progress').style.width=(mission.stage/4*100)+'%';
 }else{detail='HP ×'+difficulty().toFixed(2)+' · УРОН ×'+enemyDamageScale().toFixed(2)+' · ВРАГОВ '+(enemies.length+bossFleet.length);$('progress').style.width=(bossWave?0:spawned/Math.max(1,waveCount)*100)+'%'}
 $('objective').textContent=objective;$('missionDetail').textContent=detail;$('score').textContent=String(score).padStart(6,'0');$('kills').textContent='СБИТО '+kills+' · '+credits+' КР';
 $('health').innerHTML=Math.ceil(shieldEnergy)+' <small>/ '+maxShield()+'</small>';$('shield').style.width=shieldEnergy/maxShield()*100+'%';$('hullValue').textContent='КОРПУС '+Math.ceil(health)+' / '+maxHealth();$('hullBar').style.width=health/maxHealth()*100+'%';
 $('heatValue').textContent=overheated?'ПЕРЕГРЕВ · ОХЛАЖДЕНИЕ':'НАГРЕВ '+Math.round(heat)+'%';$('heatBar').style.width=heat+'%';$('heatBar').style.background=overheated?'#ff7269':'#ffc777';
 $('ammo').textContent=ammo+' / '+maxAmmo();$('rocketstatus').textContent=locks.filter(l=>l.time>=lockSeconds()).length+' ЦЕЛ. · '+(missileCD>0?'ПУСК':ammo===0?'ЗАРЯД '+Math.ceil(reloadSeconds()-reload)+' с':'R / ПКМ');
 $('dashstatus').textContent=dashCD>0?dashCD.toFixed(1)+' С':'ГОТОВ';$('pulsestatus').textContent=pulseCD>0?pulseCD.toFixed(1)+' С':'ГОТОВ';$('velocity').textContent=Math.round(Math.hypot(vx,vy)*12)+' м/с · '+(assist?'СТАБ.':'ДРЕЙФ');
 $('loadout').textContent='УРОН '+gunDamage().toFixed(1)+' · '+barrelCount()+' СТВ. · EMP '+empRadius()+' м';
 $('statusEffects').textContent=empSuppressed>0?'EMP · РЕГЕНЕРАЦИЯ ОТКЛЮЧЕНА '+empSuppressed.toFixed(1)+' с':leechDrain?'ПИЯВКА · РЕГЕНЕРАЦИЯ −82%':mission?.environment==='star'?'СОЛНЕЧНЫЙ НАГРЕВ · ДЕРЖИСЬ В ГОЛУБОЙ ТЕНИ':mission?.warning?'ГРАВИТАЦИОННЫЙ ИМПУЛЬС · ПРИГОТОВЬСЯ':'';
};
renderEnemy=function(e){
 const aliases={swarm:'scout',reaper:'scout',hammer:'frigate',lancer:'sniper',miner:'bomber',shepherd:'frigate',leech:'scout',missileboat:'bomber',inquisitor:'frigate',carrier:'frigate'};
 let alias=aliases[e.type]||e.type;const d=enemyDefs[e.type],base=enemyDefs[alias],copy={...e,type:alias};
 const savedSize=base.size,savedColor=base.color;base.size=d.size*(e.mini?1.3:1);base.color=e.elite?[.45,1,.88]:d.color;
 baseRenderEnemy(copy);baseEnemyDetail(copy);base.size=savedSize;base.color=savedColor;
 parentMatrix=matrix(e.x,e.y,e.z,d.size,d.size,d.size,0,Math.PI,-e.vx*.025);
 const c=e.elite?[.45,1,.88]:d.color;
 if(e.type==='hammer')for(let i=0;i<3;i++)draw(cube,0,.12,-1.7-i*.14,1.1-i*.1,.55,.08,[.48,.42,.32]);
 if(e.type==='miner')for(let side of [-1,1])for(let i=0;i<3;i++)draw(orb,side*1.3,.5,-.5+i*.5,.16,.16,.16,c,.5);
 if(e.type==='carrier'){draw(cube,0,.56,.2,.7,.05,1.3,[.04,.07,.08]);for(let side of [-1,1])draw(cube,side*.72,.66,.2,.03,.04,1.3,c,.8)}
 if(e.type==='shepherd'||e.type==='inquisitor'){draw(haloRing,0,1,0,.8,.8,1,c,.8,Math.PI/2,time*.3);draw(orb,0,1,0,.2,.2,.2,c,1)}
 if(e.elite){for(let side of [-1,1])draw(orb,side*.85,0,2.4,.22,.22,.4,[.45,1,.88],2)}
 parentMatrix=null;
 if(e.barrier>0){gl.depthMask(false);draw(orb,e.x,e.y,e.z,e.r*1.6,e.r,e.r*1.4,[.7,.25,1],.5,0,0,0,.13);gl.depthMask(true)}
 if(e.type==='leech'&&leechDrain&&Math.hypot(e.x-px,e.y-py,e.z-3)<13){gl.depthMask(false);line3(e,{x:px,y:py,z:3},[.8,.25,1],.035,.6);gl.depthMask(true)}
};
function renderBossFleet(){for(const b of bossFleet){
 if(b.hidden){gl.depthMask(false);draw(orb,b.x,b.y,b.z,4,2,4,[.5,.25,.7],.2,0,0,0,.045);gl.depthMask(true);continue}
 const c=bossDefs[b.kind].color;
 if(b.kind==='archon'&&b.phase<=2){parentMatrix=matrix(b.x,b.y,b.z,1,1,1);draw(tube,0,0,0,4,4,2,metal);for(let i=0;i<12;i++){let a=i*Math.PI/6;draw(cube,Math.cos(a)*8,Math.sin(a)*5,0,2,1.2,2,metal,0,0,0,a);draw(cube,Math.cos(a)*7,Math.sin(a)*4.5,2.1,.5,.3,.15,c,1)}parentMatrix=null}
 else if(b.kind==='leviathan'){draw(cube,b.x,b.y,b.z,4,1.6,7,metal);for(let side of [-1,1]){draw(cube,b.x+side*6,b.y,b.z,1.4,1,6,metal);draw(cube,b.x+side*4,b.y+1.7,b.z,1,.1,4,[.025,.06,.07]);draw(orb,b.x+side*6,b.y,b.z-6,1,.6,1,c,1)}}
 else if(b.kind==='phantom'){ship(b.x,b.y,b.z,true,2.5,Math.sin(b.age)*.15);gl.depthMask(false);draw(haloRing,b.x,b.y,b.z,5,3,1,c,.7,0,b.age*.4,0,.4);gl.depthMask(true)}
 else{ship(b.x,b.y,b.z,true,b.kind==='cerberus'&&b.phase<3?3.2:2.5);if(b.kind==='cerberus'&&b.phase<3)for(let side of [-1,1])draw(cube,b.x+side*3,b.y,b.z,1,1.2,3,[.4,.3,.24])}
 for(const m of b.modules)if(m.hp>0){draw(cube,m.x,m.y,m.z,m.kind==='armor'?2:.95,.8,1,metal);draw(orb,m.x,m.y,m.z+1,.48,.48,.3,m.kind==='generator'?cyan:c,.8);if(m.kind==='turret'||m.kind==='sidegun')draw(tube,m.x,m.y+.8,m.z+1,.18,.18,1,c,.3)}
 if(bossProtected(b)){gl.depthMask(false);draw(orb,b.x,b.y,b.z,10,6,6,c,.3,0,0,0,.09);gl.depthMask(true)}
}}
function renderMissionObjects(){
 if(mission?.gate&&mission.stage===2){const g=mission.gate;draw(haloRing,g.x,g.y,g.z,g.r,g.r,1,cyan,1);}
 for(const s of structures){draw(tube,s.x,s.y,s.z,1.2,1.2,1.5,metal);draw(haloRing,s.x,s.y,s.z+1.6,1.3,1.3,1,cyan,1);draw(orb,s.x,s.y,s.z+1.7,.6,.6,.3,cyan,1)}
 for(const m of mines){draw(orb,m.x,m.y,m.z,.5,.5,.5,[.16,.18,.2]);for(let i=0;i<3;i++)draw(cube,m.x,m.y,m.z,.95,.045,.045,orange,.4,i*Math.PI/3,0,i*Math.PI/3);draw(orb,m.x,m.y,m.z+.5,.18,.18,.18,red,1+Math.sin(time*8)*.5)}
 if(mission?.ally){const a=mission.ally;if(a.station){draw(cube,a.x,a.y,a.z,3,1,3,metal);for(let side of [-1,1])draw(cube,a.x+side*5,a.y,a.z,2,.2,2,[.06,.3,.35]);draw(orb,a.x,a.y+1,a.z,1,.5,1,cyan,.5)}else ship(a.x,a.y,a.z,false,1.2);}
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 for(const e of empWaves){let r=e.r*(1-e.life/.8);draw(haloRing,e.x,e.y,e.z,r,r,1,cyan,1,0,0,0,e.life*.4)}
 if(mission?.environment==='anomaly'){for(let i=0;i<3;i++)draw(haloRing,Math.sin(i*2)*17,Math.cos(i*3)*6,-35-i*15,5,5,1,[.55,.25,.9],.5,0,time*.3,0,.3)}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
}
render=function(dt){
 baseRender(dt);renderMissionObjects();
 let labels='';const label=(t,text,color)=>{let p=project(t.x,t.y,t.z);if(p.x>0&&p.x<W&&p.y>0&&p.y<H)labels+='<span style="left:'+p.x+'px;top:'+(p.y-25)+'px;color:'+color+'">'+text+'</span>'};
 if(mode==='play'){
 if(mission?.gate&&mission.stage===2)label(mission.gate,'ПРОХОД','#91ffe3');for(const s of structures)label(s,'УЗЕЛ '+Math.ceil(s.hp),'#9ff8e9');
 for(const b of bossFleet)for(const m of b.modules)if(m.hp>0)label(m,({generator:'ГЕНЕРАТОР',armor:'БРОНЯ',turret:'ТУРЕЛЬ',sidegun:'ОРУДИЕ'}[m.kind])+' '+Math.ceil(m.hp),'#ffd091');
 for(const e of enemies)if(e.mini||e.elite||e.objective)label(e,(e.objective?'ЦЕЛЬ':e.name||(e.elite?'ЭЛИТНЫЙ ':'')+enemyDefs[e.type].name)+' '+Math.ceil(e.hp),'#ffc996');
 if(mission?.ally)label(mission.ally,'ЗАЩИЩАЙ · '+Math.ceil(mission.ally.hp),'#91ffe3');
 }
 $('targetLabels').innerHTML=labels;
 const env=mode==='play'?mission?.environment||'open':'open';$('environment').dataset.kind=env;
 $('starCover').hidden=env!=='star';if(env==='star'){let p=project(mission.coverX,0,3);$('starCover').style.left=p.x+'px';$('starCover').style.width=(W*6/(18-3)/aspect/Math.tan(Math.PI/6)/2)+'px'}
};
$('start').onclick=()=>start();$('restart').onclick=()=>start();$('retryLevel').onclick=()=>{if(runCheckpoint)start(runCheckpoint)};
$('loadCampaign').onclick=()=>{if(checkpointAvailable)start(checkpointAvailable)};
$('campaign').onclick=()=>{gameMode='campaign';$('campaign').setAttribute('aria-pressed','true');$('endless').setAttribute('aria-pressed','false');$('modeInfo').textContent='20 уровней · 4 акта · 4 босса · сохранение между уровнями';$('loadCampaign').hidden=!checkpointAvailable};
$('endless').onclick=()=>{gameMode='endless';$('campaign').setAttribute('aria-pressed','false');$('endless').setAttribute('aria-pressed','true');$('modeInfo').textContent='Без остановок · подбор улучшений · адаптивные боссы';$('loadCampaign').hidden=true};
$('shopCategories').onclick=e=>{const b=e.target.closest('[data-category]');if(b){shopCategory=b.dataset.category;renderShop()}};
$('upgrades').onclick=e=>{const b=e.target.closest('[data-up]');if(b)buyUpgrade(b.dataset.up)};
$('repair').onclick=()=>{if(mode==='shop'&&credits>=50&&health<maxHealth()){credits-=50;health=Math.min(maxHealth(),health+60);renderShop();saveCampaign(wave+1)}};
$('continue').onclick=nextWave;$('dash').onclick=dash;$('pulse').onclick=pulse;$('rocket').onclick=launchMissile;
const exitBase=$('exit').onclick;$('exit').onclick=()=>{exitBase();bossFleet=[];mission=null;mines=[];structures=[];$('targetLabels').innerHTML='';$('loadCampaign').hidden=gameMode!=='campaign'||!checkpointAvailable};
const originalPause=pause;pause=function(){originalPause();$('retryLevel').hidden=true};$('pause').onclick=pause;$('resume').onclick=pause;
checkpointAvailable=readCampaignSave();$('loadCampaign').hidden=!checkpointAvailable;if(checkpointAvailable)$('loadCampaign').textContent='ПРОДОЛЖИТЬ · УРОВЕНЬ '+(checkpointAvailable.nextLevel+1);
requestAnimationFrame(frame);
