'use strict';
// ===== VOID SECTOR — Этап 2: процедурная геометрия =====
// Сырые генераторы (позиции/нормали), сборщик моделей с вершинными материалами,
// генератор астероидов (икосаэдр → subdivide → деформация → впадины → кратеры → шум → нормали → материал).
let gfxMeshId=1;
// Сырая геометрия: {p:[x,y,z,...], n:[...]} без цветов; сборщик добавляет цвет/материал.
function geoTri(p,n,a,b,c,flip=false){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let nn=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...nn)||1;nn=nn.map(x=>x/l);if(flip){nn=nn.map(x=>-x);[b,c]=[c,b]}for(const q of [a,b,c]){p.push(q[0],q[1],q[2]);n.push(nn[0],nn[1],nn[2])}}
function geoQuad(p,n,a,b,c,d,flip=false){geoTri(p,n,a,b,c,flip);geoTri(p,n,a,c,d,flip)}
// Ориентирует треугольники наружу от центра (для выпуклых тел).
function geoOutward(p,n){for(let i=0;i<p.length;i+=9){const cx=(p[i]+p[i+3]+p[i+6])/3,cy=(p[i+1]+p[i+4]+p[i+7])/3,cz=(p[i+2]+p[i+5]+p[i+8])/3;if(n[i]*cx+n[i+1]*cy+n[i+2]*cz<0){for(let k=0;k<9;k++)n[i+k]=-n[i+k];const t=[p[i+3],p[i+4],p[i+5]];p[i+3]=p[i+6];p[i+4]=p[i+7];p[i+5]=p[i+8];p[i+6]=t[0];p[i+7]=t[1];p[i+8]=t[2]}}}
function boxGeo(w=1,h=1,d=1){const p=[],n=[],v=[[-w,-h,-d],[w,-h,-d],[w,h,-d],[-w,h,-d],[-w,-h,d],[w,-h,d],[w,h,d],[-w,h,d]];for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[2,3,7,6],[1,2,6,5],[3,0,4,7]])geoQuad(p,n,v[f[0]],v[f[1]],v[f[2]],v[f[3]]);return{p,n}}
// Скошенный параллелепипед: грани + фаски по рёбрам; даёт живые блики на корпусах.
function bevelBoxGeo(w=1,h=1,d=1,b=.12){b=Math.min(b,w*.45,h*.45,d*.45);const p=[],n=[];const V=(sx,sy,sz,ax)=>[sx*(ax===0?w:w-b),sy*(ax===1?h:h-b),sz*(ax===2?d:d-b)];
 for(const [ax,sign] of [[0,1],[0,-1],[1,1],[1,-1],[2,1],[2,-1]]){const others=[0,1,2].filter(k=>k!==ax);const c=[];for(const [s1,s2] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const q=[0,0,0];q[ax]=sign;q[others[0]]=s1;q[others[1]]=s2;c.push(V(q[0],q[1],q[2],ax))}geoQuad(p,n,c[0],c[1],c[2],c[3])}
 geoOutward(p,n);
 // фаски рёбер
 const E=[[0,1,2],[0,2,1],[1,2,0]];for(const [a1,a2,along] of E)for(const s1 of [-1,1])for(const s2 of [-1,1]){const A=[0,0,0],B=[0,0,0],C=[0,0,0],D=[0,0,0];const dims=[w,h,d];const set=(q,t,inA,inB)=>{q[along]=t*(dims[along]-b);q[a1]=s1*(inA?dims[a1]-b:dims[a1]);q[a2]=s2*(inB?dims[a2]-b:dims[a2])};set(A,-1,false,true);set(B,1,false,true);set(C,1,true,false);set(D,-1,true,false);geoQuad(p,n,A,B,C,D)}
 // угловые треугольники
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){const a=[sx*w,sy*(h-b),sz*(d-b)],c2=[sx*(w-b),sy*h,sz*(d-b)],c3=[sx*(w-b),sy*(h-b),sz*d];geoTri(p,n,a,c2,c3)}
 geoOutward(p,n);return{p,n}}
