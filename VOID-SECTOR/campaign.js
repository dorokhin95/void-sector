'use strict';
const campaign=[
 {name:'Первый сигнал',act:1,goal:'clear',environment:'open',twist:'training',pool:['scout'],intro:'WASD — манёвр. ЛКМ / пробел — огонь. Наведи прицел на врага; R / ПКМ — ракета.',change:'Теперь захвати цель ракетой. E — локальный EMP, Shift — рывок.',final:'Последняя группа «Игл». Очисти маршрут.'},
 {name:'Каменный коридор',act:1,goal:'clear',environment:'asteroids',twist:'dense',pool:['scout','fighter'],intro:'Пройди астероидный коридор. Камни блокируют огонь обеих сторон.',change:'Впереди плотное поле. Уничтожай опасные астероиды или обходи их.',final:'Корсары перекрывают выход из коридора.'},
 {name:'Засада',act:1,goal:'survive',environment:'open',twist:'ambush',pool:['fighter','bomber'],intro:'Сигнал бедствия оказался ловушкой. Удерживай позицию до расчёта выхода.',change:'Громы атакуют с флангов. Продержись 25 секунд.',final:'Координаты получены. Уничтожь группу перехвата.'},
 {name:'Живой груз',act:1,goal:'escort',environment:'open',twist:'mines',pool:['fighter','bomber'],mini:['hammer'],intro:'Защити союзный транспорт. Его прочность показана под задачей.',change:'Противник заминировал маршрут. Защити транспорт ещё 25 секунд.',final:'Мини-босс «Таран» приближается к транспорту.'},
 {name:'Пасть Цербера',act:1,goal:'clear',environment:'station',twist:'reinforcements',pool:['fighter','bomber','frigate'],boss:'cerberus',intro:'Прорви внешнюю охрану тяжёлого корабля «Цербер».',change:'Подошло подкрепление. Береги ракеты для бортовых модулей.',final:'Цербер: уничтожай орудия. После сброса брони он ускорится.'},
 {name:'Слепая зона',act:2,goal:'survive',environment:'nebula',twist:'nebula',pool:['missileboat','fighter','sniper'],intro:'В туманности захват цели медленнее. Ракетоносцы держат дистанцию.',change:'Помехи усилились. Переживи ракетный обстрел: 25 секунд.',final:'Расчисти выход из туманности.'},
 {name:'Пояс мин',act:2,goal:'objects',environment:'mines',twist:'mines',pool:['miner','scout','missileboat'],intro:'Минёры закрывают путь магнитными зарядами. Мины можно расстрелять.',change:'Уничтожь три узла управления минным полем.',final:'Разбей оставшуюся охрану узлов.'},
 {name:'Перехват снабжения',act:2,goal:'convoy',environment:'open',twist:'convoy',pool:['hammer','frigate','fighter'],intro:'Прорви эскорт и перехвати конвой. Ни один грузовой корабль не должен уйти.',change:'Три тяжёлых транспорта выходят на маршрут. Уничтожь их до прорыва.',final:'Уничтожь арьергард конвоя.'},
 {name:'Охотники за тенью',act:2,goal:'chase',environment:'nebula',twist:'ambush',pool:['sniper','lancer','reaper'],elite:true,mini:['lancer'],intro:'Элитная эскадрилья прикрывает курьера. Его уход сорвёт операцию.',change:'Курьер появился. Держись на его курсе и используй рывок для сближения. Перехвати за 60 секунд.',final:'Мини-босс «Баллиста». Следи за линиями заряда рельсотрона.'},
 {name:'Утроба Левиафана',act:2,goal:'generators',environment:'station',twist:'reinforcements',pool:['frigate','missileboat','miner'],boss:'leviathan',intro:'Разрушь внешние генераторы военной станции.',change:'Три генератора защищают подход к носителю. Уничтожь их.',final:'Левиафан: сначала два генератора щита, затем центральный корпус.'},
 {name:'Осколки флота',act:3,goal:'objects',environment:'debris',twist:'debris',pool:['swarm','shepherd','carrier'],intro:'В обломках скрываются дроны. Уничтожение Пастуха нарушает их строй.',change:'Уничтожь три ретранслятора, пока носители выпускают новые группы.',final:'Улей дронов закрывает путь.',mini:['carrier']},
 {name:'Солнечный ожог',act:3,goal:'survive',environment:'star',twist:'star',pool:['reaper','leech','missileboat'],intro:'Излучение нагревает орудия. Голубая полоса отмечает прохладную тень.',change:'Вспышка звезды. Держись в тени и продержись 25 секунд.',final:'Перехватчики заходят со стороны звезды.'},
 {name:'Броня и камень',act:3,goal:'blockade',environment:'dense',twist:'dense',pool:['hammer','frigate','miner'],intro:'Нос Молота поглощает большую часть пулемётного огня. Атакуй сбоку или ракетами.',change:'Уничтожь три блокирующих узла и пройди коридор.',final:'Бронированная группа перекрывает последний проход.'},
 {name:'Линия фронта',act:3,goal:'station',environment:'station',twist:'reinforcements',pool:['carrier','hammer','lancer','shepherd'],mini:['hammer','inquisitor'],intro:'Защити союзную станцию от наступающего флота.',change:'Непрерывные подкрепления: удерживай станцию 25 секунд.',final:'Два командира атакуют одновременно: Таран и Прелат.'},
 {name:'Призрак флагмана',act:3,goal:'clear',environment:'debris',twist:'ambush',pool:['reaper','lancer','inquisitor'],boss:'phantom',intro:'Экспериментальный корабль скрывается за линией охраны.',change:'Не доверяй силуэтам: впереди ложные цели.',final:'Фантом: маскировка, телепортация и атаки с двух сторон.'},
 {name:'Чужая граница',act:4,goal:'escort',environment:'alien',twist:'barriers',pool:['inquisitor','leech','swarm','shepherd'],intro:'Выведи разведывательный корабль из сектора новой фракции.',change:'Инквизиторы ставят барьеры. EMP снимает их, если цель находится в радиусе.',final:'Разбей заслон и сохрани разведчика.'},
 {name:'Разлом',act:4,goal:'objects',environment:'anomaly',twist:'anomaly',pool:['reaper','inquisitor','lancer'],intro:'Аномалии смещают корабль. Следи за предупреждением перед импульсом.',change:'Уничтожь три якоря разлома. Гравитационные импульсы продолжаются.',final:'Прелат удерживает последний разлом.',mini:['inquisitor']},
 {name:'Осада',act:4,goal:'generators',environment:'station',twist:'reinforcements',pool:['hammer','carrier','missileboat','frigate'],elite:true,intro:'Проломи тяжёлую оборону осадной платформы.',change:'Охрана прибывает непрерывно. Разрушь три генератора, чтобы остановить поток.',final:'Авианосец прикрывает эвакуацию командования.',mini:['carrier']},
 {name:'Последний рубеж',act:4,goal:'blockade',environment:'dense',twist:'anomaly',pool:Object.keys(enemyDefs),elite:true,mini:['lancer','hammer'],intro:'Все типы врагов перекрывают путь к финальному комплексу.',change:'Разрушь узлы блокады под действием аномалий.',final:'Последние командиры. Дальше — Архонт Бездны.'},
 {name:'Сердце Бездны',act:4,goal:'generators',environment:'station',twist:'reinforcements',pool:['inquisitor','carrier','leech','hammer'],boss:'archon',intro:'Штурмуй финальный комплекс. Сначала отключи внешние генераторы.',change:'Разрушь три внешних генератора под огнём подкреплений.',final:'Архонт: генераторы станции → броня → центральный корабль → бой в обломках.'}
];
const stageNames=['ВСТУПЛЕНИЕ','БОЕВОЙ КОНТАКТ','ИЗМЕНЕНИЕ УСЛОВИЙ','КУЛЬМИНАЦИЯ','ЗАВЕРШЕНИЕ'];
let mission=null,runCheckpoint=null,checkpointAvailable=null;
function configureRocks(environment){let count={asteroids:35,dense:52,debris:48,station:12,mines:14,anomaly:18,star:12,nebula:16,alien:12,open:15}[environment]||15;rocks=Array.from({length:count},(_,i)=>({x:(Math.random()-.5)*100,y:(Math.random()-.5)*50,z:-35-Math.random()*220,r:.65+Math.random()*(environment==='dense'?2.6:2),a:Math.random()*6,detailSeed:i%6}));}
function initializeMission(){const def=campaign[wave];mission={...def,stage:0,stageTime:0,time:0,spawned:0,quota:0,spawnClock:1,kills:0,objectsDestroyed:0,escaped:0,goalReady:false,pursuit:0,gate:null,gatePassed:false,objectiveStarted:false,ally:null,coverX:-5,warning:false};
 if(def.goal==='escort'||def.goal==='station')mission.ally={x:0,y:0,z:-12,hp:def.goal==='station'?500:330,maxHp:def.goal==='station'?500:330,r:def.goal==='station'?4:2.6,station:def.goal==='station'};
 configureRocks(def.environment);notify(def.intro);noticeTime=5;updateHUD();
}
function enterStage(stage){
 mission.stage=stage;mission.stageTime=0;mission.spawned=0;mission.spawnClock=.5;mission.goalReady=false;mission.quota=stage===1?4+Math.floor(wave/4):stage===2?4+Math.floor(wave/5):5+Math.floor(wave/3);
 if(stage===2){
 if(['dense','nebula','star','debris','anomaly','mines'].includes(mission.twist)){mission.environment=mission.twist;configureRocks(mission.environment)}
 if(mission.twist==='ambush')spawnPack('reaper',wave<4?0:2,{x:10,z:-38});
 if(mission.twist==='barriers')spawnEnemy('inquisitor',{x:0,z:-60});
 if(['objects','generators','blockade'].includes(mission.goal))for(let i=0;i<3;i++)structures.push(strategicObject((i-1)*11,2+Math.sin(i*2)*4,-48,'generator'));
 if(mission.goal==='convoy')for(let i=0;i<3;i++)spawnEnemy('hammer',{x:(i-1)*9,y:2,z:-80-i*9,convoy:true,objective:true});
 if(mission.goal==='chase')spawnEnemy('reaper',{x:0,z:-55,chase:true,elite:true,objective:true});
 notify(mission.change);
 }else if(stage===3){
 notify(mission.final);
 if(mission.boss){spawnBoss(mission.boss);mission.quota=0}
 else if(mission.mini){mission.mini.forEach((k,i)=>spawnMini(k,(i-(mission.mini.length-1)/2)*14));mission.quota=2}
 }else if(stage===4){firing=false;rocketHeld=false;shots=[];mines=[];notify('УРОВЕНЬ ЗАВЕРШЁН · '+mission.name)}
}
function campaignDirector(dt){
 if(!mission)return;mission.time+=dt;mission.stageTime+=dt;
 if(mission.escaped>0){finish(false,mission.goal==='chase'?'Курьер ушёл. Перехват сорван.':'Транспорт противника прорвался. Конвой потерян.');return}
 if(mission.ally&&mission.ally.hp<=0){finish(false,mission.ally.station?'Союзная станция уничтожена.':'Союзный корабль уничтожен.');return}
 if(mission.stage===0){if(mission.stageTime>=4)enterStage(1);return}
 if(mission.stage===4){if(mission.stageTime<2.3)return;if(wave===19){finish(true);return}credits+=180+wave*22;health=Math.min(maxHealth(),health+30);shieldEnergy=maxShield();ammo=maxAmmo();mode='shop';keys={};$('shop').hidden=false;renderShop();saveCampaign(wave+1);return}
 if(mission.ally&&!mission.ally.station){mission.ally.x=Math.sin(mission.time*.2)*4;mission.ally.y=Math.sin(mission.time*.3)*2}
 const special=mission.stage===2,timed=special&&['survive','escort','station'].includes(mission.goal),objects=special&&['objects','generators','blockade'].includes(mission.goal),intercept=special&&['convoy','chase'].includes(mission.goal);
 const continuous=timed||objects;
 mission.spawnClock-=dt;
 if(mission.spawnClock<=0&&enemies.length<18&&(continuous||mission.spawned<mission.quota)){
 let type=mission.pool[mission.spawned%mission.pool.length],elite=mission.elite&&mission.spawned%3===0;
 if(type==='swarm')spawnPack(type,5,{x:(Math.random()-.5)*15});else spawnEnemy(type,{elite});
 mission.spawned++;mission.spawnClock=continuous?5:2.4;
 }
 if(special&&mission.environment==='mines'&&Math.floor(mission.stageTime*2)%7===0&&mines.length<8)spawnMine((Math.random()-.5)*24,(Math.random()-.5)*12,-45,true);
 let complete=false;
 if(timed)complete=mission.stageTime>=25;
 else if(objects){
 complete=mission.objectsDestroyed>=3;
 if(mission.goal==='blockade'&&complete){
 if(!mission.gate){mission.gate={x:wave%2?6:-6,y:2,z:-45,r:3};notify('ПРОХОД ОТКРЫТ · ПРОЛЕТИ ЧЕРЕЗ КОЛЬЦО')}
 let g=mission.gate;g.z+=dt*(dashActive>0?24:9);
 if(Math.abs(g.z-3)<1.5&&Math.hypot(px-g.x,py-g.y)<g.r)mission.gatePassed=true;
 if(g.z>10&&!mission.gatePassed){g.z=-40;notify('ПРОХОД СНОВА ВПЕРЕДИ · ЗАЙМИ ЕГО ПОЛОСУ')}
 complete=mission.gatePassed;
 }
 }
 else if(intercept)complete=mission.stageTime>1&&!enemies.some(e=>e.objective);
 else complete=mission.spawned>=mission.quota&&enemies.length===0&&bossFleet.length===0;
 if(complete){if(mission.stage<3)enterStage(mission.stage+1);else enterStage(4)}
}
function endlessDirector(dt){
 if(bossWave){if(bossFleet.length===0&&enemies.length===0){wave++;prepareWave()}return}
 spawnTimer-=dt;if(spawned<waveCount&&spawnTimer<=0&&enemies.length<22){const pool=Object.keys(enemyDefs).slice(0,Math.min(15,5+Math.floor(wave/2)));let type=pool[(spawned+wave)%pool.length];if(type==='swarm')spawnPack(type,5);else spawnEnemy(type,{elite:wave>5&&spawned%4===0});spawned++;spawnTimer=Math.max(.8,2-wave*.035)}
 if(spawned>=waveCount&&enemies.length===0){wave++;prepareWave()}
}
prepareWave=function(){
 clearDelay=-1;bossWave=false;bossDefeated=false;waveKills=0;spawned=0;spawnTimer=.5;
 if(gameMode==='campaign'){initializeMission();return}
 mission=null;bossWave=(wave+1)%5===0;waveCount=Math.min(26,6+wave*2);
 if(bossWave){let decision=directBoss(),dual=wave>=39&&(wave+1)%20===0;spawnBoss(decision.kind,{...decision,hpScale:decision.hpScale*(dual?.6:1),x:dual?-11:0});if(dual){const next=Object.keys(bossDefs).filter(k=>k!==decision.kind&&k!==bossHistory[bossHistory.length-2]);spawnBoss(next[wave%next.length],{hpScale:decision.hpScale*.6,damageScale:decision.damageScale*.8,x:11})}lastEncounterBosses=bossFleet.map(b=>b.kind);if(wave>=14)spawnPack('reaper',2,{elite:true,z:-70});}
 else notify('ВОЛНА '+(wave+1)+' · HP ×'+difficulty().toFixed(2)+' · УРОН ×'+enemyDamageScale().toFixed(2));
 if(wave===0)configureRocks('asteroids');updateHUD();
};
function snapshot(nextLevel){return {version:6,nextLevel,levels:{...levels},credits,health,score,kills,elapsed}}
function saveCampaign(nextLevel){if(gameMode!=='campaign'||nextLevel>19)return;const data=snapshot(nextLevel);checkpointAvailable=data;$('loadCampaign').textContent='ПРОДОЛЖИТЬ · УРОВЕНЬ '+(nextLevel+1);try{localStorage.setItem('void-sector-campaign-v6',JSON.stringify(data));$('saveState').textContent='Прогресс сохранён на этом ПК'}catch{$('saveState').textContent='Автосохранение недоступно в этом браузере'}return data}
function readCampaignSave(){try{let s=JSON.parse(localStorage.getItem('void-sector-campaign-v6'));if(s?.version!==6||!Number.isInteger(s.nextLevel)||s.nextLevel<0||s.nextLevel>19||!s.levels)return null;for(const u of upgrades)if(!Number.isInteger(s.levels[u.id])||s.levels[u.id]<0||s.levels[u.id]>u.max)return null;for(const k of ['credits','health','score','kills','elapsed'])if(!Number.isFinite(s[k])||s[k]<0)return null;return s}catch{return null}}
nextWave=function(){if(mode!=='shop')return;wave++;$('shop').hidden=true;mode='play';resetBattle();prepareWave();runCheckpoint=snapshot(wave);saveCampaign(wave)};
