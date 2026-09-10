'use strict';
// ===== VOID SECTOR — кандидаты звука орудия игрока (GATE 4) =====
// Один и тот же код используется страницей превью (sfx-preview.html) и офлайн-рендером
// в mp3 (render.html) — что слышно в превью, то и лежит в файлах. Примитивы повторяют
// audio.js (env/sweep/G/F/O/N/click/boom), чтобы выбранный кандидат переносился 1:1.
// makeGunSynth(ctx, dest) → {GUNS, prims}; GUNS[id](t, {count, critical}) планирует выстрел в t.
function makeGunSynth(ctx,dest){
 const len=ctx.sampleRate*2,nb=ctx.createBuffer(1,len,ctx.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<len;i++)nd[i]=Math.random()*2-1;
 const rnd=()=>Math.random(),rv=k=>1+(rnd()*2-1)*k;
 function env(p,t,a,peak,d,tail=.0005){p.setValueAtTime(0,t);p.linearRampToValueAtTime(Math.max(peak,.0006),t+Math.max(a,.001));p.exponentialRampToValueAtTime(tail,t+Math.max(a,.001)+Math.max(d,.005))}
 function sweep(p,f0,f1,t0,t1){p.setValueAtTime(Math.max(1,f0),t0);p.exponentialRampToValueAtTime(Math.max(1,f1),t1)}
 function G(d,t,a,peak,dur,tail){const g=ctx.createGain();g.connect(d);env(g.gain,t,a,peak,dur,tail);return g}
 function F(type,f,q,d){const x=ctx.createBiquadFilter();x.type=type;x.frequency.value=f;x.Q.value=q;x.connect(d);return x}
 function O(type,f,t0,t1,d,detune=0){const o=ctx.createOscillator();o.type=type;o.frequency.value=f;if(detune)o.detune.value=detune;o.connect(d);o.start(t0);o.stop(t1+.02);return o}
 function N(t0,t1,d){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;s.connect(d);s.start(t0,rnd()*1.7);s.stop(t1+.02);return s}
 function shaper(k,d){const x=ctx.createWaveShaper();const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const v=i/(n-1)*2-1;c[i]=(1+k)*v/(1+k*Math.abs(v))}x.curve=c;x.oversample='2x';x.connect(d);return x}
 function click(d,t,vol,hp=2500,dur=.02){N(t,t+dur+.02,F('highpass',hp,.7,G(d,t,.001,vol,dur)))}
 function boom(d,t,f0,f1,dur,vol){const g=G(d,t,.004,vol,dur);sweep(O('sine',f0,t,t+dur+.05,g).frequency,f0,f1,t,t+dur*.8)}
 // «голос» выстрела: ±1.5 дБ громкости (высота варьируется внутри кандидата через rv(.03))
 function voice(t,gainMul=1){const v=ctx.createGain();v.gain.value=gainMul*Math.pow(10,(rnd()*3-1.5)/20);v.connect(dest);return v}
 const GUNS={
  // REF — текущая процедурная подпись игры (без Kenney laserSmall)
  ref(t,o={}){const n=Math.max(1,Math.min(4,(o.count||2)/2)),A=.45+n*.12,p=rv(.08),v=voice(t);
   N(t,t+.05,F('highpass',1400*p,.8,G(v,t,.002,A*.5,.03)));
   const c=O('sine',900*p,t,t+.09,G(v,t,.001,A*.5,.06));sweep(c.frequency,900*p,200*p,t,t+.07);
   if(o.critical){const g=G(v,t,.004,.22,.11);sweep(O('triangle',2600*p,t,t+.15,g).frequency,2600*p,1700,t,t+.11)}},
  // A — MASS DRIVER: транзиент → плотное низко-среднее тело → металлический затвор → микро-хвост
  A(t,o={}){const p=rv(.03),n=Math.max(1,Math.min(4,(o.count||2)/2)),A=.5+n*.08,v=voice(t);
   click(v,t,.55*A,1800,.012);
   boom(v,t,110*p,60*p,.075,.7*A);
   const body=G(v,t,.002,.3*A,.06),bl=F('lowpass',900,1.2,body);O('triangle',95*p,t,t+.09,shaper(1.8,bl));
   N(t+.004,t+.05,F('bandpass',3200*p,8,G(v,t+.004,.002,.16*A,.04)));
   N(t+.02,t+.07,F('lowpass',700,.8,G(v,t+.02,.006,.08*A,.045)));
   if(o.critical){boom(v,t,55*p,38,.14,.55);click(v,t+.008,.3,900,.02);N(t,t+.09,F('bandpass',2400*p,6,G(v,t,.002,.14,.07)))}},
  // B — PULSE CANNON: транзиент → пилообразный импульс 420→180 → тело 160 Гц → короткий зип
  B(t,o={}){const p=rv(.03),n=Math.max(1,Math.min(4,(o.count||2)/2)),A=.45+n*.09,v=voice(t);
   click(v,t,.45*A,3000,.008);
   const g=G(v,t,.002,.42*A,.045),lp=F('lowpass',2200,1.5,g);sweep(O('sawtooth',420*p,t,t+.06,lp).frequency,420*p,180*p,t,t+.03);
   const b=G(v,t+.003,.003,.32*A,.06);O('square',160*p,t,t+.08,F('lowpass',800,1,b));
   const z=G(v,t+.01,.004,.07*A,.04);sweep(O('sine',2400*p,t+.01,t+.06,z).frequency,2400*p,1200*p,t+.01,t+.05);
   if(o.critical){boom(v,t,70*p,42,.12,.5);const q=G(v,t,.002,.2,.09),f=F('bandpass',1200*p,3,q);sweep(f.frequency,1200*p,500,t,t+.09);N(t,t+.1,f)}},
  // C — MILITARY SCI-FI: крак → «чанк» через сатурацию → два щелчка затвора → слабый пинг
  C(t,o={}){const p=rv(.03),n=Math.max(1,Math.min(4,(o.count||2)/2)),A=.5+n*.08,v=voice(t);
   click(v,t,.6*A,2500,.01);
   const b=G(v,t,.002,.55*A,.05),lp=F('lowpass',1100,1,b);sweep(O('triangle',240*p,t,t+.07,shaper(3,lp)).frequency,240*p,90*p,t,t+.05);
   boom(v,t,80*p,50,.06,.35*A);
   click(v,t+.028,.22*A,4000,.008);click(v,t+.052,.16*A,4200,.008);
   N(t+.006,t+.06,F('bandpass',2000*p,10,G(v,t+.006,.002,.1*A,.05)));
   if(o.critical){boom(v,t,52*p,36,.15,.6);click(v,t+.004,.35,1500,.018);N(t,t+.12,F('bandpass',900*p,4,G(v,t,.003,.18,.1)))}}
 };
 // Сценарии прослушивания — одинаковые для превью и рендера
 const PATTERNS={
  single:{dur:1.0,run:(gun,t0)=>gun(t0,{count:2})},
  burst:{dur:1.9,run:(gun,t0)=>{for(let i=0;i<5;i++)gun(t0+i*.11,{count:2})}},
  max:{dur:3.0,run:(gun,t0)=>{for(let i=0;i<36;i++)gun(t0+i*.055,{count:4})}},   // ~2 с максимального темпа, 4 ствола
  crit:{dur:1.0,run:(gun,t0)=>gun(t0,{count:2,critical:true})}
 };
 return {GUNS,PATTERNS,prims:{env,sweep,G,F,O,N,click,boom,voice,rv}};
}
