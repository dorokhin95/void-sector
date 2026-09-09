'use strict';
// ===== VOID SECTOR — Этап 2: космос =====
// Процедурное небо (звёзды, туманности, пыль, солнце), планеты, газовые гиганты, дальние станции,
// обломки и пыль. Каждое окружение кампании имеет собственную визуальную тему и цветокоррекцию.
const spaceThemes={
 open:{base:[.004,.008,.02],nebA:[.05,.12,.28],nebB:[.16,.08,.26],nebC:[.2,.5,.6],nebOffset:[1.2,3.4,.7],nebScale:2.2,nebDensity:.55,stars:1,sunDir:[-.55,.6,.5],sunColor:[1,.92,.8],sunSize:.018,sunGlow:64,brightness:1,dust:.5,dustColor:[.25,.3,.45],dustAxis:[.2,.9,.35],
  light:{dir:[-.55,.6,.5],color:[1.15,1.05,.92]},ambSky:[.14,.2,.3],ambGround:[.05,.06,.1],fog:[.012,.03,.06],fogRange:[110,360],
  planet:{x:64,y:30,z:-190,r:43,color:[.2,.36,.4],color2:[.05,.12,.18],surface:1,ring:[.38,.5,.55],ringTilt:.32,moon:{x:-28,y:18,z:-175,r:6,color:[.5,.47,.43]}},structures:['gate','relay'],wrecks:1,dustField:[.65,.75,.9],grade:{lift:[0,0,.006],gain:[1,1,1.02],sat:1.05}},
 asteroids:{base:[.006,.006,.012],nebA:[.2,.14,.08],nebB:[.1,.09,.12],nebC:[.3,.24,.16],nebOffset:[4.2,1.4,2.7],nebScale:1.9,nebDensity:.45,stars:1.1,sunDir:[.6,.45,.5],sunColor:[1,.86,.7],sunSize:.016,sunGlow:70,brightness:1,dust:.9,dustColor:[.35,.3,.25],dustAxis:[.6,.7,.2],
  light:{dir:[.6,.45,.5],color:[1.2,1,.85]},ambSky:[.13,.14,.17],ambGround:[.06,.05,.05],fog:[.02,.018,.02],fogRange:[90,330],
  planet:{x:-70,y:-25,z:-230,r:22,color:[.45,.4,.36],color2:[.3,.27,.25],surface:9},belt:true,structures:['relay'],wrecks:0,dustField:[.7,.65,.6],grade:{lift:[.003,0,0],gain:[1.03,1,.96],sat:1}},
 dense:{base:[.006,.005,.01],nebA:[.22,.12,.06],nebB:[.12,.08,.1],nebC:[.4,.25,.12],nebOffset:[7.2,2.4,.3],nebScale:2.4,nebDensity:.55,stars:.9,sunDir:[.5,.3,.6],sunColor:[1,.8,.62],sunSize:.02,sunGlow:56,brightness:1,dust:1.1,dustColor:[.4,.3,.22],dustAxis:[.5,.8,.1],
  light:{dir:[.5,.3,.6],color:[1.25,1,.8]},ambSky:[.14,.13,.14],ambGround:[.07,.05,.04],fog:[.022,.017,.016],fogRange:[80,300],
  planet:{x:80,y:-10,z:-240,r:30,color:[.5,.42,.35],color2:[.32,.26,.22],surface:9},belt:true,structures:[],wrecks:1,dustField:[.75,.65,.55],grade:{lift:[.004,0,0],gain:[1.04,.99,.94],sat:1}},
 station:{base:[.004,.008,.018],nebA:[.05,.1,.25],nebB:[.2,.1,.2],nebC:[.25,.4,.6],nebOffset:[2.2,5.4,1.7],nebScale:2,nebDensity:.5,stars:1,sunDir:[.7,.35,.4],sunColor:[1,.75,.55],sunSize:.024,sunGlow:50,brightness:1,dust:.5,dustColor:[.3,.32,.45],dustAxis:[.1,.9,.4],
  light:{dir:[.7,.35,.4],color:[1.25,.98,.8]},ambSky:[.12,.17,.26],ambGround:[.06,.06,.09],fog:[.012,.028,.055],fogRange:[110,360],
  planet:{x:-75,y:20,z:-210,r:34,color:[.3,.45,.55],color2:[.08,.14,.24],surface:1,ring:null},structures:['station','station2','relay'],wrecks:2,dustField:[.7,.75,.9],grade:{lift:[0,0,.004],gain:[1.02,1,1.02],sat:1.05}},
 mines:{base:[.004,.01,.01],nebA:[.06,.2,.14],nebB:[.1,.16,.1],nebC:[.2,.6,.4],nebOffset:[3.3,.4,5.7],nebScale:2.3,nebDensity:.55,stars:.85,sunDir:[-.6,.5,.45],sunColor:[.9,1,.85],sunSize:.015,sunGlow:70,brightness:1,dust:.6,dustColor:[.25,.4,.3],dustAxis:[.4,.8,.3],
  light:{dir:[-.6,.5,.45],color:[1.05,1.15,.95]},ambSky:[.1,.18,.15],ambGround:[.05,.07,.06],fog:[.012,.03,.028],fogRange:[100,340],
  planet:{x:70,y:-30,z:-230,r:26,color:[.35,.42,.3],color2:[.15,.2,.14],surface:9},structures:['relay','relay2'],wrecks:1,dustField:[.6,.85,.7],grade:{lift:[0,.004,0],gain:[.98,1.03,.98],sat:1}},
 nebula:{base:[.03,.01,.05],nebA:[.35,.12,.45],nebB:[.1,.18,.5],nebC:[.6,.3,.7],nebOffset:[6.1,2.2,4.4],nebScale:1.6,nebDensity:1.3,stars:.5,sunDir:[-.3,.7,.6],sunColor:[.85,.7,1],sunSize:.014,sunGlow:30,brightness:1.05,dust:.3,dustColor:[.4,.25,.5],dustAxis:[.3,.6,.7],
  light:{dir:[-.3,.7,.6],color:[.95,.85,1.15]},ambSky:[.24,.16,.34],ambGround:[.1,.06,.14],fog:[.14,.06,.2],fogRange:[45,200],
  planet:null,structures:[],wrecks:1,dustField:[.9,.7,1],grade:{lift:[.01,0,.015],gain:[1.02,.97,1.06],sat:1.1}},
 debris:{base:[.005,.006,.009],nebA:[.12,.11,.1],nebB:[.08,.09,.12],nebC:[.22,.2,.18],nebOffset:[8.8,1.1,3.3],nebScale:2.1,nebDensity:.5,stars:.9,sunDir:[.3,.5,.8],sunColor:[1,.9,.78],sunSize:.017,sunGlow:64,brightness:.95,dust:.8,dustColor:[.3,.28,.26],dustAxis:[.7,.6,.3],
  light:{dir:[.3,.5,.8],color:[1.15,1.05,.95]},ambSky:[.12,.13,.15],ambGround:[.05,.05,.06],fog:[.016,.017,.02],fogRange:[90,320],
  planet:{x:-60,y:34,z:-220,r:24,color:[.36,.34,.33],color2:[.24,.22,.22],surface:9},structures:['deadStation'],wrecks:5,dustField:[.7,.68,.65],grade:{lift:[0,0,0],gain:[1,.99,.97],sat:.92}},
 star:{base:[.03,.012,.004],nebA:[.4,.18,.05],nebB:[.3,.1,.05],nebC:[.7,.35,.1],nebOffset:[1.1,7.4,2.2],nebScale:1.8,nebDensity:.7,stars:.4,sunDir:[.82,.25,.45],sunColor:[1,.72,.42],sunSize:.16,sunGlow:9,brightness:1.1,dust:.4,dustColor:[.45,.3,.15],dustAxis:[.2,.8,.5],
  light:{dir:[.82,.25,.45],color:[1.7,1.15,.75]},ambSky:[.3,.16,.08],ambGround:[.14,.07,.04],fog:[.16,.07,.03],fogRange:[80,300],
  planet:null,sunBody:{x:150,y:45,z:-260,r:75},structures:['relay'],wrecks:0,dustField:[1,.8,.55],grade:{lift:[.012,.004,0],gain:[1.08,.98,.9],sat:1.05}},
 anomaly:{base:[.01,.004,.02],nebA:[.3,.08,.45],nebB:[.05,.15,.4],nebC:[.7,.3,.9],nebOffset:[9.4,.7,6.6],nebScale:2.6,nebDensity:.85,stars:.7,sunDir:[-.4,.3,.7],sunColor:[.7,.5,1],sunSize:.012,sunGlow:40,brightness:1,dust:.5,dustColor:[.45,.25,.6],dustAxis:[.5,.5,.7],
  light:{dir:[-.4,.3,.7],color:[.95,.8,1.2]},ambSky:[.2,.12,.3],ambGround:[.08,.05,.12],fog:[.07,.02,.11],fogRange:[70,260],
  planet:{x:55,y:-20,z:-200,r:28,color:[.35,.25,.5],color2:[.12,.08,.2],surface:1,ring:[.5,.35,.7],ringTilt:.9},structures:['monolith'],wrecks:2,dustField:[.85,.6,1],grade:{lift:[.008,0,.014],gain:[1.03,.96,1.08],sat:1.12}},
 alien:{base:[.004,.012,.014],nebA:[.05,.25,.3],nebB:[.15,.1,.3],nebC:[.2,.7,.6],nebOffset:[5.5,4.4,8.8],nebScale:2,nebDensity:.7,stars:.8,sunDir:[.2,.75,.6],sunColor:[.6,1,.9],sunSize:.014,sunGlow:50,brightness:1,dust:.4,dustColor:[.2,.45,.45],dustAxis:[.6,.4,.7],
  light:{dir:[.2,.75,.6],color:[.85,1.15,1.1]},ambSky:[.1,.22,.24],ambGround:[.05,.09,.1],fog:[.012,.04,.045],fogRange:[90,320],
  planet:{x:-70,y:-15,z:-230,r:36,color:[.15,.4,.42],color2:[.05,.12,.16],surface:1,ring:[.3,.7,.65],ringTilt:.45},structures:['monolith','monolith2','archRing'],wrecks:0,dustField:[.6,1,.9],grade:{lift:[0,.006,.006],gain:[.96,1.04,1.03],sat:1.08}}
};
// Плавный переход между темами.
const space={current:null,target:null,blend:1,theme:null,env:'open',act:1,structures:[],wrecks:[],meshes:{}};
function lerp(a,b,t){return a+(b-a)*t}
function lerpArr(a,b,t){return a.map((v,i)=>lerp(v,b[i],t))}
function mixTheme(a,b,t){const out={};for(const k in b){const va=a[k],vb=b[k];if(typeof vb==='number')out[k]=lerp(typeof va==='number'?va:vb,vb,t);else if(Array.isArray(vb)&&typeof vb[0]==='number')out[k]=lerpArr(Array.isArray(va)&&va.length===vb.length?va:vb,vb,t);else out[k]=vb}return out}
function spaceSetEnvironment(env){
 const theme=spaceThemes[env]||spaceThemes.open;if(space.target===theme)return;
 space.current=space.theme||theme;space.target=theme;space.blend=space.theme?0:1;space.env=env;
 spaceBuildStructures(theme);fxDustReset(theme.dustField);
}
// Дальние структуры: строятся один раз на тип, расставляются по теме.
function spaceMesh(kind){
 if(space.meshes[kind])return space.meshes[kind];
 const b=new ModelBuilder(),metal=[.28,.32,.37],dark=[.1,.12,.15],panel=[.06,.2,.3];
 if(kind==='gate'){for(let i=0;i<24;i++){const a=i/28*Math.PI*2+.25;b.add(G.bevel,{x:Math.cos(a)*29,y:Math.sin(a)*25,z:0,sx:2,sy:3.1,sz:3,rz:a,color:[.17,.25,.29],rough:.6,metal:.8});if(i%3===0)b.add(G.box,{x:Math.cos(a)*31,y:Math.sin(a)*27,z:2,sx:.4,sy:2.3,sz:5,rz:a,color:dark,rough:.7,metal:.7});if(i%2===0)b.add(G.box,{x:Math.cos(a)*27,y:Math.sin(a)*23,z:4,sx:.18,sy:1.4,sz:.2,rz:a,color:[.25,.95,.88],glow:2.5,rough:.4,metal:0});if(i%3===0)b.add(G.box,{x:Math.cos(a)*28,y:Math.sin(a)*24,z:5,sx:1,sy:.16,sz:.2,rz:a,color:[1,.4,.12],glow:1.5,rough:.4,metal:0})}}
 if(kind==='relay'||kind==='relay2'){b.add(G.cyl,{sx:.8,sy:.8,sz:5,rx:Math.PI/2,color:metal,rough:.5,metal:.85});b.add(G.box,{y:2,sx:.12,sy:3,sz:.12,color:metal,rough:.5,metal:.9});for(const side of [-1,1]){b.add(G.box,{x:side*8,y:0,z:0,sx:6,sy:.1,sz:3,rx:.35,rz:.3*side,color:panel,rough:.3,metal:.6});for(let j=0;j<7;j++)b.add(G.box,{x:side*8-5+j*1.6,y:.15,z:0,sx:.025,sy:.04,sz:3,rx:.35,rz:.3*side,color:[.3,.4,.5],rough:.4,metal:.8})}b.add(G.sphereLow,{y:5,s:.3,color:[1,.4,.12],glow:2,rough:.5,metal:0});if(kind==='relay2'){b.add(G.torusThin,{y:-2,s:3,rx:Math.PI/2,color:metal,rough:.5,metal:.85});b.add(G.box,{y:-6,sx:2,sy:.5,sz:2,color:dark,rough:.6,metal:.8})}}
 if(kind==='station'||kind==='station2'){b.add(G.torus,{s:14,color:metal,rough:.55,metal:.85});for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.add(G.bevel,{x:Math.cos(a)*14,y:Math.sin(a)*14,z:0,sx:2.2,sy:1.6,sz:1.8,rz:a,color:[.32,.36,.4],rough:.55,metal:.8});b.add(G.box,{x:Math.cos(a)*14,y:Math.sin(a)*14,z:2,sx:1.4,sy:.12,sz:.15,rz:a,color:[.25,.95,.88],glow:2,rough:.4,metal:0});b.add(G.box,{x:Math.cos(a)*7,y:Math.sin(a)*7,z:0,sx:7,sy:.35,sz:.35,rz:a,color:dark,rough:.6,metal:.8})}b.add(G.cyl,{sx:3,sy:3,sz:5,color:[.3,.34,.38],rough:.5,metal:.85});b.add(G.cyl,{sx:1.2,sy:1.2,sz:9,color:dark,rough:.6,metal:.8});for(const side of [-1,1])b.add(G.box,{x:side*22,z:1,sx:7,sy:.12,sz:4,color:panel,rough:.3,metal:.6});if(kind==='station2'){b.add(G.box,{y:-16,sx:1,sy:5,sz:1,color:metal,rough:.5,metal:.85});b.add(G.sphere,{y:-22,s:3,color:[.3,.34,.38],rough:.5,metal:.85});b.add(G.box,{y:-22,z:3.2,sx:.8,sy:.8,sz:.2,color:[1,.4,.12],glow:2,rough:.5,metal:0})}}
 if(kind==='deadStation'){b.add(G.torus,{s:14,color:[.2,.2,.21],rough:.8,metal:.6});for(let i=0;i<8;i++){if(i===2||i===3||i===6)continue;const a=i/8*Math.PI*2;b.add(G.bevel,{x:Math.cos(a)*14,y:Math.sin(a)*14,z:0,sx:2.2,sy:1.6,sz:1.8,rz:a,color:[.22,.22,.24],rough:.75,metal:.6});b.add(G.box,{x:Math.cos(a)*7,y:Math.sin(a)*7,z:0,sx:7,sy:.3,sz:.3,rz:a+.1,color:dark,rough:.7,metal:.6})}b.add(G.cyl,{sx:3,sy:3,sz:4,rx:.3,color:[.2,.21,.23],rough:.7,metal:.6});for(let i=0;i<3;i++)b.add(G.box,{x:Math.cos(i*2.1)*9,y:Math.sin(i*2.1)*9,z:1,sx:.3,sy:.2,sz:.3,color:[1,.35,.1],glow:1.2,rough:.5,metal:0})}
 if(kind==='monolith'||kind==='monolith2'){const c=[.06,.09,.12],glow=[.3,1,.85];b.add(G.bevel,{sx:3,sy:22,sz:3,color:c,rough:.25,metal:.9});b.add(G.bevel,{y:-24,sx:6,sy:2,sz:6,color:c,rough:.3,metal:.9});for(let j=0;j<6;j++)b.add(G.box,{x:3.05,y:-14+j*5,sx:.05,sy:.3,sz:1.8,color:glow,glow:2.2,rough:.3,metal:0,mirror:true});b.add(G.torusThin,{y:14,s:5,rx:Math.PI/2,color:c,rough:.3,metal:.9});b.add(G.sphere,{y:14,s:1.4,color:glow,glow:2.5,rough:.3,metal:0});if(kind==='monolith2'){for(let i=0;i<4;i++){const a=i*Math.PI/2;b.add(G.bevel,{x:Math.cos(a)*9,y:-10,z:Math.sin(a)*9,sx:.8,sy:9,sz:.8,ry:-a,color:c,rough:.3,metal:.9})}}}
 if(kind==='archRing'){const c=[.05,.08,.11],glow=[.3,1,.85];b.add(G.torus,{s:40,color:c,rough:.3,metal:.9});for(let i=0;i<16;i++){const a=i/16*Math.PI*2;b.add(G.bevel,{x:Math.cos(a)*40,y:Math.sin(a)*40,z:0,sx:4,sy:2,sz:2.5,rz:a,color:c,rough:.3,metal:.9});b.add(G.box,{x:Math.cos(a)*40,y:Math.sin(a)*40,z:2.7,sx:2.5,sy:.2,sz:.2,rz:a,color:glow,glow:2.2,rough:.3,metal:0})}}
 return space.meshes[kind]=b.mesh({rough:.6,metal:.8,shadow:false});
}
function spaceBuildStructures(theme){
 const rnd=seededRandom(Object.keys(spaceThemes).indexOf(space.env)*17+3);space.structures=[];space.wrecks=[];
 const places={gate:{x:0,y:0,z:-112,s:1},relay:{x:-38,y:10,z:-105,s:1},relay2:{x:44,y:-8,z:-140,s:1.3},station:{x:-60,y:12,z:-170,s:1.6},station2:{x:70,y:24,z:-215,s:1.2},deadStation:{x:38,y:-6,z:-150,s:1.4},monolith:{x:-40,y:-14,z:-150,s:1},monolith2:{x:52,y:8,z:-190,s:1.2},archRing:{x:0,y:8,z:-300,s:1.4}};
 for(const k of theme.structures||[]){const p=places[k];if(p)space.structures.push({mesh:spaceMesh(k),x:p.x,y:p.y,z:p.z,s:p.s,rz:k==='archRing'?0:rnd()*.4-.2,spin:k==='station'||k==='station2'?.03:0,kind:k})}
 for(let i=0;i<(theme.wrecks||0);i++)space.wrecks.push({mesh:bigWrecks[i%bigWrecks.length],x:(rnd()<.5?-1:1)*(45+rnd()*60),y:(rnd()-.5)*60,z:-140-rnd()*150,s:1.5+rnd()*2.5,rx:rnd()*6,ry:rnd()*6,rz:rnd()*6,spin:(rnd()-.5)*.04});
 // Пояс дальних астероидов
 space.belt=theme.belt?Array.from({length:70},(_,i)=>({a:i/70*Math.PI*2+rnd()*.05,r:.8+rnd()*2.2,kind:['rock','iron','carbon'][i%3],variant:i%4,ry:rnd()*6})):null;
}
function spaceApplyLighting(theme){
 gfx.sun.dir=theme.light.dir;gfx.sun.color=theme.light.color;gfx.ambientSky=theme.ambSky;gfx.ambientGround=theme.ambGround;gfx.fogColor=theme.fog;gfx.fog=theme.fogRange;
 gfx.post.lift=theme.grade.lift;gfx.post.gain=theme.grade.gain;gfx.post.sat=theme.grade.sat;
}
function spaceUpdate(dt){
 const env=mode==='play'||mode==='pause'||mode==='shop'?(mission?.environment||(gameMode==='endless'?['asteroids','open','station','nebula','debris'][Math.floor(wave/4)%5]:'open')):'open';
 if(env!==space.env||!space.target)spaceSetEnvironment(env);
 if(space.blend<1){space.blend=Math.min(1,space.blend+dt*.35)}
 const t=space.blend*space.blend*(3-2*space.blend);
 space.theme=space.blend>=1?space.target:mixTheme(space.current,space.target,t);
 if(space.theme.light&&space.current&&space.blend<1){space.theme.light={dir:lerpArr(space.current.light.dir,space.target.light.dir,t),color:lerpArr(space.current.light.color,space.target.light.color,t)};space.theme.grade={lift:lerpArr(space.current.grade.lift,space.target.grade.lift,t),gain:lerpArr(space.current.grade.gain,space.target.grade.gain,t),sat:lerp(space.current.grade.sat,space.target.grade.sat,t)}}
 spaceApplyLighting(space.theme);
}
// Дальние объекты — рисуются в сцене (с туманом), без теней.
function spaceRenderFar(){
 const th=space.target||spaceThemes.open;
 gl.depthMask(true);
 if(th.planet){const p=th.planet;draw(orb,p.x,p.y,p.z,p.r,p.r,p.r,p.color,0,0,gfx.time*.006,0,1,{surface:p.surface,color2:p.color2,seed:3.3,rough:.9,metal:0,shadow:false});
  gl.depthMask(false);draw(orb,p.x,p.y,p.z,p.r*1.03,p.r*1.03,p.r*1.03,p.surface===1?[.16,.65,.7]:[.4,.45,.5],.8,0,0,0,.14,{rough:1,metal:0,shadow:false});gl.depthMask(true);
  if(p.ring){pushMatrix(matrix(p.x,p.y,p.z,1,1,1,p.ringTilt||.3,gfx.time*.004,.2));gl.depthMask(false);for(let i=0;i<4;i++){const r=p.r*(1.45+i*.16);draw(haloRing,0,0,0,r,r,1,p.ring,.15,Math.PI/2,0,0,.55-i*.1,{rough:.9,metal:0,shadow:false})}gl.depthMask(true);popMatrix()}
  if(p.moon)draw(orb,p.moon.x,p.moon.y,p.moon.z,p.moon.r,p.moon.r,p.moon.r,p.moon.color,0,0,gfx.time*.01,0,1,{surface:9,seed:7.1,rough:.95,metal:0,shadow:false})}
 if(th.sunBody){const s=th.sunBody;draw(orb,s.x,s.y,s.z,s.r,s.r,s.r,[1,.45,.12],2.1,0,0,0,1,{rough:1,metal:0,shadow:false,surface:1,color2:[1,.7,.3],seed:gfx.time*.02});gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);draw(orb,s.x,s.y,s.z,s.r*1.1,s.r*1.1,s.r*1.1,[1,.4,.1],1,0,0,0,.2,{shadow:false});gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true)}
 if(space.belt&&th.planet){const p=th.planet;for(const b of space.belt){const x=p.x+Math.cos(b.a)*p.r*1.9,y=p.y+Math.sin(b.a)*p.r*.35,z=p.z+Math.sin(b.a)*p.r*1.5;const v=asteroidVariants(b.kind)[b.variant%asteroidVariants(b.kind).length];drawModel(v.far,x,y,z,b.r,0,b.ry+gfx.time*.02,0,{shadow:false})}}
 for(const s of space.structures)drawModel(s.mesh,s.x,s.y,s.z,s.s,0,0,s.rz+gfx.time*s.spin,{shadow:false});
 for(const w of space.wrecks)drawModel(w.mesh,w.x,w.y,w.z,w.s,w.rx,w.ry+gfx.time*w.spin,w.rz,{shadow:false,damage:.35,seed:w.rx});
 // Ближние блуждающие обломки поля (окружение debris/station)
 if(space.env==='debris'||space.env==='station'||space.env==='dense'){for(let i=0;i<(space.env==='debris'?8:3);i++){const z=((gfx.time*3+i*37)%130);const x=Math.sin(i*2.3)*34,y=Math.cos(i*1.7)*14;drawModel(bigWrecks[i%bigWrecks.length],x,y,-175+z,.9+i*.15,i*.7+gfx.time*.05,i*1.3,i*.4,{damage:.3,seed:i})}}
}
