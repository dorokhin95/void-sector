'use strict';
const $=id=>document.getElementById(id),canvas=$('space'),gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'})||canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});
if(!gl){$('menu').innerHTML='<h1>НУЖЕН WEBGL</h1><p>Открой игру в браузере с аппаратным ускорением.</p>';throw Error('WebGL unavailable');}
const vs=`attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 uM;uniform mat4 uVP;uniform mat3 uN;varying vec3 n;varying vec3 p;varying vec3 localP;void main(){vec4 w=uM*vec4(aPos,1.);p=w.xyz;localP=aPos;n=normalize(uN*aNormal);gl_Position=uVP*w;}`;
const fs=`precision mediump float;varying vec3 n;varying vec3 p;varying vec3 localP;uniform vec3 uColor;uniform float uGlow;uniform float uAlpha;uniform float uPlanet;void main(){vec3 l=normalize(vec3(-.5,.8,.6));float d=max(dot(normalize(n),l),0.);float rim=pow(1.-abs(dot(normalize(n),normalize(vec3(0.,3.,18.)-p))),3.);vec3 base=uColor;if(uPlanet>.5&&uPlanet<1.5){float bands=sin(n.y*42.+sin(n.x*17.+n.z*11.)*2.)*.5+.5;base=mix(vec3(.055,.15,.21),vec3(.27,.48,.49),bands);base+=vec3(.08,.10,.11)*sin(n.y*95.+n.x*7.);}if(uPlanet>1.5){float grain=sin(localP.x*61.+sin(localP.z*43.))*sin(localP.y*57.+localP.x*17.);float vein=pow(1.-abs(sin(localP.x*18.+sin(localP.y*11.)+localP.z*13.)),18.);base*=.78+grain*.19;base=mix(base,base*.32,vein*.7);}vec3 view=normalize(vec3(0.,3.,18.)-p);float spec=pow(max(dot(normalize(n),normalize(l+view)),0.),34.);vec3 c=vec3(spec*.3)+base*(.18+d*.9)+vec3(.10,.27,.35)*rim+uColor*uGlow;float fog=smoothstep(100.,340.,-p.z);gl_FragColor=vec4(mix(c,vec3(.015,.035,.065),fog*.8),uAlpha);}`;
function shader(t,s){let x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(x));return x}let program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
let ap=gl.getAttribLocation(program,'aPos'),an=gl.getAttribLocation(program,'aNormal'),um=gl.getUniformLocation(program,'uM'),uvp=gl.getUniformLocation(program,'uVP'),uc=gl.getUniformLocation(program,'uColor'),ug=gl.getUniformLocation(program,'uGlow'),ua=gl.getUniformLocation(program,'uAlpha'),up=gl.getUniformLocation(program,'uPlanet'),un=gl.getUniformLocation(program,'uN');gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
function mesh(pos,norm){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);const data=[];for(let i=0;i<pos.length;i+=3)data.push(...pos.slice(i,i+3),...norm.slice(i,i+3));gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return{b,count:pos.length/3};}
function sphere(rows=16,cols=24,rough=0){let p=[],n=[];const v=(a,b)=>{let x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b),r=1+rough*Math.sin(b*7+a*13)*Math.sin(a*9);return[x*r,y*r,z*r]};for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*Math.PI/rows,b=j*2*Math.PI/cols,c=(i+1)*Math.PI/rows,d=(j+1)*2*Math.PI/cols;for(let q of [v(a,b),v(c,b),v(c,d),v(a,b),v(c,d),v(a,d)]){p.push(...q);n.push(...q)}}return mesh(p,n)}
function poly(vertices,faces){let p=[],n=[];for(const f of faces){let a=vertices[f[0]],b=vertices[f[1]],c=vertices[f[2]],u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]),nn=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const q of [a,b,c]){p.push(...q);n.push(...nn)}}return mesh(p,n)}
const orb=sphere(),starMesh=sphere(3,5),rock=sphere(12,18,.20),cube=poly([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[2,3,7],[2,7,6],[1,2,6],[1,6,5],[3,0,4],[3,4,7]]),hull=poly([[0,0,-3],[-1,0,1.5],[1,0,1.5],[0,.65,.7],[0,-.3,1]],[[0,1,3],[0,3,2],[1,2,3],[0,4,1],[0,2,4],[1,4,2]]);
function matrix(x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);return new Float32Array([(c*e)*sx,(a*f+b*d*e)*sx,(b*f-a*d*e)*sx,0,-c*f*sy,(a*e-b*d*f)*sy,(b*e+a*d*f)*sy,0,d*sz,-b*c*sz,a*c*sz,0,x,y,z,1])}
let parentMatrix=null;
function multiply(a,b){let out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
function draw(m,x,y,z,sx,sy,sz,col,glow=0,rx=0,ry=0,rz=0,alpha=1){
 gl.bindBuffer(gl.ARRAY_BUFFER,m.b);gl.enableVertexAttribArray(ap);gl.enableVertexAttribArray(an);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(an,3,gl.FLOAT,false,24,12);
 let model=matrix(x,y,z,sx,sy,sz,rx,ry,rz);if(parentMatrix)model=multiply(parentMatrix,model);
 const normal=new Float32Array(9);for(let c=0;c<3;c++){let len=model[c*4]**2+model[c*4+1]**2+model[c*4+2]**2;for(let r=0;r<3;r++)normal[c*3+r]=model[c*4+r]/Math.max(.000001,len)}
 gl.uniformMatrix4fv(um,false,model);gl.uniformMatrix3fv(un,false,normal);gl.uniform3fv(uc,col);gl.uniform1f(ug,glow);gl.uniform1f(ua,alpha);gl.uniform1f(up,m===orb&&sx===43?1:m===rock||m.surface===2?2:0);gl.drawArrays(gl.TRIANGLES,0,m.count)
}
function cylinder(){let v=[],f=[];for(let z of [-1,1])for(let i=0;i<12;i++){let a=i/12*Math.PI*2;v.push([Math.cos(a),Math.sin(a),z])}v.push([0,0,-1],[0,0,1]);for(let i=0;i<12;i++){let j=(i+1)%12;f.push([i,j,j+12],[i,j+12,i+12],[24,j,i],[25,i+12,j+12])}return poly(v,f)}
const tube=cylinder();
const cyan=[.25,.95,.88],red=[1,.18,.18],metal=[.20,.29,.37],orange=[1,.4,.12];let W,H,aspect,vp;
// Единый источник размера «доступного» вьюпорта для мобильной сборки: обычный
// innerWidth/innerHeight везде, кроме случая, когда страница реально запущена
// внутри Telegram (см. telegram-integration.js) — там Telegram сам сообщает
// стабильную высоту вьюпорта (viewportStableHeight/viewportHeight), которая может
// отличаться от innerHeight из-за собственных панелей и жестов Telegram.
function getAppViewport(){
 const tg=window.Telegram&&window.Telegram.WebApp;
 const width=innerWidth;
 const height=(tg&&tg.initData&&(tg.viewportStableHeight||tg.viewportHeight))||innerHeight;
 return{width,height};
}
function resize(){const v=getAppViewport();W=v.width;H=v.height;try{document.documentElement.style.setProperty('--app-height',H+'px')}catch{}let d=Math.min(devicePixelRatio,1.6);canvas.width=W*d;canvas.height=H*d;gl.viewport(0,0,canvas.width,canvas.height);aspect=W/H;let f=1/Math.tan(Math.PI/6),near=.1,far=800,A=(far+near)/(near-far),B=2*far*near/(near-far);vp=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,A,-1,0,-3*f,B-18*A,18]);gl.uniformMatrix4fv(uvp,false,vp)}addEventListener('resize',resize);resize();
let stars=Array.from({length:230},()=>({x:(Math.random()-.5)*450,y:(Math.random()-.5)*260,z:-40-Math.random()*420,r:.06+Math.random()*.17}));let rocks=Array.from({length:43},()=>({x:(Math.random()-.5)*125,y:(Math.random()-.5)*62,z:-Math.random()*240,r:.8+Math.random()*3.5,a:Math.random()*6}));
let mode='menu',time=0,elapsed=0,health=100,score=0,kills=0,wave=0,spawned=0,spawnTimer=0,enemies=[],bullets=[],shots=[],sparks=[],keys={},px=0,py=-2,mx=W*.5,my=H*.45,firing=false,fireCD=0,dashCD=0,pulseCD=0,inv=0,noticeTime=0,boss=null,shake=0,muted=false,audioCtx;const waves=[6,8,10,11,12,13,14,16];
let vx=0,vy=0,bank=0,pitch=0,missiles=[],trails=[],debris=[],blasts=[],lockTarget=null,lockTime=0,ammo=6,missileCD=0,reload=0,accumulator=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function project(x,y,z){let f=1/Math.tan(Math.PI/6),d=18-z;return{x:(x*f/aspect/d+1)*W/2,y:(1-(y-3)*f/d)*H/2}}
// Segment/sphere time-of-impact avoids tunnelling at high projectile speeds.
function sweep(a,b,c,r){let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,ox=a.x-c.x,oy=a.y-c.y,oz=a.z-c.z,A=dx*dx+dy*dy+dz*dz,C=ox*ox+oy*oy+oz*oz-r*r;if(C<=0)return 0;if(A<1e-10)return null;let B=ox*dx+oy*dy+oz*dz,D=B*B-A*C;if(D<0)return null;let t=(-B-Math.sqrt(D))/A;return t>=0&&t<=1?t:null}
function targets(){return boss?[...enemies,boss]:enemies}
function liveTarget(t){return t&&t.hp>0&&(t===boss||enemies.includes(t))}
function updateLock(dt){let candidate=null,best=95;for(const t of targets()){if(t.z>1||t.hp<=0)continue;let p=project(t.x,t.y,t.z),d=Math.hypot(p.x-mx,p.y-my);if(d<best){best=d;candidate=t}}if(candidate!==lockTarget){lockTarget=candidate;lockTime=0}if(candidate)lockTime=Math.min(.6,lockTime+dt)}
function launchMissile(){if(mode!=='play')return;if(missileCD>0)return;if(ammo<=0){notify('РАКЕТЫ · ПЕРЕЗАРЯДКА');return}if(!liveTarget(lockTarget)||lockTime<.6){notify('УДЕРЖИВАЙ ПРИЦЕЛ НА ЦЕЛИ ДЛЯ ЗАХВАТА');return}ammo--;missileCD=.8;let side=ammo%2?1:-1;missiles.push({x:px+side*1.65,y:py-.25,z:3,vx:vx*.4+side*3,vy:vy*.4,vz:-22,life:6,target:lockTarget,trail:0});tone(220,.4,'sawtooth',.055);notify('РАКЕТА ПУЩЕНА')}
function explode(x,y,z,radius=8){radius+=levels.rocket*.6;blastImpulse(x,y,z,radius);burst(x,y,z,orange,38);blasts.push({x,y,z,life:1.9,r:radius});for(const t of targets()){let d=Math.hypot(x-t.x,y-t.y,z-t.z);if(d<radius+(t===boss?5:2)){damageEnemy(t,(t===boss?18:8)*(1+levels.rocket*.35));score+=40}}for(const r of rocks)if(Math.hypot(x-r.x,y-r.y,z-r.z)<radius+r.r){r.z=-230;score+=20}shake=Math.max(shake,.2);}
function wreck(x,y,z,count=14){for(let i=0;i<count;i++)debris.push({x,y,z,vx:(Math.random()-.5)*14,vy:(Math.random()-.5)*14,vz:4+Math.random()*18,life:2+Math.random()*2,size:.12+Math.random()*.45,spin:Math.random()*6});if(debris.length>180)debris.splice(0,debris.length-180)}
function physics(dt){
 if(blasts.length>28)blasts.splice(0,blasts.length-28);if(trails.length>240)trails.splice(0,trails.length-240);
 let ax=Number(!!(keys.KeyD||keys.ArrowRight))-Number(!!(keys.KeyA||keys.ArrowLeft)),ay=Number(!!(keys.KeyW||keys.ArrowUp))-Number(!!(keys.KeyS||keys.ArrowDown)),len=Math.hypot(ax,ay);if(len>1){ax/=len;ay/=len}
 const boost=dashActive>0,drag=boost?.6:assist?2.6+levels.handling*.18:.12,decay=Math.exp(-drag*dt),thrust=(boost?52:34)*(1+levels.engine*.1+levels.handling*.035);
 vx=vx*decay+ax*thrust*(1-decay)/drag;vy=vy*decay+ay*thrust*(1-decay)/drag;let speed=Math.hypot(vx,vy),limit=(boost?28:14)*(1+levels.maxSpeed*.06);if(speed>limit){vx*=limit/speed;vy*=limit/speed}
 px+=vx*dt;py+=vy*dt;let bound=Math.min(12,aspect*7);if(Math.abs(px)>bound){px=clamp(px,-bound,bound);vx*=-.22}if(py< -6||py>8){py=clamp(py,-6,8);vy*=-.22}
 rollVelocity+=(-vx*.032-bank)*64*dt-rollVelocity*14*dt;bank+=rollVelocity*dt;pitchVelocity+=(vy*.018-pitch)*54*dt-pitchVelocity*13*dt;pitch+=pitchVelocity*dt;
 missileCD=Math.max(0,missileCD-dt);if(ammo<maxAmmo()){reload+=dt;if(reload>=reloadSeconds()){ammo++;reload-=reloadSeconds()}}else reload=0;updateLock(dt);
 for(const m of missiles){let old={x:m.x,y:m.y,z:m.z},speed=Math.min(78*(1+levels.missileSpeed*.12),Math.hypot(m.vx,m.vy,m.vz)+38*(1+levels.missileSpeed*.12)*dt);if(liveTarget(m.target)){let t=m.target,lead=Math.min(.4,Math.hypot(t.x-m.x,t.y-m.y,t.z-m.z)/speed*.35),dx=t.x+(t.vx||0)*lead-m.x,dy=t.y+(t.vy||0)*lead-m.y,dz=t.z+(t.vz||0)*lead-m.z,dl=Math.max(.001,Math.hypot(dx,dy,dz)),vl=Math.hypot(m.vx,m.vy,m.vz);let a=[m.vx/vl,m.vy/vl,m.vz/vl],b=[dx/dl,dy/dl,dz/dl],angle=Math.acos(clamp(a[0]*b[0]+a[1]*b[1]+a[2]*b[2],-1,1)),blend=Math.min(1,2.5*(1+levels.missileSpeed*.08)*dt/Math.max(angle,.001)),sn=Math.sin(angle);let out=angle>.001&&sn>.001?a.map((v,i)=>(v*Math.sin((1-blend)*angle)+b[i]*Math.sin(blend*angle))/sn):b;m.vx=out[0]*speed;m.vy=out[1]*speed;m.vz=out[2]*speed}else{let l=Math.hypot(m.vx,m.vy,m.vz);m.vx=m.vx/l*speed;m.vy=m.vy/l*speed;m.vz=m.vz/l*speed}
 m.x+=m.vx*dt;m.y+=m.vy*dt;m.z+=m.vz*dt;m.life-=dt;m.trail-=dt;if(m.trail<=0){m.trail=.035;trails.push({x:m.x,y:m.y,z:m.z,life:.65})}
 let impact=null,nearest=2;for(const t of [...targets(),...rocks]){let h=sweep(old,m,t,t.r|| (t===boss?5:2));if(h!==null&&h<nearest){nearest=h;impact=t}}if(impact){m.x=old.x+(m.x-old.x)*nearest;m.y=old.y+(m.y-old.y)*nearest;m.z=old.z+(m.z-old.z)*nearest;explode(m.x,m.y,m.z);m.life=-1}
 }missiles=missiles.filter(m=>m.life>0);
 for(const t of trails)t.life-=dt;trails=trails.filter(t=>t.life>0);for(const b of blasts)b.life-=dt;blasts=blasts.filter(b=>b.life>0);
 rockCollisions(dt);for(const d of debris){d.x+=d.vx*dt;d.y+=d.vy*dt;d.z+=d.vz*dt;d.life-=dt;d.spin+=dt*3}debris=debris.filter(d=>d.life>0);
}

