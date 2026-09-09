'use strict';
// ===== VOID SECTOR — Этап 4: процедурный звук =====
// Философия: никаких внешних ресурсов. Всё синтезируется Web Audio API на лету:
// одиночные эффекты (sfx), петля двигателя и многослойная генеративная музыка.
// Файл подключается после events.js и графики, до story.js. Ничего не бросает при загрузке:
// если Web Audio недоступен — все функции превращаются в пустышки.
let audio=null; // AudioContext, создаётся лениво по первому жесту пользователя или событию 'start'

const audioAPI=(function(){
 const STORAGE_KEY='void-sector-audio',LOOKAHEAD=.12,MAX_VOICES=24;
 const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
 const rnd=()=>Math.random(),rv=k=>1+(Math.random()*2-1)*k; // случайная вариация высоты ±k
 const hz=m=>440*Math.pow(2,(m-69)/12);
 const supported=typeof window!=='undefined'&&!!(window.AudioContext||window.webkitAudioContext);

 // ---------- Настройки громкости ----------
 const settings={master:.7,sfx:.85,music:.45,ui:.6,voice:.9,muted:false};
 function loadSettings(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY));if(s&&typeof s==='object'){for(const k of ['master','sfx','music','ui','voice'])if(typeof s[k]==='number'&&isFinite(s[k]))settings[k]=clamp01(s[k]);if(typeof s.muted==='boolean')settings.muted=s.muted}}catch{}}
 function saveSettings(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings))}catch{}}
 loadSettings();
 try{muted=settings.muted}catch{} // синхронизация с устаревшим глобальным флагом
 const syncButton=()=>{try{const b=document.getElementById('sound');if(b)b.textContent='ЗВУК: '+(settings.muted?'ВЫКЛ':'ВКЛ')}catch{}};
 syncButton();

 // ---------- Узлы мастер-цепи ----------
 let master,compressor,sfxBus,musicBus,uiBus,engineBus,voiceBus,voiceDuck,duckGain,pauseGain,reverbIn,convolver,whiteBuf,pinkBuf,panSupported=false;
 const shaperCache={};
 const now=()=>audio.currentTime;
 function makeNoise(seconds,pink){
  const len=Math.floor(audio.sampleRate*seconds),buf=audio.createBuffer(1,len,audio.sampleRate),d=buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for(let i=0;i<len;i++){const w=Math.random()*2-1;if(!pink){d[i]=w;continue}
   b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;
   d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926}
  return buf}
 function makeImpulse(seconds){
  const len=Math.floor(audio.sampleRate*seconds),buf=audio.createBuffer(2,len,audio.sampleRate);
  for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++){const k=1-i/len;d[i]=(Math.random()*2-1)*Math.pow(k,2.6)*(i<400?i/400:1)}}
  return buf}
 function shaperCurve(k){if(shaperCache[k])return shaperCache[k];const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=(1+k)*x/(1+k*Math.abs(x))}return shaperCache[k]=c}

 // iOS: сообщаем WebKit, что это плеер/игра ("playback"), а не голосовой чат
 // (ambient/transient/transient-solo) — иначе звук молчит при включённом
 // Silent Mode. navigator.audioSession — экспериментальный API, есть не
 // везде, поэтому вызывается best-effort перед каждым (пере)запуском звука.
 function configureAudioSession(){
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}
 }
 // Временная диагностика для проверки на iPhone — см. журнал [AUDIO] в консоли.
 function debugAudio(tag){
  console.debug('[AUDIO]',tag,{
   supported,
   context:audio?.state||'none',
   muted:settings.muted,
   master:settings.master,
   session:navigator.audioSession?.type||'unsupported',
   visibility:document.visibilityState
  });
 }
 function ensureContext(){
  if(audio||!supported)return audio;
  try{
   configureAudioSession();
   const AC=window.AudioContext||window.webkitAudioContext;audio=new AC({latencyHint:'interactive'});
   master=audio.createGain();compressor=audio.createDynamicsCompressor();
   compressor.threshold.value=-16;compressor.knee.value=14;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.22;
   master.connect(compressor);compressor.connect(audio.destination);
   sfxBus=audio.createGain();uiBus=audio.createGain();engineBus=audio.createGain();musicBus=audio.createGain();voiceBus=audio.createGain();voiceDuck=audio.createGain();duckGain=audio.createGain();pauseGain=audio.createGain();
   sfxBus.connect(master);uiBus.connect(master);engineBus.connect(master);voiceBus.connect(master);
   // voiceDuck — приглушает музыку во время речи диалогов (отдельно от duckGain,
   // который приглушают взрывы/EMP): musicBus -> voiceDuck -> duckGain -> pauseGain -> master.
   musicBus.connect(voiceDuck);voiceDuck.connect(duckGain);duckGain.connect(pauseGain);pauseGain.connect(master);
   // Небольшая реверберация как посыл для взрывов, колоколов и боссов.
   reverbIn=audio.createGain();reverbIn.gain.value=.55;convolver=audio.createConvolver();convolver.buffer=makeImpulse(1.2);reverbIn.connect(convolver);convolver.connect(master);
   whiteBuf=makeNoise(2,false);pinkBuf=makeNoise(2,true);
   panSupported=typeof audio.createStereoPanner==='function';
   applyVolumes(true);
   setupMusic();
   if(!pollTimer)pollTimer=setInterval(poll,100);
   audio.onstatechange=()=>debugAudio('statechange');
  }catch(err){console.warn('audio: инициализация не удалась',err);audio=null}
  debugAudio('ensureContext');
  return audio}
 function applyVolumes(immediate){
  if(!audio)return;const t=now(),tc=immediate?.001:.03,set=(g,v)=>{try{g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(v,t,tc)}catch{}};
  set(master,settings.muted?0:settings.master);set(sfxBus,settings.sfx*.9);set(engineBus,settings.sfx*.16);set(uiBus,settings.ui*.7);set(musicBus,settings.music*.75);set(voiceBus,settings.muted?0:settings.voice)}

 // ---------- Озвучка диалогов: предзагруженный LRU-кэш AudioBuffer'ов ----------
 // Не используем HTMLAudio/новые AudioContext — один и тот же audio, декодированные
 // буферы просто переигрываются через voiceBus. MAX_DECODED_VOICE_BUFFERS ограничивает
 // память: 390 реплик разом никогда не декодируются, только те, что реально звучали.
 const MAX_DECODED_VOICE_BUFFERS=12;
 const voiceCache=new Map(),voiceInflight=new Map(),voiceOrder=[];
 function voiceTouch(src){const i=voiceOrder.indexOf(src);if(i>=0)voiceOrder.splice(i,1);voiceOrder.push(src);while(voiceOrder.length>MAX_DECODED_VOICE_BUFFERS){const old=voiceOrder.shift();voiceCache.delete(old)}}
 function preloadVoice(src){
  if(!src)return Promise.resolve(null);
  if(voiceCache.has(src)){voiceTouch(src);return Promise.resolve(voiceCache.get(src))}
  if(voiceInflight.has(src))return voiceInflight.get(src);
  ensureContext();if(!audio)return Promise.resolve(null);
  const p=fetch(src).then(r=>r.arrayBuffer()).then(buf=>audio.decodeAudioData(buf)).then(decoded=>{
   voiceCache.set(src,decoded);voiceTouch(src);voiceInflight.delete(src);return decoded;
  }).catch(err=>{console.warn('voice: не удалось загрузить',src,err);voiceInflight.delete(src);return null});
  voiceInflight.set(src,p);return p;
 }
 let voiceSource=null;
 function duckForVoice(active){
  if(!audio)return;const t=now(),g=voiceDuck.gain;
  try{g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);
   if(active)g.linearRampToValueAtTime(.55,t+.08);else g.linearRampToValueAtTime(1,t+.25)}catch{}
 }
 function stopVoice(){
  if(voiceSource){try{voiceSource.onended=null;voiceSource.stop()}catch{}try{voiceSource.disconnect()}catch{}voiceSource=null;duckForVoice(false)}
 }
 async function playVoice(src,opts){
  const o=opts||{};stopVoice();ensureContext();if(!audio||!src)return false;
  const buf=await preloadVoice(src);if(!buf||voiceSource)return false; // voiceSource!=null: успели вызвать stopVoice()/новую playVoice() пока грузилось
  try{
   const s=audio.createBufferSource();s.buffer=buf;s.connect(voiceBus);
   s.onended=()=>{if(voiceSource===s)voiceSource=null;duckForVoice(false);try{o.onended?.()}catch{}};
   voiceSource=s;duckForVoice(true);s.start();return true;
  }catch(err){console.warn('voice: playVoice упал',err);duckForVoice(false);return false}
 }

 // ---------- Разблокировка контекста по жесту ----------
 // Слушатели НЕ снимаются после первой разблокировки: iOS может в любой
 // момент перевести AudioContext в 'suspended'/'interrupted' (звонок, Siri,
 // сворачивание Telegram), а восстановить его способен только следующий
 // настоящий жест пользователя. unlock() дёшев, пока audio.state==='running'
 // (resume() не вызывается вовсе), так что держать обработчики постоянно
 // ничего не стоит и не подлежит "once"-очистке.
 async function unlock(){
  try{
   configureAudioSession();
   ensureContext();
   if(!audio)return false;
   if(audio.state==='suspended'||audio.state==='interrupted'){
    try{await audio.resume()}catch{}
    debugAudio('resume');
   }
   return audio.state==='running';
  }catch{return false}
 }
 try{for(const ev of ['pointerdown','keydown','touchstart'])document.addEventListener(ev,unlock,{capture:true,passive:true})}catch{}
 // Возврат из фона/Telegram minimize/блокировки экрана — best effort: если iOS
 // всё же требует настоящего user activation, следующий pointerdown его даст.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){configureAudioSession();unlock();debugAudio('visibilitychange')}});
 addEventListener('pageshow',()=>{configureAudioSession();unlock()});
 addEventListener('focus',()=>{configureAudioSession();unlock()});

 // ---------- Управление голосами (ограничение одновременных эффектов) ----------
 const voices=[];
 function spatial(o){
  if(!o||typeof o.x!=='number'||typeof px!=='number')return{amp:1,pan:0};
  const d=Math.hypot(o.x-px,(typeof o.y==='number'?o.y:py)-py,(typeof o.z==='number'?o.z:3)-3);
  return{amp:d<20?1:1/(1+(d-20)/45),pan:Math.max(-.8,Math.min(.8,o.x/22))}}
 function voice(pri,bus,o){
  if(voices.length>=MAX_VOICES){let lo=null;for(const v of voices)if(!lo||v.pri<lo.pri)lo=v;if(!lo||lo.pri>=pri)return null;killVoice(lo)}
  const sp=spatial(o),g=audio.createGain();g.gain.value=sp.amp*(o&&typeof o.volume==='number'?o.volume:1);
  let out=g;if(panSupported&&sp.pan!==0){const p=audio.createStereoPanner();p.pan.value=sp.pan;g.connect(p);out=p}
  out.connect(bus);const v={g,out,pri,src:[],timer:null};voices.push(v);return v}
 function finishVoice(v,t,dur){v.timer=setTimeout(()=>{const i=voices.indexOf(v);if(i>=0)voices.splice(i,1);try{v.out.disconnect()}catch{}},Math.max(0,(t+dur-now())*1000)+150)}
 function killVoice(v){clearTimeout(v.timer);const i=voices.indexOf(v);if(i>=0)voices.splice(i,1);const t=now();try{v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0,t,.008)}catch{}for(const s of v.src)try{s.stop(t+.05)}catch{}setTimeout(()=>{try{v.out.disconnect()}catch{}},120)}

 // ---------- Примитивы синтеза ----------
 function env(p,t,a,peak,d,tail=.0005){p.setValueAtTime(0,t);p.linearRampToValueAtTime(Math.max(peak,.0006),t+Math.max(a,.001));p.exponentialRampToValueAtTime(tail,t+Math.max(a,.001)+Math.max(d,.005))}
 function envHold(p,t,a,peak,hold,r,tail=.0005){p.setValueAtTime(0,t);p.linearRampToValueAtTime(Math.max(peak,.0006),t+Math.max(a,.001));p.setValueAtTime(Math.max(peak,.0006),t+a+hold);p.exponentialRampToValueAtTime(tail,t+a+hold+Math.max(r,.005))}
 function sweep(p,f0,f1,t0,t1){p.setValueAtTime(Math.max(1,f0),t0);p.exponentialRampToValueAtTime(Math.max(1,f1),t1)}
 function gain(v,dest){const g=audio.createGain();g.gain.value=v;g.connect(dest);return g}
 function G(v,t,a,peak,d,tail){const g=audio.createGain();g.connect(v.g);env(g.gain,t,a,peak,d,tail);return g}
 function GH(v,t,a,peak,hold,r){const g=audio.createGain();g.connect(v.g);envHold(g.gain,t,a,peak,hold,r);return g}
 function F(type,f,q,dest){const x=audio.createBiquadFilter();x.type=type;x.frequency.value=f;x.Q.value=q;x.connect(dest);return x}
 function S(k,dest){const x=audio.createWaveShaper();x.curve=shaperCurve(k);x.oversample='2x';x.connect(dest);return x}
 function O(v,type,f,t0,t1,dest,detune=0){const o=audio.createOscillator();o.type=type;o.frequency.value=f;if(detune)o.detune.value=detune;o.connect(dest);o.start(t0);o.stop(t1+.02);if(v)v.src.push(o);return o}
 function N(v,t0,t1,dest,pink=false){const s=audio.createBufferSource();s.buffer=pink?pinkBuf:whiteBuf;s.loop=true;s.connect(dest);s.start(t0,Math.random()*1.7);s.stop(t1+.02);if(v)v.src.push(s);return s}
 function LFO(v,f,depth,param,t0,t1,type='sine'){const o=audio.createOscillator();o.type=type;o.frequency.value=f;const g=audio.createGain();g.gain.value=depth;o.connect(g);g.connect(param);o.start(t0);o.stop(t1+.02);if(v)v.src.push(o);return o}
 function RM(v,type,cf,mf,t0,t1,dest){const g=audio.createGain();g.gain.value=0;g.connect(dest);O(v,type,cf,t0,t1,g);O(v,'sine',mf,t0,t1,g.gain);return g}
 function send(v,amount){const g=audio.createGain();g.gain.value=amount;v.g.connect(g);g.connect(reverbIn);return g}
 function beep(v,t,f,dur,vol,type='triangle',glideTo=null){const g=G(v,t,.004,vol,dur);const o=O(v,type,f,t,t+dur+.05,g);if(glideTo)sweep(o.frequency,f,glideTo,t,t+dur);return o}
 function click(v,t,vol,hp=2500,dur=.02){N(v,t,t+dur+.02,F('highpass',hp,.7,G(v,t,.001,vol,dur)))}
 function boom(v,t,f0,f1,dur,vol){const g=G(v,t,.004,vol,dur);sweep(O(v,'sine',f0,t,t+dur+.05,g).frequency,f0,f1,t,t+dur*.8)}
 function whoosh(v,t,f0,f1,dur,vol,type='bandpass',q=1.2){const g=G(v,t,dur*.3,vol,dur*.7),f=F(type,f0,q,g);sweep(f.frequency,f0,f1,t,t+dur);N(v,t,t+dur,f)}
 function brass(v,t,f,dur,vol,dest){const g=audio.createGain();g.connect(dest||v.g);envHold(g.gain,t,.02,vol,dur*.6,dur*.4);const lp=F('lowpass',f*5,1,g);O(v,'sawtooth',f,t,t+dur+.1,lp,-7);O(v,'sawtooth',f,t,t+dur+.1,lp,7);O(v,'square',f/2,t,t+dur+.1,lp)}

 // ---------- Библиотека одиночных эффектов ----------
 // Каждая функция получает голос v, время t и параметры o; возвращает длительность в секундах.
 const RADIO_PITCH={spectre:520,voronova:680,leya:790,markov:430,unknown:300};
 const SFX={
  gun(v,t,o){const n=Math.max(1,Math.min(4,(o.count||2)/2)),A=.45+n*.12,p=rv(.08);
   N(v,t,t+.05,F('highpass',1400*p,.8,G(v,t,.002,A*.5,.03)));
   const c=O(v,'sine',900*p,t,t+.09,G(v,t,.001,A*.5,.06));sweep(c.frequency,900*p,200*p,t,t+.07);
   if(o.critical)beep(v,t,2600*p,.11,.22,'triangle',1700);return .15},
  overheat(v,t){N(v,t,t+1.3,F('bandpass',2800,.7,G(v,t,.03,.32,1.2)));for(let i=0;i<3;i++)beep(v,t+i*.22,760-i*120,.14,.14,'square',560-i*100);return 1.4},
  heatWarning(v,t){beep(v,t,1250,.06,.14);beep(v,t+.13,1250,.06,.14);return .25},
  missileLaunch(v,t,o){const n=Math.min(3,o.count||1);for(let i=0;i<n;i++){const s=t+i*.08;whoosh(v,s,300,1800,.45,.38,'bandpass',1.4);const g=G(v,s,.01,.32,.42);sweep(O(v,'sawtooth',120*rv(.05),s,s+.5,F('lowpass',700,1,g)).frequency,120,60,s,s+.4)}return .6},
  lockTick(v,t){beep(v,t,1900,.012,.07,'sine');return .04},
  lockAcquired(v,t){beep(v,t,880,.08,.2);beep(v,t+.09,1320,.1,.22);return .25},
  shieldHit(v,t,o){const p=rv(.08);N(v,t,t+.15,F('highpass',2200,.8,G(v,t,.002,.3,.13)));RM(v,'square',2000*p,180*p,t,t+.16,G(v,t,.002,.2,.14));return .2},
  hullHit(v,t,o){const A=Math.min(1,.6+(o.damage||8)*.02);boom(v,t,80,40,.28,.7*A);N(v,t,t+.22,F('lowpass',400,.8,G(v,t,.003,.45*A,.2)));return .3},
  shieldDown(v,t){const g=G(v,t,.01,.4,.8);LFO(v,18,.5,g.gain,t,t+.85,'square');const o=O(v,'sawtooth',1500,t,t+.85,F('lowpass',2500,1,g));sweep(o.frequency,1500,100,t,t+.8);N(v,t,t+.4,F('bandpass',1200,2,G(v,t,.01,.12,.35)));return .9},
  shieldRestored(v,t){[523,659,784].forEach((f,i)=>beep(v,t+i*.09,f,.35,.16,'sine'));return .7},
  collision(v,t,o){boom(v,t,60,28,.5,.9);N(v,t,t+.35,F('lowpass',500,.6,G(v,t,.003,.5,.3)));const g=G(v,t+.03,.02,.25,.45),f=F('bandpass',900,3,g);sweep(f.frequency,900,350,t,t+.5);N(v,t+.03,t+.55,f);return .6},
  emp(v,t){const g=G(v,t,.01,.55,.9),o=O(v,'sine',60,t,t+.95,g);o.frequency.setValueAtTime(60,t);o.frequency.exponentialRampToValueAtTime(400,t+.25);o.frequency.exponentialRampToValueAtTime(30,t+.9);
   for(let i=0;i<5;i++){const s=t+.05+i*.14+rnd()*.05;N(v,s,s+.05,F('highpass',1800,.8,G(v,s,.002,.22,.04)))}
   const w=G(v,t,.05,.07,.85);sweep(O(v,'sine',3000,t,t+.95,w).frequency,3000,5200,t,t+.9);send(v,.35);return 1},
  dash(v,t){const g=G(v,t,.12,.5,.5),f=F('lowpass',200,1,g);f.frequency.setValueAtTime(200,t);f.frequency.exponentialRampToValueAtTime(4000,t+.22);f.frequency.exponentialRampToValueAtTime(300,t+.6);N(v,t,t+.62,f);
   const d=G(v,t,.08,.09,.5),o=O(v,'sine',300,t,t+.62,d);o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(520,t+.2);o.frequency.exponentialRampToValueAtTime(200,t+.6);return .65},
  pickup(v,t){[660,880,1320].forEach((f,i)=>{beep(v,t+i*.07,f,.22,.16,'sine');beep(v,t+i*.07,f,.1,.06,'triangle')});return .5},
  purchase(v,t){click(v,t,.35,1800,.02);click(v,t+.045,.3,2400,.02);beep(v,t+.1,1046,.3,.16,'sine');beep(v,t+.17,1568,.35,.14,'sine');return .6},
  uiClick(v,t){click(v,t,.25,2000,.015);beep(v,t,1200,.03,.12,'sine');return .06},
  uiHover(v,t){beep(v,t,2400,.012,.05,'sine');return .03},
  uiConfirm(v,t){beep(v,t,880,.07,.14);beep(v,t+.08,1320,.12,.16);return .25},
  uiBack(v,t){beep(v,t,660,.06,.13);beep(v,t+.07,440,.1,.13);return .2},
  warning(v,t){beep(v,t,600,.25,.13,'square',1200);beep(v,t+.3,600,.25,.13,'square',1200);return .6},
  anomalyWarning(v,t){const g=G(v,t,.05,.4,1.2);LFO(v,4,.5,g.gain,t,t+1.3,'square');O(v,'square',55,t,t+1.3,F('lowpass',300,1,g));boom(v,t,42,38,1.2,.45);for(let i=0;i<3;i++)beep(v,t+i*.3,220,.18,.12,'triangle');send(v,.3);return 1.4},
  levelComplete(v,t){const lp=F('lowpass',2200,1,v.g);[329.6,392,493.9,659.3].forEach((f,i)=>{const s=t+i*.2,d=i===3?.9:.22;brass(v,s,f,d,.22,lp)});send(v,.3);return 1.8},
  levelBegin(v,t){return SFX.hyperjump(v,t)},
  hyperjump(v,t){boom(v,t+.5,90,30,.9,.6);const g=GH(v,t,1.0,.3,.02,.15),f=F('bandpass',400,1,g);sweep(f.frequency,400,3500,t,t+1.05);N(v,t,t+1.2,f);
   [1760,2217,2637].forEach((f,i)=>{const s=t+.6+i*.05,sg=G(v,s,.15,.06,1.4);O(v,'sine',f,s,s+1.6,sg,-6);O(v,'sine',f,s,s+1.6,sg,6)});send(v,.45);return 2.2},
  gameOver(v,t){const g=GH(v,t,.4,.4,1.6,1.4),lp=F('lowpass',420,1,g);O(v,'sawtooth',55,t,t+3.5,lp);O(v,'sawtooth',58.3,t,t+3.5,lp);O(v,'triangle',82.4,t,t+3.5,lp);const d=G(v,t,.1,.14,2.2);sweep(O(v,'sine',220,t,t+2.4,d).frequency,220,55,t,t+2.2);send(v,.4);return 3.6},
  victory(v,t){const lp=F('lowpass',2600,1,v.g);const seq=[[440,.18],[523,.18],[659,.18],[880,.7],[784,.25],[880,1.1]];let s=t;for(const[f,d]of seq){brass(v,s,f,d,.2,lp);brass(v,s,f/2,d,.1,lp);s+=d+.03}boom(v,t,110,55,1,.35);send(v,.4);return 3.2},
  notify(v,t){beep(v,t,1500,.04,.07,'sine');beep(v,t+.05,1800,.05,.07,'sine');return .12},
  stageChange(v,t){beep(v,t,740,.08,.1,'triangle');beep(v,t+.1,988,.16,.1,'triangle');return .3},
  shopOpen(v,t){[523,659,784,1046].forEach((f,i)=>beep(v,t+i*.08,f,.4,.12,'sine'));return .8},
  mineArm(v,t){beep(v,t,1000,.03,.08,'sine');beep(v,t+.06,1000,.03,.06,'sine');return .1},
  // Вражеское оружие
  bolt(v,t){const p=rv(.1);beep(v,t,1200*p,.12,.28,'square',300*p);return .15},
  plasma(v,t){const p=rv(.08),g=G(v,t,.01,.3,.3),lp=F('lowpass',1400,2,g);sweep(lp.frequency,1400,300,t,t+.3);const o=O(v,'sawtooth',180*p,t,t+.32,lp);LFO(v,28,45,o.frequency,t,t+.32);return .35},
  rail(v,t){click(v,t,.5,3000,.012);const g=G(v,t,.004,.3,.4);sweep(O(v,'sawtooth',3000,t,t+.42,F('lowpass',5000,1,g)).frequency,3000,400,t,t+.4);return .45},
  missileEnemy(v,t){whoosh(v,t,200,900,.55,.3,'bandpass',1.2);const g=G(v,t,.02,.28,.5);sweep(O(v,'sawtooth',80*rv(.06),t,t+.55,F('lowpass',500,1,g)).frequency,80,45,t,t+.5);return .6},
  empEnemy(v,t){const g=G(v,t,.005,.3,.25);LFO(v,40,.5,g.gain,t,t+.3,'square');N(v,t,t+.3,F('highpass',1500,.8,g));beep(v,t,2500,.22,.08,'sine',1800);return .32},
  hitMetal(v,t,o){const f=2200/(1+(o.damage||1)*.04)*rv(.1);beep(v,t,f,.045,.22,'triangle',f*.6);click(v,t,.12,3500,.01);return .08},
  hitShield(v,t){const p=rv(.06);beep(v,t,3200*p,.07,.16,'sine',2600*p);RM(v,'sine',2400*p,310,t,t+.08,G(v,t,.002,.12,.07));return .1},
  hitBlocked(v,t){beep(v,t,320*rv(.08),.09,.28,'triangle',200);N(v,t,t+.08,F('lowpass',600,.8,G(v,t,.002,.2,.07)));return .12},
  // Взрывы
  explosionSmall(v,t){const g=G(v,t,.003,.5,.3),f=F('lowpass',2500,.7,g);sweep(f.frequency,2500,200,t,t+.3);N(v,t,t+.32,f);boom(v,t,120*rv(.1),50,.22,.35);return .35},
  explosionMedium(v,t){const g=G(v,t,.004,.7,.7),f=F('lowpass',3000,.7,g);sweep(f.frequency,3000,80,t,t+.7);N(v,t,t+.72,f);boom(v,t,55*rv(.08),42,.6,.55);click(v,t,.3,2000,.03);send(v,.3);return .8},
  explosionLarge(v,t){const g=G(v,t,.006,.85,1.5),f=F('lowpass',2500,.6,g);sweep(f.frequency,2500,60,t,t+1.5);N(v,t,t+1.52,f);
   const g2=G(v,t,.01,.4,.55),f2=F('bandpass',600,1.5,g2);sweep(f2.frequency,600,150,t,t+.55);N(v,t,t+.6,f2);boom(v,t,45,30,1.2,.7);send(v,.5);return 1.6},
  explosionBoss(v,t){let s=t;for(let i=0;i<5;i++){const g=G(v,s,.005,.65,.6+i*.1),f=F('lowpass',2600-i*300,.7,g);sweep(f.frequency,2600,70,s,s+.7);N(v,s,s+.75,f);boom(v,s,60-i*4,32,.7,.5);s+=.15+rnd()*.25}
   const r=G(v,t,.1,.5,3),rf=F('lowpass',120,.8,r);N(v,t,t+3.1,rf,true);
   for(let i=0;i<8;i++){const q=t+1+rnd()*1.8,f=2000+rnd()*2500;beep(v,q,f,.25,.08,i%2?'sine':'triangle',f*.9)}send(v,.6);return 3.2},
  debris(v,t){const n=3+Math.floor(rnd()*3);for(let i=0;i<n;i++){const s=t+rnd()*.3,f=800+rnd()*2200;beep(v,s,f,.05,.07,'triangle',f*.7)}return .4},
  flyby(v,t){const g=G(v,t,.25,.16,.3),f=F('bandpass',900,1.5,g);sweep(f.frequency,900,280,t,t+.55);N(v,t,t+.58,f);return .6},
  // Боссы
  bossSpawn(v,t){const lp=F('lowpass',1800,1,v.g);for(let i=0;i<6;i++){const s=t+i*.26,g=audio.createGain();g.connect(lp);envHold(g.gain,s,.01,.22,.18,.05);O(v,'square',i%2?330:440,s,s+.3,g)}
   const h=GH(v,t,.3,.35,1.2,.6),hl=F('lowpass',500,1,h);O(v,'sawtooth',55,t,t+2.2,hl,-5);O(v,'sawtooth',82.5,t,t+2.2,hl,5);O(v,'sawtooth',55,t,t+2.2,hl,9);send(v,.45);return 2.3},
  bossPhase(v,t){const g=G(v,t,.02,.3,.5),rm=audio.createGain();rm.gain.value=0;rm.connect(g);O(v,'sine',220,t,t+.55,rm.gain);const o=O(v,'sawtooth',1800,t,t+.55,rm);sweep(o.frequency,1800,3500,t,t+.5);SFX.explosionMedium(v,t+.15);return .9},
  miniSpawn(v,t){const lp=F('lowpass',1800,1,v.g);for(let i=0;i<4;i++){const s=t+i*.19,g=audio.createGain();g.connect(lp);envHold(g.gain,s,.01,.18,.12,.05);O(v,'square',i%2?392:523,s,s+.2,g)}
   const h=GH(v,t,.2,.25,.4,.4),hl=F('lowpass',600,1,h);O(v,'sawtooth',65,t,t+1.1,hl,-6);O(v,'sawtooth',98,t,t+1.1,hl,6);send(v,.3);return 1.2},
  // Радио для сюжета (story.js)
  radioOpen(v,t,o){N(v,t,t+.14,F('highpass',1500,.8,G(v,t,.004,.22,.12)));const f=RADIO_PITCH[o.who]||RADIO_PITCH.unknown;beep(v,t+.1,f,.07,.12,'sine');if(o.who==='unknown')SFX.radioBlip(v,t+.18,o);return .35},
  radioClose(v,t){N(v,t,t+.08,F('highpass',1800,.8,G(v,t,.003,.18,.07)));beep(v,t+.05,600,.08,.1,'sine',380);return .2},
  radioBlip(v,t,o){const f=(RADIO_PITCH[o.who]||RADIO_PITCH.unknown)*rv(.03);
   if(o.who==='unknown'){const g=GH(v,t,.22,.12,.02,.03);O(v,'sine',f,t,t+.3,g,-25);O(v,'sine',f*1.5,t,t+.3,g,25);LFO(v,7,12,g.gain,t,t+.3);return .3}
   beep(v,t,f,.05,.1,'sine');return .07}
 };
 const PRIORITY={gun:2,hitMetal:1,hitShield:1,hitBlocked:1,uiHover:1,uiClick:3,lockTick:1,notify:1,debris:1,flyby:1,bolt:2,plasma:2,rail:3,missileEnemy:2,empEnemy:2,mineArm:1,
  explosionSmall:3,explosionMedium:4,explosionLarge:5,explosionBoss:7,hullHit:5,shieldHit:4,shieldDown:6,collision:5,emp:5,dash:4,missileLaunch:4,
  bossSpawn:7,bossPhase:6,miniSpawn:6,levelComplete:7,hyperjump:7,levelBegin:7,gameOver:8,victory:8,radioOpen:6,radioClose:6,radioBlip:6,anomalyWarning:5,warning:4,overheat:5,heatWarning:3,shieldRestored:4,pickup:4,purchase:5};
 const UI_NAMES=new Set(['uiClick','uiHover','uiConfirm','uiBack','purchase','notify','shopOpen','radioOpen','radioClose','radioBlip']);

 function playSfx(name,opts){
  if(!audio||audio.state!=='running')return null;const fn=SFX[name];if(!fn)return null;
  try{
   const o=opts||{},t=typeof o.at==='number'?Math.max(now(),o.at):now(),v=voice(PRIORITY[name]||3,UI_NAMES.has(name)?uiBus:sfxBus,o);
   if(!v)return null;const dur=fn(v,t,o)||.3;finishVoice(v,t,dur);return v
  }catch(err){console.warn('sfx '+name,err);return null}}

 // Кратковременное приглушение музыки при мощных взрывах.
 function duck(amount=.8,dur=.3){if(!audio)return;try{const t=now(),g=duckGain.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(amount,t+.03);g.setTargetAtTime(1,t+dur,.25)}catch{}}

 // ---------- Двигатель ----------
 let engine=null;
 function startEngine(){
  if(engine||!audio)return;const t=now();
  const out=gain(0,engineBus);out.gain.setTargetAtTime(1,t,.4);
  const sh=S(.7,out),gate=gain(1,sh),lp=F('lowpass',500,1.2,gate);
  const o1=audio.createOscillator();o1.type='sawtooth';o1.frequency.value=48;o1.connect(lp);o1.start(t);
  const o2=audio.createOscillator();o2.type='triangle';o2.frequency.value=72;o2.detune.value=4;o2.connect(lp);o2.start(t);
  const pn=audio.createBufferSource();pn.buffer=pinkBuf;pn.loop=true;const ng=gain(.4,lp);pn.connect(ng);pn.start(t,rnd());
  const rattleG=gain(0,out),rattle=audio.createBufferSource();rattle.buffer=whiteBuf;rattle.loop=true;rattle.connect(F('bandpass',1400,2.5,rattleG));rattle.start(t,rnd());
  const hissG=gain(0,out),hiss=audio.createBufferSource();hiss.buffer=whiteBuf;hiss.loop=true;hiss.connect(F('highpass',4500,.7,hissG));hiss.start(t,rnd());
  engine={out,gate,lp,o1,o2,rattleG,hissG,src:[o1,o2,pn,rattle,hiss],nextStutter:0}}
 function stopEngine(){if(!engine)return;const e=engine;engine=null;const t=now();try{e.out.gain.cancelScheduledValues(t);e.out.gain.setTargetAtTime(0,t,.15)}catch{}for(const s of e.src)try{s.stop(t+.7)}catch{}setTimeout(()=>{try{e.out.disconnect()}catch{}},900)}
 function updateEngine(){
  if(!engine)return;const t=now(),speed=Math.hypot(vx||0,vy||0),s=Math.max(0,Math.min(1,speed/28)),dashK=dashActive>0?1:0,pitch=1+s*.35+dashK*.45;
  engine.o1.frequency.setTargetAtTime(48*pitch,t,.15);engine.o2.frequency.setTargetAtTime(72*pitch,t,.15);
  engine.lp.frequency.setTargetAtTime(300+s*1200+dashK*500,t,.12);engine.out.gain.setTargetAtTime(.32+s*.3+dashK*.25,t,.2);
  const hull=health/maxHealth();
  if(hull<.35){engine.rattleG.gain.setTargetAtTime(.22,t,.3);if(t>engine.nextStutter&&rnd()<.4){engine.gate.gain.cancelScheduledValues(t);engine.gate.gain.setValueAtTime(1,t);engine.gate.gain.setTargetAtTime(.1,t+.005,.008);engine.gate.gain.setTargetAtTime(1,t+.04+rnd()*.06,.02);engine.nextStutter=t+.12}}
  else engine.rattleG.gain.setTargetAtTime(0,t,.4);
  engine.hissG.gain.setTargetAtTime(overheated?.3:0,t,.25)}

 // ---------- Петли тревог: низкий корпус, пиявка ----------
 let lowHullOn=false,hbNext=0,leech=null;
 function heartbeatStep(t){if(!audio)return;const g=gain(0,sfxBus);env(g.gain,t,.005,.35,.16);const o=O(null,'sine',70,t,t+.2,g);sweep(o.frequency,70,40,t,t+.16);
  const g2=gain(0,sfxBus);env(g2.gain,t+.18,.005,.26,.14);const o2=O(null,'sine',64,t+.18,t+.36,g2);sweep(o2.frequency,64,38,t+.18,t+.32);
  const a=gain(0,sfxBus);env(a.gain,t,.01,.06,.12);O(null,'triangle',660,t,t+.15,a)}
 function startLeech(){if(leech||!audio)return;const t=now(),out=gain(0,sfxBus);out.gain.setTargetAtTime(.18,t,.3);const lp=F('lowpass',500,2,out),o=audio.createOscillator();o.type='sawtooth';o.frequency.value=90;o.connect(lp);o.start(t);
  const trem=audio.createOscillator();trem.type='sine';trem.frequency.value=7;const tg=gain(.5,out.gain);trem.connect(tg);trem.start(t);leech={out,src:[o,trem]}}
 function stopLeech(){if(!leech)return;const l=leech;leech=null;const t=now();l.out.gain.setTargetAtTime(0,t,.2);for(const s of l.src)try{s.stop(t+.6)}catch{}setTimeout(()=>{try{l.out.disconnect()}catch{}},800)}

 // ---------- Музыка: многослойная генеративная система ----------
 // Гармония по актам. Ноты — MIDI; частота = 440·2^((midi−69)/12).
 // Для бесконечного режима акт = floor(wave/5)%4+1, чтобы первые волны начинались с Акта I.
 const ACTS={
  1:{scale:[57,59,60,62,64,65,67],chords:[[57,'m'],[53,'M'],[48,'M'],[55,'M']]},          // Ля минор: Am–F–C–G
  2:{scale:[50,51,53,55,57,58,60],chords:[[50,'m'],[51,'M'],[50,'m'],[46,'M']]},          // Ре фригийский: Dm–Eb–Dm–Bb
  3:{scale:[52,53,55,57,59,60,62],chords:[[52,'m'],[53,'M'],[52,'m'],[48,'M']]},          // Ми минор с b2: Em–F–Em–C
  4:{scale:[47,48,50,52,53,55,57],chords:[[47,'d'],[52,'m'],[54,'M'],[47,'m']]}           // Си локрийский: Bdim–Em–F#–Bm
 };
 const TRIAD={m:[0,3,7],M:[0,4,7],d:[0,3,6]};
 const LAYER_LEVEL={ambient:1,tension:.9,combat:.9,critical:.85,boss:1};
 const music={layers:{},bpm:100,step:0,bar:0,next:0,act:1,chord:null,timer:null,inst:null,paused:false};
 const stepDur=()=>60/music.bpm/4;
 function currentAct(){try{if(mission&&mission.act)return Math.max(1,Math.min(4,mission.act));if(mode==='menu')return 1;return Math.floor((wave||0)/5)%4+1}catch{return 1}}
 function chordAt(bar){const a=ACTS[music.act]||ACTS[1],c=a.chords[bar%a.chords.length];return{root:c[0],triad:TRIAD[c[1]],scale:a.scale}}

 function setupMusic(){
  const L=music.layers;for(const n in LAYER_LEVEL){const g=gain(0,musicBus);L[n]={g,target:0}}
  const t=now(),I={};
  // ambient: медленный пэд из трёх расстроенных пил через фильтр с медленным LFO
  I.padGain=gain(.11,L.ambient.g);I.padLP=F('lowpass',700,.8,I.padGain);I.pad=[-8,0,8].map(d=>{const o=audio.createOscillator();o.type='sawtooth';o.frequency.value=110;o.detune.value=d;o.connect(I.padLP);o.start(t);return o});
  const lfo=audio.createOscillator();lfo.frequency.value=.05;const lg=gain(320,I.padLP.frequency);lfo.connect(lg);lfo.start(t);
  // critical: тремоло-струны (малая секунда) + низкий гул
  I.strGain=gain(.07,L.critical.g);I.trem=gain(.5,I.strGain);I.strLP=F('lowpass',1600,1,I.trem);I.str=[0,1].map(i=>{const o=audio.createOscillator();o.type='sawtooth';o.frequency.value=220;o.connect(I.strLP);o.start(t);return o});
  const tl=audio.createOscillator();tl.frequency.value=6;const tg=gain(.5,I.trem.gain);tl.connect(tg);tl.start(t);
  const rum=audio.createBufferSource();rum.buffer=pinkBuf;rum.loop=true;rum.connect(F('lowpass',90,.8,gain(.3,L.critical.g)));rum.start(t);
  // boss: хоровой пэд из фильтрованных импульсов с вибрато
  I.choirGain=gain(.045,L.boss.g);I.choirLP=F('lowpass',900,1,I.choirGain);I.choir=[0,1,2].map(()=>{const o=audio.createOscillator();o.type='square';o.frequency.value=220;o.connect(I.choirLP);o.start(t);return o});
  const vib=audio.createOscillator();vib.frequency.value=5;const vg=audio.createGain();vg.gain.value=7;vib.connect(vg);for(const o of I.choir)vg.connect(o.detune);vib.start(t);
  // combat: общий фильтр и задержка 3/16 для арпеджио
  I.arpLP=F('lowpass',2200,1,gain(.5,L.combat.g));I.delay=audio.createDelay(1);I.delay.delayTime.value=stepDur()*3;I.arpLP.connect(I.delay);const fb=gain(.35,I.delay);I.delay.connect(fb);I.delay.connect(gain(.3,L.combat.g));
  I.bassLP=F('lowpass',600,1.2,L.combat.g);
  // Общие фильтры ударных (линейные, поэтому их можно делить между нотами — экономия узлов)
  I.hatHP=F('highpass',8000,.7,L.combat.g);I.tHatHP=F('highpass',7000,.7,L.tension.g);I.bHatHP=F('highpass',9000,.7,L.boss.g);I.snareBP=F('bandpass',1800,1,L.combat.g);I.bellSend=gain(.5,reverbIn);
  music.inst=I;music.act=currentAct();music.chord=chordAt(0);applyChord(t);
  music.next=t+.1;music.step=0;music.bar=0;
  if(!music.timer)music.timer=setInterval(tick,40)}
 function applyChord(t){const I=music.inst,c=music.chord;if(!I||!c)return;const r=c.root,tri=c.triad,gl=(o,f)=>o.frequency.setTargetAtTime(f,t,.4);
  gl(I.pad[0],hz(r-12));gl(I.pad[1],hz(r-12+tri[2]));gl(I.pad[2],hz(r+tri[1]));
  gl(I.str[0],hz(r+12));gl(I.str[1],hz(r+13));
  gl(I.choir[0],hz(r));gl(I.choir[1],hz(r+tri[1]));gl(I.choir[2],hz(r+tri[2]))}

 // Инструменты музыки (не учитываются в лимите голосов sfx)
 function mNote(dest,t,type,f,a,peak,d,detune=0){const g=gain(0,dest);env(g.gain,t,a,peak,d);const o=O(null,type,f,t,t+a+d,g,detune);return o}
 function bell(dest,t,f){const g=gain(0,dest);env(g.gain,t,.005,.07,1.3);O(null,'sine',f,t,t+1.4,g);O(null,'triangle',f*2,t,t+1.4,gain(.25,g));g.connect(music.inst.bellSend)}
 function sub(dest,t,f,d){mNote(dest,t,'sine',f,.01,.28,d)}
 function hat(dest,t,vol,d=.03){const g=gain(0,dest);env(g.gain,t,.001,vol,d);N(null,t,t+d+.02,g)} // dest — общий highpass слоя
 function kick(dest,t,vol,d=.13){const g=gain(0,dest);env(g.gain,t,.002,vol,d);sweep(O(null,'sine',150,t,t+d+.05,g).frequency,150,40,t,t+d)}
 function snare(t,vol){const I=music.inst,g=gain(0,I.snareBP);env(g.gain,t,.002,vol,.14);N(null,t,t+.16,g);mNote(music.layers.combat.g,t,'sine',200,.002,vol*.7,.09)}
 function riser(dest,t,dur){const g=gain(0,dest);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+dur-.05);g.gain.setValueAtTime(0,t+dur);const f=F('bandpass',400,1.5,g);sweep(f.frequency,400,3200,t,t+dur);N(null,t,t+dur,f)}
 function bassNote(t,f){const I=music.inst,g=gain(0,I.bassLP);env(g.gain,t,.005,.26,.2);O(null,'sawtooth',f,t,t+.25,g);O(null,'square',f,t,t+.25,gain(.5,g))}
 function arpNote(t,f){const g=gain(0,music.inst.arpLP);env(g.gain,t,.003,.12,.14);O(null,'square',f,t,t+.18,g)}
 function stab(dest,t,c){const g=gain(0,dest);envHold(g.gain,t,.015,.2,.12,.28);const lp=F('lowpass',1200,1.2,g),sh=S(1.6,lp);for(const iv of [0,7])for(const d of [-9,9])O(null,'sawtooth',hz(c.root-12+iv),t,t+.5,sh,d)}
 function toll(dest,t,c){const f=hz(c.root-12),g=gain(0,dest);env(g.gain,t,.005,.22,2.6);O(null,'sine',f,t,t+2.7,g);O(null,'sine',f*2.76,t,t+2.7,gain(.3,g));O(null,'sine',f*5.4,t,t+1.5,gain(.12,g));g.connect(gain(.6,reverbIn))}

 const KICK=[0,8,10,14],SNARE=[4,12],HAT16=[3,7,11,15],BASS=[0,0,7,0,12,0,7,5],ARP=[0,1,2,null,1,2,0,null,2,1,0,null,1,2,null,0];
 function scheduleStep(step,bar,t){
  const L=music.layers,I=music.inst,c=music.chord,on=n=>L[n].target>.02||L[n].g.gain.value>.02,combat=on('combat');
  if(on('ambient')&&step%4===0&&rnd()<.28)bell(L.ambient.g,t,hz(c.scale[Math.floor(rnd()*c.scale.length)]+24));
  if(on('tension')){if(step%2===0)sub(L.tension.g,t,hz(c.root-24),.22);if(!combat)hat(I.tHatHP,t,.018,.02);if(bar%4===3&&step===0)riser(L.tension.g,t,stepDur()*16)}
  if(combat){if(KICK.includes(step))kick(L.combat.g,t,.4);if(SNARE.includes(step))snare(t,.22);if(step%2===0)hat(I.hatHP,t,.05);else if(HAT16.includes(step))hat(I.hatHP,t,.022);
   if(step%2===0)bassNote(t,hz(c.root-24+BASS[step/2]));const a=ARP[step];if(a!==null)arpNote(t,hz(c.root+12+c.triad[a]))}
  if(on('critical')&&step%4===0){kick(L.critical.g,t,.32,.15);kick(L.critical.g,t+.13,.24,.15)}
  if(on('boss')){if(step===0||step===8)stab(L.boss.g,t,c);hat(I.bHatHP,t,step%4===0?.045:.03,.025);if(bar%2===0&&step===0)toll(L.boss.g,t,c)}}
 function tick(){
  if(!audio||audio.state!=='running')return;
  try{
   const t=now();if(music.next<t-.5)music.next=t+.05; // пересинхронизация после засыпания вкладки
   while(music.next<t+LOOKAHEAD){
    if(music.step===0){
     if(music.bar%4===0){const act=currentAct(),bpm=(mode==='play'||mode==='pause')&&bossFleet.length>0?112:100;if(act!==music.act)music.act=act;if(bpm!==music.bpm){music.bpm=bpm;music.inst.delay.delayTime.setTargetAtTime(stepDur()*3,music.next,.2)}}
     music.chord=chordAt(music.bar);applyChord(music.next)}
    scheduleStep(music.step,music.bar,music.next);
    music.next+=stepDur();music.step++;if(music.step===16){music.step=0;music.bar++}}
   if(lowHullOn){if(hbNext<t)hbNext=t+.05;while(hbNext<t+LOOKAHEAD){heartbeatStep(hbNext);hbNext+=1.0}}
  }catch(err){console.warn('music tick',err)}}

 function musicTargets(){
  const tg={ambient:0,tension:0,combat:0,critical:0,boss:0};
  try{
   if(mode==='menu')tg.ambient=.8;
   else if(mode==='shop'){tg.ambient=.7;tg.tension=.15}
   else if(mode==='win'||mode==='lose')tg.ambient=.3;
   else{
    const hostile=enemies.length>0||bossFleet.length>0,calm=!!mission&&(mission.stage===0||mission.stage===4);
    if(!hostile||calm){tg.ambient=1;tg.tension=.35}else{tg.ambient=.55;tg.combat=1;tg.tension=.5}
    if(bossFleet.length>0&&!calm){tg.boss=1;tg.combat=.4;tg.ambient=.3}
    const hp=health/maxHealth();if(hp<.3||(shieldEnergy<=0&&hp<.5)){tg.critical=1;tg.combat=Math.min(tg.combat,.7)}}
  }catch{tg.ambient=.8}
  return tg}
 function updateMusicMix(){const L=music.layers,tg=musicTargets(),t=now();for(const n in L){const l=L[n],want=tg[n]*LAYER_LEVEL[n];if(Math.abs(want-l.target)>.001){const rising=want>l.target;l.target=want;l.g.gain.setTargetAtTime(want,t,rising?1.6:2.4)}}
  const paused=mode==='pause';if(paused!==music.paused){music.paused=paused;pauseGain.gain.setTargetAtTime(paused?.4:1,t,.3)}}

 // ---------- Опрос состояния игры (каждые 100 мс) ----------
 let pollTimer=null,lastLockTick=0;
 function poll(){
  if(!audio||audio.state!=='running')return;
  try{
   updateMusicMix();
   if(mode==='play'){startEngine();updateEngine()}else stopEngine();
   if(mode==='play'){
    for(const e of enemies){if(e.charge>0&&!e.warned){e.warned=true;playSfx('warning',{x:e.x,y:e.y,z:e.z})}else if(!(e.charge>0)&&e.warned)e.warned=false}
    if(typeof locks!=='undefined'&&typeof lockSeconds==='function'){const t=now();if(t-lastLockTick>.12&&locks.some(l=>l.time<lockSeconds())){lastLockTick=t;playSfx('lockTick')}}
    if(lowHullOn&&health/maxHealth()>.5)lowHullOn=false;
    if(typeof leechDrain!=='undefined'){if(leechDrain)startLeech();else stopLeech()}
   }else{lowHullOn=false;stopLeech()}
  }catch(err){console.warn('audio poll',err)}}

 // ---------- Подписка на игровые события ----------
 const rate={};const limited=(key,ms)=>{const t=performance.now();if(rate[key]&&t-rate[key]<ms)return true;rate[key]=t;return false};
 const at=e=>e?{x:e.x,y:e.y,z:e.z}:{};
 if(typeof on==='function'){
  on('start',()=>{unlock()});
  on('levelBegin',()=>playSfx('hyperjump'));
  on('waveBegin',d=>{if(!d.bossWave)playSfx('notify')});
  on('stage',d=>{if(d.stage===2||d.stage===3)playSfx('stageChange')});
  on('levelComplete',()=>playSfx('levelComplete'));
  on('finish',d=>{stopEngine();lowHullOn=false;playSfx(d.win?'victory':'gameOver')});
  on('pause',d=>playSfx(d.paused?'uiClick':'uiConfirm'));
  on('shopOpen',()=>playSfx('shopOpen'));
  on('exit',()=>playSfx('uiBack'));
  on('gun',d=>playSfx('gun',d));
  on('overheat',()=>playSfx('overheat'));
  on('heatWarning',()=>playSfx('heatWarning'));
  on('missileLaunch',d=>playSfx('missileLaunch',d));
  on('lockAcquired',()=>playSfx('lockAcquired'));
  on('playerHit',d=>{if(d.kind==='collision')playSfx('collision');else if(d.hullDamage>0)return;else playSfx('shieldHit',d)}); // урон корпусу озвучивает 'hullHit'
  on('hullHit',d=>{if(d.kind!=='collision')playSfx('hullHit',d)}); // столкновение уже озвучено 'collision'
  on('shieldDown',()=>playSfx('shieldDown'));
  on('shieldRestored',()=>playSfx('shieldRestored'));
  on('dash',()=>playSfx('dash'));
  on('emp',()=>{playSfx('emp');duck(.85,.25)});
  on('explode',d=>{if(d.secondary){if(!limited('explSec',60))playSfx('explosionSmall',at(d))}else{playSfx('explosionMedium',at(d));duck(.8,.3)}});
  on('enemyHit',d=>{const p=at(d.e);if(d.shieldHit||d.barrier){if(!limited('hitShield',50))playSfx('hitShield',{...p})}else if(!limited('hitMetal',45))playSfx('hitMetal',{...p,damage:d.damage})});
  on('enemyBlocked',d=>{if(!limited('blocked',100))playSfx('hitBlocked',at(d.e))});
  on('hostileShot',d=>{
   const kind=d.kind==='missile'?'missileEnemy':d.kind==='emp'?'empEnemy':SFX[d.kind]?d.kind:'bolt';
   if(!limited('shot:'+kind,kind==='rail'?0:45))playSfx(kind,at(d.e));
   const s=d.shot;if(s&&s.vz>0&&!limited('flyby',700)&&rnd()<.35){const dt=(3-s.z)/s.vz;if(dt>.3&&dt<2.5)playSfx('flyby',{at:now()+dt-.25,x:s.x+s.vx*dt,y:py,z:3})}});
  on('bossSpawn',()=>{playSfx('bossSpawn');duck(.7,.5)});
  on('bossPhase',d=>{playSfx('bossPhase',at(d.b));duck(.75,.4)});
  on('miniSpawn',()=>playSfx('miniSpawn'));
  on('mineSpawn',d=>{if(!limited('mine',400))playSfx('mineArm',at(d.mine))});
  on('enemyKilled',d=>{const p=at(d.e),size=d.size||1;
   if(d.decoy||d.type==='swarm'||size<.9)playSfx('explosionSmall',p);
   else if(d.mini||size>=1.9){playSfx('explosionLarge',p);duck(.8,.35)}
   else playSfx('explosionMedium',p)});
  on('bossKilled',d=>{playSfx('explosionBoss',at(d.b));duck(.6,.9)});
  on('moduleDestroyed',d=>playSfx('explosionMedium',at(d.m)));
  on('structureDestroyed',d=>{playSfx('explosionMedium',at(d.s));duck(.85,.3)});
  on('mineDestroyed',d=>playSfx('explosionSmall',at(d.m)));
  on('wreck',d=>{if(!limited('wreck',220)&&rnd()<.6)playSfx('debris',at(d))});
  on('pickup',()=>playSfx('pickup'));
  on('purchase',()=>playSfx('purchase'));
  on('notify',()=>{if(!limited('notify',1500))playSfx('notify')});
  on('lowHull',()=>{if(!lowHullOn){lowHullOn=true;hbNext=0}});
  on('anomalyWarning',()=>playSfx('anomalyWarning'));
  on('leechStart',()=>startLeech());
  on('leechEnd',()=>stopLeech());
 }

 // ---------- Звуки интерфейса: делегированные слушатели ----------
 let lastHover=null;
 try{
  document.addEventListener('click',async e=>{
   const b=e.target&&e.target.closest?e.target.closest('button'):null;if(!b||b.disabled)return;
   if(b.closest('#hud')||b.id==='fire'||b.dataset.up!==undefined||b.id==='pause'||b.id==='resume')return; // игровые кнопки и покупки озвучены событиями
   await unlock(); // первый тап по кнопке — частый первый жест на iOS, гарантируем контекст перед звуком
   if(audio?.state!=='running')return;
   if(['start','continue','loadCampaign','retryLevel','restart'].includes(b.id))playSfx('uiConfirm');
   else if(b.id==='exit')playSfx('uiBack');
   else playSfx('uiClick')});
  document.addEventListener('pointerover',e=>{
   const b=e.target&&e.target.closest?e.target.closest('button'):null;if(!b||b===lastHover)return;lastHover=b;
   if(b.disabled||b.closest('#hud')||b.id==='fire'||limited('hover',70))return;playSfx('uiHover')});
 }catch{}

 // ---------- Кнопка звука и замена устаревшего tone() ----------
 function setMuted(flag){settings.muted=!!flag;try{muted=settings.muted}catch{}saveSettings();applyVolumes(false);syncButton();if(!settings.muted){configureAudioSession();unlock()}}
 try{const b=document.getElementById('sound');if(b)b.onclick=()=>setMuted(!settings.muted)}catch{}
 try{tone=function(){}}catch{}

 // ---------- Публичный API ----------
 const api={
  settings,
  setVolume(kind,v){if(!(kind in settings)||kind==='muted')return;settings[kind]=clamp01(v);saveSettings();applyVolumes(false)},
  getVolume(kind){return kind in settings?settings[kind]:0},
  setMuted,isMuted(){return settings.muted},
  toggleMuted(){setMuted(!settings.muted)},
  play:playSfx,duck,unlock,debugAudio,preloadVoice,playVoice,stopVoice,
  get context(){return audio},
  music:{get state(){return{bpm:music.bpm,bar:music.bar,step:music.step,act:music.act,layers:Object.fromEntries(Object.entries(music.layers).map(([k,l])=>[k,l.target]))}},setState(){/* внутренний: микс задаётся опросом состояния игры */}}
 };
 return api;
})();
try{globalThis.audioAPI=audioAPI}catch{}
// Глобальная функция одиночного эффекта: sfx('explosionMedium',{x,y,z}); sfx('radioOpen',{who:'voronova'}).
function sfx(name,opts){try{return audioAPI.play(name,opts)}catch{return null}}
