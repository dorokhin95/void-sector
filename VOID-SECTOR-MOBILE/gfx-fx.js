'use strict';
// ===== VOID SECTOR — Этап 2: частицы, взрывы, повреждения =====
// Пакетная отрисовка частиц (одна загрузка буфера на смесь), многостадийные взрывы,
// динамический свет вспышек, визуальные повреждения кораблей.
const FX={list:[],max:2600,buffer:gl.createBuffer(),data:null,explosions:[],hitMarks:[],time:0,
 kinds:{SPARK:0,GLOW:1,FIRE:2,SMOKE:3,RING:4}};
function fxCapacity(){return Math.floor(FX.max*(gfx.preset.particles||1))}
// spawnParticle({x,y,z,vx,vy,vz,life,size,size2,color:[r,g,b],alpha,kind,add,drag,stretch,rot,rotV,fadeIn,grow})
function spawnParticle(o){
 if(FX.list.length>=fxCapacity()){FX.list.splice(0,Math.ceil(fxCapacity()*.05))}
 o.age=0;o.life=o.life||1;o.size=o.size||.3;o.size2=o.size2??o.size;o.alpha=o.alpha??1;o.kind=o.kind||0;o.add=o.add??true;o.drag=o.drag??0;o.vx=o.vx||0;o.vy=o.vy||0;o.vz=o.vz||0;o.rot=o.rot||0;o.rotV=o.rotV||0;o.seed=Math.random();o.fadeIn=o.fadeIn||0;o.color=o.color||[1,1,1];o.color2=o.color2||null;
 FX.list.push(o);return o;
}
const fxRand=(a,b)=>a+Math.random()*(b-a);
function fxDir(speed){const a=Math.random()*Math.PI*2,c=Math.random()*2-1,s=Math.sqrt(1-c*c),v=speed*(.4+Math.random()*.6);return[Math.cos(a)*s*v,Math.sin(a)*s*v,c*v]}
// --- Базовые эффекты ---
function fxSparks(x,y,z,color,count=12,speed=14,life=.6,size=.1){for(let i=0;i<count;i++){const v=fxDir(speed);spawnParticle({x,y,z,vx:v[0],vy:v[1],vz:v[2],life:life*fxRand(.5,1.2),size:size*fxRand(.7,1.4),size2:size*.3,color,kind:0,stretch:true,drag:1.5,alpha:1})}}
function fxEmbers(x,y,z,count=10,speed=6,life=1.4){for(let i=0;i<count;i++){const v=fxDir(speed);spawnParticle({x,y,z,vx:v[0],vy:v[1]+1,vz:v[2],life:life*fxRand(.6,1.3),size:fxRand(.05,.14),size2:.02,color:[1,fxRand(.3,.6),.1],kind:1,drag:.8,alpha:.9,stretch:true})}}
function fxFlash(x,y,z,size,color=[1,.95,.85],life=.14){spawnParticle({x,y,z,life,size:size*.6,size2:size*1.6,color,kind:1,alpha:1,add:true})}
function fxFire(x,y,z,radius,count=8,life=.7,speed=null){for(let i=0;i<count;i++){const v=fxDir(speed??radius*2.2);spawnParticle({x:x+v[0]*.08,y:y+v[1]*.08,z:z+v[2]*.08,vx:v[0],vy:v[1],vz:v[2],life:life*fxRand(.6,1.2),size:radius*fxRand(.25,.45),size2:radius*fxRand(.5,.9),color:[1,fxRand(.5,.75),.2],color2:[.6,.12,.03],kind:2,add:true,drag:2.6,rot:Math.random()*6,rotV:fxRand(-2,2),alpha:.95})}}
function fxSmoke(x,y,z,radius,count=6,life=2.4,color=[.16,.15,.15]){for(let i=0;i<count;i++){const v=fxDir(radius*.9);spawnParticle({x:x+v[0]*.2,y:y+v[1]*.2,z:z+v[2]*.2,vx:v[0]*.7,vy:v[1]*.7+.4,vz:v[2]*.7,life:life*fxRand(.7,1.3),size:radius*fxRand(.25,.4),size2:radius*fxRand(.7,1.1),color,kind:3,add:false,drag:1.4,rot:Math.random()*6,rotV:fxRand(-.6,.6),alpha:fxRand(.35,.55),fadeIn:.15})}}
function fxShock(x,y,z,radius,life=.5,color=[1,.75,.45]){spawnParticle({x,y,z,life,size:radius*.2,size2:radius*1.7,color,kind:4,add:true,alpha:.9})}
function fxGlowTrail(x,y,z,color,size=.25,life=.4){spawnParticle({x,y,z,life,size,size2:size*.2,color,kind:1,alpha:.7,add:true})}
// --- Взрыв: вспышка → ядро → ударная волна → огненное облако → раскалённые частицы → обломки → дым → искры ---
function fxExplosion(x,y,z,r=4,opt={}){
 const big=r>=7,huge=r>=12,k=opt.scale||1;
 // Art Pass: даже "средний" взрыв (r 4..7 — обычный враг, не мелочь вроде swarm/мины)
 // получает одну маленькую вторичную детонацию, а не только big/huge — тяжелее без
 // отдельного нового экранного эффекта.
 FX.explosions.push({x,y,z,r,age:0,big,huge,subs:opt.subs||(huge?5:big?3:r>=4?1:0),nextSub:.18,color:opt.color||[1,.55,.2],smokeDone:false});
 addFlashLight(x,y,z,[1,.75,.45],huge?26:big?16:8,r*3.2,huge?.9:big?.7:.45);
 fxFlash(x,y,z,r*1.4,[1,.97,.9],.12);
 spawnParticle({x,y,z,life:.5,size:r*.35,size2:r*1.3,color:[1,.8,.5],kind:1,alpha:1,add:true});
 fxShock(x,y,z,r*1.15,.55);
 fxFire(x,y,z,r*1.35,huge?20:big?14:9,.8);
 fxEmbers(x,y,z,huge?26:big?18:10,r*2.2,1.3);
 fxSparks(x,y,z,[1,.85,.5],huge?22:big?14:8,r*4,.55,.12);
 if(opt.chunks!==false)fxChunks(x,y,z,huge?10:big?6:3,r*2.5);
 shake=Math.max(shake,Math.min(.55,r*.045));
 if(r>3)gfx.post.ca=Math.max(gfx.post.ca,Math.min(.012,r*.0009));
 emit?.('fxExplosion',{x,y,z,r});
}
function fxChunks(x,y,z,count,speed){for(let i=0;i<count;i++){const v=fxDir(speed);debris.push({x,y,z,vx:v[0],vy:v[1],vz:v[2]+3,life:fxRand(1.6,3.4),size:fxRand(.18,.6),spin:Math.random()*6,spinV:fxRand(-4,4),mesh:Math.floor(Math.random()*wreckChunks.length),smoke:Math.random()<.5,heat:1})}if(debris.length>140)debris.splice(0,debris.length-140)}
function fxUpdateExplosions(dt){
 for(const e of FX.explosions){
  e.age+=dt;
  // дым появляется чуть позже огня и растёт; мелкое уничтожение (swarm/мины) — короткий
  // дымок, а не тот же 2.6с шлейф, что у обычного взрыва (п.37 — "не каждое уничтожение
  // большим экранным эффектом").
  if(e.age>.08&&!e.smokeDone){fxSmoke(e.x,e.y,e.z,e.r*1.1,e.huge?12:e.big?8:4,e.huge?4:e.big?2.6:1.1);e.smokeDone=true}
  if(e.age<.45&&Math.random()<dt*40)fxEmbers(e.x+fxRand(-1,1)*e.r*.3,e.y+fxRand(-1,1)*e.r*.3,e.z,2,e.r*1.5,1);
  // внутренние детонации крупных кораблей
  if(e.subs>0&&e.age>=e.nextSub){e.subs--;e.nextSub=e.age+fxRand(.12,.3);const a=Math.random()*6.28,d=e.r*fxRand(.3,.8);const sx=e.x+Math.cos(a)*d,sy=e.y+Math.sin(a)*d*.6,sz=e.z+fxRand(-1,1)*d*.5;
   addFlashLight(sx,sy,sz,[1,.7,.4],10,e.r*2.2,.45);fxFlash(sx,sy,sz,e.r*.7,[1,.95,.85],.1);fxFire(sx,sy,sz,e.r*.55,6,.6);fxEmbers(sx,sy,sz,8,e.r*1.6,1.1);fxSparks(sx,sy,sz,[1,.8,.4],6,e.r*3,.5);fxSmoke(sx,sy,sz,e.r*.6,3,2.2);fxChunks(sx,sy,sz,2,e.r*2);shake=Math.max(shake,.25)}
 }
 FX.explosions=FX.explosions.filter(e=>e.age<3);
}
// --- Попадания ---
function fxImpact(x,y,z,color,kind='gun'){
 if(kind==='shield'){spawnParticle({x,y,z,life:.25,size:.5,size2:1.6,color,kind:1,alpha:.8});fxSparks(x,y,z,color,4,6,.3,.06);return}
 fxSparks(x,y,z,color,kind==='crit'?8:4,kind==='crit'?18:11,.45,.08);spawnParticle({x,y,z,life:.12,size:.35,size2:.9,color:[1,.9,.7],kind:1,alpha:.9});
 if(Math.random()<.35)fxSmoke(x,y,z,.35,1,.9,[.2,.19,.18]);
 if(Math.random()<.12)fxChunks(x,y,z,1,4); // изредка маленький осколок металла с попадания (п.41)
 addFlashLight(x,y,z,color,2.2,4,.12);
 FX.hitMarks.push({x,y,z,life:1.2,color});if(FX.hitMarks.length>60)FX.hitMarks.shift();
}
// --- Повреждения кораблей: искры, дым, электрические дуги, огонь ---
function fxDamageEmit(x,y,z,r,frac,dt,vx=0,vy=0,vz=0){
 // frac: доля потерянного HP (0..1)
 if(frac<.3)return;
 const rate=(frac-.3)*(frac>.7?26:12);
 if(Math.random()<rate*dt){const v=fxDir(r*.6);fxSparks(x+v[0],y+v[1],z+v[2],[1,.8,.4],3,5,.35,.06)}
 if(frac>.5&&Math.random()<(frac-.5)*14*dt){const v=fxDir(r*.5);spawnParticle({x:x+v[0],y:y+v[1],z:z+v[2],vx:vx*.3,vy:vy*.3+.5,vz:vz*.3+2,life:fxRand(1.2,2.2),size:r*.18,size2:r*.55,color:[.12,.11,.11],kind:3,add:false,drag:1,rotV:fxRand(-1,1),alpha:.5,fadeIn:.2})}
 if(frac>.7&&Math.random()<(frac-.7)*30*dt){const v=fxDir(r*.5);spawnParticle({x:x+v[0],y:y+v[1],z:z+v[2],vx:0,vy:.6,vz:1.5,life:fxRand(.3,.6),size:r*.14,size2:r*.28,color:[1,.5,.15],color2:[.5,.1,.02],kind:2,add:true,alpha:.85})}
 if(frac>.6&&Math.random()<(frac-.6)*16*dt){const v=fxDir(r*.7);spawnParticle({x:x+v[0],y:y+v[1],z:z+v[2],vx:fxRand(-3,3),vy:fxRand(-3,3),vz:0,life:.12,size:fxRand(.08,.2),size2:.02,color:[.6,.9,1],kind:0,stretch:true,alpha:1})}
}
// --- Двигательный след / выхлоп ---
function fxEngineTrail(x,y,z,color,strength=1,size=.22){if(Math.random()<strength*.9)spawnParticle({x,y,z,vx:fxRand(-.6,.6),vy:fxRand(-.6,.6),vz:8+strength*6,life:fxRand(.18,.32)*strength,size:size*strength,size2:size*.25,color,kind:1,alpha:.55,add:true})}
// --- Космическая пыль ---
FX.dust=[];
function fxDustReset(color){FX.dust=Array.from({length:Math.floor(140*(gfx.preset.particles||1))},()=>({x:fxRand(-28,28),y:fxRand(-14,16),z:fxRand(-120,15),s:fxRand(.02,.06),color}))}
function fxUpdateDust(dt,speed){if(!FX.dust.length)fxDustReset([.7,.8,.9]);for(const d of FX.dust){d.z+=speed*dt;if(d.z>17){d.z=-120;d.x=fxRand(-28,28);d.y=fxRand(-14,16)}}}
// --- Обновление частиц ---
function fxUpdate(dt){
 FX.time+=dt;
 for(const p of FX.list){p.age+=dt;const k=Math.exp(-p.drag*dt);p.vx*=k;p.vy*=k;p.vz*=k;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=p.rotV*dt}
 FX.list=FX.list.filter(p=>p.age<p.life);
 fxUpdateExplosions(dt);
 for(const h of FX.hitMarks)h.life-=dt;FX.hitMarks=FX.hitMarks.filter(h=>h.life>0);
 // Конвертация старых взрывных шаров (blasts) в новые взрывы.
 for(const b of blasts)if(!b.fx){b.fx=true;fxExplosion(b.x,b.y,b.z,b.r)}
 sparks.length=0;
 // Обломки: вращение, остывание, дымный след.
 for(const d of debris){d.spin+=(d.spinV||3)*dt;d.heat=Math.max(0,(d.heat??1)-dt*.7);if(d.smoke&&d.life>.6&&Math.random()<dt*9)spawnParticle({x:d.x,y:d.y,z:d.z,vx:0,vy:.3,vz:0,life:fxRand(.6,1.1),size:d.size*.5,size2:d.size*1.6,color:[.14,.13,.13],kind:3,add:false,alpha:.35,fadeIn:.1});if(d.heat>.5&&Math.random()<dt*6)fxEmbers(d.x,d.y,d.z,1,2,.6)}
}
// --- Отрисовка частиц: два пакета (аддитивный и с альфа-смешиванием) ---
const FX_STRIDE=15;
function fxRender(){
 const list=FX.list,dust=FX.dust,total=list.length+dust.length;if(!total)return;
 const need=total*6*FX_STRIDE;if(!FX.data||FX.data.length<need)FX.data=new Float32Array(Math.ceil(need*1.3));
 const D=FX.data;let o=0,addCount=0;
 const sunL=gfx.sun.color,amb=gfx.ambientSky,lights=gfx.lights;
 const write=(x,y,z,size,kind,rot,seed,r,g,b,a,dx,dy)=>{for(const [cx,cy] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){D[o++]=x;D[o++]=y;D[o++]=z;D[o++]=cx;D[o++]=cy;D[o++]=r;D[o++]=g;D[o++]=b;D[o++]=a;D[o++]=size;D[o++]=kind;D[o++]=rot;D[o++]=seed;D[o++]=dx;D[o++]=dy}};
 const emitP=(p,speedZ)=>{
  const t=p.age/p.life,fade=(p.fadeIn>0?Math.min(1,p.age/p.fadeIn):1)*(1-t*t);let size=p.size+(p.size2-p.size)*t;let r=p.color[0],g=p.color[1],b=p.color[2];
  if(p.color2){const m=Math.min(1,t*1.4);r=r+(p.color2[0]-r)*m;g=g+(p.color2[1]-g)*m;b=b+(p.color2[2]-b)*m}
  let dx=0,dy=0;if(p.stretch){const sp=Math.hypot(p.vx,p.vy,p.vz);if(sp>.5){const f=Math.min(6,sp*.09);dx=p.vx/sp*f;dy=p.vy/sp*f;if(Math.abs(dx)+Math.abs(dy)<.05){dx=.05}}}
  if(p.kind===3){ // дым освещается солнцем, окружением и вспышками
   let lr=amb[0]*1.2+sunL[0]*.35,lg=amb[1]*1.2+sunL[1]*.35,lb=amb[2]*1.2+sunL[2]*.35;
   for(let i=0;i<lights.length&&i<6;i++){const L=lights[i],ddx=L.x-p.x,ddy=L.y-p.y,ddz=L.z-p.z,d2=ddx*ddx+ddy*ddy+ddz*ddz,att=1/(1+d2*4/(L.radius*L.radius))*Math.max(0,1-d2/(L.radius*L.radius*9));lr+=L.r*att;lg+=L.g*att;lb+=L.b*att}
   r*=lr*1.7;g*=lg*1.7;b*=lb*1.7;
  }
  write(p.x,p.y,p.z,size,p.kind,p.rot,p.seed,r,g,b,p.alpha*fade,dx,dy);
 };
 for(const p of list)if(p.add){emitP(p);addCount++}
 for(const d of dust){const speed=dashActive>0?26:11;const stretch=Math.min(5,speed*.06+(dashActive>0?2.5:0));write(d.x,d.y,d.z,d.s*(1+stretch*.15),0,0,.5,d.color[0],d.color[1],d.color[2],.5,0,0);addCount++}
 const alphaList=list.filter(p=>!p.add).sort((a,b)=>a.z-b.z);for(const p of alphaList)emitP(p);
 const prog=gfx.partProg,a=prog.a,u=prog.u;gl.useProgram(prog.p);
 gl.bindBuffer(gl.ARRAY_BUFFER,FX.buffer);gl.bufferData(gl.ARRAY_BUFFER,D.subarray(0,o),gl.DYNAMIC_DRAW);
 const stride=FX_STRIDE*4;gl.enableVertexAttribArray(a.aPos);gl.vertexAttribPointer(a.aPos,3,gl.FLOAT,false,stride,0);gl.enableVertexAttribArray(a.aCorner);gl.vertexAttribPointer(a.aCorner,2,gl.FLOAT,false,stride,12);gl.enableVertexAttribArray(a.aColor);gl.vertexAttribPointer(a.aColor,4,gl.FLOAT,false,stride,20);gl.enableVertexAttribArray(a.aData);gl.vertexAttribPointer(a.aData,4,gl.FLOAT,false,stride,36);gl.enableVertexAttribArray(a.aDir);gl.vertexAttribPointer(a.aDir,2,gl.FLOAT,false,stride,52);
 gl.uniformMatrix4fv(u.uVP,false,vp);gl.uniform1f(u.uTime,FX.time);gl.uniform1f(u.uOutScale,gfx.outScale);
 gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);
 gl.blendFunc(gl.ONE,gl.ONE);gl.uniform1f(u.uAdditive,1);gl.drawArrays(gl.TRIANGLES,0,addCount*6);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(u.uAdditive,0);gl.drawArrays(gl.TRIANGLES,addCount*6,alphaList.length*6);
 gl.depthMask(true);
 for(const name of ['aPos','aCorner','aColor','aData','aDir'])gl.disableVertexAttribArray(a[name]);
}
// Обломки рисуются как запечённые куски корпуса (внутри сцены).
function fxRenderDebris(){for(const d of debris){const m=wreckChunks[d.mesh??0]||wreckChunks[0],heat=d.heat??0;drawModel(m,d.x,d.y,d.z,d.size*1.6,d.spin,d.spin*.6,d.spin*.3,{emit:[heat*.9,heat*.3,heat*.05],damage:.3,seed:d.spin})}}
// Следы попаданий: светящиеся, затухающие точки на корпусах (приближённо — в мировых координатах).
function fxRenderHitMarks(){gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const h of FX.hitMarks){const k=h.life/1.2;draw(orb,h.x,h.y,h.z,.16+k*.1,.16+k*.1,.16+k*.1,[1,.45+k*.4,.15],2.5*k,0,0,0,k*.8)}gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
// Перехват старых эффектов: искры и обломки старого формата.
(function hookLegacy(){
 const baseBurst=burst;burst=function(x,y,z,color,count=25){baseBurst(x,y,z,color,count);sparks.length=0;fxSparks(x,y,z,color,Math.min(count,20),12+count*.15,.55,.09);if(count>=30){fxFlash(x,y,z,1.2,color,.1);addFlashLight(x,y,z,color,4,6,.25)}};
 const baseWreck=wreck;wreck=function(x,y,z,count=14){const n=debris.length;baseWreck(x,y,z,count);for(let i=n;i<debris.length;i++){const d=debris[i];d.mesh=Math.floor(Math.random()*wreckChunks.length);d.spinV=fxRand(-4,4);d.smoke=Math.random()<.45;d.heat=1}};
 on('enemyHit',d=>{const e=d.e,at=d.at;const x=at?at.x:e.x+fxRand(-.5,.5)*e.r,y=at?at.y:e.y+fxRand(-.5,.5)*e.r,z=at?at.z:e.z+e.r*.8;const c=(e.type&&enemyDefs[e.type]?.color)||(e.kind&&bossDefs[e.kind]?.color)||[1,.6,.2];
  if(d.shieldHit||d.barrier)fxImpact(x,y,z,d.barrier?[.75,.3,1]:c,'shield');else if(d.kind==='gun')fxImpact(x,y,z,[1,.7,.35],'gun');else if(d.kind==='emp'){fxSparks(e.x,e.y,e.z,[.5,.9,1],10,8,.5,.08)}});
 on('enemyBlocked',d=>{const e=d.e;fxSparks(e.x,e.y,e.z-e.r*.7,[.7,.8,.9],5,9,.3,.06)});
 on('playerHit',d=>{if(d.shieldAfter>0||d.kind==='emp'){spawnParticle({x:px,y:py,z:3,life:.3,size:2.2,size2:3.4,color:[.4,.95,1],kind:4,alpha:.6});fxSparks(px+fxRand(-1,1),py+fxRand(-.5,.5),2.4,[.5,.95,1],8,8,.35,.07)}
  if(d.hullDamage>0){fxSparks(px+fxRand(-1.5,1.5),py+fxRand(-.4,.4),2.6,[1,.75,.35],10,12,.5,.09);fxSmoke(px,py,3,.6,2,1.2);addFlashLight(px,py,4,[1,.5,.2],5,6,.2);gfx.post.ca=Math.max(gfx.post.ca,.01)}
  if(d.shieldBroken){spawnParticle({x:px,y:py,z:3,life:.6,size:2.5,size2:6,color:[.5,.9,1],kind:4,alpha:.9});fxSparks(px,py,3,[.6,.95,1],26,14,.6,.1);gfx.post.ca=Math.max(gfx.post.ca,.02)}});
 on('emp',d=>{spawnParticle({x:d.x,y:d.y,z:d.z,life:.8,size:1,size2:d.r*1.15,color:[.4,.95,1],kind:4,alpha:1});fxSparks(d.x,d.y,d.z,[.5,.95,1],40,d.r*1.2,.7,.09);addFlashLight(d.x,d.y,d.z,[.4,.9,1],22,d.r*1.5,.6);gfx.post.empFx={t:0,x:px,y:py};gfx.post.ca=Math.max(gfx.post.ca,.03)});
 on('dash',()=>{gfx.post.dashFx=.65;for(let i=0;i<14;i++)fxSparks(px+fxRand(-1.8,1.8),py+fxRand(-.4,.4),3.5+fxRand(0,1),[.5,.95,1],1,3,.3,.08)});
 on('missileLaunch',()=>{fxSmoke(px,py-.3,3.6,.5,3,.9,[.35,.35,.36]);fxFlash(px,py-.2,4,.8,[1,.8,.5],.08)});
 on('gun',d=>{const c=levels.damage>=3?[.5,.7,1]:[.3,.95,.9];for(let i=0;i<d.count;i++){const side=i%2?1:-1;spawnParticle({x:px+side*(1.9-Math.floor(i/2)*.65),y:py-.09,z:1.9,life:.07,size:.32,size2:.5,color:c,kind:1,alpha:.9})}});
 on('bossPhase',d=>{const b=d.b;fxExplosion(b.x,b.y,b.z,b.r*1.4,{chunks:false});gfx.post.ca=Math.max(gfx.post.ca,.03)});
 on('levelBegin',()=>{gfx.post.warpFx=1.05;gfx.post.ca=Math.max(gfx.post.ca,.02)});
 on('pickup',d=>{fxSparks(d.p.x,d.p.y,d.p.z,lootColors[d.type]||[1,1,1],14,7,.6,.08);spawnParticle({x:d.p.x,y:d.p.y,z:d.p.z,life:.4,size:.6,size2:2.4,color:lootColors[d.type]||[1,1,1],kind:4,alpha:.8})});
 on('hostileShot',d=>{const s=d.shot;if(!s)return;const c=s.color||[1,.3,.3];spawnParticle({x:s.x,y:s.y,z:s.z,life:.1,size:.5,size2:.9,color:c,kind:1,alpha:.8});addFlashLight(s.x,s.y,s.z,c,d.kind==='rail'?8:3,5,.1)});
})();