function tone(freq,duration,type='sine',volume=.05){if(muted)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.35,audioCtx.currentTime+duration);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch{}}
function notify(s){$('notice').textContent=s;noticeTime=3;}
function start(){resetRun();mode='play';vx=0;vy=0;bank=0;pitch=0;missiles=[];trails=[];debris=[];blasts=[];lockTarget=null;lockTime=0;ammo=6;missileCD=0;reload=0;elapsed=0;health=100;score=0;kills=0;wave=0;spawned=0;spawnTimer=.7;enemies=[];bullets=[];shots=[];sparks=[];boss=null;px=0;py=-2;fireCD=0;dashCD=0;pulseCD=0;inv=2;keys={};firing=false;$('menu').hidden=true;$('location').hidden=true;$('modal').hidden=true;$('hud').hidden=false;$('bossHud').hidden=true;document.body.classList.add('playing');prepareWave();notify('ВОЛНА 01 · КОНТАКТ ВПЕРЕДИ');tone(180,.5);updateHUD()}
function pause(){if(mode==='play'){rocketHeld=false;mode='pause';firing=false;keys={};$('modalLabel').textContent='МИССИЯ ПРИОСТАНОВЛЕНА';$('modalTitle').textContent='ПАУЗА';$('modalText').textContent='Космос подождёт.';$('resume').hidden=false;$('modal').hidden=false;}else if(mode==='pause'){mode='play';$('modal').hidden=true}}
function finish(win){rocketHeld=false;mode=win?'win':'lose';firing=false;$('modal').hidden=false;$('resume').hidden=true;$('modalLabel').textContent=win?'СЕКТОР ОЧИЩЕН':'СИГНАЛ ПОТЕРЯН';$('modalTitle').textContent=win?'ТЫ ВЕРНУЛСЯ.':'КОРАБЛЬ ПОТЕРЯН';$('modalText').textContent=(win?'«Страж» уничтожен. Путь к Эребу открыт.':'Блокада всё ещё держится. Попробуй ещё раз.')+' Счёт: '+score.toLocaleString('ru')+' · Волна: '+(wave+1)+' · Время: '+Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0');tone(win?700:100,1,'sine',.1)}
function burst(x,y,z,color,count=25){if(sparks.length>450)sparks.splice(0,count);for(let i=0;i<count;i++)sparks.push({x,y,z,vx:(Math.random()-.5)*17,vy:(Math.random()-.5)*17,vz:(Math.random()-.5)*17,life:.45+Math.random()*.6,color});tone(65,.25,'sawtooth',.04)}
function hit(d){if(inv>0||mode!=='play')return;d*=1/(1+levels.armor*.1);health=Math.max(0,health-d);inv=.65;shake=.5;$('flash').style.opacity=.55;tone(90,.25,'triangle',.1);if(health<=0)finish(false)}
function dash(){if(mode!=='play'||dashCD>0)return;dashCD=4;inv=1.1;let dx=Number(!!keys.KeyD)-Number(!!keys.KeyA),dy=Number(!!keys.KeyW)-Number(!!keys.KeyS),l=Math.hypot(dx,dy);if(l){vx+=dx/l*15;vy+=dy/l*15}notify('РЫВОК · ЩИТ НЕУЯЗВИМОСТИ');tone(250,.4)}
function pulse(){if(mode!=='play'||pulseCD>0)return;pulseCD=13;shots=[];for(const e of enemies)damageEnemy(e,3+levels.damage);if(boss)damageEnemy(boss,10+levels.damage*2);burst(px,py,-15,cyan,95);shake=.25;notify('ЭЛЕКТРОМАГНИТНЫЙ ИМПУЛЬС');tone(130,.6,'sawtooth',.08)}
$('start').onclick=start;$('restart').onclick=start;$('resume').onclick=pause;$('pause').onclick=pause;$('dash').onclick=dash;$('pulse').onclick=pulse;$('rocket').onclick=launchMissile;$('sound').onclick=()=>{muted=!muted;$('sound').textContent='ЗВУК: '+(muted?'ВЫКЛ':'ВКЛ')};
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='Escape'&&!e.repeat)pause();if(e.code==='ShiftLeft'||e.code==='ShiftRight')dash();if(e.code==='KeyE'&&!e.repeat)pulse();if(e.code==='KeyR'&&!e.repeat)launchMissile();if(e.code==='KeyC'&&!e.repeat&&mode==='play'){assist=!assist;notify(assist?'СТАБИЛИЗАЦИЯ ВКЛЮЧЕНА':'СВОБОДНЫЙ ДРЕЙФ')}});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{if(mode==='play')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')pause()});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function mouseMove(e){mx=e.clientX;my=e.clientY;if(mode==='play')firing=!!(e.buttons&1)}
function mouseDown(e){mx=e.clientX;my=e.clientY;if(mode!=='play')return;if(e.button===0)firing=true;if(e.button===2){rocketHeld=true;launchMissile()}}
function mouseUp(e){firing=!!(e.buttons&1);if(e.button===2)rocketHeld=false}
canvas.addEventListener('mousemove',mouseMove);canvas.addEventListener('mousedown',mouseDown);addEventListener('mouseup',mouseUp);
// Мобильная сборка: касания экрана целиком обрабатывает mobile-controls.js (два джойстика),
// поэтому здесь нет обобщённых pointermove/pointerdown для не-мышиных указателей.
addEventListener('pointerup',e=>{if(e.pointerType==='mouse')firing=!!(e.buttons&1)});addEventListener('pointercancel',e=>{if(e.pointerType==='mouse'){firing=false;rocketHeld=false}});
function ship(x,y,z,enemy=false,size=1,roll=0){
 let c=enemy?[.27,.16,.19]:[.30,.39,.46],g=enemy?red:cyan,dark=[.06,.09,.12];
 parentMatrix=matrix(x,y,z,size,size,size,enemy?0:pitch,enemy?Math.PI:0,roll);
 draw(hull,0,0,0,1,.8,1.1,c);draw(hull,0,.24,-.3,.57,.67,.85,[.39,.48,.54]);
 draw(orb,0,.45,-.9,.32,.22,.85,[.04,.31,.38],.35);draw(cube,0,.54,-.6,.025,.045,.75,g,.45);
 for(const side of [-1,1]){
 draw(hull,side*1.3,-.12,.65,1.12,.19,.72,c,0,0,0,side*.12);
 draw(hull,side*1.7,-.10,1.0,.64,.12,.45,[.14,.21,.28]);
 draw(tube,side*.83,-.03,1.08,.30,.30,.84,dark);draw(tube,side*.83,-.03,1.65,.34,.34,.12,c);
 draw(tube,side*.83,-.03,1.79,.24,.24,.03,g,2);
 let thrust=enemy?.8:1+Math.hypot(vx,vy)*.04+(dashActive>0?1.2:0);
 draw(orb,side*.83,-.03,2.1,.17,.17,(.45+Math.sin(time*36)*.05)*thrust,g,3);
 draw(tube,side*1.9,-.09,-.35,.075,.075,.68,[.12,.18,.23]);draw(tube,side*1.9,-.09,-1.02,.09,.09,.07,g,1);
 draw(cube,side*1.23,.03,.3,.48,.023,.035,g,.65,0,0,side*.12);
 draw(hull,side*.70,.45,1.22,.12,.78,.35,c,0,0,0,-side*.24);
 for(let j=0;j<4;j++)draw(cube,side*.46,.28,.35+j*.19,.14,.035,.033,dark);
 for(let j=0;j<3;j++)draw(cube,side*(1.05+j*.28),-.015,.87,.09,.02,.025,[.65,.75,.79]);
 if(!enemy){draw(tube,side*1.42,-.35,.5,.12,.12,.48,[.64,.67,.63]);draw(hull,side*1.42,-.35,-.13,.11,.11,.18,orange,.2)}
 }
 if(!enemy){for(let side of [-1,1]){for(let j=0;j<3+Math.min(3,levels.rate);j++){let a=time*((firing||keys.Space)?24:2)+j*Math.PI*2/(3+Math.min(3,levels.rate));draw(tube,side*1.9+Math.cos(a)*.08,Math.sin(a)*.08-.09,-.66,.025,.025,.8,[.5,.57,.62])}if(Math.abs(vx)>.5)draw(orb,side*2.18,-.1,.6,.10+Math.abs(vx)*.008,.08,.18,cyan,2);draw(cube,side*.3,.34,.25,.08,.025,.34,[.1,.2,.24]);}for(let j=0;j<4;j++)draw(cube,0,.45,.3+j*.23,.13,.02,.08,health<35?red:cyan,.8);}
 parentMatrix=null;
}
function update(dt){if(mode==='play'||mode==='menu')time+=dt;if(mode!=='play')return;elapsed+=dt;fireCD-=dt;dashCD=Math.max(0,dashCD-dt);pulseCD=Math.max(0,pulseCD-dt);inv-=dt;noticeTime-=dt;if(noticeTime<=0)$('notice').textContent='';shake=Math.max(0,shake-dt);$('flash').style.opacity=Math.max(0,shake*.75);physics(dt);updatePickups(dt);if((rocketHeld||keys.KeyR)&&lockTime>=.6&&ammo>0&&missileCD<=0)launchMissile();
if((firing||keys.Space)&&fireCD<=0){fireCD=Math.max(.045,.14/(1+levels.rate*.18));let tz=liveTarget(lockTarget)?lockTarget.z:-65,tx=(mx/W*2-1)*(18-tz)*Math.tan(Math.PI/6)*aspect,ty=3+(1-my/H*2)*(18-tz)*Math.tan(Math.PI/6);for(let side of (levels.multishot>0?[-1.8,-.6,.6,1.8]:[-1,1])){let x=px+side*.8,z=2,dx=tx-x,dy=ty-py,dz=tz-z,len=Math.hypot(dx,dy,dz);bullets.push({x,y:py,z,vx:dx/len*145+vx*.12,vy:dy/len*145+vy*.12,vz:dz/len*145,damage:1+levels.damage*.45,life:1.8})}vy-=.055;tone(680,.07,'triangle',.02)}
advanceEncounter(dt);if(mode!=='play')return;
updateEnemies(dt);
for(const b of bullets){let old={x:b.x,y:b.y,z:b.z};b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.life-=dt;let nearest=2,impact=null;for(const t of [...targets(),...rocks]){let h=sweep(old,b,t,t.r||(t===boss?5:2));if(h!==null&&h<nearest){nearest=h;impact=t}}if(impact){b.life=-1;let x=old.x+(b.x-old.x)*nearest,y=old.y+(b.y-old.y)*nearest,z=old.z+(b.z-old.z)*nearest;if(impact.hp!==undefined){damageEnemy(impact,b.damage||1);score+=10}else{impact.hpRock=(impact.hpRock??Math.ceil(impact.r*3))-1;if(impact.hpRock<=0){wreck(x,y,z,8);impact.z=-230;impact.hpRock=undefined;score+=20}}burst(x,y,z,orange,3)}}bullets=bullets.filter(b=>b.life>0);
for(const s of shots){let old={x:s.x,y:s.y,z:s.z};if(s.homing){let dx=px-s.x,dy=py-s.y,dz=3-s.z,l=Math.hypot(dx,dy,dz),blend=1-Math.exp(-1.15*dt);s.vx+=(dx/l*30-s.vx)*blend;s.vy+=(dy/l*30-s.vy)*blend;s.vz+=(dz/l*30-s.vz)*blend;}s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.life-=dt;if(s.homing){s.trail=(s.trail||0)-dt;if(s.trail<=0){s.trail=.06;trails.push({x:s.x,y:s.y,z:s.z,life:.65,color:s.color})}}let h=sweep(old,s,{x:px,y:py,z:3},1.25);if(h!==null){if(s.homing){blasts.push({x:s.x,y:s.y,z:s.z,life:1.9,r:3});burst(s.x,s.y,s.z,s.color,15)}else burst(s.x,s.y,s.z,s.color,6);hit(s.damage||10);vx+=s.vx*.025;vy+=s.vy*.025;s.life=-1}else for(const r of rocks)if(sweep(old,s,r,r.r)!==null){s.life=-1;if(s.homing)blasts.push({x:s.x,y:s.y,z:s.z,life:1.9,r:3});else burst(s.x,s.y,s.z,s.color,4);break}}shots=shots.filter(s=>s.life>0&&s.z<22);if(mode!=='play')return;

enemies=enemies.filter(e=>{if(e.hp<=0){burst(e.x,e.y,e.z,orange,32);wreck(e.x,e.y,e.z);blasts.push({x:e.x,y:e.y,z:e.z,life:1.9,r:4});score+=e.reward||250;credits+=e.credit||18;waveKills++;kills++;dropLoot(e);return false}return true});if(boss&&boss.hp<=0){burst(boss.x,boss.y,boss.z,orange,160);score+=3000;credits+=200+wave*20;if(gameMode==='endless'){dropLoot(boss,true)}wreck(boss.x,boss.y,boss.z,45);blasts.push({x:boss.x,y:boss.y,z:boss.z,life:1.9,r:16});boss=null;bossDefeated=true;}for(const r of rocks){r.z+=dt*(dashActive>0?32:13);r.x+=(r.vx||0)*dt;r.y+=(r.vy||0)*dt;if(r.z>23){r.z=-230;r.x=(Math.random()-.5)*125;r.vx=0;r.vy=0;r.hpRock=undefined}let dx=px-r.x,dy=py-r.y,dz=3-r.z,dist=Math.hypot(dx,dy,dz),radius=r.r+1.1;if(dist<radius){let nx=dx/Math.max(dist,.001),ny=dy/Math.max(dist,.001),nz=dz/Math.max(dist,.001),relative=vx*nx+vy*ny-13*nz;if(relative<0){let impulse=-(1.35)*relative;vx+=nx*impulse;vy+=ny*impulse;r.vx=(r.vx||0)-nx*impulse*.2;r.vy=(r.vy||0)-ny*impulse*.2;hit(clamp(Math.abs(relative)*1.2,6,28));burst(px,py,3,cyan,8)}let overlap=radius-dist;px+=nx*overlap;py+=ny*overlap}}
updateHUD();}
function render(dt){gl.clearColor(.009,.019,.043,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(uvp,false,vp);
// Distant planet, atmospheric limb, and inclined orbital debris belt.
draw(orb,64,30,-180,43,43,43,[.09,.24,.29],.12,0,time*.006);gl.depthMask(false);draw(orb,64,30,-180,44.1,44.1,44.1,[.16,.65,.70],.65,0,0,0,.12);gl.depthMask(true);
for(let i=0;i<86;i++){let a=i/86*Math.PI*2;let x=64+Math.cos(a)*66,y=30+Math.sin(a)*13,z=-180+Math.sin(a)*51;draw(cube,x,y,z,2.8,.16,1.1,[.28,.39,.43],.05,.22,-a,.16)}
for(const s of stars)draw(starMesh,s.x,s.y,s.z,s.r,s.r,s.r,[.54,.72,.83],1.5);
for(const r of rocks)renderAsteroid(r);
// Broken orbital gate gives the flight path a strong silhouette.
for(let i=0;i<23;i++){let a=i/28*Math.PI*2+.25;draw(cube,Math.cos(a)*29,Math.sin(a)*25,-112,2,3.1,3,[.17,.25,.29],0,0,0,a);if(i%3===0){draw(cube,Math.cos(a)*31,Math.sin(a)*27,-110,.4,2.3,5,[.10,.14,.18],0,0,0,a);draw(cube,Math.cos(a)*28,Math.sin(a)*24,-107,1,.16,.2,orange,1,0,0,a)}if(i%2===0)draw(cube,Math.cos(a)*27,Math.sin(a)*23,-108,.18,1.4,.2,cyan,2,0,0,a)}
if(mode==='menu'){ship(15+Math.sin(time*.4),-1+Math.sin(time*.7)*.5,-17,false,2.3,-.12);ship(-10,8,-70,true,1.8,.3)}else{ship(px+(Math.random()-.5)*shake,py,3,false,1,bank);if(inv>0){gl.depthMask(false);draw(orb,px,py,3,2.8,1.2,3.6,cyan,.7,0,0,0,.10);gl.depthMask(true)}}
for(const e of enemies)renderEnemy(e);
renderBossFleet();
renderProjectiles();renderPickups();
gl.depthMask(false);for(const p of sparks){if(mode==='play'||mode==='win'||mode==='lose'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.life-=dt}draw(cube,p.x,p.y,p.z,.12,.12,.32,p.color,2,0,0,0,Math.min(1,p.life*2))}gl.depthMask(true);sparks=sparks.filter(p=>p.life>0);renderExtras();renderCombatDetails();$('reticle').style.left=mx+'px';$('reticle').style.top=my+'px'}
function renderExtras(){
 for(const m of missiles)projectileModel(m,'missile',orange);
 for(const d of debris)draw(d.size>.35?hull:cube,d.x,d.y,d.z,d.size,d.size*.4,d.size*1.7,metal,Math.max(0,d.life-2)*.35,d.spin,d.spin*.6);
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 for(const t of trails){let age=1-t.life/.65;draw(starMesh,t.x,t.y,t.z,.12+age*.35,.12+age*.35,.18+age*.4,t.color||orange,1,0,0,0,t.life*.55)}
 for(const b of blasts)renderBlast(b);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
 const marker=$('lock');marker.hidden=mode!=='play'||!liveTarget(lockTarget);if(!marker.hidden){let p=project(lockTarget.x,lockTarget.y,lockTarget.z);marker.style.left=p.x+'px';marker.style.top=p.y+'px';marker.classList.toggle('locked',lockTime>=lockSeconds());$('locktext').textContent=lockTime>=lockSeconds()?(lockTarget.type?enemyDefs[lockTarget.type].name:lockTarget.name||'МОДУЛЬ')+' · '+Math.ceil(lockTarget.hp)+' HP':Math.round(lockTime/lockSeconds()*100)+'%';}
}
// Encounter director, ship systems, and between-wave refits.
let gameMode='campaign',credits=0,levels={damage:0,rate:0,multishot:0,rocket:0,armor:0,engine:0},rocketHeld=false,assist=true,rollVelocity=0,pitchVelocity=0,waveKills=0,waveCount=6,bossWave=false,bossDefeated=false,rockTimer=0,beams=[];
const enemyDefs={
 scout:{name:'ИГЛА',hp:5,size:.85,r:1.5,speed:10,fire:1.8,credit:15,color:[.9,.35,.2]},
 fighter:{name:'КОРСАР',hp:9,size:1.2,r:2.0,speed:7,fire:2.1,credit:22,color:[1,.17,.3]},
 bomber:{name:'ГРОМ',hp:18,size:1.6,r:2.8,speed:3,fire:3.8,credit:35,color:[.8,.5,1]},
 sniper:{name:'ПРИЗРАК',hp:11,size:1.1,r:1.8,speed:3,fire:3.8,credit:30,color:[.4,.8,1]},
 frigate:{name:'БАСТИОН',hp:30,size:2,r:3.5,speed:2,fire:2.7,credit:50,color:[1,.66,.2]}
};
const upgrades=[
 {id:'damage',name:'БОЕПРИПАСЫ',desc:'+0,45 урона каждого снаряда',base:65},
 {id:'rate',name:'ПРИВОД СТВОЛОВ',desc:'+18% к скорострельности',base:70,max:12},
 {id:'multishot',name:'ЧЕТЫРЕ СТВОЛА',desc:'Четыре снаряда вместо двух',base:240,max:1},
 {id:'rocket',name:'РАКЕТНЫЙ КОМПЛЕКС',desc:'+35% урона, +2 ракеты, быстрее заряд',base:90,max:12},
 {id:'armor',name:'ЩИТ И БРОНЯ',desc:'+20 к щиту, сопротивление урону',base:80},
 {id:'engine',name:'МАНЕВРОВЫЕ ДВИГАТЕЛИ',desc:'+8% тяги и +5% предельной скорости',base:60,max:10}
];
function maxHealth(){return 100+levels.armor*20}
function maxAmmo(){return 6+levels.rocket*2}
function reloadSeconds(){return Math.max(1.5,6/(1+levels.rocket*.15))}
function difficulty(){return 1+wave*.13+wave*wave*.004}
function resetRun(){clearDelay=-1;pickups=[];pickupSerial=0;credits=0;for(const k in levels)levels[k]=0;rocketHeld=false;assist=true;rollVelocity=0;pitchVelocity=0;waveKills=0;beams=[];bossDefeated=false;$('shop').hidden=true;$('lock').hidden=true;}
function prepareWave(){clearDelay=-1;
 bossWave=gameMode==='campaign'?wave===8:(wave+1)%5===0;waveKills=0;spawned=0;spawnTimer=1.2;bossDefeated=false;
 waveCount=bossWave?0:(gameMode==='campaign'?waves[wave]:Math.min(26,6+wave*2));
 $('bossHud').hidden=!bossWave;
 if(bossWave){const hp=Math.round(210*difficulty());boss={x:0,y:4,z:-82,hp,maxHp:hp,damageScale:enemyDamageScale(),r:5,fire:1.8,phase:1,shield:0};notify('КРЕЙСЕР «СТРАЖ» · БОЕВАЯ ТРЕВОГА')}
 updateHUD();
}
function chooseType(i){const pool=wave===0?['scout','fighter']:wave===1?['scout','fighter','sniper']:wave===2?['fighter','scout','bomber','sniper']:['scout','fighter','bomber','sniper','frigate'];return pool[(i+wave)%pool.length]}
function spawnEnemy(type){let d=enemyDefs[type],x=(Math.random()-.5)*29,y=(Math.random()-.5)*13+2;let e={type,x,y,z:-100,damageScale:enemyDamageScale(),hp:d.hp*difficulty(),maxHp:d.hp*difficulty(),shield:type==='frigate'?10*difficulty():0,r:d.r,seed:Math.random()*6,fire:1+Math.random()*2,vx:0,vy:0,vz:0,homeX:x,homeY:y,age:0,charge:0,credit:d.credit,reward:d.credit*12};enemies.push(e);return e}
function advanceEncounter(dt){
 if(!bossWave){spawnTimer-=dt;if(spawned<waveCount&&spawnTimer<=0&&enemies.length<10){spawnEnemy(chooseType(spawned));spawned++;spawnTimer=Math.max(.6,1.65-wave*.06)}}
 const cleared=(bossWave?bossDefeated:spawned>=waveCount)&&enemies.length===0&&!boss;
 if(!cleared){clearDelay=-1;return}
 if(gameMode==='endless'){
  wave++;prepareWave();spawnTimer=.25;notify(bossWave?'СТРАЖ · БОЕВАЯ ТРЕВОГА':'ВОЛНА '+(wave+1)+' · HP ×'+difficulty().toFixed(2)+' / УРОН ×'+enemyDamageScale().toFixed(2));return;
 }
 if(clearDelay<0){clearDelay=2.2;inv=Math.max(inv,2.4);notify(bossWave?'СТРАЖ УНИЧТОЖЕН':'ВОЛНА ЗАВЕРШЕНА · ВОЗВРАЩЕНИЕ В АНГАР');return}
 clearDelay-=dt;if(clearDelay>0)return;
 if(bossWave){finish(true);return}
 credits+=60+wave*12;shots=[];bullets=[];missiles=[];beams=[];lockTarget=null;lockTime=0;health=Math.min(maxHealth(),health+25);ammo=Math.min(maxAmmo(),ammo+2);mode='shop';firing=false;rocketHeld=false;keys={};$('shop').hidden=false;renderShop();$('continue').focus();
}
function price(u){return Math.ceil(u.base*Math.pow(1.42,levels[u.id]))}
function renderShop(){
 $('shopTitle').textContent='ВОЛНА '+(wave+1)+' ПРОЙДЕНА';$('credits').textContent=credits+' КР';$('nextWave').textContent=gameMode==='campaign'&&wave===7?'ДАЛЕЕ: КРЕЙСЕР «СТРАЖ»':'ДАЛЕЕ: ВОЛНА '+(wave+2);
 $('upgrades').innerHTML=upgrades.map(u=>{let max=levels[u.id]>=(u.max||99),cost=price(u);return '<button class="upgrade" data-up="'+u.id+'" '+(max||credits<cost?'disabled':'')+'><small>УР. '+levels[u.id]+'</small><strong>'+u.name+'</strong><span>'+u.desc+'</span><b>'+(max?'МАКСИМУМ':cost+' КР')+'</b></button>'}).join('');
 $('repair').disabled=credits<40||health>=maxHealth();$('repair').textContent='РЕМОНТ +40 ЩИТА · 40 КР ('+Math.ceil(health)+'/'+maxHealth()+')';
}
function buyUpgrade(id){if(mode!=='shop')return false;let u=upgrades.find(u=>u.id===id);if(!u||levels[id]>=(u.max||99)||credits<price(u))return false;credits-=price(u);levels[id]++;if(id==='armor')health=Math.min(maxHealth(),health+20);if(id==='rocket')ammo=Math.min(maxAmmo(),ammo+2);renderShop();updateHUD();tone(500,.12);return true}
function nextWave(){if(mode!=='shop')return;wave++;mode='play';$('shop').hidden=true;inv=2;px=0;py=-2;vx=0;vy=0;bank=0;pitch=0;prepareWave();notify(bossWave?'ВНИМАНИЕ · КРЕЙСЕР «СТРАЖ»':'ВОЛНА '+(wave+1)+' · СЛОЖНОСТЬ ×'+difficulty().toFixed(1))}
function damageEnemy(e,d){let absorbed=Math.min(e.shield||0,d);e.shield=Math.max(0,(e.shield||0)-d);e.hp-=d-absorbed;e.hitTime=.15}
function hostileShot(e,kind='bolt',offset=0){if(shots.length>450)return;let speed=kind==='rail'?110:kind==='missile'?24:kind==='plasma'?20:30,lead=kind==='rail'?0:.4,tx=e.aim?e.aim.x:px+vx*lead,ty=e.aim?e.aim.y:py+vy*lead;let dx=tx+offset-e.x,dy=ty-e.y,dz=3-e.z,l=Math.hypot(dx,dy,dz);shots.push({x:e.x,y:e.y,z:e.z,vx:dx/l*speed,vy:dy/l*speed,vz:dz/l*speed,life:8,homing:kind==='missile',kind,color:kind==='rail'?[.4,.85,1]:kind==='missile'?[.85,.4,1]:kind==='plasma'?orange:red,damage:(kind==='rail'?22:kind==='missile'?18:kind==='plasma'?14:8)*(e.damageScale||enemyDamageScale())})}
function updateEnemies(dt){
 for(const e of enemies){
 const d=enemyDefs[e.type]||enemyDefs.fighter;e.age+=dt;e.hitTime=Math.max(0,(e.hitTime||0)-dt);e.fire-=dt;
 let tx=e.homeX+Math.sin(e.age*(e.type==='scout'?1.4:.6)+e.seed)*(e.type==='scout'?6:3),ty=e.homeY+Math.sin(e.age*.85+e.seed)*2;
 if(e.type==='scout'){for(const b of bullets){if(Math.abs(b.z-e.z)<15&&Math.abs(b.x-e.x)<3){tx+=e.x>b.x?5:-5;break}}}
 e.vx+=(clamp((tx-e.x)*1.6,-8,8)-e.vx)*(1-Math.exp(-3*dt));e.vy+=(clamp((ty-e.y)*1.5,-4,4)-e.vy)*(1-Math.exp(-3*dt));
 e.x+=e.vx*dt;e.y+=e.vy*dt;e.vz=e.z< -45?d.speed+7:d.speed*.18;e.z+=e.vz*dt;
 if(e.z>0){e.z=-95;e.homeX=-e.homeX}
 if(e.type==='sniper'){
 if(e.charge>0){e.charge-=dt;if(e.charge<=0){hostileShot(e,'rail');beams.push({a:{x:e.x,y:e.y,z:e.z},b:{x:e.aim.x,y:e.aim.y,z:3},life:.16});e.aim=null;e.fire=Math.max(1.3,d.fire/(1+wave*.025))}}
 else if(e.fire<=0){e.charge=1.1;e.aim={x:px,y:py};e.fire=99}
 }else if(e.fire<=0){e.fire=Math.max(.65,d.fire/(1+wave*.035));if(e.type==='fighter'){for(const off of [-5,0,5])hostileShot(e,'bolt',off)}else if(e.type==='bomber'){hostileShot(e,'missile')}else if(e.type==='frigate'){for(const off of [-9,-4.5,0,4.5,9])hostileShot(e,'plasma',off)}else{hostileShot(e);hostileShot({...e,x:e.x+.6})}}
 }
 if(boss){let b=boss,oldx=b.x,oldy=b.y;b.x=Math.sin(time*.42)*10;b.y=3+Math.sin(time*.65)*4;b.vx=(b.x-oldx)/dt;b.vy=(b.y-oldy)/dt;b.z=Math.min(-48,b.z+dt*5);let phase=b.hp/b.maxHp<.33?3:b.hp/b.maxHp<.66?2:1;if(phase>b.phase){b.phase=phase;notify('СТРАЖ · ФАЗА '+phase);if(enemies.length<8){spawnEnemy('scout');spawnEnemy(phase===3?'bomber':'fighter')}}b.fire-=dt;if(b.fire<=0){b.fire=Math.max(.55,1.4-b.phase*.23-wave*.01);for(let off of [-10,-5,0,5,10])hostileShot(b,'plasma',off);if(b.phase>=2)hostileShot({...b,x:b.x+6},'missile');if(b.phase===3)hostileShot({...b,x:b.x-6},'missile')}}
 for(const b of beams)b.life-=dt;beams=beams.filter(b=>b.life>0);
}
function updateHUD(){
 $('ammo').textContent=ammo+' / '+maxAmmo();$('rocketstatus').textContent=missileCD>0?'ПУСК…':ammo===0?'ЗАРЯД '+Math.ceil(reloadSeconds()-reload)+' С':lockTime>=.6?'ЦЕЛЬ ЗАХВАЧЕНА':'R / ПКМ';
 $('velocity').textContent=Math.round(Math.hypot(vx,vy)*12)+' м/с · '+(assist?'СТАБ.':'ДРЕЙФ');$('health').innerHTML=Math.ceil(health)+' <small>/ '+maxHealth()+'</small>';$('shield').style.width=health/maxHealth()*100+'%';
 $('score').textContent=String(score).padStart(6,'0');$('kills').textContent='СБИТО '+kills+(gameMode==='campaign'?' · '+credits+' КР':' · HP ×'+difficulty().toFixed(2)+' / УРОН ×'+enemyDamageScale().toFixed(2));$('progress').style.width=(bossWave?bossDefeated?100:0:Math.min(100,waveKills/Math.max(1,waveCount)*100))+'%';
 $('phase').textContent=(gameMode==='endless'?'БЕСКОНЕЧНОСТЬ · ':'КАМПАНИЯ · ')+'ВОЛНА '+(wave+1)+(gameMode==='campaign'?' / 9':'');$('objective').textContent=bossWave?'Страж · фаза '+(boss?.phase||1):'Уничтожено: '+waveKills+' / '+waveCount;
 $('dashstatus').textContent=dashCD>0?dashCD.toFixed(1)+' С':'ГОТОВ';$('pulsestatus').textContent=pulseCD>0?pulseCD.toFixed(1)+' С':'ГОТОВ';$('loadout').textContent='ПУЛЕМЁТ '+(levels.damage+1)+' · ТЕМП '+(levels.rate+1)+' · '+(levels.multishot?'4 СТВОЛА':'2 СТВОЛА');if(boss)$('bossbar').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';
}
function rockCollisions(dt){rockTimer+=dt;if(rockTimer<.08)return;rockTimer=0;for(let i=0;i<rocks.length;i++)for(let j=i+1;j<rocks.length;j++){let a=rocks[i],b=rocks[j],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,dist=Math.hypot(dx,dy,dz),r=a.r+b.r;if(dist>=r||dist<.001)continue;let nx=dx/dist,ny=dy/dist,nz=dz/dist,ma=a.r**3,mb=b.r**3,overlap=r-dist; a.x-=nx*overlap*mb/(ma+mb);a.y-=ny*overlap*mb/(ma+mb);a.z-=nz*overlap*mb/(ma+mb);b.x+=nx*overlap*ma/(ma+mb);b.y+=ny*overlap*ma/(ma+mb);b.z+=nz*overlap*ma/(ma+mb);let rv=((b.vx||0)-(a.vx||0))*nx+((b.vy||0)-(a.vy||0))*ny;if(rv<0){let impulse=-1.35*rv/(1/ma+1/mb);a.vx=(a.vx||0)-impulse/ma*nx;a.vy=(a.vy||0)-impulse/ma*ny;b.vx=(b.vx||0)+impulse/mb*nx;b.vy=(b.vy||0)+impulse/mb*ny;a.a+=impulse/ma*.02;b.a-=impulse/mb*.02}}}
function blastImpulse(x,y,z,r){for(const a of rocks){let dx=a.x-x,dy=a.y-y,dz=a.z-z,l=Math.hypot(dx,dy,dz);if(l<r*2&&l>.01){let force=(1-l/(r*2))*28/Math.max(1,a.r);a.vx=(a.vx||0)+dx/l*force;a.vy=(a.vy||0)+dy/l*force;a.a+=force*.02}}let dx=px-x,dy=py-y,l=Math.hypot(dx,dy,3-z);if(l<r*1.5&&l>.01){vx+=dx/l*5;vy+=dy/l*5}}
function renderEnemy(e){
 const d=enemyDefs[e.type]||enemyDefs.fighter,c=d.color;
 if(e.type==='scout'||e.type==='fighter'){ship(e.x,e.y,e.z,true,d.size,-e.vx*.035)}
 else{parentMatrix=matrix(e.x,e.y,e.z,d.size,d.size,d.size,0,Math.PI,-e.vx*.025);
 if(e.type==='sniper'){draw(hull,0,0,0,.6,.55,1.8,[.17,.28,.35]);draw(tube,0,.2,-2,.16,.16,1.4,c,.5);for(let side of [-1,1]){draw(hull,side*.8,0,1,.65,.12,.9,metal);draw(orb,side*.65,0,2,.18,.18,.55,c,2)}}
 else{draw(cube,0,0,0,1.1,.45,1.65,[.23,.23,.27]);draw(hull,0,.2,-1.6,.9,.5,.7,metal);for(let side of [-1,1]){draw(cube,side*1.5,0,.25,.4,.35,1.5,[.13,.18,.23]);draw(tube,side*1.5,0,1.85,.3,.3,.15,c,2);for(let j=0;j<4;j++){draw(cube,side*.8,.48,-.8+j*.55,.28,.04,.18,[.38,.4,.43]);if(e.type==='bomber')draw(tube,side*1.5,-.38,-.9+j*.6,.11,.11,.3,c,.2);else draw(tube,side*1.45,.42,-.9+j*.6,.13,.13,.45,c,.4)}}if(e.type==='frigate'){draw(cube,0,.8,.3,.65,.4,.75,metal);draw(tube,0,1.2,-.3,.18,.18,1,c,.5)}}parentMatrix=null}
 if(e.shield>0){gl.depthMask(false);draw(orb,e.x,e.y,e.z,d.r*1.1,d.r*.65,d.r*1.25,c,.6,0,0,0,.08);gl.depthMask(true)}
 if(e.hitTime>0){gl.depthMask(false);draw(starMesh,e.x,e.y,e.z,d.r,d.r*.6,d.r,orange,2,0,0,0,e.hitTime);gl.depthMask(true)}
}
function line3(a,b,color,width,alpha){let dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=Math.hypot(dx,dy,dz);draw(cube,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,width,width,l/2,color,2,Math.asin(dy/l),Math.atan2(-dx,-dz),0,alpha)}
function renderCombatDetails(){
 // Charged railguns show their locked firing line before firing.
 gl.depthMask(false);for(const e of enemies)if(e.charge>0&&e.aim)line3(e,{x:e.aim.x,y:e.aim.y,z:3},[.4,.8,1],.035,.3+Math.sin(time*24)*.15);for(const b of beams)line3(b.a,b.b,[.5,.9,1],.15,b.life*4);gl.depthMask(true);
 // Service structure: solar arrays, trusses, antenna and running lights.
 for(let side of [-1,1]){draw(cube,-38+side*8,10,-105,6,.10,3,[.05,.14,.24],0,.35,.3);for(let j=0;j<7;j++)draw(cube,-38+side*8-5+j*1.6,10.15,-105,.025,.04,3,[.3,.4,.5],0,.35,.3)}draw(tube,-38,10,-105,.8,.8,5,metal,0,0,Math.PI/2);draw(cube,-38,12,-105,.12,3,.12,metal);draw(orb,-38,15,-105,.25,.25,.25,orange,1+Math.sin(time*2)*.5);
}
$('campaign').onclick=()=>{gameMode='campaign';$('campaign').setAttribute('aria-pressed','true');$('endless').setAttribute('aria-pressed','false');$('modeInfo').textContent='8 волн + босс · ангар и прокачка'};
$('endless').onclick=()=>{gameMode='endless';$('campaign').setAttribute('aria-pressed','false');$('endless').setAttribute('aria-pressed','true');$('modeInfo').textContent='Без остановок · подбирай улучшения · босс каждые 5 волн'};
$('upgrades').onclick=e=>{let button=e.target.closest('[data-up]');if(button)buyUpgrade(button.dataset.up)};
$('repair').onclick=()=>{if(mode==='shop'&&credits>=40&&health<maxHealth()){credits-=40;health=Math.min(maxHealth(),health+40);renderShop();updateHUD()}};
$('continue').onclick=nextWave;
$('exit').onclick=()=>{pickups=[];$('lootLabels').innerHTML='';mode='menu';firing=false;rocketHeld=false;keys={};enemies=[];boss=null;shots=[];missiles=[];bullets=[];$('modal').hidden=true;$('hud').hidden=true;$('menu').hidden=false;$('location').hidden=false;document.body.classList.remove('playing')};

// Continuous survival progression and physical upgrade capsules.
let clearDelay=-1,pickups=[],pickupSerial=0;
const lootTypes=['damage','rate','rocket','armor','engine','multishot','repair'];
const lootNames={damage:'УРОН +',rate:'ТЕМП +',rocket:'РАКЕТЫ +',armor:'ЩИТ +',engine:'ДВИГАТЕЛИ +',multishot:'4 СТВОЛА',repair:'РЕМОНТ'};
const lootColors={damage:[1,.72,.22],rate:[.4,1,.7],rocket:[.9,.55,1],armor:[.3,.7,1],engine:[.5,1,1],multishot:[1,.4,.25],repair:[.4,1,.4]};
function enemyDamageScale(){return 1+wave*.075+wave*wave*.001}
function dropLoot(e,guaranteed=false){
 if(gameMode!=='endless')return;
 if(!guaranteed&&kills%3!==0&&Math.random()>.2)return;
 let count=guaranteed?3:1;
 for(let i=0;i<count;i++){const type=guaranteed&&i===0?'repair':lootTypes[pickupSerial++%lootTypes.length];pickups.push({x:e.x+(i-1)*(guaranteed?2:0),y:e.y,z:e.z,type,life:15,spin:Math.random()*6})}
 if(pickups.length>25)pickups.splice(0,pickups.length-25);
}
function collectLoot(p){
 if(p.type==='repair'){health=Math.min(maxHealth(),health+40);ammo=Math.min(maxAmmo(),ammo+2)}
 else{let u=upgrades.find(u=>u.id===p.type),id=p.type;if(levels[id]>=(u.max||99))id='damage';p.actualName=lootNames[id];levels[id]++;if(id==='armor')health=Math.min(maxHealth(),health+25);if(id==='rocket')ammo=Math.min(maxAmmo(),ammo+3)}
 notify('ПОДОБРАНО · '+(p.actualName||lootNames[p.type]));tone(650,.16,'sine',.07);burst(p.x,p.y,p.z,lootColors[p.type],12);p.life=-1;
}
function updatePickups(dt){
 for(const p of pickups){let old={x:p.x,y:p.y,z:p.z};p.life-=dt;p.spin+=dt*2;
 const bound=Math.min(11,aspect*6);p.x+=(clamp(p.x,-bound,bound)-p.x)*(1-Math.exp(-1.2*dt));p.y+=(clamp(p.y,-5,7)-p.y)*(1-Math.exp(-1.2*dt));
 let dx=px-p.x,dy=py-p.y,dz=3-p.z,d=Math.hypot(dx,dy,dz);
 if(d<8){let v=14/Math.max(d,.01);p.x+=dx*v*dt;p.y+=dy*v*dt;p.z+=dz*v*dt}else p.z+=19*dt;
 if(sweep(old,p,{x:px,y:py,z:3},1.8)!==null)collectLoot(p);
 }pickups=pickups.filter(p=>p.life>0&&p.z<12);
}
function renderPickups(){
 let labels='';for(const p of pickups){let c=lootColors[p.type];parentMatrix=matrix(p.x,p.y,p.z,1,1,1,p.spin*.4,p.spin,p.spin*.2);draw(cube,0,0,0,.38,.38,.38,[.12,.2,.25]);for(const side of [-1,1]){draw(cube,side*.42,0,0,.05,.44,.44,c,1);draw(cube,0,side*.42,0,.44,.05,.44,c,1)}draw(orb,0,0,0,.28,.28,.6,c,2);parentMatrix=null;
 gl.depthMask(false);draw(starMesh,p.x,p.y,p.z,.85,.85,.85,c,1,0,0,0,.12);gl.depthMask(true);
 if(p.z<10){let q=project(p.x,p.y,p.z);if(q.x>0&&q.x<W&&q.y>0&&q.y<H)labels+='<span style="left:'+q.x+'px;top:'+(q.y-24)+'px;color:rgb('+c.map(v=>Math.round(v*255)).join(',')+')">'+lootNames[p.type]+'</span>'}
 }$('lootLabels').innerHTML=mode==='play'?labels:'';
}
function renderProjectiles(){
 for(const b of bullets)projectileModel(b,'player',levels.damage>=3?[.5,.7,1]:cyan);
 for(const s of shots)projectileModel(s,s.homing?'missile':s.kind||'bolt',s.color||red);
}

// Cached cratered geometry: stable local features rotate with each asteroid.
function craterMesh(seed,rows,cols){
 const craters=Array.from({length:13},(_,i)=>{let a=(i*.754877+seed*.13)%1*Math.PI*2,z=-.88+1.76*((i*.618034+seed*.21)%1),q=Math.sqrt(1-z*z);return {n:[Math.cos(a)*q,z,Math.sin(a)*q],r:.10+((i*.37+seed*.11)%1)*.24}});
 const v=(a,b)=>{let n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];let r=.87+.065*Math.sin(n[0]*11+seed)*Math.sin(n[1]*9+n[2]*5)+.035*Math.sin(n[2]*29+n[0]*17);for(let c of craters){let d=Math.hypot(...n.map((x,i)=>x-c.n[i]))/c.r;r-=.115*Math.exp(-d*d*3);r+=.038*Math.exp(-(((d-.98)*6)**2))}return n.map(x=>x*r)};
 let p=[],ns=[];for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let a=i*Math.PI/rows,b=j*2*Math.PI/cols,c=(i+1)*Math.PI/rows,d=(j+1)*2*Math.PI/cols;let q=[v(a,b),v(c,b),v(c,d),v(a,b),v(c,d),v(a,d)];for(let k=0;k<6;k+=3){let u=q[k+1].map((x,l)=>x-q[k][l]),w=q[k+2].map((x,l)=>x-q[k][l]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(n.reduce((s,x,l)=>s+x*q[k][l],0)<0)n=n.map(x=>-x);for(let t=0;t<3;t++){p.push(...q[k+t]);ns.push(...n)}}}let m=mesh(p,ns);m.surface=2;return m;
}
const asteroidMeshes=Array.from({length:6},(_,i)=>({near:craterMesh(i+1,40,60),far:craterMesh(i+1,12,20)}));
function renderAsteroid(r){if(r.detailSeed===undefined)r.detailSeed=Math.floor(Math.random()*6);let set=asteroidMeshes[r.detailSeed],near=r.z> -90,col=[[.29,.27,.24],[.24,.28,.32],[.32,.24,.20]][r.detailSeed%3];draw(near?set.near:set.far,r.x,r.y,r.z,r.r,r.r*.8,r.r,col,0,r.a+time*.05,r.a,0)}
function ringMesh(){let p=[],n=[];for(let i=0;i<48;i++){let a=i*Math.PI/24,b=(i+1)*Math.PI/24;for(let q of [[a,.89],[b,.89],[b,1],[a,.89],[b,1],[a,1]]){p.push(Math.cos(q[0])*q[1],Math.sin(q[0])*q[1],0);n.push(0,0,1)}}return mesh(p,n)}
const haloRing=ringMesh();
function projectileModel(p,kind,color){
 let speed=Math.hypot(p.vx,p.vy,p.vz);if(speed<.001)return;
 parentMatrix=matrix(p.x,p.y,p.z,1,1,1,Math.asin(clamp(p.vy/speed,-1,1)),Math.atan2(-p.vx,-p.vz),0);
 const missile=kind==='missile',plasma=kind==='plasma',rail=kind==='rail',player=kind==='player',white=[.85,.95,1],steel=[.45,.51,.56];
 if(missile){
 draw(tube,0,0,0,.18,.18,.68,steel);draw(orb,0,0,-.72,.17,.17,.3,[.12,.18,.22]);draw(orb,0,0,-.96,.09,.09,.05,color,.9);
 for(let z of [-.48,.05,.48])draw(tube,0,0,z,.19,.19,.035,[.08,.1,.13]);
 for(let side of [-1,1]){draw(cube,side*.184,0,-.16,.012,.055,.2,color,.25);draw(hull,side*.24,0,.4,.23,.045,.22,steel,0,0,0,-side*.2);draw(hull,0,side*.24,.4,.045,.23,.22,steel);draw(cube,side*.15,.10,.14,.022,.022,.3,[.11,.14,.16]);}
 draw(tube,0,0,.73,.21,.21,.12,metal);draw(tube,0,0,.86,.14,.14,.03,[1,.85,.5],2);draw(orb,0,0,1.03,.13,.13,.28,white,2);
 }else if(plasma){
 draw(orb,0,0,0,.22,.22,.4,[1,.9,.65],1.6);
 for(let i=0;i<3;i++){let a=time*5+i*2.094;draw(haloRing,0,0,0,.43,.43,.43,color,1,Math.sin(a)*.8,a);draw(orb,Math.cos(a)*.29,Math.sin(a)*.29,Math.sin(a*2)*.2,.07,.07,.12,color,2)}
 }else{
 let radius=rail?.075:.07,length=rail?1.4:.46;
 draw(tube,0,0,0,radius,radius,length,player?[.68,.55,.3]:steel,.1);draw(orb,0,0,-length,.072,.072,.24,white,.6);
 draw(tube,0,0,length*.6,radius*1.2,radius*1.2,.045,color,1.6);
 if(rail){for(let i=0;i<3;i++)draw(haloRing,0,0,.4+i*.42,.17,.17,1,color,1,0,0,time*9);draw(cube,0,0,.5,.15,.018,.4,steel)}
 else {draw(tube,0,0,-.16,.08,.08,.022,[.14,.12,.09]);draw(cube,0,0,.25,.13,.018,.17,steel)}
 }
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 if(missile){draw(orb,0,0,1.42,.23,.23,.72,color,2,0,0,0,.35);for(let i=0;i<3;i++)draw(haloRing,0,0,1+i*.27,.10+i*.025,.10+i*.025,1,white,1,0,0,0,.4-i*.09)}
 else{draw(orb,0,0,plasma?.1:.8,plasma?.48:.15,plasma?.48:.15,rail?2.6:plasma?.7:1.1,color,1,0,0,0,.16);draw(tube,0,0,rail?2:1.1,.03,.03,rail?1.4:.7,color,2,0,0,0,.45)}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);parentMatrix=null;
}
// Class-specific armour, exposed mechanisms and weapon assemblies.
function enemyDetail(e){const d=enemyDefs[e.type]||enemyDefs.frigate,c=d.color,heavy=e.type==='frigate'||e.type==='bomber';
 parentMatrix=matrix(e.x,e.y,e.z,d.size,d.size,d.size,0,Math.PI,-(e.vx||0)*.025);
 let plate=[.34,.38,.43],dark=[.045,.065,.08];
 for(let side of [-1,1]){
  let x=heavy?1.5:1.05;
  for(let j=0;j<3;j++){let z=-.65+j*.64;draw(cube,side*x,.39,z,heavy?.36:.26,.07,.25,plate);draw(cube,side*x,.47,z,.22,.012,.016,dark);draw(tube,side*(x+.17),.47,z-.17,.025,.025,.025,[.66,.68,.7],0,Math.PI/2);}
  draw(tube,side*x,.1,1.7,.27,.27,.18,dark);draw(haloRing,side*x,.1,1.9,.26,.26,1,plate);draw(orb,side*x,.1,2.1,.16,.16,.45,c,1);
  if(e.type==='bomber'){for(let j=0;j<3;j++){let xx=side*(1.27+j*.22);draw(tube,xx,-.18,-1.28,.085,.085,.28,plate);draw(orb,xx,-.18,-1.58,.075,.075,.13,c,.3)}draw(cube,side*1.5,.5,.8,.35,.04,.35,dark)}
  if(e.type==='fighter'||e.type==='scout'){let xx=side*(e.type==='scout'?1.55:1.85);draw(tube,xx,.06,-.7,.13,.13,.38,dark);for(let j=0;j<3;j++){let a=j*2.094+e.age*3;draw(tube,xx+Math.cos(a)*.075,.06+Math.sin(a)*.075,-1.15,.03,.03,.46,plate)}draw(hull,side*1.7,.08,.4,.45,.05,e.type==='scout'?1.2:.65,plate);}
  if(e.type==='frigate'){draw(tube,side*1.5,.7,-.35,.34,.34,.19,dark,0,Math.PI/2);for(let j of [-1,1])draw(tube,side*1.5+j*.13,.85,-.8,.085,.085,.65,plate);draw(orb,side*1.5,.85,-1.47,.1,.1,.07,c,1);}
 }
 draw(orb,0,heavy?.75:.53,-.75,.3,.12,.4,[.04,.22,.29],.3);draw(cube,0,heavy?.88:.66,-.75,.018,.025,.37,plate);
 if(e.type==='sniper'){for(let i=0;i<6;i++){draw(haloRing,0,.2,-1.1-i*.37,.23,.23,1,plate);draw(tube,0,.2,-1.13-i*.37,.18,.18,.05,c,e.charge>0?1.2:.2)}for(let side of [-1,1])draw(cube,side*.22,.2,-2,.05,.12,1.2,plate);}
 if(heavy){draw(tube,.4,1.1,.6,.035,.035,.6,plate,0,Math.PI/2);draw(orb,.4,1.72,.6,.06,.06,.06,c,1)}
 if(e.hp/e.maxHp<.45){draw(hull,.3,.48,.4,.3,.04,.4,[.055,.035,.03]);draw(orb,.28,.53,.45,.08,.06,.16,orange,.6+Math.sin(time*17)*.4)}
 parentMatrix=null;
}
function bossDetail(b){
 parentMatrix=matrix(b.x,b.y,b.z,1,1,1,0,0,0);
 for(let side of [-1,1]){for(let i=0;i<5;i++){let z=-3+i*2;draw(cube,side*7,1.77,z,1.65,.14,.78,[.32,.36,.40]);for(let j=0;j<3;j++)draw(cube,side*7,1.94,z-.4+j*.3,1.15,.018,.04,[.055,.075,.085]);}draw(tube,side*7,2.2,-.7,.7,.7,.25,metal,0,Math.PI/2);for(let j of [-1,1]){draw(tube,side*7+j*.3,2.65,1,.16,.16,1.8,[.42,.46,.49]);draw(haloRing,side*7+j*.3,2.65,2.85,.22,.22,1,orange,1)}draw(cube,side*3.8,2.3,0,.08,.9,.08,metal);draw(orb,side*3.8,3.25,0,.12,.12,.12,red,1);}
 parentMatrix=null;
}
function renderBlast(b){let age=1-b.life/1.9,fade=Math.max(0,1-age),r=b.r;
 // A short white ignition, expanding fire lobes, cooling smoke and a thin shock front.
 gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 if(age>.12)for(let i=0;i<7;i++){let a=i*2.399,s=r*(.16+age*.18),reach=r*age*.45;draw(orb,b.x+Math.cos(a)*reach,b.y+Math.sin(a)*reach,b.z+Math.sin(a*3)*reach,s,s*.83,s,[.085,.07,.065],0,0,0,0,fade*.21)}
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
 if(age<.16){let s=r*(.09+age*2);draw(orb,b.x,b.y,b.z,s,s,s,[1,.9,.65],1.4,0,0,0,(1-age/.16)*.8)}
 for(let i=0;i<9;i++){let a=i*2.399,reach=r*(.08+age*.55),s=r*(.08+age*.14),heat=Math.max(0,1-age*1.5);if(heat>0)draw(orb,b.x+Math.cos(a)*reach,b.y+Math.sin(a)*reach,b.z+Math.sin(i*3.7)*reach,s,s*.8,s,[1,.18+heat*.5,.035+heat*.1],.7,age*4,a,0,heat*.55)}
 let s=r*(.1+age*1.5);draw(haloRing,b.x,b.y,b.z,s,s,s,[1,.55,.18],1,0,0,0,fade*fade*.6);
 gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
}

let last=performance.now();function frame(now){let dt=Math.min((now-last)/1000,.12);last=now;accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120}render(dt);requestAnimationFrame(frame)} // Stage 1 bootstrap starts the frame loop after all systems load.