// Клин/фюзеляж: нос в -z, корма в +z. Аналог старого hull.
function wedgeGeo(){const v=[[0,0,-3],[-1,0,1.5],[1,0,1.5],[0,.65,.7],[0,-.3,1]],f=[[0,1,3],[0,3,2],[1,2,3],[0,4,1],[0,2,4],[1,4,2]],p=[],n=[];for(const t of f)geoTri(p,n,v[t[0]],v[t[1]],v[t[2]]);geoOutward(p,n);return{p,n}}
// Цилиндр/конус вдоль z: радиусы r1 (z=-1) и r2 (z=+1), с крышками.
function cylGeo(seg=14,r1=1,r2=1,caps=true){const p=[],n=[];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;const A=[Math.cos(a)*r1,Math.sin(a)*r1,-1],B=[Math.cos(b)*r1,Math.sin(b)*r1,-1],C=[Math.cos(b)*r2,Math.sin(b)*r2,1],D=[Math.cos(a)*r2,Math.sin(a)*r2,1];
 // сглаженные нормали боковой поверхности
 const slope=(r1-r2)/2;const nA=[Math.cos(a),Math.sin(a),slope],nB=[Math.cos(b),Math.sin(b),slope];const norm=q=>{const l=Math.hypot(...q)||1;return q.map(x=>x/l)};const na=norm(nA),nb=norm(nB);
 if(r2>0||r1>0){for(const [q,nn] of [[A,na],[B,nb],[C,nb],[A,na],[C,nb],[D,na]]){p.push(...q);n.push(...nn)}}
 if(caps){if(r1>0){p.push(0,0,-1,B[0],B[1],-1,A[0],A[1],-1);n.push(0,0,-1,0,0,-1,0,0,-1)}if(r2>0){p.push(0,0,1,D[0],D[1],1,C[0],C[1],1);n.push(0,0,1,0,0,1,0,0,1)}}}
 return{p,n}}
function sphereGeo(rows=12,cols=18){const p=[],n=[];const v=(a,b)=>[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*Math.PI/rows,b=j*2*Math.PI/cols,c=(i+1)*Math.PI/rows,d=(j+1)*2*Math.PI/cols;for(const q of [v(a,b),v(c,b),v(c,d),v(a,b),v(c,d),v(a,d)]){p.push(...q);n.push(...q)}}return{p,n}}
function torusGeo(R=1,r=.2,seg=24,tube=8){const p=[],n=[];for(let i=0;i<seg;i++)for(let j=0;j<tube;j++){const pt=(ii,jj)=>{const a=ii/seg*Math.PI*2,b=jj/tube*Math.PI*2;const cx=Math.cos(a)*R,cy=Math.sin(a)*R;const nx=Math.cos(a)*Math.cos(b),ny=Math.sin(a)*Math.cos(b),nz=Math.sin(b);return[[cx+nx*r,cy+ny*r,nz*r],[nx,ny,nz]]};const A=pt(i,j),B=pt(i+1,j),C=pt(i+1,j+1),D=pt(i,j+1);for(const q of [A,B,C,A,C,D]){p.push(...q[0]);n.push(...q[1])}}return{p,n}}
// Плоское кольцо (аннулус) в плоскости XY, двустороннее.
function annulusGeo(r1=.85,r2=1,seg=40){const p=[],n=[];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;const A=[Math.cos(a)*r1,Math.sin(a)*r1,0],B=[Math.cos(b)*r1,Math.sin(b)*r1,0],C=[Math.cos(b)*r2,Math.sin(b)*r2,0],D=[Math.cos(a)*r2,Math.sin(a)*r2,0];for(const q of [A,B,C,A,C,D]){p.push(...q);n.push(0,0,1)}}return{p,n}}
// Плавник/киль: треугольная призма (основание вдоль z, вершина по y).
function finGeo(len=1,height=1,thick=.06,sweep=.5){const p=[],n=[];const a=[-thick,0,-len],b=[-thick,0,len],c=[-thick,height,len*sweep],a2=[thick,0,-len],b2=[thick,0,len],c2=[thick,height,len*sweep];geoTri(p,n,a,b,c);geoTri(p,n,a2,c2,b2);geoQuad(p,n,a,a2,c2,c);geoQuad(p,n,b,c,c2,b2);geoQuad(p,n,a,b,b2,a2);geoOutward(p,n);return{p,n}}
// Икосфера с общими вершинами (для сглаженных нормалей).
function icosphere(subdiv=2){const t=(1+Math.sqrt(5))/2;let verts=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(x=>x/l)});
 let faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 for(let s=0;s<subdiv;s++){const cache=new Map(),nf=[];const mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(cache.has(k))return cache.get(k);const v=[verts[a][0]+verts[b][0],verts[a][1]+verts[b][1],verts[a][2]+verts[b][2]],l=Math.hypot(...v);verts.push(v.map(x=>x/l));cache.set(k,verts.length-1);return verts.length-1};for(const [a,b,c] of faces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca])}faces=nf}
 return{verts,faces}}
