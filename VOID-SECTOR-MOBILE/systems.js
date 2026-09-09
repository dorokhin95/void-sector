'use strict';
// Stage 1 ship systems. All coefficients are shared by UI and simulation.
const systemUpgrades=[
 ['damage','Оружие','Урон','+35% базового урона',65,30],['rate','Оружие','Скорострельность','+12% темпа',70,16],['shotSpeed','Оружие','Скорость снаряда','+12% скорости',60,10],['pierce','Оружие','Пробивание','+1 поражаемая цель',150,3],['multishot','Оружие','Стволы','+1 пара стволов',210,2],['cooling','Оружие','Охлаждение','−8% нагрева; быстрее остывание',65,10],['crit','Оружие','Критический удар','+4% шанса двойного урона',90,10],
 ['rocket','Ракеты','Боеголовка','+30% урона',80,20],['ammo','Ракеты','Боезапас','+2 ракеты',65,12],['missileSpeed','Ракеты','Двигатель ракеты','+12% скорости и поворота',70,10],['blastRadius','Ракеты','Радиус взрыва','+0,8 м',85,8],['lockSpeed','Ракеты','Захват цели','−10% времени захвата',75,8],['multiLock','Ракеты','Мультизахват','+1 цель в одном залпе',160,3],['cluster','Ракеты','Кластерный заряд','+2 вторичных взрыва',160,3],
 ['shield','Щиты','Ёмкость','+25 к щиту',65,24],['regen','Щиты','Регенерация','+2 щита в секунду',75,12],['regenDelay','Щиты','Восстановление','−0,3 с задержки',70,10],['empResist','Щиты','Защита от EMP','Сокращает подавление щита',70,8],
 ['hull','Корпус','Прочность','+25 HP корпуса',70,24],['armor','Корпус','Броня','Снижает урон корпусу',80,16],['collision','Корпус','Амортизация','Снижает урон столкновений',60,12],
 ['engine','Двигатели','Ускорение','+10% тяги',60,10],['maxSpeed','Двигатели','Максимальная скорость','+6% скорости',70,10],['handling','Двигатели','Манёвренность','Быстрее смена направления',65,10],['dash','Двигатели','Рывок','Меньше перезарядка, больше тяга',90,8],
 ['empRadius','EMP','Радиус','+4 м',65,10],['empDuration','EMP','Длительность','+0,4 с оглушения',75,10],['empDamage','EMP','Урон','+3 урона',70,20],['empCooldown','EMP','Перезарядка','−0,7 с',85,10]
].map(([id,category,name,desc,base,max])=>({id,category,name,desc,base,max}));
upgrades.splice(0,upgrades.length,...systemUpgrades);
for(const u of upgrades)levels[u.id]=0;
const categories=['Оружие','Ракеты','Щиты','Корпус','Двигатели','EMP'];
let shopCategory='Оружие',shieldEnergy=70,heat=0,overheated=false,damageAge=99,empSuppressed=0,leechDrain=false,dashActive=0,locks=[],empWaves=[],shotSequence=0;
let telemetry={dealt:0,taken:0,seconds:0,dps:0,incoming:0,bucket:0};
maxHealth=()=>100+25*levels.hull;
const maxShield=()=>70+25*levels.shield;
maxAmmo=()=>6+2*levels.ammo;
reloadSeconds=()=>Math.max(1.4,5/(1+levels.rocket*.045));
const lockSeconds=()=>Math.max(.16,.65/(1+levels.lockSpeed*.18))*(mission?.environment==='nebula'?1.35:1);
const gunDamage=()=>1.25*(1+levels.damage*.35);
const gunInterval=()=>Math.max(.055,.15/(1+levels.rate*.12));
const barrelCount=()=>2+2*levels.multishot;
const empRadius=()=>23+levels.empRadius*4;
price=u=>Math.ceil(u.base*Math.pow(1.25,levels[u.id]));
function resetSystems(){for(const u of upgrades)levels[u.id]=0;shieldEnergy=maxShield();health=maxHealth();heat=0;overheated=false;damageAge=99;empSuppressed=0;leechDrain=false;dashActive=0;locks=[];empWaves=[];shotSequence=0;shopCategory='Оружие';telemetry={dealt:0,taken:0,seconds:0,dps:0,incoming:0,bucket:0};}
function updateSystems(dt){
 damageAge+=dt;empSuppressed=Math.max(0,empSuppressed-dt);dashActive=Math.max(0,dashActive-dt);
 const star=mission?.environment==='star'&&mission.stage>0&&mission.stage<4;
 const safe=star&&Math.abs(px-mission.coverX)<3;
 const cooling=star&&!safe?7:20+levels.cooling*2;
 heat=Math.max(0,heat-cooling*dt);if(star&&!safe)heat=Math.min(100,heat+11*dt);
 if(heat>=100)overheated=true;if(overheated&&heat<30)overheated=false;
 if(damageAge>Math.max(1.2,4-levels.regenDelay*.3)&&empSuppressed<=0)shieldEnergy=Math.min(maxShield(),shieldEnergy+(5+levels.regen*2)*(leechDrain?.18:1)*dt);
 telemetry.seconds+=dt;telemetry.bucket+=dt;if(telemetry.bucket>=5){telemetry.dps=telemetry.dps*.65+telemetry.dealt/telemetry.bucket*.35;telemetry.incoming=telemetry.incoming*.65+telemetry.taken/telemetry.bucket*.35;telemetry.dealt=0;telemetry.taken=0;telemetry.bucket=0;}
 for(const e of empWaves)e.life-=dt;empWaves=empWaves.filter(e=>e.life>0);
}
hit=function(d,kind='shot'){
 if(inv>0||mode!=='play'||mission?.stage===0||mission?.stage===4)return;
 if(kind==='collision')d/=1+levels.collision*.25;
 const before=health+shieldEnergy;damageAge=0;let absorbed=Math.min(shieldEnergy,d);shieldEnergy-=absorbed;health=Math.max(0,health-(d-absorbed)/(1+levels.armor*.12));
 telemetry.taken+=before-health-shieldEnergy;inv=kind==='collision'?.45:.18;shake=.3;tone(90,.15,'triangle',.055);
 if(kind==='emp')empSuppressed=Math.max(empSuppressed,4/(1+levels.empResist*.35));
 if(health<=0)finish(false,'Корпус корабля разрушен.');
};
dash=function(){if(mode!=='play'||dashCD>0)return;dashCD=Math.max(1.8,4-levels.dash*.25);dashActive=.65;inv=Math.max(inv,.7);let dx=Number(!!keys.KeyD)-Number(!!keys.KeyA),dy=Number(!!keys.KeyW)-Number(!!keys.KeyS),l=Math.hypot(dx,dy);if(l){vx+=dx/l*(15+levels.dash);vy+=dy/l*(15+levels.dash)}notify('РЫВОК');tone(250,.25)};
pulse=function(){
 if(mode!=='play'||pulseCD>0||mission?.stage===0||mission?.stage===4)return;
 pulseCD=Math.max(5,14-levels.empCooldown*.7);let r=empRadius();
 for(const e of targets())if(Math.hypot(e.x-px,e.y-py,e.z-3)<r+e.r){damageEnemy(e,5+levels.empDamage*3,'emp');e.stun=Math.max(e.stun||0,1.5+levels.empDuration*.4)}
 shots=shots.filter(s=>Math.hypot(s.x-px,s.y-py,s.z-3)>r);empWaves.push({x:px,y:py,z:3,r,life:.8});tone(130,.4,'sawtooth',.05);notify('EMP · РАДИУС '+r+' м');
};
updateLock=function(dt){
 const candidates=targets().filter(t=>liveTarget(t)&&t.z<1&&!t.hidden).map(t=>({t,d:Math.hypot(project(t.x,t.y,t.z).x-mx,project(t.x,t.y,t.z).y-my)})).filter(v=>v.d<110).sort((a,b)=>a.d-b.d).slice(0,1+levels.multiLock);
 const old=new Map(locks.map(l=>[l.target,l.time]));locks=candidates.map(v=>({target:v.t,time:Math.min(lockSeconds(),(old.get(v.t)||0)+dt)}));
 lockTarget=locks[0]?.target||null;lockTime=locks[0]?.time||0;
};
launchMissile=function(){
 if(mode!=='play'||missileCD>0||mission?.stage===0||mission?.stage===4)return;
 const ready=locks.filter(l=>l.time>=lockSeconds()&&liveTarget(l.target));
 if(!ready.length){notify('УДЕРЖИВАЙ ПРИЦЕЛ НА ЦЕЛИ');return}if(ammo<=0)return;
 for(const l of ready.slice(0,ammo)){ammo--;let side=ammo%2?1:-1;missiles.push({x:px+side*1.65,y:py-.25,z:3,vx:vx*.4+side*3,vy:vy*.4,vz:-26,life:7,target:l.target,trail:0});}
 missileCD=.7;tone(220,.3,'sawtooth',.045);
};
explode=function(x,y,z,radius=7,secondary=false){
 radius+=levels.blastRadius*.8;blastImpulse(x,y,z,radius);burst(x,y,z,orange,secondary?8:26);blasts.push({x,y,z,life:1.9,r:radius});
 for(const t of targets()){let d=Math.hypot(x-t.x,y-t.y,z-t.z);if(d<radius+t.r)damageEnemy(t,(secondary?4:13)*(1+levels.rocket*.3)*Math.max(.35,1-d/(radius+t.r)),'explosion')}
 for(const r of rocks)if(Math.hypot(x-r.x,y-r.y,z-r.z)<radius+r.r){wreck(r.x,r.y,r.z,5);r.z=-230}
 if(!secondary)for(let i=0;i<levels.cluster*2;i++){let a=i*2.399;explode(x+Math.cos(a)*radius*.65,y+Math.sin(a)*radius*.65,z-1,2,true)}
};
function fireGuns(){
 if(!(firing||keys.Space)||fireCD>0||overheated||mission?.stage===0||mission?.stage===4)return;
 fireCD=gunInterval();heat=Math.min(100,heat+5/(1+levels.cooling*.15));if(heat>=100)overheated=true;
 const tz=liveTarget(lockTarget)?lockTarget.z:-65,tx=(mx/W*2-1)*(18-tz)*Math.tan(Math.PI/6)*aspect,ty=3+(1-my/H*2)*(18-tz)*Math.tan(Math.PI/6),speed=145*(1+levels.shotSpeed*.12);
 for(let i=0;i<barrelCount();i++){let x=px+(i%2?1:-1)*(1.9-Math.floor(i/2)*.65),dx=tx-x,dy=ty-py,dz=tz-2,len=Math.hypot(dx,dy,dz),critical=Math.random()<levels.crit*.04;bullets.push({x,y:py,z:2,vx:dx/len*speed+vx*.1,vy:dy/len*speed+vy*.1,vz:dz/len*speed,damage:gunDamage()*(critical?2:1),critical,pierce:levels.pierce,hitIds:new Set(),life:2.2,id:++shotSequence})}
 vy-=.035;tone(680,.06,'triangle',.015);
}
renderShop=function(){
 $('shopTitle').textContent='УРОВЕНЬ '+(wave+1)+' · ЗАВЕРШЁН';$('credits').textContent=credits+' КР';$('nextWave').textContent=wave<19?'ДАЛЕЕ: '+campaign[wave+1].name:'КАМПАНИЯ ЗАВЕРШЕНА';
 $('shopCategories').innerHTML=categories.map(c=>'<button data-category="'+c+'" aria-pressed="'+(c===shopCategory)+'">'+c+'</button>').join('');
 $('upgrades').innerHTML=upgrades.filter(u=>u.category===shopCategory).map(u=>{let full=levels[u.id]>=u.max,cost=price(u);return '<button class="upgrade" data-up="'+u.id+'" '+(full||credits<cost?'disabled':'')+'><small>УР. '+levels[u.id]+' / '+u.max+'</small><strong>'+u.name+'</strong><span>'+u.desc+'</span><b>'+(full?'МАКСИМУМ':cost+' КР')+'</b></button>'}).join('');
 $('repair').disabled=credits<50||health>=maxHealth();$('repair').textContent='РЕМОНТ КОРПУСА +60 · 50 КР';
 $('buildSummary').textContent='Корпус '+Math.ceil(health)+'/'+maxHealth()+' · Щит '+maxShield()+' · Стволов '+barrelCount()+' · Урон '+gunDamage().toFixed(1)+' · Ракет '+maxAmmo();
};
buyUpgrade=function(id){if(mode!=='shop')return false;const u=upgrades.find(u=>u.id===id);if(!u||levels[id]>=u.max||credits<price(u))return false;credits-=price(u);levels[id]++;if(id==='hull')health+=25;if(id==='shield')shieldEnergy+=25;if(id==='ammo')ammo+=2;renderShop();saveCampaign(wave+1);updateHUD();return true};
collectLoot=function(p){
 if(p.type==='repair'){health=Math.min(maxHealth(),health+30);shieldEnergy=Math.min(maxShield(),shieldEnergy+35);ammo=Math.min(maxAmmo(),ammo+2)}else{let u=upgrades.find(u=>u.id===p.type);if(u&&levels[u.id]<u.max){levels[u.id]++;if(u.id==='hull')health+=25;if(u.id==='shield')shieldEnergy+=25;if(u.id==='ammo')ammo+=2}else health=Math.min(maxHealth(),health+20)}
 notify('ПОДОБРАНО · '+(lootNames[p.type]||p.type));tone(650,.13);p.life=-1;
};
lootTypes.splice(0,lootTypes.length,...upgrades.map(u=>u.id),'repair');
for(const u of upgrades){lootNames[u.id]=u.name.toUpperCase()+' +';lootColors[u.id]=[[1,.72,.22],[.9,.55,1],[.3,.7,1],[.4,1,.4],[.5,1,1],[.65,.6,1]][categories.indexOf(u.category)]}
dropLoot=function(e,guaranteed=false){if(gameMode!=='endless')return;if(!guaranteed&&Math.random()>(e.elite?.8:.4))return;const count=guaranteed?4:1;for(let i=0;i<count;i++){let type=i===0&&guaranteed?'repair':lootTypes[pickupSerial++%lootTypes.length];pickups.push({x:e.x+(i-(count-1)/2)*1.5,y:e.y,z:e.z,type,life:20,spin:Math.random()*6})}if(pickups.length>32)pickups.splice(0,pickups.length-32)};
