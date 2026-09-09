'use strict';
// ===== VOID SECTOR — Этап 2: модели и сборка кадра =====
// Корабль игрока из отдельных элементов, реагирующих на состояние; собственный визуальный язык
// каждого класса врагов и боссов; структуры миссий; камера и пост-эффекты.
const PAL={hull:[.34,.4,.48],hullLight:[.44,.5,.57],dark:[.07,.09,.12],steel:[.55,.6,.65],cyan:[.25,.95,.88],orange:[1,.45,.12],red:[1,.2,.2],
 ashHull:[.4,.39,.42],ashPlate:[.5,.49,.52],ashDark:[.12,.12,.15],rust:[.42,.25,.2],glass:[.08,.16,.22]};
const models={};
// ---------- Корабль игрока ----------
(function buildPlayer(){
 const b=new ModelBuilder(),H=PAL.hull,L=PAL.hullLight,D=PAL.dark,S=PAL.steel;
 // корпус: основной клин, верхний хребет, нижняя гондола
 b.add(G.wedge,{sx:1,sy:.8,sz:1.1,color:H,rough:.45,metal:.75});
 b.add(G.wedge,{y:.24,z:-.3,sx:.57,sy:.67,sz:.85,color:L,rough:.4,metal:.8});
 b.add(G.bevel,{y:-.18,z:.9,sx:.5,sy:.22,sz:.9,color:D,rough:.6,metal:.7});
 b.add(G.cone,{y:-.05,z:-3.2,sx:.18,sy:.14,sz:.5,rx:Math.PI,color:S,rough:.35,metal:.9}); // носовой датчик
 // крылья со скосом, законцовки, кромки
 b.add(G.wedge,{x:1.3,y:-.12,z:.65,sx:1.12,sy:.19,sz:.72,rz:.12,color:H,rough:.5,metal:.75,mirror:true});
 b.add(G.wedge,{x:1.7,y:-.1,z:1,sx:.64,sy:.12,sz:.45,color:[.16,.22,.3],rough:.55,metal:.7,mirror:true});
 b.add(G.bevelThin,{x:1.23,y:.03,z:.3,sx:.48,sy:.023,sz:.035,rz:.12,color:PAL.cyan,glow:.9,rough:.4,metal:0,mirror:true});
 b.add(G.fin,{x:.7,y:.45,z:1.2,sx:.35,sy:.75,sz:.12,rz:-.24,color:H,rough:.5,metal:.75,mirror:true});
 // гондолы двигателей и сопла
 b.add(G.cyl,{x:.83,y:-.03,z:1.08,sx:.3,sy:.3,sz:.84,color:D,rough:.55,metal:.8,mirror:true});
 b.add(G.cyl,{x:.83,y:-.03,z:1.65,sx:.34,sy:.34,sz:.12,color:H,rough:.4,metal:.85,mirror:true});
 b.add(G.coneWide,{x:.83,y:-.03,z:2.0,sx:.32,sy:.32,sz:.22,color:S,rough:.3,metal:.95,mirror:true});
 for(let j=0;j<6;j++)b.add(G.box,{x:.83+Math.cos(j*1.047)*.33,y:-.03+Math.sin(j*1.047)*.33,z:1.2,sx:.03,sy:.03,sz:.6,color:S,rough:.4,metal:.9,mirror:true});
 // оружейные пилоны
 b.add(G.cyl8,{x:1.9,y:-.09,z:-.35,sx:.075,sy:.075,sz:.68,color:[.12,.18,.23],rough:.5,metal:.85,mirror:true});
 b.add(G.bevel,{x:1.9,y:-.09,z:.35,sx:.14,sy:.14,sz:.3,color:D,rough:.5,metal:.8,mirror:true});
 // технические панели и охлаждение
 for(let j=0;j<4;j++)b.add(G.box,{x:.46,y:.28,z:.35+j*.19,sx:.14,sy:.035,sz:.033,color:D,rough:.7,metal:.6,mirror:true});
 for(let j=0;j<3;j++)b.add(G.box,{x:1.05+j*.28,y:-.015,z:.87,sx:.09,sy:.02,sz:.025,color:S,rough:.4,metal:.9,mirror:true});
 b.add(G.box,{x:.3,y:.34,z:.25,sx:.08,sy:.025,sz:.34,color:[.1,.2,.24],rough:.6,metal:.7,mirror:true});
 // антенны
 b.add(G.cyl8,{x:-.15,y:.62,z:.55,sx:.012,sy:.012,sz:.35,rx:Math.PI/2,color:S,rough:.4,metal:.9});
 b.add(G.cyl8,{x:.4,y:.5,z:.9,sx:.01,sy:.01,sz:.22,rx:Math.PI/2+.4,color:S,rough:.4,metal:.9});
 models.player=b.mesh({surface:10,rough:.45,metal:.75});
 // отдельные бронепанели (теряются с повреждением)
 models.playerPanels=[
  {x:.0,y:.5,z:-1.4,sx:.22,sy:.03,sz:.5,thr:.9},{x:.55,y:.18,z:-.6,sx:.3,sy:.03,sz:.55,rz:.5,thr:.8},{x:-.55,y:.18,z:-.6,sx:.3,sy:.03,sz:.55,rz:-.5,thr:.7},
  {x:1.25,y:.02,z:.45,sx:.42,sy:.025,sz:.35,rz:.12,thr:.6},{x:-1.25,y:.02,z:.45,sx:.42,sy:.025,sz:.35,rz:-.12,thr:.5},{x:.0,y:.42,z:-.4,sx:.2,sy:.03,sz:.4,thr:.4},
  {x:.9,y:-.32,z:.5,sx:.25,sy:.03,sz:.4,rz:2.7,thr:.3},{x:-.9,y:-.32,z:.5,sx:.25,sy:.03,sz:.4,rz:-2.7,thr:.2}
 ];
 models.panel=simpleMesh(bevelBoxGeo(1,1,1,.2),{rough:.4,metal:.85});
 models.glass=simpleMesh(sphereGeo(10,16),{surface:11,rough:.06,metal:.9});
})();
function renderPlayerShip(x,y,z,size=1,roll=0,pitchAngle=0,menu=false){
 const hpFrac=menu?1:health/maxHealth(),dmg=1-hpFrac,heatFrac=menu?0:heat/100,speed=Math.hypot(vx,vy);
 pushMatrix(matrix(x,y,z,size,size,size,pitchAngle,0,roll));
 drawModel(models.player,0,0,0,1,0,0,0,{damage:dmg*.9,seed:1.7});
 // бронепанели: целые — светлые; потерянные — обгоревшая основа с тлеющими кромками
 for(const p of models.playerPanels){const intact=hpFrac>=p.thr;if(intact)draw(models.panel,p.x,p.y,p.z,p.sx,p.sy,p.sz,PAL.hullLight,0,0,0,p.rz||0,1,{damage:dmg*.6,seed:p.thr*9});else{draw(models.panel,p.x,p.y-.01,p.z,p.sx*.9,p.sy*.6,p.sz*.9,[.06,.05,.05],0,0,0,p.rz||0,1,{rough:.95,metal:.1,emit:[.5+Math.sin(gfx.time*7+p.thr*20)*.3,.12,.02]})}}
 // кабина: стекло с внутренней подсветкой
 gl.depthMask(true);draw(orb,0,.42,-.9,.3,.2,.8,[.02,.1,.14],.3,0,0,0,1,{rough:.3,metal:.6,emit:[0,.12,.16]});
 gl.depthMask(false);draw(models.glass,0,.45,-.9,.33,.23,.86,PAL.glass,.15,0,0,0,.55,{shadow:false});gl.depthMask(true);
 draw(cube,0,.54,-.6,.025,.045,.75,PAL.cyan,1.2,0,0,0,1,{rough:.4,metal:0});
 // радиаторы охлаждения — краснеют при нагреве
 const glowHeat=heatFrac*heatFrac*(1+(heatFrac>.6?Math.sin(gfx.time*14)*.25:0)),heatCol=[glowHeat*1.6,glowHeat*.35,glowHeat*.05];
 for(const side of [-1,1])for(let j=0;j<4;j++)draw(cube,side*.3,.36,.1+j*.23,.02,.11,.09,[.5,.52,.55],0,0,0,0,1,{rough:.35,metal:.9,emit:heatCol});
 for(const side of [-1,1])draw(cube,side*.62,-.08,.3,.36,.015,.28,[.6,.62,.65],0,0,0,side*.1,1,{rough:.3,metal:.95,emit:heatCol.map(v=>v*.6)});
 // стволы пулемёта (вращаются при стрельбе), греются
 const barrels=3+Math.min(3,levels.rate),spin=gfx.time*((firing||keys.Space)&&!menu?24:2),barrelHeat=Math.max(0,heatFrac-.4)*1.5;
 const gunPods=levels.multishot>0?[1.9,.65]:[1.9];
 for(const side of [-1,1])for(const gx of gunPods){for(let j=0;j<barrels;j++){const a=spin+j*Math.PI*2/barrels;draw(tube,side*gx+Math.cos(a)*.08,Math.sin(a)*.08-.09,-.66,.025,.025,.8,[.5,.57,.62],0,0,0,0,1,{rough:.35,metal:.95,emit:[barrelHeat,barrelHeat*.25,0]})}draw(tube,side*gx,-.09,-1.5,.09,.09,.07,[.2,.25,.3],0,0,0,0,1,{rough:.4,metal:.9});if(gx<1)draw(tube,side*gx,-.09,-.35,.07,.07,.68,[.12,.18,.23],0,0,0,0,1,{rough:.5,metal:.85})}
 // ракетные контейнеры: индикаторы по числу заряженных ракет
 const perSide=Math.min(6,Math.ceil(maxAmmo()/2));
 for(const side of [-1,1]){draw(models.panel,side*1.42,-.35,.5,.14,.13,.5,[.5,.52,.5],0,0,0,0,1,{rough:.5,metal:.8});for(let j=0;j<perSide;j++){const loaded=menu||(j*2+(side>0?0:1))<ammo;const row=j%3,col=Math.floor(j/3);draw(tube,side*1.42+(col-.5)*.08,-.35+(row-1)*.075,0,.03,.03,.05,loaded?PAL.orange:[.12,.1,.1],loaded?1.4:0,0,0,0,1,{rough:.5,metal:.3})}}
 // технические огни, антенна
 draw(orb,-.15,.98,.55,.03,.03,.03,PAL.red,Math.sin(gfx.time*4)>0?2:.2,0,0,0,1,{rough:.5,metal:0});
 for(let j=0;j<4;j++)draw(cube,0,.45,.3+j*.23,.13,.02,.08,hpFrac<.35?PAL.red:PAL.cyan,.9+Math.sin(gfx.time*6+j)*.3,0,0,0,1,{rough:.5,metal:0});
 for(const side of [-1,1])if(Math.abs(vx)>.5)draw(orb,side*2.18,-.1,.6,.10+Math.abs(vx)*.008,.08,.18,PAL.cyan,2,0,0,0,1,{shadow:false});
 // двигатели: тяга, перебои при повреждении, свет
 const thrust=1+speed*.04+(dashActive>0?1.2:0),flicker=hpFrac<.35&&Math.random()<.18?.15:hpFrac<.6&&Math.random()<.05?.4:1;
 const engineCol=dashActive>0?[.6,1,1]:PAL.cyan;
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 for(const side of [-1,1]){draw(tube,side*.83,-.03,1.79,.24,.24,.03,engineCol,2.5*flicker,0,0,0,1,{shadow:false});draw(orb,side*.83,-.03,2.1+thrust*.2,.17,.17,(.45+Math.sin(gfx.time*36)*.05)*thrust,engineCol,3*flicker,0,0,0,.9,{shadow:false});draw(orb,side*.83,-.03,2.3+thrust*.35,.11,.11,.7*thrust,[1,1,1],2*flicker,0,0,0,.5,{shadow:false});draw(tube,side*1.9,-.09,-1.02,.09,.09,.07,PAL.cyan,1.2,0,0,0,1,{shadow:false})}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
 popMatrix();
 if(!menu){
  addLight(x,y,z+2.4,engineCol[0],engineCol[1],engineCol[2],1.6*flicker*thrust,7);
  for(const side of [-1,1])fxEngineTrail(x+side*.83*size,y-.03,z+2.4,engineCol,thrust*flicker*(dashActive>0?1.6:.7),.22);
  fxDamageEmit(x,y+.2,z-.3,1.3,dmg,1/60,vx,vy,0);
  if(hpFrac<.35&&Math.random()<.06)addFlashLight(x+fxRand(-1,1),y,z,[.6,.9,1],3,4,.08);
 }
}
// Щит: полупрозрачная оболочка при попадании
function renderPlayerShield(x,y,z){
 const recent=Math.max(0,.45-damageAge),frac=shieldEnergy/maxShield();
 if(recent<=0&&inv<=0)return;
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 if(recent>0&&frac>0)draw(orb,x,y,z,2.9,1.4,3.7,[.35,.9,1],1.5*recent,0,0,0,recent*.55,{shadow:false,surface:10,seed:damageAge*40});
 if(inv>0)draw(orb,x,y,z,2.8,1.2,3.6,PAL.cyan,.35,0,0,0,.03+Math.sin(gfx.time*20)*.01,{shadow:false});
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
}
// ---------- Модели врагов ----------
// Технические блоки на поверхности (вентиляция, люки, трубы) — делают крупные корпуса живыми.
function addGreebles(b,{x=0,y=0,z=0,w=1,d=1,n=8,seed=1,color=PAL.ashDark,alt=PAL.steel,mirror=false}={}){const rnd=seededRandom(seed);for(let i=0;i<n;i++){const gx=x+(rnd()-.5)*2*w,gz=z+(rnd()-.5)*2*d,k=rnd();if(k<.45)b.add(G.box,{x:gx,y:y+.03,z:gz,sx:.08+rnd()*.18,sy:.03+rnd()*.06,sz:.08+rnd()*.25,color:rnd()<.7?color:alt,rough:.6,metal:.7,mirror});else if(k<.75)b.add(G.cyl8,{x:gx,y:y+.04,z:gz,sx:.03+rnd()*.05,sy:.03+rnd()*.05,sz:.12+rnd()*.3,rx:rnd()<.5?Math.PI/2:0,color:alt,rough:.4,metal:.9,mirror});else{for(let j=0;j<3;j++)b.add(G.box,{x:gx,y:y+.02,z:gz+j*.08,sx:.14,sy:.015,sz:.02,color,rough:.7,metal:.5,mirror})}}}
function addStripe(b,{x=0,y=0,z=0,w=.3,d=.03,color=PAL.rust,rz=0,mirror=false}={}){b.add(G.box,{x,y:y+.005,z,sx:w,sy:.012,sz:d,rz,color,rough:.75,metal:.3,mirror})}
// ---- Art Pass: небольшие helpers для узнаваемых силуэтных деталей (используются по 3+ типам) ----
function addAntenna(b,{x=0,y=0,z=0,len=.5,color=PAL.steel,tip=null,mirror=false}={}){b.add(G.cyl8,{x,y,z,sx:.012,sy:.012,sz:len,rx:Math.PI/2,color,rough:.4,metal:.9,mirror});if(tip)b.add(G.sphereLow,{x,y,z:z+len*.52,s:.035,color:tip,glow:2.2,rough:.4,metal:0,mirror})}
function addBarrelRing(b,{x=0,y=0,z=0,r=.14,color=PAL.steel,mirror=false}={}){b.add(G.torusThin,{x,y,z,s:r,rx:Math.PI/2,color,rough:.35,metal:.9,mirror})}
const enemyBuilders={
 scout(b){const H=PAL.ashHull,D=PAL.ashDark;b.add(G.cyl,{z:-.5,sx:.22,sy:.2,sz:2.1,color:H,rough:.45,metal:.8});b.add(G.cone,{z:-3,sx:.22,sy:.2,sz:.5,rx:Math.PI,color:PAL.steel,rough:.3,metal:.9});b.add(G.fin,{x:.5,y:0,z:1.1,sx:.7,sy:.9,sz:.5,rz:-1.2,color:PAL.ashPlate,rough:.5,metal:.75,mirror:true});b.add(G.fin,{y:.2,z:1.2,sx:.5,sy:.6,sz:.4,color:PAL.ashPlate,rough:.5,metal:.75});b.add(G.bevel,{y:.15,z:-.6,sx:.14,sy:.1,sz:.5,color:D,rough:.4,metal:.7});b.add(G.cyl,{z:1.6,sx:.2,sy:.2,sz:.3,color:D,rough:.55,metal:.8});b.add(G.cyl8,{x:.55,y:-.1,z:-1.4,sx:.04,sy:.04,sz:.7,color:PAL.steel,rough:.4,metal:.9,mirror:true});
  // sensor spine + разведывательная антенна + боковые манёвровые дюзы
  b.add(G.bevelThin,{y:.16,z:.2,sx:.06,sy:.05,sz:1.6,color:PAL.steel,rough:.3,metal:.9});addAntenna(b,{y:.22,z:-1,len:.6,tip:PAL.cyan});for(const s of [-1,1])b.add(G.cyl8,{x:s*.24,y:0,z:.4,sx:.03,sy:.03,sz:.12,rx:Math.PI/2,color:D,rough:.5,metal:.7,mirror:s>0})},
 fighter(b){const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate;b.add(G.wedge,{sx:.8,sy:.6,sz:.9,color:H,rough:.45,metal:.8});b.add(G.wedge,{y:.2,z:-.2,sx:.45,sy:.5,sz:.7,color:P,rough:.4,metal:.8});b.add(G.fin,{x:1.05,y:0,z:.2,sx:1,sy:1.3,sz:.6,rz:-1.5,color:H,rough:.5,metal:.75,mirror:true});b.add(G.bevelThin,{x:1.75,y:-.02,z:-.6,sx:.08,sy:.06,sz:.55,color:D,rough:.5,metal:.8,mirror:true});b.add(G.cyl8,{x:.5,y:-.2,z:-1.7,sx:.07,sy:.07,sz:.6,color:PAL.steel,rough:.35,metal:.9,mirror:true});b.add(G.cyl,{x:.6,y:-.05,z:1.3,sx:.26,sy:.26,sz:.6,color:D,rough:.55,metal:.8,mirror:true});b.add(G.sphere,{y:.32,z:-.9,sx:.22,sy:.16,sz:.5,color:PAL.glass,rough:.1,metal:.9});b.add(G.bevelThin,{x:.4,y:-.35,z:.4,sx:.15,sy:.03,sz:.5,color:PAL.rust,rough:.7,metal:.5,mirror:true});
  // layered wing armor + отдельные стволы + wingtip-огни + шов кабины
  b.add(G.bevelThin,{x:1.4,y:.02,z:.35,sx:.35,sy:.05,sz:.4,rz:-.3,color:D,rough:.5,metal:.8,mirror:true});for(const s of [-1,1])b.add(G.cyl8,{x:s*.5,y:-.1,z:-1.05,sx:.025,sy:.025,sz:.5,color:PAL.steel,rough:.3,metal:.95,mirror:s>0});b.add(G.sphereLow,{x:1.85,y:0,z:-.6,s:.04,color:[.3,1,.5],glow:2,rough:.4,metal:0});b.add(G.bevelThin,{y:.34,z:-.6,sx:.28,sy:.02,sz:.3,color:PAL.steel,rough:.4,metal:.85})},
 bomber(b){const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate;b.add(G.bevel,{sx:1.1,sy:.55,sz:1.5,color:H,rough:.5,metal:.75});b.add(G.sphere,{z:-1.6,sx:1,sy:.5,sz:.7,color:H,rough:.5,metal:.75});b.add(G.bevelThin,{y:.6,z:.2,sx:.9,sy:.05,sz:1.1,color:P,rough:.45,metal:.8});b.add(G.bevel,{x:.9,y:-.55,z:.1,sx:.4,sy:.28,sz:1.3,color:D,rough:.55,metal:.8,mirror:true});for(let j=0;j<3;j++){b.add(G.cyl8,{x:.9+(j-1)*.24,y:-.55,z:-1.2,sx:.09,sy:.09,sz:.3,color:PAL.steel,rough:.4,metal:.9,mirror:true})}b.add(G.fin,{y:.62,z:1.2,sx:.6,sy:.8,sz:.4,color:P,rough:.5,metal:.75});b.add(G.cyl,{x:1.2,y:.05,z:1.5,sx:.38,sy:.38,sz:.65,color:D,rough:.55,metal:.8,mirror:true});b.add(G.bevelThin,{x:.45,y:.3,z:-.8,sx:.25,sy:.15,sz:.35,color:PAL.glass,rough:.1,metal:.9,mirror:true});addGreebles(b,{y:.65,w:.7,d:.9,n:10,seed:3});addStripe(b,{y:.65,z:.6,w:.85,d:.05,color:PAL.rust});for(let j=0;j<4;j++)b.add(G.box,{x:1.12,y:.2,z:-.9+j*.5,sx:.02,sy:.12,sz:.15,color:D,rough:.6,metal:.7,mirror:true});
  // видимый бомбовый отсек снизу + внешние подвесы боеприпасов + вторая (жёлтая) предупредительная полоса
  b.add(G.box,{y:-.3,z:-.2,sx:.7,sy:.04,sz:1,color:[.05,.05,.06],rough:.7,metal:.5});for(let j=0;j<3;j++)b.add(G.cyl,{x:(j-1)*.4,y:-.42,z:-.2,sx:.13,sy:.13,sz:.4,color:D,rough:.5,metal:.7});addStripe(b,{y:.6,z:.35,w:.85,d:.05,color:[.85,.72,.25]})},
 sniper(b){const H=[.22,.25,.3],D=PAL.ashDark;b.add(G.wedge,{sx:1.1,sy:.32,sz:1.35,color:H,rough:.3,metal:.9});b.add(G.wedge,{sx:1.1,sy:.32,sz:1.35,rz:Math.PI,color:H,rough:.3,metal:.9});b.add(G.cyl8,{y:.15,z:-1.4,sx:.1,sy:.1,sz:2.2,color:PAL.steel,rough:.25,metal:.95});b.add(G.cyl,{y:.15,z:.7,sx:.2,sy:.2,sz:.5,color:D,rough:.4,metal:.85});b.add(G.box,{x:.7,y:0,z:1.3,sx:.4,sy:.03,sz:.15,color:D,rough:.4,metal:.8,mirror:true});
  // фокусирующие кольца ствола + опоры + кормовой энергоблок + рёбра охлаждения
  for(const zf of [-1,-.2,.7])addBarrelRing(b,{y:.15,z:zf,r:.16,color:[.35,.75,1]});for(const s of [-1,1])b.add(G.bevelThin,{x:s*.12,y:0,z:-.5,sx:.03,sy:.35,sz:.06,color:D,rough:.5,metal:.7,mirror:s>0});b.add(G.bevel,{y:.15,z:1.6,sx:.28,sy:.24,sz:.35,color:D,rough:.5,metal:.8});for(let j=0;j<3;j++)b.add(G.box,{y:.15+.16+j*0,z:1.55,sx:.3-j*.06,sy:.02,sz:.3,color:PAL.steel,rough:.4,metal:.85})},
 frigate(b){const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate;b.add(G.bevel,{sx:1.4,sy:.7,sz:1.9,color:H,rough:.55,metal:.75});b.add(G.bevel,{x:1.7,y:-.1,z:.2,sx:.5,sy:.85,sz:1.6,color:P,rough:.55,metal:.8,mirror:true});for(let j=0;j<3;j++)b.add(G.bevelThin,{y:.72+j*.1,z:-.4+j*.2,sx:1.2-j*.25,sy:.05,sz:1.3-j*.2,color:j%2?P:H,rough:.5,metal:.8});b.add(G.sphere,{y:1.05,z:.3,s:.42,color:[.12,.3,.36],rough:.2,metal:.6});b.add(G.bevel,{z:-2.2,sx:.9,sy:.45,sz:.5,color:P,rough:.5,metal:.8});b.add(G.cyl8,{x:.55,y:-.2,z:-2.6,sx:.1,sy:.1,sz:.5,color:PAL.steel,rough:.35,metal:.9,mirror:true});b.add(G.cyl,{x:.9,y:.1,z:2,sx:.38,sy:.38,sz:.55,color:D,rough:.55,metal:.8,mirror:true});b.add(G.cyl,{y:-.25,z:2,sx:.4,sy:.4,sz:.55,color:D,rough:.55,metal:.8});b.add(G.cyl,{x:1.7,y:.85,z:-.3,sx:.3,sy:.3,sz:.25,rx:Math.PI/2,color:D,rough:.5,metal:.85,mirror:true});b.add(G.cyl8,{x:1.7,y:1.1,z:-.9,sx:.08,sy:.08,sz:.6,color:PAL.steel,rough:.4,metal:.9,mirror:true});addGreebles(b,{y:.98,x:.7,w:.35,d:.9,n:9,seed:5,mirror:true});addGreebles(b,{x:2.2,y:.75,w:.12,d:1.2,n:8,seed:6,mirror:true});addStripe(b,{y:.98,z:1.3,w:1.1,d:.06,color:PAL.rust});addStripe(b,{y:.98,z:1.5,w:1.1,d:.03,color:[.08,.08,.09]});for(let j=0;j<5;j++)b.add(G.box,{x:1.45,y:-.2,z:-1.4+j*.7,sx:.02,sy:.3,sz:.2,color:D,rough:.6,metal:.7,mirror:true});for(let j=0;j<3;j++)b.add(G.box,{x:0,y:-.72,z:-1+j*.9,sx:.9,sy:.04,sz:.08,color:D,rough:.6,metal:.7});
  // мачта связи (мостик) + бортовые навигационные огни
  addAntenna(b,{y:1.28,z:.3,len:.7,tip:PAL.cyan});for(const s of [-1,1])b.add(G.sphereLow,{x:s*1.9,y:.2,z:.2,s:.05,color:s>0?[.3,1,.5]:[1,.3,.3],glow:2,rough:.4,metal:0})},
 swarm(b){b.add(G.sphere,{s:.55,color:PAL.ashDark,rough:.4,metal:.8});for(let i=0;i<3;i++)b.add(G.fin,{sx:.45,sy:.9,sz:.5,rz:i*2.094,z:.2,color:PAL.ashPlate,rough:.5,metal:.75});
  // усиленное свечение ядра + мелкие придатки между плавниками
  b.add(G.sphereLow,{s:.3,color:[.5,1,.9],glow:2.5,rough:.3,metal:0});for(let i=0;i<3;i++){const a=i*2.094+1.047;b.add(G.cone,{x:Math.cos(a)*.4,y:Math.sin(a)*.4,z:.1,sx:.05,sy:.05,sz:.3,ry:a,color:PAL.ashDark,rough:.5,metal:.6})}},
 reaper(b){const H=PAL.ashHull,D=PAL.ashDark;b.add(G.wedge,{sx:.5,sy:.4,sz:1.1,color:H,rough:.45,metal:.8});for(let j=0;j<4;j++){const t=j/3;b.add(G.bevelThin,{x:.6+t*1.1,y:0,z:-.2-t*1.5+j*.1,sx:.32,sy:.05,sz:.35,ry:-.2-t*.7,color:j%2?PAL.rust:H,rough:.5,metal:.75,mirror:true})}b.add(G.cyl,{z:1.2,sx:.25,sy:.25,sz:.45,color:D,rough:.55,metal:.8});b.add(G.sphere,{y:.25,z:-.6,sx:.18,sy:.12,sz:.35,color:PAL.glass,rough:.1,metal:.9});
  // открытый хребет вдоль спины + акцент цвета удара
  b.add(G.bevelThin,{y:.22,z:0,sx:.04,sy:.04,sz:1.7,color:[.6,.15,.1],rough:.3,metal:.6});for(let j=0;j<3;j++)b.add(G.sphereLow,{y:.22,z:-.5+j*.5,s:.025,color:PAL.orange,glow:1.8,rough:.4,metal:0})},
 hammer(b){const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate,R=PAL.rust;b.add(G.bevel,{z:-1.5,sx:1.5,sy:1.1,sz:1.1,color:P,rough:.6,metal:.7});for(let i=0;i<3;i++)b.add(G.bevelThin,{z:-2.7-i*.14,sx:1.3-i*.12,sy:.95-i*.1,sz:.08,color:i%2?R:P,rough:.65,metal:.65});b.add(G.bevel,{z:.6,sx:.85,sy:.6,sz:1.5,color:H,rough:.5,metal:.75});b.add(G.cyl8,{x:.9,y:.5,z:-1.5,sx:.12,sy:.12,sz:1.1,color:PAL.steel,rough:.4,metal:.9,mirror:true});b.add(G.cyl8,{x:.9,y:-.5,z:-1.5,sx:.12,sy:.12,sz:1.1,color:PAL.steel,rough:.4,metal:.9,mirror:true});b.add(G.cyl,{x:.55,y:0,z:2.2,sx:.4,sy:.4,sz:.5,color:D,rough:.55,metal:.8,mirror:true});b.add(G.fin,{y:.6,z:1.4,sx:.6,sy:.9,sz:.4,color:P,rough:.5,metal:.75});b.add(G.cone,{x:.7,y:0,z:-3.1,sx:.12,sy:.12,sz:.3,rx:Math.PI,color:PAL.steel,rough:.3,metal:.95,mirror:true});addGreebles(b,{y:1.12,z:-1.5,w:1.2,d:.9,n:10,seed:7});addGreebles(b,{y:.62,z:.6,w:.6,d:1.2,n:7,seed:8});addStripe(b,{y:1.12,z:-.6,w:1.4,d:.06,color:PAL.rust});addStripe(b,{y:1.12,z:-.4,w:1.4,d:.03,color:[.08,.08,.09]});for(let j=0;j<4;j++){b.add(G.box,{x:1.52,y:0,z:-2.2+j*.5,sx:.02,sy:.7,sz:.12,color:D,rough:.6,metal:.7,mirror:true})}for(const s of [-1,1])b.add(G.bevelThin,{x:s*.6,y:.62,z:1.4,sx:.25,sy:.05,sz:.6,color:PAL.rust,rough:.7,metal:.5});
  // усиление тарана: рёбра жёсткости на носовой плите + бортовое орудие сзади
  for(let j=0;j<3;j++)b.add(G.box,{y:1.12,z:-2.6+j*.3,sx:1.4,sy:.03,sz:.03,color:D,rough:.5,metal:.8});for(const s of [-1,1])b.add(G.cyl,{x:s*1.1,y:0,z:1.2,sx:.14,sy:.14,sz:.5,color:D,rough:.5,metal:.8,mirror:s>0})},
 lancer(b){const H=PAL.ashHull,D=PAL.ashDark;b.add(G.cyl8,{z:-1.6,sx:.12,sy:.12,sz:2.6,color:PAL.steel,rough:.25,metal:.95});b.add(G.cone,{z:-4.4,sx:.14,sy:.14,sz:.3,rx:Math.PI,color:[.7,.75,.8],rough:.2,metal:1});b.add(G.bevel,{z:.3,sx:.55,sy:.4,sz:.9,color:H,rough:.45,metal:.8});for(let i=0;i<4;i++)b.add(G.fin,{z:1,sx:.45,sy:.9,sz:.5,rz:i*Math.PI/2+Math.PI/4,color:PAL.ashPlate,rough:.5,metal:.75});b.add(G.cyl,{z:1.4,sx:.3,sy:.3,sz:.4,color:D,rough:.55,metal:.8});b.add(G.sphere,{y:.3,z:0,sx:.16,sy:.12,sz:.3,color:PAL.glass,rough:.1,metal:.9});
  // фокусирующие кольца длинного ствола + конденсаторный модуль сзади
  for(const zf of [-2.6,-1.6,-.6])addBarrelRing(b,{z:zf,r:.17,color:[.7,.3,1]});b.add(G.bevel,{z:1.7,sx:.24,sy:.24,sz:.3,color:D,rough:.5,metal:.8});b.add(G.sphereLow,{z:1.9,s:.08,color:[.7,.3,1],glow:2.2,rough:.4,metal:0})},
 miner(b){const H=[.36,.34,.3],D=PAL.ashDark,Y=[.85,.7,.15];b.add(G.bevel,{sx:.9,sy:.55,sz:1.2,color:H,rough:.6,metal:.7});b.add(G.bevel,{x:.55,y:-.6,z:0,sx:.4,sy:.35,sz:.55,color:D,rough:.6,metal:.7,mirror:true});b.add(G.box,{x:.55,y:-.3,z:-1.2,sx:.35,sy:.06,sz:.06,color:Y,rough:.6,metal:.3,mirror:true});b.add(G.box,{y:.6,z:-.9,sx:.9,sy:.06,sz:.08,color:Y,rough:.6,metal:.3});b.add(G.box,{y:.6,z:-.9,sx:.45,sy:.07,sz:.09,color:[.08,.08,.08],rough:.7,metal:.3});b.add(G.cyl8,{y:.7,z:.2,sx:.06,sy:.06,sz:1,rx:.6,color:PAL.steel,rough:.4,metal:.9});b.add(G.box,{y:1.3,z:-.5,sx:.12,sy:.12,sz:.3,color:D,rough:.6,metal:.7});b.add(G.cyl,{x:.6,y:.1,z:1.3,sx:.3,sy:.3,sz:.5,color:D,rough:.55,metal:.8,mirror:true});b.add(G.bevelThin,{x:.3,y:.35,z:-.6,sx:.2,sy:.15,sz:.3,color:PAL.glass,rough:.1,metal:.9,mirror:true});
  // сенсорная антенна + похожий на манипулятор коленчатый нос-держатель
  addAntenna(b,{y:1.4,z:-.5,len:.4,tip:Y});b.add(G.cyl8,{x:.2,y:-.2,z:-1.4,sx:.05,sy:.05,sz:.3,rz:.6,color:D,rough:.5,metal:.7});b.add(G.cyl8,{x:.35,y:-.32,z:-1.65,sx:.04,sy:.04,sz:.22,rz:1.2,color:D,rough:.5,metal:.7})},
 shepherd(b){const H=PAL.ashHull,D=PAL.ashDark;b.add(G.sphere,{sx:1,sy:.7,sz:1.3,color:H,rough:.45,metal:.8});b.add(G.cyl8,{y:.9,sx:.08,sy:.08,sz:.5,rx:Math.PI/2,color:PAL.steel,rough:.4,metal:.9});for(let i=0;i<3;i++)b.add(G.cyl8,{x:Math.cos(i*2.1)*.5,y:.7,z:Math.sin(i*2.1)*.5,sx:.03,sy:.03,sz:.45,rx:Math.PI/2+.3,rz:i,color:PAL.steel,rough:.4,metal:.9});b.add(G.cyl,{x:.7,y:-.1,z:1.2,sx:.3,sy:.3,sz:.5,color:D,rough:.55,metal:.8,mirror:true});b.add(G.bevelThin,{x:1.1,y:0,z:0,sx:.3,sy:.05,sz:.9,color:PAL.ashPlate,rough:.5,metal:.75,mirror:true});
  // командный узел связи: приподнятая мачта с ярким узлом + кольцо-излучатель поля
  addAntenna(b,{y:1.15,z:0,len:.6,tip:[.4,1,.6]});b.add(G.torusThin,{y:.9,s:.65,rx:Math.PI/2,color:[.3,1,.7],glow:1.2,rough:.3,metal:0})},
 leech(b){const O=[.32,.2,.36],D=[.16,.08,.18];b.add(G.sphere,{z:-.6,s:.55,color:O,rough:.35,metal:.5});b.add(G.sphere,{z:.2,s:.45,color:O,rough:.35,metal:.5});b.add(G.sphere,{z:.85,s:.35,color:O,rough:.35,metal:.5});for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;b.add(G.cone,{x:Math.cos(a)*.45,y:Math.sin(a)*.45,z:-1.5,sx:.1,sy:.1,sz:.6,rx:Math.PI,color:D,rough:.4,metal:.6})}b.add(G.cyl,{z:1.3,sx:.18,sy:.18,sz:.3,color:D,rough:.5,metal:.7});
  // неровные шипы по сегментам тела + светящиеся присоски у "рта"
  for(let i=0;i<5;i++){const a=i*1.256+.3;b.add(G.cone,{x:Math.cos(a)*.5,y:Math.sin(a)*.5,z:-.1,sx:.04,sy:.04,sz:.3+((i*37)%5)*.05,ry:a,rx:Math.PI/2,color:D,rough:.5,metal:.4})}for(let i=0;i<3;i++){const a=i*2.094;b.add(G.sphereLow,{x:Math.cos(a)*.3,y:Math.sin(a)*.3,z:1.35,s:.06,color:[.9,.3,1],glow:1.8,rough:.4,metal:0})}},
 missileboat(b){const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate;b.add(G.wedge,{sx:.7,sy:.5,sz:1.2,color:H,rough:.45,metal:.8});b.add(G.bevel,{x:1.3,y:0,z:.1,sx:.5,sy:.55,sz:1.1,color:P,rough:.5,metal:.8,mirror:true});for(let r=0;r<2;r++)for(let c=0;c<3;c++){b.add(G.cyl8,{x:1.3+(c-1)*.28,y:(r-.5)*.3,z:-1.05,sx:.1,sy:.1,sz:.15,color:D,rough:.5,metal:.8,mirror:true});b.add(G.cone,{x:1.3+(c-1)*.28,y:(r-.5)*.3,z:-1.25,sx:.07,sy:.07,sz:.12,rx:Math.PI,color:PAL.steel,rough:.3,metal:.9,mirror:true})}b.add(G.bevelThin,{x:1.3,y:.6,z:.1,sx:.5,sy:.03,sz:1.1,color:H,rough:.5,metal:.8,mirror:true});b.add(G.cyl,{x:.5,y:-.05,z:1.6,sx:.28,sy:.28,sz:.5,color:D,rough:.55,metal:.8,mirror:true});b.add(G.sphere,{y:.3,z:-.7,sx:.2,sy:.14,sz:.4,color:PAL.glass,rough:.1,metal:.9});addGreebles(b,{x:1.3,y:.63,w:.4,d:.9,n:6,seed:11,mirror:true});addStripe(b,{x:1.3,y:.63,z:-.7,w:.45,d:.04,color:PAL.rust,mirror:true});
  // компактный радар (сразу видно, что это ракетоносец, а не истребитель) + индикатор перезарядки
  b.add(G.cyl8,{y:.75,z:.4,sx:.03,sy:.03,sz:.25,rx:Math.PI/2,color:PAL.steel,rough:.4,metal:.9});b.add(G.bevelThin,{y:.9,z:.4,sx:.18,sy:.02,sz:.14,color:PAL.steel,rough:.3,metal:.95});b.add(G.sphereLow,{x:1.3,y:.63,z:-1.3,s:.05,color:PAL.orange,glow:1.6,rough:.4,metal:0})},
 inquisitor(b){const H=[.24,.2,.28],D=PAL.ashDark,P=[.32,.28,.36];b.add(G.wedge,{sx:.9,sy:.6,sz:1.1,color:H,rough:.4,metal:.85});b.add(G.finThick,{y:.35,z:.3,sx:1.3,sy:2.1,sz:.5,color:P,rough:.4,metal:.85});b.add(G.finThick,{y:-.3,z:.5,sx:.9,sy:1.2,sz:.5,rz:Math.PI,color:P,rough:.4,metal:.85});b.add(G.torus,{z:-2.2,s:.55,color:PAL.steel,rough:.3,metal:.95});b.add(G.cyl8,{z:-1.7,sx:.15,sy:.15,sz:.9,color:D,rough:.4,metal:.85});b.add(G.bevelThin,{x:1.1,y:.1,z:.4,sx:.5,sy:.04,sz:.7,rz:.3,color:H,rough:.4,metal:.85,mirror:true});b.add(G.cyl,{x:.55,y:0,z:1.5,sx:.28,sy:.28,sz:.5,color:D,rough:.55,metal:.8,mirror:true});
  // узлы-эмиттеры барьера на кончиках пилонов (визуальный источник фиолетового поля)
  b.add(G.sphereLow,{y:1.35,z:.55,s:.09,color:[.7,.25,1],glow:2,rough:.3,metal:0});b.add(G.sphereLow,{y:-1.05,z:.75,s:.07,color:[.7,.25,1],glow:2,rough:.3,metal:0})},
 carrier(b){const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate;b.add(G.bevel,{y:-.2,sx:1,sy:.45,sz:1.9,color:H,rough:.55,metal:.75});b.add(G.bevel,{y:.3,sx:1.35,sy:.12,sz:2.2,color:P,rough:.5,metal:.8});b.add(G.box,{y:.15,z:-1.9,sx:.9,sy:.2,sz:.3,color:[.02,.03,.04],rough:.8,metal:.3});b.add(G.bevel,{x:.9,y:.75,z:1.2,sx:.3,sy:.4,sz:.5,color:P,rough:.5,metal:.8});b.add(G.cyl8,{x:.9,y:1.3,z:1.2,sx:.04,sy:.04,sz:.5,rx:Math.PI/2,color:PAL.steel,rough:.4,metal:.9});for(let j=0;j<5;j++)b.add(G.box,{x:1.36,y:0,z:-1.2+j*.6,sx:.06,sy:.22,sz:.2,color:D,rough:.6,metal:.7,mirror:true});b.add(G.cyl,{x:.7,y:-.2,z:2.2,sx:.32,sy:.32,sz:.5,color:D,rough:.55,metal:.8,mirror:true});b.add(G.cyl,{y:-.2,z:2.2,sx:.32,sy:.32,sz:.5,color:D,rough:.55,metal:.8});addGreebles(b,{y:.42,x:-.6,w:.5,d:1.6,n:9,seed:9});for(let j=0;j<6;j++)addStripe(b,{y:.42,z:-1.6+j*.6,w:.9,d:.03,color:[.85,.75,.3]});addStripe(b,{y:.42,x:0,w:.04,d:2,color:[.85,.75,.3]});for(let j=0;j<4;j++)b.add(G.box,{x:1,y:-.5,z:-1.2+j*.7,sx:.15,sy:.12,sz:.2,color:D,rough:.6,metal:.7,mirror:true});
  // командная мачта + доп. броня по бортам корпуса (самый детальный обычный враг)
  addAntenna(b,{y:1.35,z:1.2,len:.6,tip:PAL.cyan});for(const s of [-1,1])b.add(G.bevelThin,{x:s*1.05,y:-.15,z:0,sx:.06,sy:.35,sz:1.5,color:D,rough:.6,metal:.7,mirror:s>0})}
};
for(const k in enemyBuilders){const b=new ModelBuilder();enemyBuilders[k](b);models[k]=b.mesh({surface:10,rough:.5,metal:.8})}
// Динамические элементы: двигатели, огни, оружие, спецэффекты класса.
function enemyDynamic(e,c,d){
 const stunned=e.stun>0,eng=stunned?.15:1,glowCol=e.elite?[.45,1,.88]:c,pulse=.8+Math.sin(gfx.time*6+e.seed)*.2;
 const engine=(x,y,z,r)=>{gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(tube,x,y,z,r,r,.03,glowCol,2.5*eng,0,0,0,1,{shadow:false});draw(orb,x,y,z+.25,r*.7,r*.7,r*1.6,glowCol,3*eng,0,0,0,.9,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)};
 switch(e.type){
  case 'scout':engine(0,0,1.92,.19);draw(cube,0,.24,-.5,.025,.02,1.8,c,1.2,0,0,0,1,{shadow:false});break;
  case 'fighter':for(const s of [-1,1]){engine(s*.6,-.05,1.92,.24);draw(orb,s*.5,-.2,-2.35,.06,.06,.06,c,1.5)}break;
  case 'bomber':for(const s of [-1,1]){engine(s*1.2,.05,2.17,.35);for(let j=0;j<3;j++)draw(orb,s*(.9+(j-1)*.24),-.55,-1.55,.06,.06,.06,c,1.4*pulse)}break;
  case 'sniper':for(const s of [-1,1])draw(cube,s*.5,0,1.2,.25,.02,.03,c,1.6*eng,0,0,0,1,{shadow:false});draw(orb,0,.15,-3.6,.08,.08,.12,c,e.charge>0?3:.5);if(e.charge>0)for(let i=0;i<5;i++)draw(haloRing,0,.15,-.6-i*.5,.2,.2,1,c,1.5+Math.sin(gfx.time*30+i)*.5);break;
  case 'frigate':for(const s of [-1,1]){engine(s*.9,.1,2.57,.36)}engine(0,-.25,2.57,.38);draw(orb,0,1.05,.3,.46,.46,.46,[.3,.8,.9],.6*pulse,0,0,0,.6,{shadow:false});for(const s of [-1,1])draw(orb,s*1.7,1.1,-1.5,.08,.08,.08,c,1.5);break;
  case 'swarm':draw(orb,0,0,-.45,.16,.16,.16,c,3*pulse);engine(0,0,.55,.15);break;
  case 'reaper':engine(0,0,1.67,.24);for(const s of [-1,1])for(let j=0;j<4;j++){const t=j/3;draw(cube,s*(.6+t*1.1),0,-.2-t*1.5+j*.1,.34,.015,.06,c,1.2,0,-s*(.2+t*.7),0,1,{shadow:false})}break;
  case 'hammer':for(const s of [-1,1])engine(s*.55,0,2.72,.38);for(const s of [-1,1]){draw(orb,s*.9,.5,-2.6,.1,.1,.1,c,1.2);draw(orb,s*.9,-.5,-2.6,.1,.1,.1,c,1.2)}break;
  case 'lancer':engine(0,0,1.82,.28);{const ch=e.charge>0?1.5+Math.sin(gfx.time*25)*.5:.25;for(let i=0;i<4;i++)draw(models.torusThin,0,0,-1.2-i*.7,.32,.32,.32,c,ch*(1+i*.2),0,0,0,1,{shadow:false});draw(orb,0,0,-4.6,.1,.1,.2,c,ch*2)}break;
  case 'miner':for(const s of [-1,1]){engine(s*.6,.1,1.82,.28);for(let i=0;i<3;i++)draw(orb,s*.55,-.75,-.4+i*.35,.14,.14,.14,[.25,.27,.3],0,0,0,0,1,{rough:.4,metal:.8});draw(orb,s*.55,-.75,-.4,.05,.05,.05,PAL.red,2*pulse)}draw(orb,0,1.3,-.8,.06,.06,.06,[.9,.75,.2],Math.sin(gfx.time*5)>0?2:.2);break;
  case 'shepherd':for(const s of [-1,1])engine(s*.7,-.1,1.72,.28);draw(haloRing,0,1.05,0,.85,.85,1,c,1.2*pulse,Math.PI/2,gfx.time*.8,0,1,{shadow:false});draw(models.torusThin,0,1.05,0,.85,.85,.85,PAL.steel,0,Math.PI/2,0,0,1,{rough:.3,metal:.95});draw(orb,0,1.05,0,.2,.2,.2,c,2*pulse);break;
  case 'leech':{const p2=.6+Math.sin(gfx.time*9+e.seed)*.4;for(const [z,s] of [[-.6,.6],[.2,.5],[.85,.4]])draw(orb,0,0,z,s*.55,s*.55,s*.55,[.9,.3,1],p2*1.2,0,0,0,.4,{shadow:false});for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;draw(orb,Math.cos(a)*.45,Math.sin(a)*.45,-2.1,.05,.05,.05,[.9,.3,1],2*p2)}engine(0,0,1.62,.16)}break;
  case 'missileboat':for(const s of [-1,1]){engine(s*.5,-.05,2.12,.26);const reload=Math.max(0,1-e.fire/4);draw(cube,s*1.3,.66,.1,.45,.02,.9,c,reload*1.5,0,0,0,1,{shadow:false})}break;
  case 'inquisitor':{const bar=e.barrier>0?1.8:.5,ring=gfx.time*1.4;for(const s of [-1,1])engine(s*.55,0,2.02,.26);draw(haloRing,0,0,-2.2,.55,.55,1,c,bar*pulse,0,0,ring,1,{shadow:false});for(let i=0;i<3;i++){const a=ring*.7+i*2.094;draw(orb,Math.cos(a)*.9,.35+Math.sin(a)*.5,.3,.12,.12,.12,c,bar*1.2)}draw(cube,0,2.4,.55,.02,.4,.1,c,1.5*bar,0,0,0,1,{shadow:false})}break;
  case 'carrier':{for(const s of [-1,1])engine(s*.7,-.2,2.72,.31);engine(0,-.2,2.72,.31);const open=e.special<2?1.5+Math.sin(gfx.time*8)*.5:.5;draw(cube,0,.15,-2.15,.85,.02,.05,c,open,0,0,0,1,{shadow:false});for(let j=0;j<5;j++)for(const s of [-1,1])draw(cube,s*1.4,0,-1.2+j*.6,.02,.15,.08,c,(Math.floor(gfx.time*3+j)%5===0?2:.6),0,0,0,1,{shadow:false});draw(orb,.9,1.55,1.2,.05,.05,.05,PAL.red,Math.sin(gfx.time*4)>0?2:.2)}break;
 }
 // Elite/mini: узнаваемость через recognition-lights поверх базовой модели типа,
 // без новых mesh — лёгкая доработка существующих маркеров (п.27/28).
 if(e.elite){for(const s of [-1,1])draw(models.fin,s*.9,.3,1,.4,.6,.5,[.2,.6,.6],0,0,0,-s*.9,1,{rough:.4,metal:.85});draw(cube,0,.55,.4,.02,.25,.6,[.45,1,.88],1.5,0,0,0,1,{shadow:false});draw(cube,0,.55,1,.015,.015,.5,[.45,1,.88],1.2+Math.sin(gfx.time*8)*.4,0,0,0,1,{shadow:false})}
 if(e.mini){for(let i=0;i<3;i++)draw(cube,(i-1)*.35,.9,.6,.02,.5+i%2*.2,.02,PAL.steel,0,0,0,0,1,{rough:.4,metal:.9});draw(orb,0,1.5,.6,.08,.08,.08,PAL.red,Math.sin(gfx.time*6)>0?2.5:.3);for(const s of [-1,1])draw(cube,s*.8,.2,-.5,.45,.02,.12,[1,.85,.3],1,0,0,0,1,{shadow:false});draw(orb,-.15,1.62,.6,.03,.03,.03,PAL.red,Math.sin(gfx.time*6+1)>0?2:.2,0,0,0,1,{shadow:false})}
}
models.fin=simpleMesh(G.fin,{rough:.5,metal:.8});models.torusThin=simpleMesh(G.torusThin,{rough:.3,metal:.9});models.torus=simpleMesh(G.torus,{rough:.35,metal:.9});models.bevel=simpleMesh(G.bevel,{rough:.5,metal:.8});models.cone=simpleMesh(G.cone,{rough:.4,metal:.85});models.sphereLow=simpleMesh(G.sphereLow,{rough:.5,metal:.5});
// Только визуальный масштаб модели врага на мобильном (мелкие враги плохо читались на телефоне).
// Не влияет на e.r/d.r/collision — hitbox и вся геометрия попаданий остаются как есть.
const MOBILE_ENEMY_VISUAL_SCALE=1.3;
renderEnemy=function(e){
 const d=enemyDefs[e.type]||enemyDefs.fighter,c=e.elite?[.45,1,.88]:d.color,baseSize=d.size*(e.mini?1.3:1),size=baseSize*MOBILE_ENEMY_VISUAL_SCALE,m=models[e.type]||models.fighter;
 const dmg=1-e.hp/e.maxHp,flash=e.hitTime>0?e.hitTime*5:0;
 pushMatrix(matrix(e.x,e.y,e.z,size,size,size,0,Math.PI,-e.vx*.025));
 drawModel(m,0,0,0,1,0,0,0,{damage:dmg,seed:e.seed,emit:[flash+c[0]*.05,flash*.45+c[1]*.05,flash*.1+c[2]*.05],tint:e.elite?[.9,1,1]:null});
 enemyDynamic(e,c,d);
 // габаритные огни: делают силуэт читаемым на тёмном фоне
 {const blink=Math.sin(gfx.time*5+e.seed*3)>.2?2.2:.6,ext=Math.max(.9,d.r/d.size*.55);for(const s of [-1,1])draw(orb,s*ext,0,.2,.06,.06,.06,s>0?[.3,1,.5]:[1,.3,.3],blink,0,0,0,1,{shadow:false});draw(orb,0,.35,1.1,.05,.05,.05,c,blink,0,0,0,1,{shadow:false})}
 popMatrix();
 if(e.shield>0){gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(orb,e.x,e.y,e.z,e.r*1.1,e.r*.65,e.r*1.25,[.3,.8,.95],.9,0,0,0,.09+flash*.05,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
 if(e.barrier>0){gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(orb,e.x,e.y,e.z,e.r*1.6,e.r,e.r*1.4,[.7,.25,1],.8,0,0,0,.14+Math.sin(gfx.time*12)*.03,{shadow:false,surface:10,seed:e.seed});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
 if(e.stun>0){fxSparks(e.x+fxRand(-.5,.5)*e.r,e.y+fxRand(-.5,.5)*e.r,e.z,[.5,.9,1],1,4,.2,.05)}
 if(e.type==='leech'&&leechDrain&&Math.hypot(e.x-px,e.y-py,e.z-3)<13){gl.depthMask(false);line3(e,{x:px,y:py,z:3},[.8,.25,1],.035+Math.sin(gfx.time*20)*.01,.6);gl.depthMask(true)}
 if(e.type==='shepherd'){gl.depthMask(false);for(const o of enemies)if(o.owner===e&&o.hp>0)line3({x:e.x,y:e.y+1,z:e.z},o,c,.012,.25);gl.depthMask(true)}
 if(e.z>-75){const glow=e.elite?[.45,1,.88]:c;addLight(e.x,e.y,e.z+size*1.8,glow[0],glow[1],glow[2],.9*size,6*size);addLight(e.x,e.y+size,e.z-size,.9,.9,1,.35*size,5*size)}
 fxDamageEmit(e.x,e.y,e.z,e.r,dmg,1/60,e.vx,e.vy,e.vz);
 if(e.hitTime>0&&e.hitTime>.13)addFlashLight(e.x,e.y,e.z,[1,.7,.4],2.5,e.r*3,.1);
};
// ---------- Боссы ----------
(function buildBosses(){
 const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate,S=PAL.steel;
 let b=new ModelBuilder(); // Цербер — три «головы»
 b.add(G.bevel,{sx:1.2,sy:.7,sz:2,color:H,rough:.5,metal:.8});b.add(G.bevel,{z:-1.8,sx:.7,sy:.5,sz:.9,color:P,rough:.5,metal:.8});
 b.add(G.bevel,{x:1.9,y:-.1,z:-.6,sx:.6,sy:.5,sz:1.3,color:P,rough:.5,metal:.8,mirror:true});b.add(G.cyl8,{x:1.9,y:0,z:-2.2,sx:.16,sy:.16,sz:.8,color:S,rough:.3,metal:.95,mirror:true});b.add(G.cyl8,{y:.1,z:-3,sx:.2,sy:.2,sz:.7,color:S,rough:.3,metal:.95});
 b.add(G.bevel,{x:1.2,y:.05,z:.3,sx:.9,sy:.15,sz:.9,color:H,rough:.5,metal:.8,mirror:true});for(const x of [.6,1.5])b.add(G.cyl,{x,y:-.1,z:2.1,sx:.36,sy:.36,sz:.55,color:D,rough:.55,metal:.8,mirror:true});
 b.add(G.finThick,{y:.5,z:1.2,sx:.9,sy:1.3,sz:.4,color:P,rough:.5,metal:.8});for(const s of [-1,1])b.add(G.box,{x:s*.8,y:.3,z:-.5,sx:.4,sy:.15,sz:.5,color:PAL.glass,rough:.1,metal:.9});addGreebles(b,{y:.7,w:1,d:1.6,n:14,seed:13});addGreebles(b,{x:1.9,y:.4,z:-.6,w:.5,d:1.1,n:6,seed:14,mirror:true});addStripe(b,{y:.7,z:1.4,w:1.1,d:.07,color:PAL.rust});
 // Art Pass: командная антенна + вторичные турели + доп. броне-заклёпки на стыках голов
 addAntenna(b,{y:1.2,z:1,len:.8,color:S,tip:PAL.orange});for(const x of [.9,1.9])b.add(G.cyl,{x,y:.55,z:.1,sx:.16,sy:.16,sz:.22,color:D,rough:.5,metal:.8,mirror:true});for(const zl of [-.9,0,.9])addStripe(b,{x:1.9,y:.35,z:-.6+zl*.3,w:.5,d:.03,color:[.2,.2,.22]});
 models.cerberus=b.mesh({surface:10,rough:.5,metal:.8});
 b=new ModelBuilder();for(const s of [-1,1])for(let i=0;i<4;i++){b.add(G.bevelThin,{x:s*1.05,y:.72,z:-1.3+i*.75,sx:.5,sy:.06,sz:.33,color:i%2?P:H,rough:.5,metal:.8});b.add(G.bevelThin,{x:s*2.2,y:.3,z:-1+i*.6,sx:.08,sy:.45,sz:.28,color:P,rough:.5,metal:.8})}b.add(G.bevelThin,{y:.85,z:-.3,sx:.6,sy:.06,sz:1.4,color:P,rough:.5,metal:.8});
 models.cerberusArmor=b.mesh({surface:10,rough:.55,metal:.75});
 b=new ModelBuilder(); // Левиафан — носитель-кит
 b.add(G.bevel,{sx:1.3,sy:.6,sz:3.4,color:H,rough:.5,metal:.8});b.add(G.sphere,{z:-3.2,sx:1.25,sy:.55,sz:1,color:H,rough:.5,metal:.8});b.add(G.box,{y:-.05,z:-3.9,sx:.75,sy:.25,sz:.3,color:[.02,.03,.04],rough:.8,metal:.3});
 for(let i=0;i<7;i++)b.add(G.torusThin,{z:-2.2+i*.8,sx:1.35,sy:.65,sz:1,color:P,rough:.5,metal:.85});b.add(G.bevel,{x:2.3,y:.1,z:.3,sx:.45,sy:.35,sz:2.2,color:P,rough:.5,metal:.8,mirror:true});b.add(G.box,{x:1.7,y:.1,z:.3,sx:.7,sy:.08,sz:.3,color:D,rough:.6,metal:.7,mirror:true});
 b.add(G.fin,{y:.55,z:2.4,sx:.9,sy:1.4,sz:.5,color:P,rough:.5,metal:.8});b.add(G.fin,{x:1.2,y:0,z:2.6,sx:.8,sy:1,sz:.5,rz:-1.9,color:P,rough:.5,metal:.8,mirror:true});addGreebles(b,{y:.6,w:1.1,d:2.8,n:18,seed:15});addGreebles(b,{x:2.3,y:.45,z:.3,w:.4,d:2,n:8,seed:16,mirror:true});for(let j=0;j<4;j++)addStripe(b,{y:.6,z:-1.8+j*1.2,w:1.2,d:.05,color:PAL.rust});for(const x of [-.7,0,.7])b.add(G.cyl,{x,y:-.15,z:3.6,sx:.4,sy:.4,sz:.6,color:D,rough:.55,metal:.8});
 // Art Pass: навигационные огни вдоль рёбер-обручей + мачта связи на спине
 for(let i=0;i<7;i++)b.add(G.sphereLow,{y:.68,z:-2.1+i*.8,s:.05,color:i%2?[.3,1,.5]:[1,.3,.3],glow:1.6,rough:.4,metal:0});addAntenna(b,{y:.95,z:1.5,len:.9,color:S,tip:[.3,1,.9]});
 models.leviathan=b.mesh({surface:10,rough:.5,metal:.8});
 b=new ModelBuilder(); // Фантом — стелс-стрела
 const F=[.13,.11,.17];b.add(G.wedge,{sx:1.7,sy:.28,sz:2.2,color:F,rough:.25,metal:.95});b.add(G.wedge,{sx:1.7,sy:.28,sz:2.2,rz:Math.PI,color:F,rough:.25,metal:.95});b.add(G.wedge,{y:.2,z:-.6,sx:.5,sy:.45,sz:1.2,color:[.18,.16,.22],rough:.2,metal:.95});
 b.add(G.fin,{x:1.6,y:0,z:1.8,sx:1.2,sy:.9,sz:.15,rz:-.9,color:F,rough:.25,metal:.95,mirror:true});b.add(G.fin,{x:1.6,y:0,z:1.8,sx:1.2,sy:.9,sz:.15,rz:-Math.PI+.9,color:F,rough:.25,metal:.95,mirror:true});for(const x of [.6,1.6])b.add(G.box,{x,y:0,z:2.6,sx:.3,sy:.06,sz:.3,color:D,rough:.5,metal:.8,mirror:true});
 // Art Pass: асимметричный энергетический шов (акцент silhouette, не greebles) — намеренно только с одной стороны
 b.add(G.bevelThin,{x:.6,y:.05,z:.4,sx:1.1,sy:.02,sz:.06,rz:-.15,color:[.5,.25,.9],glow:1.4,rough:.2,metal:0});
 models.phantom=b.mesh({surface:10,rough:.25,metal:.95});
 b=new ModelBuilder(); // Архонт — станция (фазы 1–2)
 const A=[.2,.16,.2],AP=[.28,.22,.27];b.add(G.cyl,{sx:4,sy:4,sz:2,color:A,rough:.45,metal:.85});b.add(G.cyl,{sx:2.5,sy:2.5,sz:3.2,color:AP,rough:.45,metal:.85});for(let i=0;i<12;i++){const a=i*Math.PI/6;b.add(G.bevel,{x:Math.cos(a)*8,y:Math.sin(a)*5,z:0,sx:2,sy:1.2,sz:2,rz:a,color:A,rough:.45,metal:.85});b.add(G.box,{x:Math.cos(a)*6,y:Math.sin(a)*3.6,z:0,sx:2.2,sy:.25,sz:.25,rz:a,color:AP,rough:.5,metal:.85});b.add(G.box,{x:Math.cos(a)*7,y:Math.sin(a)*4.5,z:2.1,sx:.5,sy:.3,sz:.15,rz:a,color:[1,.2,.45],glow:1.5,rough:.5,metal:0})}
 b.add(G.torusThin,{sx:9.5,sy:6.2,sz:1.5,color:AP,rough:.45,metal:.85});for(let i=0;i<6;i++){const a=i*Math.PI/3+.3;b.add(G.finThick,{x:Math.cos(a)*3.2,y:Math.sin(a)*3.2,z:1.5,sx:1.2,sy:2.4,sz:.5,rz:a-Math.PI/2,color:A,rough:.4,metal:.9})}
 // Art Pass: второе, более узкое концентрическое кольцо — усиливает "не-человеческую" симметрию
 b.add(G.torusThin,{sx:6.4,sy:4.1,sz:1,color:[1,.2,.45],glow:.6,rough:.4,metal:0});
 models.archonStation=b.mesh({surface:10,rough:.45,metal:.85});
 b=new ModelBuilder(); // Архонт — центральный корабль (фазы 3–4): корона
 b.add(G.sphere,{s:1,color:[.12,.08,.12],rough:.3,metal:.9});for(let i=0;i<6;i++){const a=i*Math.PI/3;b.add(G.bevel,{x:Math.cos(a)*1.4,y:Math.sin(a)*1.4,z:.6,sx:.35,sy:.9,sz:.5,rz:a-Math.PI/2,color:A,rough:.35,metal:.9});b.add(G.cone,{x:Math.cos(a)*2.1,y:Math.sin(a)*2.1,z:-.4,sx:.22,sy:.22,sz:1.1,rx:Math.PI,rz:a,color:AP,rough:.3,metal:.9})}
 b.add(G.cyl,{z:1.6,sx:.9,sy:.9,sz:.9,color:A,rough:.4,metal:.85});b.add(G.torusThin,{z:-.2,s:2.4,color:AP,rough:.35,metal:.9});
 // Art Pass: радиальные энергетические жилы от короны к ядру — глиф-подобные emissive-полосы
 for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;b.add(G.box,{x:Math.cos(a)*1.05,y:Math.sin(a)*1.05,z:.2,sx:.04,sy:.04,sz:.9,ry:a,color:[1,.2,.45],glow:1.8,rough:.3,metal:0})}
 models.archonShip=b.mesh({surface:10,rough:.35,metal:.9});
 // модули: генератор, броня, турель, бортовое орудие
 b=new ModelBuilder();b.add(G.cyl,{sx:.9,sy:.9,sz:1,color:H,rough:.5,metal:.8});b.add(G.cyl,{z:.9,sx:.5,sy:.5,sz:.35,color:D,rough:.5,metal:.8});for(const s of [-1,1])b.add(G.box,{x:s*.95,y:0,z:0,sx:.1,sy:.4,sz:.8,color:P,rough:.5,metal:.8});models.generator=b.mesh({surface:10,rough:.5,metal:.8});
 b=new ModelBuilder();b.add(G.bevel,{sx:2,sy:.8,sz:.6,color:P,rough:.55,metal:.75});for(let i=0;i<3;i++)b.add(G.bevelThin,{x:(i-1)*1.2,y:0,z:.62,sx:.5,sy:.7,sz:.06,color:i%2?PAL.rust:H,rough:.6,metal:.7});models.armor=b.mesh({surface:10,rough:.55,metal:.75});
 b=new ModelBuilder();b.add(G.bevel,{sx:.9,sy:.5,sz:.9,color:H,rough:.5,metal:.8});b.add(G.sphere,{y:.5,s:.5,color:P,rough:.45,metal:.85});for(const s of [-1,1])b.add(G.cyl8,{x:s*.2,y:.6,z:.9,sx:.09,sy:.09,sz:.9,color:S,rough:.3,metal:.95});models.turret=b.mesh({surface:10,rough:.5,metal:.8});
 b=new ModelBuilder();b.add(G.bevel,{sx:1,sy:.7,sz:1,color:P,rough:.5,metal:.8});b.add(G.cyl,{y:.3,z:1,sx:.35,sy:.35,sz:.9,color:D,rough:.5,metal:.85});b.add(G.cyl8,{y:.3,z:1.9,sx:.16,sy:.16,sz:.5,color:S,rough:.3,metal:.95});models.sidegun=b.mesh({surface:10,rough:.5,metal:.8});
})();
function renderBoss(b){
 const c=bossDefs[b.kind].color,dmg=1-b.hp/b.maxHp,flash=b.hitTime>0?b.hitTime*4:0,emitF=[flash,flash*.45,flash*.1];
 if(b.hidden){gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);pushMatrix(matrix(b.x,b.y,b.z,2.4,2.4,2.4,0,Math.PI,Math.sin(b.age)*.15));drawModel(models.phantom,0,0,0,1,0,0,0,{alpha:.06+Math.sin(gfx.time*7)*.03,shadow:false,tint:[.5,.25,.7],glowScale:0});popMatrix();gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
 else if(b.kind==='cerberus'){pushMatrix(matrix(b.x,b.y,b.z,3.5,3.5,3.5,0,Math.PI,0));drawModel(models.cerberus,0,0,0,1,0,0,0,{damage:dmg,seed:2.2,emit:emitF});if(b.phase<3)drawModel(models.cerberusArmor,0,0,0,1,0,0,0,{damage:dmg*.6,seed:3.1,emit:emitF});
  const rate=b.phase===3?1.6:1;gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const s of [-1,1])for(const x of [.6,1.5]){draw(tube,s*x,-.1,2.66,.33,.33,.03,c,2.5,0,0,0,1,{shadow:false});draw(orb,s*x,-.1,2.9,.25,.25,.9*rate,c,3,0,0,0,.9,{shadow:false})}for(const x of [-1.9,0,1.9])draw(orb,x,x?0:.1,x?-3:-3.7,.12,.12,.2,[1,.5,.2],b.fire<.3?3:.6,0,0,0,1,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);popMatrix();addLight(b.x,b.y,b.z+8,c[0],c[1],c[2],2.5,14)}
 else if(b.kind==='leviathan'){pushMatrix(matrix(b.x,b.y,b.z,2.9,2.9,2.9,0,Math.PI,0));drawModel(models.leviathan,0,0,0,1,0,0,0,{damage:dmg,seed:4.4,emit:emitF});const open=b.phase>=2?1.8:.5;draw(cube,0,-.05,-4.15,.7,.02,.05,c,open+Math.sin(gfx.time*5)*.3,0,0,0,1,{shadow:false});if(b.phase>=2)draw(orb,0,0,-3.6,.5,.35,.5,c,2.5,0,0,0,1,{shadow:false});gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const x of [-.7,0,.7]){draw(tube,x,-.15,4.22,.36,.36,.03,c,2.5,0,0,0,1,{shadow:false});draw(orb,x,-.15,4.5,.28,.28,1,c,3,0,0,0,.9,{shadow:false})}gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);popMatrix();addLight(b.x,b.y,b.z+11,c[0],c[1],c[2],2.5,16)}
 else if(b.kind==='phantom'){pushMatrix(matrix(b.x,b.y,b.z,2.4,2.4,2.4,0,Math.PI,Math.sin(b.age)*.15));drawModel(models.phantom,0,0,0,1,0,0,0,{damage:dmg,seed:5.5,emit:emitF});const sh=.7+Math.sin(gfx.time*3)*.3;for(const s of [-1,1]){draw(cube,s*1.2,0,.6,.9,.012,.02,c,1.6*sh,0,s*.55,0,1,{shadow:false});draw(cube,s*2.2,0,2.2,.02,.6,.02,c,1.6*sh,0,0,0,1,{shadow:false})}gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const x of [.6,1.6])for(const s of [-1,1])draw(orb,s*x,0,2.9,.2,.08,.7,c,3,0,0,0,.9,{shadow:false});draw(haloRing,0,0,0,2.2,1.4,1,c,.7,0,b.age*.4,0,.35,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);popMatrix();addLight(b.x,b.y,b.z+6,c[0],c[1],c[2],2,12)}
 else if(b.kind==='archon'){
  if(b.phase<=2){pushMatrix(matrix(b.x,b.y,b.z,1,1,1,0,0,gfx.time*.05));drawModel(models.archonStation,0,0,0,1,0,0,0,{damage:dmg*.5,seed:6.6,emit:emitF});draw(orb,0,0,1.5,1.6,1.6,1.2,c,1.5+Math.sin(gfx.time*2)*.5,0,0,0,1,{shadow:false});popMatrix();
   pushMatrix(matrix(b.x,b.y,b.z,1,1,1,0,0,-gfx.time*.08));draw(models.torusThin,0,0,2.5,5,3.4,1,c,1,0,0,0,1,{shadow:false});popMatrix();addLight(b.x,b.y,b.z+4,c[0],c[1],c[2],4,22)}
  else{pushMatrix(matrix(b.x,b.y,b.z,2,2,2,0,Math.PI,gfx.time*.3));drawModel(models.archonShip,0,0,0,1,0,0,0,{damage:dmg,seed:7.7,emit:emitF});const core=1.8+Math.sin(gfx.time*6)*.6+(b.phase===4?1:0);draw(orb,0,0,0,.78,.78,.78,c,core,0,0,0,1,{shadow:false});for(let i=0;i<6;i++){const a=i*Math.PI/3;draw(orb,Math.cos(a)*2.1,Math.sin(a)*2.1,-1.4,.12,.12,.12,c,2.5)}gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(orb,0,0,2.4,.6,.6,1.4,c,3,0,0,0,.9,{shadow:false});draw(orb,0,0,0,1.6,1.6,1.6,c,.6,0,0,0,.15,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);popMatrix();addLight(b.x,b.y,b.z+4,c[0],c[1],c[2],5,20)}
 }
 for(const m of b.modules)if(m.hp>0){const mf=m.hitTime>0?m.hitTime*4:0,md=1-m.hp/m.maxHp;const mm=models[m.kind]||models.turret;drawModel(mm,m.x,m.y,m.z,m.kind==='armor'?1.1:1,0,m.kind==='armor'?Math.atan2(m.dx,-(m.dy||1))*0:0,0,{damage:md,seed:m.id,emit:[mf,mf*.45,mf*.1]});
  if(m.kind==='generator'){draw(haloRing,m.x,m.y,m.z+1.3,1.1,1.1,1,PAL.cyan,1.5,0,0,gfx.time*2,1,{shadow:false});draw(orb,m.x,m.y,m.z+1.3,.45,.45,.3,PAL.cyan,2+Math.sin(gfx.time*5)*.5,0,0,0,1,{shadow:false});addLight(m.x,m.y,m.z+2,.25,.95,.88,1.2,7)}
  else if(m.kind==='armor')draw(orb,m.x,m.y,m.z+.7,.25,.25,.15,c,1.5,0,0,0,1,{shadow:false});
  else draw(orb,m.x,m.y+.6,m.z+1.9,.17,.17,.2,c,m.fire<.4?3:.8,0,0,0,1,{shadow:false});
  fxDamageEmit(m.x,m.y,m.z,1.2,md,1/60)}
 if(bossProtected(b)){gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(orb,b.x,b.y,b.z,b.kind==='archon'?11:10,b.kind==='archon'?7:6,6,c,.5,0,0,0,.08+Math.sin(gfx.time*3)*.02,{shadow:false,surface:10,seed:gfx.time*.1});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
 fxDamageEmit(b.x,b.y,b.z,b.r,dmg,1/60);
 if(b.hitTime>.12)addFlashLight(b.x,b.y,b.z,[1,.7,.4],4,b.r*3,.1);
}
function renderBossFleetNew(){for(const b of bossFleet)renderBoss(b)}
// ---------- Структуры миссий ----------
(function buildStructures(){
 const H=PAL.ashHull,D=PAL.ashDark,P=PAL.ashPlate,S=PAL.steel;let b=new ModelBuilder();
 b.add(G.cyl,{sx:1.1,sy:1.1,sz:1.5,color:H,rough:.5,metal:.8});b.add(G.cyl,{z:1.5,sx:.6,sy:.6,sz:.3,color:D,rough:.5,metal:.8});for(let i=0;i<4;i++){const a=i*Math.PI/2;b.add(G.box,{x:Math.cos(a)*1.25,y:Math.sin(a)*1.25,z:-.2,sx:.12,sy:.12,sz:1.1,rz:a,color:P,rough:.5,metal:.8})}b.add(G.torusThin,{z:-1,s:1.3,color:S,rough:.3,metal:.95});
 models.node=b.mesh({surface:10,rough:.5,metal:.8});
 b=new ModelBuilder();b.add(G.sphere,{s:.5,color:[.16,.18,.2],rough:.5,metal:.8});for(let i=0;i<6;i++){const a=i*Math.PI/3;b.add(G.cone,{x:Math.cos(a)*.7,y:Math.sin(a)*.7,z:0,sx:.1,sy:.1,sz:.35,rx:Math.PI/2,rz:a+Math.PI/2,color:S,rough:.4,metal:.9})}b.add(G.cone,{z:-.75,sx:.1,sy:.1,sz:.35,rx:Math.PI,color:S,rough:.4,metal:.9});b.add(G.cone,{z:.75,sx:.1,sy:.1,sz:.35,color:S,rough:.4,metal:.9});
 models.mine=b.mesh({rough:.5,metal:.85});
 b=new ModelBuilder(); // союзный транспорт
 const T=[.36,.42,.48],TL=[.5,.55,.6];b.add(G.bevel,{sx:.8,sy:.6,sz:2.4,color:T,rough:.5,metal:.75});b.add(G.bevel,{y:.4,z:-2.2,sx:.6,sy:.45,sz:.6,color:TL,rough:.45,metal:.8});for(let i=0;i<3;i++)for(const s of [-1,1])b.add(G.bevel,{x:s*1.1,y:0,z:-.9+i*.9,sx:.32,sy:.5,sz:.4,color:i%2?[.5,.35,.2]:[.2,.35,.45],rough:.6,metal:.6});b.add(G.cyl,{x:.5,y:-.1,z:2.6,sx:.35,sy:.35,sz:.5,color:PAL.dark,rough:.55,metal:.8,mirror:true});b.add(G.box,{y:.9,z:-2.2,sx:.3,sy:.03,sz:.3,color:PAL.cyan,glow:1,rough:.5,metal:0});
 models.transport=b.mesh({surface:10,rough:.5,metal:.75});
 b=new ModelBuilder(); // союзная станция «Маяк»
 b.add(G.bevel,{sx:3,sy:1,sz:3,color:T,rough:.5,metal:.8});b.add(G.cyl,{y:1,sx:1,sy:1,sz:1.2,rx:Math.PI/2,color:TL,rough:.45,metal:.85});for(const s of [-1,1]){b.add(G.box,{x:s*5.2,sx:2.2,sy:.08,sz:2,color:[.06,.3,.35],rough:.3,metal:.6});for(let j=0;j<5;j++)b.add(G.box,{x:s*5.2-1.6+j*.8,y:.1,sx:.02,sy:.03,sz:2,color:[.3,.45,.5],rough:.4,metal:.8});b.add(G.box,{x:s*3.2,sx:.4,sy:.15,sz:.15,color:PAL.dark,rough:.6,metal:.7})}b.add(G.cyl8,{y:2.2,sx:.06,sy:.06,sz:1.2,rx:Math.PI/2,color:S,rough:.4,metal:.9});for(let i=0;i<4;i++)b.add(G.box,{x:Math.cos(i*1.57)*2.9,y:.6,z:Math.sin(i*1.57)*2.9,sx:.15,sy:.15,sz:.15,color:PAL.cyan,glow:1.5,rough:.5,metal:0});
 models.station=b.mesh({surface:10,rough:.5,metal:.8});
 b=new ModelBuilder();b.add(G.torus,{s:1,color:S,rough:.35,metal:.9});for(let i=0;i<8;i++){const a=i*Math.PI/4;b.add(G.box,{x:Math.cos(a)*1.05,y:Math.sin(a)*1.05,z:.1,sx:.08,sy:.08,sz:.12,rz:a,color:PAL.cyan,glow:2,rough:.5,metal:0})}models.gate=b.mesh({rough:.35,metal:.9});
})();
function renderMissionObjectsNew(){
 if(mission?.gate&&mission.stage===2){const g=mission.gate;pushMatrix(matrix(g.x,g.y,g.z,g.r,g.r,g.r,0,0,gfx.time*.5));drawModel(models.gate,0,0,0,1);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(haloRing,0,0,0,.9,.9,1,PAL.cyan,1.5,0,0,0,.35,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);popMatrix();addLight(g.x,g.y,g.z,.25,.95,.88,2,8)}
 for(const s of structures){const md=1-s.hp/s.maxHp,f=s.hitTime>0?s.hitTime*4:0;drawModel(models.node,s.x,s.y,s.z,1,0,0,0,{damage:md,seed:s.id,emit:[f,f*.4,f*.1]});draw(haloRing,s.x,s.y,s.z-1,1.35,1.35,1,PAL.cyan,1.5,0,0,gfx.time*1.5,1,{shadow:false});draw(haloRing,s.x,s.y,s.z-1,1.35,1.35,1,PAL.cyan,1.5,Math.PI/2,gfx.time*1.1,0,1,{shadow:false});draw(orb,s.x,s.y,s.z+1.7,.55,.55,.3,PAL.cyan,2+Math.sin(gfx.time*4)*.5,0,0,0,1,{shadow:false});addLight(s.x,s.y,s.z+2,.25,.95,.88,1.5,8);fxDamageEmit(s.x,s.y,s.z,1.2,md,1/60)}
 for(const m of mines){drawModel(models.mine,m.x,m.y,m.z,1,m.age*.7,m.age*.4,0);const blink=Math.sin(gfx.time*(m.magnetic?9:5)+m.id)>0;draw(orb,m.x,m.y,m.z,.2,.2,.2,PAL.red,blink?3:.4,0,0,0,1,{shadow:false});if(m.magnetic&&Math.hypot(px-m.x,py-m.y,3-m.z)<11){gl.depthMask(false);draw(haloRing,m.x,m.y,m.z,1.2+Math.sin(gfx.time*8)*.2,1.2+Math.sin(gfx.time*8)*.2,1,[1,.4,.3],1,0,0,0,.4,{shadow:false});gl.depthMask(true)}if(blink)addLight(m.x,m.y,m.z,1,.2,.2,.6,3)}
 if(mission?.ally){const a=mission.ally,md=1-a.hp/a.maxHp;if(a.station){drawModel(models.station,a.x,a.y,a.z,1,0,gfx.time*.05,0,{damage:md,seed:9.1});draw(orb,a.x,a.y+1,a.z,.8,.5,.8,PAL.cyan,.6+Math.sin(gfx.time*3)*.2,0,0,0,.5,{shadow:false});addLight(a.x,a.y+2,a.z,.25,.95,.88,1.5,10)}else{pushMatrix(matrix(a.x,a.y,a.z,1.2,1.2,1.2,0,0,Math.sin(mission.time*.4)*.05));drawModel(models.transport,0,0,0,1,0,0,0,{damage:md,seed:9.2});gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const s of [-1,1])draw(orb,s*.5,-.1,3.2,.25,.25,.8,PAL.cyan,3,0,0,0,.9,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);popMatrix()}fxDamageEmit(a.x,a.y,a.z,a.r,md,1/60)}
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 for(const e of empWaves){const r=e.r*(1-e.life/.8);draw(haloRing,e.x,e.y,e.z,r,r,1,PAL.cyan,1,0,0,0,e.life*.4,{shadow:false});draw(haloRing,e.x,e.y,e.z,r*.85,r*.85,1,[.8,1,1],1,Math.PI/2,0,0,e.life*.3,{shadow:false})}
 if(mission?.environment==='anomaly'){for(let i=0;i<3;i++){const x=Math.sin(i*2)*17,y=Math.cos(i*3)*6,z=-35-i*15,warn=mission.warning?1+Math.sin(gfx.time*20)*.5:.5;draw(haloRing,x,y,z,5,5,1,[.55,.25,.9],warn,0,gfx.time*.3,0,.3,{shadow:false});draw(haloRing,x,y,z,3.5,3.5,1,[.8,.5,1],warn,gfx.time*.5,0,0,.25,{shadow:false});addLight(x,y,z,.55,.25,.9,warn*2,14)}}
 if(mission?.environment==='star'&&mission.stage>0&&mission.stage<4){const x=mission.coverX;gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(cube,x,1,-30,3,12,60,[.25,.6,1],.4,0,0,0,.05,{shadow:false});for(const s of [-1,1])draw(cube,x+s*3,1,-30,.04,12,60,[.35,.75,1],.9,0,0,0,.35,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
 for(const e of enemies)if(e.charge>0&&e.aim)line3(e,{x:e.aim.x,y:e.aim.y,z:3},[.4,.8,1],.035,.3+Math.sin(gfx.time*24)*.15);
 for(const bm of beams){line3(bm.a,bm.b,[.5,.9,1],.15,bm.life*4);line3(bm.a,bm.b,[1,1,1],.05,bm.life*6);addLight((bm.a.x+bm.b.x)/2,(bm.a.y+bm.b.y)/2,(bm.a.z+bm.b.z)/2,.5,.85,1,bm.life*8,16)}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
}
// ---------- Астероиды ----------
function renderAsteroidNew(r){
 if(!r.kind)assignAsteroidLook(r,mission?.environment||'asteroids');
 const list=asteroidVariants(r.kind),v=list[r.variant%list.length],near=r.z>-100;
 const spin=r.a+gfx.time*(r.spin||.05);
 drawModel(near?v.near:v.far,r.x,r.y,r.z,[r.r*r.sx,r.r*r.sy,r.r*r.sz],spin*r.spinAxis[0]*2+r.a,spin,spin*r.spinAxis[2]*2,{tint:[r.tint,r.tint,r.tint],seed:r.seedOffset});
 if(r.kind==='volcanic'&&r.z>-80)addLight(r.x,r.y,r.z,1,.4,.1,.6*r.r,r.r*4);
 if(r.kind==='crystal'&&r.z>-80)addLight(r.x,r.y,r.z,.35,.9,1,.4*r.r,r.r*4);
}
// ---------- Пост-эффекты и камера ----------
gfx.post.dashFx=0;gfx.post.warpFx=0;gfx.post.empFx=null;gfx.post.shakeVec=[0,0];
function updatePostFX(dt){
 const P=gfx.post;
 // тряска камеры: шум, затухание; сильнее при столкновениях и взрывах рядом
 const s=Math.min(1,shake),t=gfx.time;P.shakeVec=[Math.sin(t*47.3)*.55+Math.sin(t*89.1)*.45,Math.cos(t*53.7)*.55+Math.sin(t*71.3)*.45].map(v=>v*s*.011);
 P.ca=Math.max(0,P.ca-dt*.05);
 P.dashFx=Math.max(0,P.dashFx-dt*1.3);const d=P.dashFx;P.radial=d*d*.9;P.flash=[d*.02,d*.05,d*.08];
 P.warpFx=Math.max(0,P.warpFx-dt*1.25);P.warp=Math.min(1,P.warpFx)*Math.min(1,P.warpFx);P.zoom=1+P.warp*.06+d*.02+s*.01;
 if(P.empFx){P.empFx.t+=dt;const k=P.empFx.t/.9;if(k>=1)P.empFx=null;else{const sc=project(P.empFx.x,P.empFx.y,3);P.emp=[sc.x/W,1-sc.y/H,k*.9,(1-k)*.9]}}else P.emp=[0,0,0,0];
 const hull=mode==='play'?health/maxHealth():1;const dmg=hull<.35?(1-hull/.35)*(.5+Math.sin(t*6)*.2):0;P.damage=dmg*.8;
 P.vignette=.42+dmg*.3+s*.1;
 if(overheated)P.flash=[P.flash[0]+.03,P.flash[1],P.flash[2]];
 if(mode==='play'&&mission?.stage===0&&mission.stageTime<.3&&!P.warpStarted){P.warpStarted=true}if(mode!=='play')P.warpStarted=false;
 document.body.classList.toggle('damaged',mode==='play'&&hull<.35);document.body.classList.toggle('critical',mode==='play'&&hull<.18);
 document.body.classList.toggle('emp',!!P.empFx);
}
// ---------- Сборка кадра ----------
function renderScene(dt){
 spaceRenderFar();
 for(const r of rocks)renderAsteroidNew(r);
 if(mode==='menu'){renderPlayerShip(15+Math.sin(gfx.time*.4),-1+Math.sin(gfx.time*.7)*.5,-17,2.3,-.12,Math.sin(gfx.time*.5)*.05,true);
  const demo={type:'frigate',x:-10,y:8,z:-70,hp:1,maxHp:1,vx:0,seed:1,stun:0,barrier:0,fire:1,special:5,hitTime:0,r:3.5,elite:false,mini:false};renderEnemy(demo);
  const demo2={type:'scout',x:-22,y:2,z:-40,hp:1,maxHp:1,vx:Math.sin(gfx.time),seed:2,stun:0,barrier:0,fire:1,special:5,hitTime:0,r:1.5,elite:false,mini:false};renderEnemy(demo2)}
 else{renderPlayerShip(px,py,3,1,bank,pitch);renderPlayerShield(px,py,3)}
 for(const e of enemies)renderEnemy(e);
 renderBossFleetNew();
 renderMissionObjectsNew();
 renderProjectiles();renderPickups();
 fxRenderDebris();fxRenderHitMarks();
 for(const m of missiles){projectileModel(m,'missile',PAL.orange);addLight(m.x,m.y,m.z+1.2,1,.55,.2,1.2,6);fxEngineTrail(m.x,m.y,m.z+1.1,[1,.6,.25],1.2,.16);if(Math.random()<.5)spawnParticle({x:m.x,y:m.y,z:m.z+1,vx:0,vy:.2,vz:0,life:.9,size:.18,size2:.6,color:[.5,.5,.52],kind:3,add:false,alpha:.35,fadeIn:.05})}
 for(const s of shots){const c=s.color||PAL.red;if(s.z>-70)addLight(s.x,s.y,s.z,c[0],c[1],c[2],s.kind==='plasma'?1:.6,4)}
 for(const b of bullets)if(b.z>-40&&Math.random()<.3)addLight(b.x,b.y,b.z,.3,.9,.9,.35,3);
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);for(const t of trails){const age=1-t.life/.65;draw(starMesh,t.x,t.y,t.z,.12+age*.35,.12+age*.35,.18+age*.4,t.color||PAL.orange,1,0,0,0,t.life*.55,{shadow:false})}gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
}
render=function(dt){
 spaceUpdate(dt);updatePostFX(dt);
 if(mode==='play'||mode==='menu'){fxUpdate(dt);fxUpdateDust(dt,mode==='menu'?4:dashActive>0?26:11)}
 gfx.renderFrame(dt,()=>renderScene(dt),fxRender,space.theme||spaceThemes.open);
 // HUD-метки (как в Этапе 1)
 let labels='';const label=(t,text,color)=>{const p=project(t.x,t.y,t.z);if(p.x>0&&p.x<W&&p.y>0&&p.y<H)labels+='<span style="left:'+p.x+'px;top:'+(p.y-25)+'px;color:'+color+'">'+text+'</span>'};
 if(mode==='play'){
  if(mission?.gate&&mission.stage===2)label(mission.gate,'ПРОХОД','#91ffe3');for(const s of structures)label(s,'УЗЕЛ '+Math.ceil(s.hp),'#9ff8e9');
  for(const b of bossFleet)for(const m of b.modules)if(m.hp>0)label(m,({generator:'ГЕНЕРАТОР',armor:'БРОНЯ',turret:'ТУРЕЛЬ',sidegun:'ОРУДИЕ'}[m.kind])+' '+Math.ceil(m.hp),'#ffd091');
  for(const e of enemies)if(e.mini||e.elite||e.objective)label(e,(e.objective?'ЦЕЛЬ':e.name||(e.elite?'ЭЛИТНЫЙ ':'')+enemyDefs[e.type].name)+' '+Math.ceil(e.hp),'#ffc996');
  if(mission?.ally)label(mission.ally,'ЗАЩИЩАЙ · '+Math.ceil(mission.ally.hp),'#91ffe3');
 }
 // Мультизахват: свой квадрат на каждую живую цель в locks (не только lockTarget=locks[0]).
 if(mode==='play')for(const l of locks){
  if(!liveTarget(l.target))continue;
  const p=project(l.target.x,l.target.y,l.target.z);if(p.x<0||p.x>W||p.y<0||p.y>H)continue;
  const ready=l.time>=lockSeconds(),pct=Math.min(100,Math.round(l.time/lockSeconds()*100));
  const txt=ready?(l.target.type?enemyDefs[l.target.type].name:l.target.name||'МОДУЛЬ')+' · '+Math.ceil(l.target.hp)+' HP':pct+'%';
  labels+='<span class="lockMarker'+(ready?' locked':'')+'" style="left:'+p.x+'px;top:'+p.y+'px"><i>'+txt+'</i></span>';
 }
 $('targetLabels').innerHTML=labels;
 $('lock').hidden=true; // старый одиночный маркер заменён циклом выше по locks — держим его скрытым, не удаляя (см. lockTarget/lockTime — используются и вне HUD)
 $('reticle').style.left=mx+'px';$('reticle').style.top=my+'px';
 const env=mode==='play'?mission?.environment||'open':'open';$('environment').dataset.kind=env;
 $('starCover').hidden=true;
};
// Обновить внешний вид астероидов при смене окружения.
(function hookRocks(){const base=configureRocks;configureRocks=function(environment){base(environment);for(const r of rocks)assignAsteroidLook(r,environment)}})();
for(const r of rocks)assignAsteroidLook(r,'open');
