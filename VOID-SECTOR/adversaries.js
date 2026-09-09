'use strict';
Object.assign(enemyDefs,{
 swarm:{name:'РОЙ',hp:2,size:.42,r:.65,speed:13,fire:2.8,credit:7,color:[.4,1,.65]},
 reaper:{name:'ЖНЕЦ',hp:9,size:.9,r:1.4,speed:14,fire:1.5,credit:28,color:[1,.4,.12]},
 hammer:{name:'МОЛОТ',hp:36,size:2,r:3.3,speed:3,fire:2.6,credit:55,color:[.8,.67,.42]},
 lancer:{name:'КОПЬЁ',hp:15,size:1.25,r:1.9,speed:3,fire:4.2,credit:38,color:[.3,.7,1]},
 miner:{name:'МИНЁР',hp:13,size:1.3,r:2,speed:5,fire:3,credit:33,color:[.8,1,.25]},
 shepherd:{name:'ПАСТУХ',hp:20,size:1.5,r:2.5,speed:4,fire:3.6,credit:48,color:[.35,1,.8]},
 leech:{name:'ПИЯВКА',hp:10,size:.85,r:1.4,speed:12,fire:2.6,credit:30,color:[.9,.3,1]},
 missileboat:{name:'РАКЕТОНОСЕЦ',hp:19,size:1.6,r:2.5,speed:3,fire:4,credit:42,color:[.7,.45,1]},
 inquisitor:{name:'ИНКВИЗИТОР',hp:23,size:1.65,r:2.7,speed:5,fire:3.4,credit:50,color:[.8,.25,1]},
 carrier:{name:'АВИАНОСЕЦ',hp:48,size:2.7,r:4.3,speed:2,fire:5,credit:85,color:[.4,.8,.72]}
});
let entityId=0,bossFleet=[],mines=[],structures=[],lastBossKind=null,lastEncounterBosses=[],bossHistory=[],directorReport=null;
const bossDefs={cerberus:{name:'ЦЕРБЕР',hp:480,color:[1,.36,.12]},leviathan:{name:'ЛЕВИАФАН',hp:650,color:[.3,.85,.65]},phantom:{name:'ФАНТОМ',hp:420,color:[.7,.35,1]},archon:{name:'АРХОНТ БЕЗДНЫ',hp:850,color:[1,.2,.45]}};
difficulty=()=>gameMode==='campaign'?1+wave*.085:1+wave*.13+wave*wave*.003;
enemyDamageScale=()=>Math.sqrt(difficulty());
targets=()=>[...enemies.filter(e=>!e.hidden),...mines,...structures,...bossFleet.flatMap(b=>[...b.modules.filter(m=>m.hp>0),...(!b.hidden?[b]:[])])].filter(t=>t.hp>0);
liveTarget=t=>!!t&&t.hp>0&&!t.hidden&&targets().includes(t);
spawnEnemy=function(type,options={}){
 const d=enemyDefs[type]||enemyDefs.fighter,elite=!!options.elite,x=options.x??(Math.random()-.5)*27,y=options.y??(Math.random()-.5)*12+1;
 const hp=d.hp*difficulty()*(elite?1.5:1)*(options.mini?5:1);
 const e={id:++entityId,type,x,y,z:options.z??-100,hp,maxHp:hp,shield:type==='frigate'?8*difficulty():0,r:d.r*(options.mini?1.3:1),damageScale:enemyDamageScale(),seed:Math.random()*6,fire:1.5+Math.random()*2,vx:0,vy:0,vz:0,homeX:x,homeY:y,age:0,charge:0,credit:Math.round(d.credit*(elite?1.8:1)*(options.mini?5:1)),reward:d.credit*12,elite,mini:options.mini||false,stun:0,special:1.5,owner:options.owner||null,objective:options.objective||false,convoy:options.convoy||false,chase:options.chase||false,decoy:!!options.decoy,barrier:0};
 if(options.decoy){e.hp=e.maxHp=1;e.credit=0;e.reward=0}enemies.push(e);return e;
};
function spawnPack(type,count,options={}){for(let i=0;i<count&&enemies.length<28;i++)spawnEnemy(type,{...options,x:(options.x??0)+(i-(count-1)/2)*1.5,y:(options.y??2)+Math.sin(i)*1.5})}
function spawnMine(x,y,z,magnetic=false){if(mines.length>=28)return;mines.push({id:++entityId,x,y,z,hp:2*difficulty(),maxHp:2*difficulty(),r:.8,age:0,life:25,magnetic,mine:true,damageScale:enemyDamageScale()})}
function strategicObject(x,y,z,kind='generator',owner=null){let hp=(kind==='armor'?24:kind==='turret'?13:20)*difficulty();return {id:++entityId,x,y,z,hp,maxHp:hp,r:kind==='armor'?2:1.3,module:!!owner,structure:!owner,kind,owner,dx:owner?x-owner.x:0,dy:owner?y-owner.y:0,dz:owner?z-owner.z:0,fire:2,stun:0}}
function playerPower(){const nominal=gunDamage()*barrelCount()/gunInterval();return clamp(.7+Math.sqrt(nominal/17)*.4+levels.rocket*.025+levels.shield*.008+levels.hull*.008,.8,3.4)}
function directBoss(){
 const choices=Object.keys(bossDefs).filter(k=>!lastEncounterBosses.includes(k)&&k!==lastBossKind);
 const pressure=telemetry.incoming/Math.max(1,maxShield()/10),ranged=levels.rocket+levels.multiLock+levels.lockSpeed;
 const weights=choices.map(k=>1+(k==='leviathan'&&levels.multishot>0?.8:0)+(k==='cerberus'&&ranged>3?.7:0)+(k==='phantom'&&levels.engine+levels.handling>3?.7:0)-(k==='archon'&&pressure>1?.6:0));
 let roll=Math.random()*weights.reduce((a,b)=>a+b,0),chosen=choices[choices.length-1];for(let i=0;i<choices.length;i++){roll-=weights[i];if(roll<=0){chosen=choices[i];break}}
 let expected=gunDamage()*barrelCount()/gunInterval(),performanceFactor=clamp(.85+telemetry.dps/Math.max(10,expected)*.35-pressure*.04,.8,1.3);
 let power=clamp(playerPower()*performanceFactor,.8,3.7);
 directorReport={kind:chosen,wave:wave+1,power,dps:telemetry.dps,incoming:telemetry.incoming,hpScale:difficulty()*power,damageScale:Math.sqrt(difficulty())};
 lastBossKind=chosen;bossHistory.push(chosen);if(bossHistory.length>12)bossHistory.shift();return {kind:chosen,hpScale:directorReport.hpScale,damageScale:directorReport.damageScale};
}
function spawnBoss(kind,options={}){
 const d=bossDefs[kind],hp=d.hp*(options.hpScale??difficulty()),b={id:++entityId,kind,name:d.name,x:options.x??0,y:3,z:-75,hp,maxHp:hp,r:kind==='archon'?6:4,damageScale:options.damageScale??enemyDamageScale(),phase:1,modules:[],age:0,fire:2,special:5,stun:0,hidden:false,shield:0,credit:350+wave*20,mini:false};
 bossFleet.push(b);boss=bossFleet[0];
 if(kind==='cerberus')for(let side of [-1,1])b.modules.push(strategicObject(b.x+side*4,b.y,b.z+1,'turret',b));
 if(kind==='leviathan'){for(let side of [-1,1]){b.modules.push(strategicObject(b.x+side*5,b.y+2,b.z+1,'generator',b));b.modules.push(strategicObject(b.x+side*6,b.y-1,b.z+4,'turret',b))}}
 if(kind==='archon')for(let i=0;i<4;i++){let a=i*Math.PI/2;b.modules.push(strategicObject(b.x+Math.cos(a)*8,b.y+Math.sin(a)*5,b.z+3,'generator',b))}
 // Director scaling applies to the whole encounter, including destructible modules.
 for(const m of b.modules){m.hp*=options.hpScale?options.hpScale/difficulty():1;m.maxHp=m.hp}
 notify(d.name+' · УНИЧТОЖАЙ ОТМЕЧЕННЫЕ МОДУЛИ');return b;
}
function spawnMini(kind='hammer',x=0){const e=spawnEnemy(kind,{x,z:-65,elite:true,mini:true});e.name={hammer:'ТАРАН',inquisitor:'ПРЕЛАТ',carrier:'УЛЕЙ',lancer:'БАЛЛИСТА'}[kind]||'КОМАНДИР';return e}
function bossProtected(b){return b.kind==='leviathan'&&(b.phase===1||b.modules.some(m=>m.kind==='generator'&&m.hp>0))||b.kind==='archon'&&b.phase<=2}
damageEnemy=function(e,d,kind='gun',projectile=null){
 if(!e||e.hp<=0||e.hidden)return 0;
 if(bossFleet.includes(e)&&bossProtected(e)){e.hitTime=.15;return 0}
 if(e.type==='hammer'&&kind==='gun'&&Math.abs((projectile?.x??px)-e.x)<e.r*.6)d*=.3;
 if(e.barrier>0&&kind!=='emp')d*=.2;
 let absorbed=Math.min(e.shield||0,d);e.shield=Math.max(0,(e.shield||0)-d);let dealt=d-absorbed;
 const before=e.hp;
 if(bossFleet.includes(e)){
  // Phase boundaries cannot be skipped by a single upgraded missile.
  let floor=e.kind==='cerberus'?(e.phase===1?e.maxHp*.66:e.phase===2?e.maxHp*.33:0):e.kind==='phantom'?(e.phase===1?e.maxHp*.7:e.phase===2?e.maxHp*.4:0):e.kind==='archon'&&e.phase===3?e.maxHp*.5:0;
  e.hp=Math.max(floor,e.hp-dealt);
 }else e.hp-=dealt;
 const actual=absorbed+Math.min(before,Math.max(0,before-e.hp));telemetry.dealt+=actual;e.hitTime=.15;if(kind==='emp'){e.barrier=0;e.stun=1.5+levels.empDuration*.4}return actual;
};
hostileShot=function(e,kind='bolt',offset=0){
 if(shots.length>=220||e.stun>0)return;
 let ally=mission?.ally,aim=e.aim||(ally&&Math.random()<.42?ally:{x:px+vx*.22,y:py+vy*.22,z:3});
 let speed=kind==='rail'?90:kind==='missile'?24:kind==='plasma'?23:34,dx=aim.x+offset-e.x,dy=aim.y-e.y,dz=(aim.z??3)-e.z,l=Math.max(.001,Math.hypot(dx,dy,dz));
 shots.push({x:e.x,y:e.y,z:e.z,vx:dx/l*speed,vy:dy/l*speed,vz:dz/l*speed,life:9,homing:kind==='missile',kind,color:kind==='rail'?[.4,.85,1]:kind==='missile'?[.85,.4,1]:kind==='plasma'?orange:kind==='emp'?[.8,.3,1]:red,damage:(kind==='rail'?17:kind==='missile'?14:kind==='plasma'?11:8)*(e.damageScale||enemyDamageScale()),target:ally&&aim===ally?ally:null});
};
updateEnemies=function(dt){
 leechDrain=false;
 for(const e of [...enemies]){
 const d=enemyDefs[e.type];e.age+=dt;e.hitTime=Math.max(0,(e.hitTime||0)-dt);e.stun=Math.max(0,e.stun-dt);if(e.stun>0)continue;
 e.fire-=dt;e.special-=dt;e.barrier=Math.max(0,e.barrier-dt);
 let tx=e.homeX+Math.sin(e.age*.65+e.seed)*3,ty=e.homeY+Math.sin(e.age*.85+e.seed)*2,range=-42;
 if(e.type==='scout'||e.type==='reaper'){tx=e.homeX+Math.sin(e.age*1.6+e.seed)*7;for(const p of bullets)if(Math.abs(p.z-e.z)<12&&Math.abs(p.x-e.x)<2){tx+=e.x>p.x?5:-5;break}}
 if(e.type==='reaper'){range=-12;let a=e.age%7;if(a>4){tx=clamp(px+(e.seed>3?7:-7),-12,12);ty=py;range=6}}
 if(e.type==='missileboat'||e.type==='lancer'||e.type==='sniper')range=-65;
 if(e.type==='leech'){tx=px+Math.sin(e.age)*3;ty=py;range=-4;if(Math.hypot(e.x-px,e.y-py,e.z-3)<13)leechDrain=true}
 if(e.type==='swarm'){if(e.owner&&e.owner.hp>0){tx=e.owner.x+Math.sin(e.seed+e.age)*4;ty=e.owner.y+Math.cos(e.seed+e.age)*3;range=e.owner.z+10}else{tx=Math.sin(e.seed+e.age*.5)*13;ty=Math.cos(e.seed+e.age*.7)*6;range=-28}}
 if(e.convoy){tx=e.homeX;ty=e.homeY;range=20}
 if(e.chase){tx=Math.sin(e.age*.6)*12;ty=2+Math.sin(e.age)*4;let aligned=Math.abs(px-e.x)<4&&Math.abs(py-e.y)<3;if(mission)mission.pursuit=clamp((mission.pursuit||0)+(aligned?(dashActive>0?16:2):-1)*dt,0,47);range=-65+(mission?.pursuit||0)}
 let multiplier=e.elite?1.3:1,speed=d.speed*multiplier*(e.type==='reaper'&&e.age%7>4?2:1);
 if(e.elite){tx+=Math.sin(e.age*2.6)*2;ty+=Math.cos(e.age*2.1)*1.1}
 const old={x:e.x,y:e.y,z:e.z};e.vx+=(clamp((tx-e.x)*2,-speed,speed)-e.vx)*(1-Math.exp(-3*dt));e.vy+=(clamp((ty-e.y)*2,-speed*.7,speed*.7)-e.vy)*(1-Math.exp(-3*dt));e.x=clamp(e.x+e.vx*dt,-22,22);e.y=clamp(e.y+e.vy*dt,-9,12);e.z+=clamp(range-e.z,-speed,speed)*dt;
 e.vz=(e.z-old.z)/dt;
 if(e.convoy&&e.z>14){e.escaped=true;e.hp=0;if(mission)mission.escaped++}
 if(e.chase&&e.age>60){e.escaped=true;e.hp=0;if(mission)mission.escaped++}
 if(e.type==='miner'&&e.special<=0){spawnMine(e.x,e.y,e.z+3,true);e.special=3.4}
 if((e.type==='carrier'||e.type==='shepherd')&&e.special<=0){spawnPack('swarm',e.type==='carrier'?6:5,{x:e.x,y:e.y,z:e.z+5,owner:e});e.special=e.type==='carrier'?11:16}
 if(e.type==='inquisitor'&&e.special<=0){e.barrier=4;for(const other of enemies)if(Math.hypot(other.x-e.x,other.y-e.y,other.z-e.z)<12)other.barrier=4;e.special=10}
 if(e.decoy)continue;
 if(e.type==='lancer'||e.type==='sniper'){
 if(e.charge>0){e.charge-=dt;if(e.charge<=0){hostileShot(e,'rail');if(e.type==='lancer'){hostileShot(e,'rail',-2);hostileShot(e,'rail',2)}e.aim=null;e.fire=d.fire}}
 else if(e.fire<=0){e.charge=e.type==='lancer'?1.35:1.05;e.aim={x:px,y:py,z:3};e.fire=99}
 }else if(e.fire<=0){
 e.fire=d.fire/(e.elite?1.15:1);
 if(e.type==='fighter')for(let o of [-5,0,5])hostileShot(e,'bolt',o);
 else if(e.type==='frigate'||e.type==='hammer')for(let o of [-7,0,7])hostileShot(e,'plasma',o);
 else if(e.type==='bomber'||e.type==='missileboat'){hostileShot(e,'missile',0);if(e.type==='missileboat')hostileShot({...e,x:e.x+2},'missile',3)}
 else if(e.type==='inquisitor')hostileShot(e,'emp');
 else hostileShot(e);
 }
 }
 for(const b of bossFleet)updateBoss(b,dt);
 for(const b of beams)b.life-=dt;beams=beams.filter(b=>b.life>0);
};
function updateBoss(b,dt){
 b.age+=dt;b.fire-=dt;b.special-=dt;b.stun=Math.max(0,b.stun-dt);b.hitTime=Math.max(0,(b.hitTime||0)-dt);
 let oldx=b.x,oldy=b.y,spacing=bossFleet.length>1?(bossFleet.indexOf(b)===0?-11:11):0;
 if(b.kind!=='archon'||b.phase>=3){b.x=spacing+(b.anchorX||0)+Math.sin(b.age*(b.kind==='cerberus'&&b.phase===3?1.3:.4))*(b.kind==='phantom'?3:7);b.y=3+(b.anchorY||0)+Math.sin(b.age*.7)*(b.kind==='phantom'?1.5:3)}
 b.z=Math.min(-43,b.z+dt*4);b.vx=(b.x-oldx)/dt;b.vy=(b.y-oldy)/dt;
 if(b.kind==='cerberus'){
 if(b.phase===1&&b.hp<=b.maxHp*.66){b.phase=2;for(let side of [-1,1])b.modules.push(strategicObject(b.x+side*6,b.y+1,b.z+3,'sidegun',b));notify('ЦЕРБЕР · БОКОВЫЕ ОРУДИЯ АКТИВНЫ')}
 if(b.phase===2&&b.hp<=b.maxHp*.33){b.phase=3;wreck(b.x,b.y,b.z,22);notify('ЦЕРБЕР · БРОНЯ СБРОШЕНА')}
 }
 if(b.kind==='leviathan'&&b.phase===1&&!b.modules.some(m=>m.kind==='generator'&&m.hp>0)){b.phase=2;notify('ЛЕВИАФАН · ЯДРО ОТКРЫТО')}
 if(b.kind==='phantom'){
 b.hidden=b.age%10>3&&b.age%10<5;
 if(b.special<=0){b.special=10;b.anchorX=(Math.random()-.5)*18;b.anchorY=(Math.random()-.5)*6;b.x=spacing+b.anchorX;b.y=3+b.anchorY;b.age=Math.floor(b.age/10)*10+8;spawnPack('reaper',2,{x:b.x,y:b.y,z:b.z+4,decoy:true});notify('ФАНТОМ · ЛОЖНЫЕ ЦЕЛИ')}
 b.phase=b.hp<=b.maxHp*.4?3:b.hp<=b.maxHp*.7?2:1;
 }
 if(b.kind==='archon'){
 if(b.phase===1&&b.modules.every(m=>m.hp<=0)){b.phase=2;b.modules=[];for(let i=0;i<4;i++){let a=i*Math.PI/2;b.modules.push(strategicObject(b.x+Math.cos(a)*7,b.y+Math.sin(a)*4,b.z+4,'armor',b))}notify('АРХОНТ · РАЗРУШЬ ВНЕШНЮЮ БРОНЮ')}
 if(b.phase===2&&b.modules.every(m=>m.hp<=0)){b.phase=3;b.r=3.5;wreck(b.x,b.y,b.z,45);blasts.push({x:b.x,y:b.y,z:b.z,life:1.9,r:18});notify('АРХОНТ · ЦЕНТРАЛЬНЫЙ КОРАБЛЬ ВЫШЕЛ ИЗ СТАНЦИИ')}
 if(b.phase===3&&b.hp<=b.maxHp*.5){b.phase=4;if(mission)mission.environment='debris';configureRocks('debris');notify('АРХОНТ · ФИНАЛЬНЫЙ БОЙ СРЕДИ ОБЛОМКОВ')}
 }
 for(const m of b.modules){m.x=b.x+m.dx;m.y=b.y+m.dy;m.z=b.z+m.dz;m.stun=Math.max(0,m.stun-dt);m.fire-=dt;if(m.hp>0&&(m.kind==='turret'||m.kind==='sidegun')&&m.fire<=0){hostileShot({...m,damageScale:b.damageScale},m.kind==='sidegun'?'plasma':'bolt');m.fire=2.2}}
 if(b.stun>0||b.hidden)return;
 if(b.fire<=0){b.fire=b.kind==='phantom'?1.9:b.phase>=3?1.6:2.4;
 if(b.kind==='cerberus'){if(b.modules.some(m=>m.hp>0))hostileShot(b,'missile');if(b.phase===3)for(let o of [-6,0,6])hostileShot(b,'bolt',o)}
 if(b.kind==='leviathan'){for(let o of [-8,0,8])hostileShot(b,'plasma',o)}
 if(b.kind==='phantom'){for(let side of [-1,1]){let source={...b,x:b.x+side*9,aim:{x:px,y:py,z:3}};beams.push({a:{x:source.x,y:source.y,z:source.z},b:{x:px,y:py,z:3},life:.55});hostileShot(source,'plasma')}}
 if(b.kind==='archon'){for(let o of [-9,-3,3,9])hostileShot(b,'plasma',o);if(b.phase>=3)hostileShot(b,'missile')}
 }
 if(b.kind==='leviathan'&&b.special<=0){spawnPack('swarm',6,{x:b.x,y:b.y,z:b.z+5});b.special=12}
}
function cleanupHostiles(){
 enemies=enemies.filter(e=>{if(e.hp>0)return true;if(!e.escaped){burst(e.x,e.y,e.z,orange,e.mini?40:16);wreck(e.x,e.y,e.z,e.type==='swarm'?3:12);blasts.push({x:e.x,y:e.y,z:e.z,life:1.9,r:e.mini?8:e.type==='swarm'?1.5:4});if(!e.decoy){kills++;waveKills++;score+=e.reward;credits+=e.credit;dropLoot(e,e.mini);if(mission)mission.kills++}}return false});
 for(const b of bossFleet)for(const m of b.modules)if(m.hp<=0&&!m.destroyed){m.destroyed=true;wreck(m.x,m.y,m.z,8);blasts.push({x:m.x,y:m.y,z:m.z,life:1.9,r:3});credits+=20;}
 bossFleet=bossFleet.filter(b=>{if(b.hp>0)return true;wreck(b.x,b.y,b.z,40);blasts.push({x:b.x,y:b.y,z:b.z,life:1.9,r:14});burst(b.x,b.y,b.z,orange,60);score+=4000;credits+=b.credit;kills++;dropLoot(b,true);return false});boss=bossFleet[0]||null;
 structures=structures.filter(s=>{if(s.hp>0)return true;if(mission)mission.objectsDestroyed++;wreck(s.x,s.y,s.z,10);blasts.push({x:s.x,y:s.y,z:s.z,life:1.9,r:4});credits+=25;return false});
 mines=mines.filter(m=>{if(m.hp>0&&m.life>0)return true;if(m.hp<=0){burst(m.x,m.y,m.z,orange,6);blasts.push({x:m.x,y:m.y,z:m.z,life:1.9,r:2})}return false});
}