// Сглаженные нормали по общим вершинам и развёртка в неиндексированный массив.
function expandIndexed(verts,faces,colors=null){const acc=verts.map(()=>[0,0,0]);for(const [a,b,c] of faces){const A=verts[a],B=verts[b],C=verts[c],u=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],v=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],nn=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const i of [a,b,c]){acc[i][0]+=nn[0];acc[i][1]+=nn[1];acc[i][2]+=nn[2]}}
 const p=[],n=[],c=[];for(const f of faces)for(const i of f){p.push(...verts[i]);const l=Math.hypot(...acc[i])||1;n.push(acc[i][0]/l,acc[i][1]/l,acc[i][2]/l);if(colors)c.push(...colors[i])}return colors?{p,n,c}:{p,n}}
// Загрузка «богатого» меша: pos3 + normal3 + color3 + mat3 (rough, metal, glow), stride 48.
function richMesh(p,n,c,m,extra={}){const count=p.length/3,data=new Float32Array(count*12);for(let i=0;i<count;i++){const o=i*12;data[o]=p[i*3];data[o+1]=p[i*3+1];data[o+2]=p[i*3+2];data[o+3]=n[i*3];data[o+4]=n[i*3+1];data[o+5]=n[i*3+2];data[o+6]=c[i*3];data[o+7]=c[i*3+1];data[o+8]=c[i*3+2];data[o+9]=m[i*3];data[o+10]=m[i*3+1];data[o+11]=m[i*3+2]}
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return Object.assign({b,count,stride:48,id:gfxMeshId++},extra)}
// Простой меш из сырой геометрии (stride 24) с материалом по умолчанию.
function simpleMesh(geo,extra={}){const m=mesh(geo.p,geo.n);m.id=gfxMeshId++;return Object.assign(m,extra)}
// ---------- Сборщик моделей ----------
class ModelBuilder{
 constructor(){this.p=[];this.n=[];this.c=[];this.m=[]}
 // add(geo,{x,y,z,sx,sy,sz,rx,ry,rz,color,rough,metal,glow,mirror})
 add(geo,o={}){
  const sx=o.sx??o.s??1,sy=o.sy??o.s??1,sz=o.sz??o.s??1;
  const sides=o.mirror?[1,-1]:[1];
  for(const side of sides){
   const M=matrix(o.x||0,o.y||0,o.z||0,sx,sy,sz,o.rx||0,o.ry||0,o.rz||0);
   const N=new Float32Array(9);gfxNormalMatrix(M,N);
   const col=o.color||[.5,.55,.6],rough=o.rough??.5,metal=o.metal??.7,glow=o.glow??0;
   const P=geo.p,Nn=geo.n;
   for(let i=0;i<P.length;i+=3){
    const x=P[i],y=P[i+1],z=P[i+2];
    this.p.push(side*(M[0]*x+M[4]*y+M[8]*z+M[12]),M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14]);
    const nx=Nn[i],ny=Nn[i+1],nz=Nn[i+2];let ox=N[0]*nx+N[3]*ny+N[6]*nz,oy=N[1]*nx+N[4]*ny+N[7]*nz,oz=N[2]*nx+N[5]*ny+N[8]*nz;const l=Math.hypot(ox,oy,oz)||1;
    this.n.push(side*ox/l,oy/l,oz/l);this.c.push(col[0],col[1],col[2]);this.m.push(rough,metal,glow)
   }
   // зеркалирование меняет ориентацию треугольников — восстановить порядок обхода
   if(side<0){const start=this.p.length-P.length;for(let i=start;i<this.p.length;i+=9){for(const arr of [this.p,this.n,this.c,this.m]){const t0=arr[i+3],t1=arr[i+4],t2=arr[i+5];arr[i+3]=arr[i+6];arr[i+4]=arr[i+7];arr[i+5]=arr[i+8];arr[i+6]=t0;arr[i+7]=t1;arr[i+8]=t2}}}
  }
  return this;
 }
 mesh(extra={}){return richMesh(this.p,this.n,this.c,this.m,extra)}
}
// Общие сырые примитивы.
const G={box:boxGeo(),bevel:bevelBoxGeo(1,1,1,.14),bevelThin:bevelBoxGeo(1,1,1,.06),wedge:wedgeGeo(),cyl:cylGeo(14),cyl8:cylGeo(8),cone:cylGeo(14,1,0),coneWide:cylGeo(14,1,.35),sphere:sphereGeo(12,18),sphereLow:sphereGeo(7,10),torus:torusGeo(1,.18,28,8),torusThin:torusGeo(1,.08,32,6),annulus:annulusGeo(.82,1,48),fin:finGeo(1,1,.05,.55),finThick:finGeo(1,1,.12,.35)};
// ---------- Генератор астероидов ----------
// Типы: rock(2), ice(3), carbon(4), volcanic(5), crystal(6), iron(7), cracked(8).
const asteroidTypes={
 rock:{surface:2,base:[.42,.38,.33],alt:[.3,.29,.27],rough:.9,metal:0,color2:[.3,.28,.26]},
 ice:{surface:3,base:[.72,.82,.9],alt:[.55,.7,.85],rough:.3,metal:0,color2:[.45,.7,.95]},
 carbon:{surface:4,base:[.14,.13,.13],alt:[.09,.09,.1],rough:.97,metal:0,color2:[.1,.1,.1]},
 volcanic:{surface:5,base:[.2,.15,.13],alt:[.12,.1,.09],rough:.85,metal:0,color2:[1,.38,.08]},
 cracked:{surface:8,base:[.4,.36,.32],alt:[.26,.24,.22],rough:.9,metal:0,color2:[.9,.5,.2]},
 crystal:{surface:6,base:[.32,.36,.42],alt:[.24,.27,.32],rough:.8,metal:.1,color2:[.35,.9,1]},
 iron:{surface:7,base:[.3,.27,.25],alt:[.22,.2,.19],rough:.85,metal:.1,color2:[.6,.55,.5]}
};
function seededRandom(seed){let s=seed*9301+49297;return()=>{s=(s*9301+49297)%233280;return s/233280}}
function asteroidGeometry(seed,subdiv,typeName){
 const rnd=seededRandom(seed),type=asteroidTypes[typeName]||asteroidTypes.rock;
 const {verts,faces}=icosphere(subdiv);
 // 1–2: базовый икосаэдр, subdivide. 3: деформация низкочастотным шумом.
 const fx=1+rnd()*.5,fy=.7+rnd()*.5,fz=.8+rnd()*.5;const lobes=Array.from({length:3},()=>({d:[rnd()-.5,rnd()-.5,rnd()-.5],k:.12+rnd()*.25}));
 const dents=Array.from({length:3+Math.floor(rnd()*3)},()=>{const d=[rnd()-.5,rnd()-.5,rnd()-.5],l=Math.hypot(...d)||1;return{n:d.map(x=>x/l),r:.35+rnd()*.35,depth:.12+rnd()*.14}});
 const craters=Array.from({length:8+Math.floor(rnd()*10)},()=>{const d=[rnd()-.5,rnd()-.5,rnd()-.5],l=Math.hypot(...d)||1;return{n:d.map(x=>x/l),r:.08+rnd()*.2,depth:.05+rnd()*.09}});
 const phase=[rnd()*10,rnd()*10,rnd()*10];
 const noiseAt=(x,y,z,f,ph)=>Math.sin(x*f+ph)*Math.sin(y*f*1.3+ph*.7)*Math.sin(z*f*.8+ph*1.9);
 const heights=[];
 for(const v of verts){
  let r=1;
  for(const L of lobes){const d=v[0]*L.d[0]+v[1]*L.d[1]+v[2]*L.d[2];r+=L.k*Math.max(0,d)*2}
  r+=.12*noiseAt(v[0],v[1],v[2],2.1,phase[0]);
  // 4: крупные впадины
  for(const d of dents){const dist=Math.hypot(v[0]-d.n[0],v[1]-d.n[1],v[2]-d.n[2])/d.r;if(dist<1.6)r-=d.depth*Math.exp(-dist*dist*1.6)}
  // 5: кратеры с валом
  for(const c of craters){const dist=Math.hypot(v[0]-c.n[0],v[1]-c.n[1],v[2]-c.n[2])/c.r;if(dist<2.2){r-=c.depth*Math.exp(-dist*dist*2.4);r+=c.depth*.45*Math.exp(-(((dist-1.05)*4)**2))}}
  // 6: мелкий шум
  r+=.035*noiseAt(v[0],v[1],v[2],7.3,phase[1])+.018*noiseAt(v[0],v[1],v[2],15.1,phase[2]);
  if(typeName==='crystal'&&noiseAt(v[0],v[1],v[2],4.2,phase[0])>.62)r+=.16;
  heights.push(r);
 }
 const out=verts.map((v,i)=>[v[0]*heights[i]*fx,v[1]*heights[i]*fy,v[2]*heights[i]*fz]);
 // 8: цвет по высоте/впадинам — дно кратеров темнее, гребни светлее.
 const colors=heights.map((h,i)=>{const t=clamp((h-.85)*2.2,0,1);const c=[type.alt[0]+(type.base[0]-type.alt[0])*t,type.alt[1]+(type.base[1]-type.alt[1])*t,type.alt[2]+(type.base[2]-type.alt[2])*t];const v=verts[i];const streak=.9+.2*noiseAt(v[0],v[1],v[2],5.5,phase[2]);return c.map(x=>x*streak)});
 // 7: нормали
 const geo=expandIndexed(out,faces,colors);
 const m=[];for(let i=0;i<geo.p.length/3;i++)m.push(type.rough,type.metal,0);
 return{geo,m,type};
}
function buildAsteroid(seed,typeName,subdiv=4){const{geo,m,type}=asteroidGeometry(seed,subdiv,typeName);return richMesh(geo.p,geo.n,geo.c,m,{surface:type.surface,color2:type.color2,seed:seed*.37,typeName})}
// Пул: для каждого типа несколько уникальных форм в двух уровнях детализации.
const asteroidPool={};
function asteroidVariants(typeName){
 if(asteroidPool[typeName])return asteroidPool[typeName];
 const list=[];const n=typeName==='rock'?6:4;for(let i=0;i<n;i++){const seed=(Object.keys(asteroidTypes).indexOf(typeName)+1)*100+i*7+3;list.push({near:buildAsteroid(seed,typeName,gfx.preset.lod?3:4),far:buildAsteroid(seed,typeName,2)})}
 return asteroidPool[typeName]=list;
}
// Распределение типов по окружению.
const asteroidMix={open:['rock','rock','iron','cracked'],asteroids:['rock','rock','rock','iron','cracked','carbon'],dense:['rock','rock','iron','cracked','carbon','volcanic'],debris:['carbon','rock','iron'],station:['rock','iron'],mines:['carbon','rock','iron'],anomaly:['crystal','crystal','rock','carbon'],star:['volcanic','volcanic','iron','rock'],nebula:['ice','ice','rock','crystal'],alien:['crystal','crystal','carbon','ice']};
function assignAsteroidLook(r,environment){const mix=asteroidMix[environment]||asteroidMix.open;r.kind=mix[Math.floor(Math.random()*mix.length)];const list=asteroidVariants(r.kind);r.variant=Math.floor(Math.random()*list.length);r.tint=.85+Math.random()*.3;r.spinAxis=[Math.random()-.5,Math.random()-.5,Math.random()-.5];r.spin=(Math.random()-.5)*.5;r.sx=.85+Math.random()*.3;r.sy=.75+Math.random()*.35;r.sz=.85+Math.random()*.3;r.seedOffset=Math.random()*40}
// ---------- Обломки корпуса ----------
function wreckChunkMesh(seed){const rnd=seededRandom(seed),b=new ModelBuilder();const plate=[.3,.33,.37],dark=[.12,.14,.17];
 b.add(G.bevelThin,{sx:.5+rnd()*.5,sy:.08+rnd()*.1,sz:.4+rnd()*.7,color:plate,rough:.55,metal:.8});
 b.add(G.box,{x:(rnd()-.5)*.4,y:.1,z:(rnd()-.5)*.4,sx:.15+rnd()*.25,sy:.15+rnd()*.2,sz:.2+rnd()*.3,rx:rnd(),ry:rnd(),color:dark,rough:.7,metal:.6});
 if(rnd()>.4)b.add(G.cyl8,{x:(rnd()-.5)*.5,y:.12,z:0,sx:.06,sy:.06,sz:.5,rx:1.2,color:[.5,.5,.52],rough:.4,metal:.9});
 if(rnd()>.5)b.add(G.fin,{x:.3,y:.08,z:0,sx:.35,sy:.3,sz:.4,ry:rnd()*3,color:plate,rough:.6,metal:.75});
 b.add(G.box,{x:.2,y:-.02,z:.3,sx:.12,sy:.04,sz:.12,color:[1,.5,.15],rough:.5,metal:.2,glow:.8});
 return b.mesh({rough:.6,metal:.8})}
const wreckChunks=Array.from({length:6},(_,i)=>wreckChunkMesh(i*13+5));
// Крупный обломок корабля для фонов и поля обломков.
function bigWreckMesh(seed){const rnd=seededRandom(seed),b=new ModelBuilder();const hullC=[.22,.24,.27],plate=[.3,.32,.35],dark=[.08,.09,.11];
 b.add(G.bevel,{sx:1.6+rnd(),sy:.7+rnd()*.5,sz:3+rnd()*2,color:hullC,rough:.6,metal:.75});
 b.add(G.bevel,{x:0,y:.8,z:-.5,sx:.8,sy:.5,sz:1.4,color:plate,rough:.55,metal:.8});
 for(let i=0;i<5;i++)b.add(G.box,{x:(rnd()-.5)*3,y:(rnd()-.5)*1.4,z:(rnd()-.5)*5,sx:.2+rnd()*.5,sy:.15+rnd()*.4,sz:.3+rnd()*1.2,rx:rnd()*2,ry:rnd()*2,color:dark,rough:.7,metal:.6});
 for(let i=0;i<4;i++)b.add(G.cyl8,{x:(rnd()-.5)*2.5,y:(rnd()-.5)*1.2,z:1+rnd()*2,sx:.08,sy:.08,sz:1+rnd(),rx:(rnd()-.5)*1.5,ry:(rnd()-.5)*1.5,color:[.4,.42,.45],rough:.4,metal:.9});
 b.add(G.fin,{x:1.8,y:0,z:1,sx:1.5,sy:1.6,sz:1.2,rz:-.3,color:plate,rough:.6,metal:.75,mirror:true});
 b.add(G.cyl,{x:.9,y:-.2,z:3.4,sx:.55,sy:.55,sz:.8,color:dark,rough:.5,metal:.8,mirror:true});
 for(let i=0;i<3;i++)b.add(G.box,{x:(rnd()-.5)*2,y:.4+rnd()*.3,z:(rnd()-.5)*3,sx:.08,sy:.04,sz:.08,color:[1,.45,.12],rough:.5,metal:.2,glow:.7});
 return b.mesh({rough:.6,metal:.75})}
const bigWrecks=Array.from({length:4},(_,i)=>bigWreckMesh(i*31+7));
