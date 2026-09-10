'use strict';
// ===== VOID SECTOR — Этап 4: сюжетный слой (story.js) =====
// Загружается ПОСЛЕДНИМ. Подписывается на шину событий (events.js: on/emit),
// показывает переговоры в панели «ЭФИР» внизу экрана, стенограмму в ангаре,
// правит текст меню и финального экрана. Игру не останавливает и ничего
// в существующих файлах не меняет.
//
// Голоса: капитан (игрок, командир перехватчика «Вектор») и женский бортовой ИИ.
// Штаб, разведка, наука и архивы «Персея» звучат только через ИИ — третьего голоса нет.

// ---------------------------------------------------------------------------
// 1. Персонажи
// ---------------------------------------------------------------------------
const storyCharacters={
 captain:{name:'КАПИТАН',color:'#ffc996'},
 ship_ai:{name:'БОРТОВОЙ ИИ',color:'#9fd7ff'}
};
function storyName(who){return (storyCharacters[who]||storyCharacters.ship_ai).name}

// ---------------------------------------------------------------------------
// 2. Сценарий кампании — по одной записи на уровень (индекс = wave)
//    brief → contact → change → climax → debrief; bossPhase по реальным фазам;
//    ally / timer / objects — ситуативные реплики уровня (objects[2] — "все цели сбиты").
//    Два голоса: капитан (игрок, командир «Вектора») и бортовой ИИ. Всё, что раньше
//    говорили штаб, разведка и наука, ИИ пересказывает как сообщения/анализ данных.
//    Хелпер L принимает (who, displayText, voiceText): третий аргумент — текст для TTS,
//    если он должен отличаться от экранного (аббревиатуры, цифры, ударения, служебные символы).
// ---------------------------------------------------------------------------
const L=(who,text,voiceText)=>({who,text,voiceText:voiceText||null});
const storyScript=[
 // 01 · Первый сигнал — обучение, Иглы
 {brief:[L('ship_ai','Орбита Эреба. Источник сигнала в трёх минутах. Сигнатуры не опознаны.')],
  contact:[L('ship_ai','Контакт: лёгкие перехватчики, класс «Игла». Уклоняются — бери упреждение.')],
  change:[L('ship_ai','Захват: держи прицел на цели до готовности. Ракета доведёт сама.')],
  climax:[],
  debrief:[L('ship_ai','Маршрут чист. Сплав обломков — неизвестной металлургии. Образец сохранён.')]},
 // 02 · Каменный коридор — астероиды, Корсары
 {brief:[L('ship_ai','Астероидный коридор: камни блокируют огонь, наш и их. Сигнал «Персея» шёл отсюда.')],
  contact:[L('ship_ai','Корсары. Веер пулемётного огня — не стой на одной линии.')],
  change:[],
  climax:[L('ship_ai','Корсары перекрывают выход. Три сигнатуры справа — только сопровождение.')],
  debrief:[L('captain','Слишком согласованно для пиратов. Это выученный экипаж.')]},
 // 03 · Засада — выживание 25 с, Громы
 {brief:[L('ship_ai','Сигнал бедствия, гражданский код Союза. Координаты за Эребом. Вероятность ловушки высокая.')],
  contact:[L('ship_ai','Ловушка. Корсары и Громы со всех сторон. Держи позицию — считаю выход из зоны.')],
  change:[L('ship_ai','Управляемые ракеты с флангов. Продержись двадцать пять секунд.')],
  timer:L('ship_ai','Десять секунд до выхода.'),
  climax:[L('ship_ai','Выход рассчитан. Они знали наш код бедствия. Земной код.'),L('captain','Земной код. Запиши всё.')],
  debrief:[L('ship_ai','Код бедствия — стандарт Союза, устаревший на четверть века. Кто-то давно слушает наш эфир.')]},
 // 04 · Живой груз — защита транспорта, мины, Таран
 {brief:[L('ship_ai','Транспорт «Ковчег-3», двести человек. Его прочность — под задачей. Ведём до точки.','Транспорт «Ковчег-три», двести человек. Его прочность — под задачей. Ведём до точки.')],
  contact:[],
  change:[L('ship_ai','Маршрут заминирован. Магнитные мины тянутся к ближнему кораблю — расстреливай издали.')],
  ally:L('ship_ai','Транспорт под огнём, половина корпуса. Прикрой его.'),
  climax:[L('ship_ai','Тяжёлая сигнатура, обозначаю «Таран». Нос бронирован — бей сбоку или ракетами.')],
  debrief:[L('ship_ai','Транспорт вышел из зоны. Броня Тарана — земной сплав. Совпадение исключено.')]},
 // 05 · Пасть Цербера — босс Цербер
 {brief:[L('ship_ai','Командный узел в доке станции — «Цербер». Охрана: Корсары, Громы, Бастионы. У Бастионов щит.')],
  contact:[],
  change:[],
  climax:[L('ship_ai','Цербер выходит из дока. Ракеты — на его турели и модули: каждый сбитый снижает огонь.')],
  bossPhase:{3:[L('ship_ai','Броня сброшена, скорость выше. Ядро открыто — добивай.')]},
  debrief:[L('ship_ai','Цербер уничтожен. В обломках кресло пилота земного стандарта и маркировка: «Персей». Первая экспедиция.'),L('captain','Значит, они не погибли.')]},
 // 06 · Слепая зона — туманность, выживание
 {brief:[L('ship_ai','Акт второй. Идём по следу «Персея». Туманность: захват цели медленнее на треть.')],
  contact:[L('ship_ai','Ракетоносцы — сбивай носители, не ракеты. Призрак: рельсотрон, уходи с линии заряда.')],
  change:[L('ship_ai','Помехи растут, сенсоры теряют цели. Переживи обстрел — двадцать пять секунд.')],
  climax:[],
  debrief:[L('ship_ai','Их ракеты используют наши алгоритмы наведения. Доработанные за двадцать четыре года.')]},
 // 07 · Пояс мин — три узла управления
 {brief:[L('ship_ai','Минёры перекрыли путь магнитными зарядами. Разведка засекла три узла управления полем.')],
  contact:[],
  change:[L('ship_ai','Узлы управления отмечены. Их берут пули, ракеты и импульс в радиусе.')],
  objects:[null,null,L('ship_ai','Поле ослепло. Охрана всё ещё здесь — добей её.')],
  climax:[],
  debrief:[L('ship_ai','Протокол узлов — экспедиционный, «Персей». Они не выживали. Они строили.')]},
 // 08 · Перехват снабжения — конвой
 {brief:[L('ship_ai','Конвой снабжения: три тяжёлых транспорта на корпусах Молотов. Ни один не должен уйти.')],
  contact:[],
  change:[L('ship_ai','Транспорты на маршруте. Нос бронирован — сбоку или ракетами. Не дай уйти за спину.')],
  climax:[L('ship_ai','Конвой уничтожен. Добей арьергард. Из обломков высыпается светящийся серый материал.')],
  debrief:[L('ship_ai','Анализ: не руда. Пепел — материал Архитекторов. Везли тоннами.')]},
 // 09 · Охотники за тенью — погоня за курьером, Баллиста, первый перехват из сектора
 {brief:[L('ship_ai','Элитная эскадрилья прикрывает курьера с данными. Бирюзовые двигатели — элита. Курьер не должен уйти.')],
  // Первое появление классов "Копьё" и "Жнец" в кампании (эскорт курьера) — до этого их
  // не было ни в одном пуле уровня (см. tools/voice/dialogue-audit.txt).
  contact:[L('ship_ai','Копьё держит дистанцию — после паузы три снаряда веером, уходи с линии огня. Жнец быстрый, сближается рывками.')],
  change:[L('ship_ai','Курьер. Держись на его курсе — рывок при совпадении курса ускоряет сближение. Шестьдесят секунд.')],
  climax:[L('ship_ai','Перехват на нашем канале. Источник внутри сектора. Он знает наш позывной.')],
  debrief:[L('ship_ai','Данные курьера зашифрованы ключом «Персея». В моих архивах есть ключ. Расшифровка начата.')]},
 // 10 · Утроба Левиафана — генераторы, босс Левиафан
 {brief:[L('ship_ai','Данные курьера — карта. Переход внутрь сектора охраняет носитель «Левиафан». Сначала внешние генераторы.')],
  contact:[],
  change:[L('ship_ai','Три генератора защищают подход к носителю. Обойти нельзя — только сбить.')],
  objects:[null,null,L('ship_ai','Генераторы погасли. Док открывается.')],
  climax:[L('ship_ai','Левиафан. Дроны, независимые турели, два генератора щита держат корпус. Сначала генераторы.')],
  bossPhase:{2:[L('ship_ai','Ядро открыто. Бей корпус, пока щит не вернулся. Дронов игнорируй.')]},
  debrief:[L('ship_ai','Переход открыт. За ним сектор, которого нет на картах. Врата Архитекторов ведут туда.'),L('captain','Входим. Полный ход.')]},
 // 11 · Осколки флота — обломки «Персея», ретрансляторы, Улей
 {brief:[L('ship_ai','Мы внутри. Поле обломков — корабли. Маркировка «Персей-1», «Персей-4». Вся экспедиция.','Мы внутри. Поле обломков — корабли. Маркировка «Персей-один», «Персей-четыре». Вся экспедиция.')],
  contact:[L('ship_ai','Рой, группы по пять-шесть. Ищи Пастуха — без него строй рассыпается.')],
  change:[L('ship_ai','Три ретранслятора среди обломков. Носители выпускают дронов, пока ретрансляторы живы.')],
  objects:[null,null,L('ship_ai','Ретрансляторы сбиты. Обломки молчат.')],
  climax:[L('ship_ai','Улей — носитель-командир. Выпускает дронов, пока жив. Без него Рой слепой.')],
  debrief:[L('ship_ai','Экипажи не погибли здесь. «Персей» вошёл в сектор — и сектор его переписал. Они зовут себя Пепельным Флотом.')]},
 // 12 · Солнечный ожог — звезда, выживание
 {brief:[L('ship_ai','Звезда сектора. Излучение греет орудия. Голубая полоса — прохладная тень. Тень движется.')],
  contact:[L('ship_ai','Пиявки гасят регенерацию щита рядом с тобой. Сбивай их первыми.')],
  change:[L('ship_ai','Вспышка. Держись в тени двадцать пять секунд. Вне тени пулемёт перегревается быстрее.')],
  timer:L('ship_ai','Десять секунд до спада вспышки. В тень.'),
  climax:[],
  debrief:[L('ship_ai','Пепельный Флот строит корабли из пепла. Из того, что было «Персеем».')]},
 // 13 · Броня и камень — блокада, кольцо
 {brief:[L('ship_ai','Бронированная группа Молотов перекрыла коридор. Нос Молота глотает пули — ракеты обходят броню.')],
  contact:[L('ship_ai','Молоты. В лоб бесполезно. Держи угол.')],
  change:[L('ship_ai','Три узла блокады. Сбей их — откроется проход. Потом совмести корабль с кольцом.')],
  objects:[null,null,L('ship_ai','Проход открыт. Ищи кольцо и проходи. Пропустишь — оно вернётся.')],
  climax:[],
  debrief:[L('ship_ai','Впереди станция «Маяк» — передовая база «Немезиды» в секторе. Двести человек. Флот пойдёт туда.'),L('captain','Тогда мы будем там раньше.')]},
 // 14 · Линия фронта — защита станции «Маяк», Таран и Прелат
 {brief:[L('ship_ai','«Маяк» под ударом. Наступает весь флот. Прочность станции — под задачей.')],
  contact:[],
  change:[L('ship_ai','Подкрепления идут непрерывно. Двадцать пять секунд до подхода резерва «Немезиды».')],
  ally:L('ship_ai','«Маяк» на половине прочности. Перекрой подход к станции.'),
  timer:L('ship_ai','Десять секунд. Резерв на радаре.'),
  climax:[L('ship_ai','Два командира. Таран идёт на станцию, Прелат ставит барьеры. Импульс снимает барьеры в радиусе.')],
  debrief:[L('ship_ai','Станция устояла, резерв подошёл. Сообщение «Маяка»: сигнал флота идёт с флагмана. Технологии Архитекторов.')]},
 // 15 · Призрак флагмана — босс Фантом, идентификация Соколова
 {brief:[L('ship_ai','Флагман за линией охраны. Маскировка, телепортация. Обозначение — «Фантом». Жди проявления, я подсвечу.')],
  contact:[],
  change:[L('ship_ai','Ложные цели рассыпаются от одного попадания. Ракеты держи до проявления.')],
  climax:[L('ship_ai','Фантом. Смещается телепортом, бьёт с двух флангов. Лови момент, когда он виден.')],
  bossPhase:{3:[L('ship_ai','Перехват идентификатора: командор «Персея» Артём Соколов. Он жив. Или то, что от него осталось.')]},
  debrief:[L('ship_ai','Соколов передавал данные ещё десять лет после исчезновения. Союз слушал и молчал.'),L('captain','И послал нас.')]},
 // 16 · Чужая граница — вывод разведчика «Зонд», барьеры
 {brief:[L('ship_ai','Территория Архитекторов. Разведчик «Зонд» отснял их станции и уходит. У него своя прочность.')],
  contact:[],
  change:[L('ship_ai','Инквизиторы ставят барьеры — импульс снимает их в радиусе. Двадцать пять секунд до выхода «Зонда».')],
  ally:L('ship_ai','«Зонд» на половине корпуса. Его добивают.'),
  climax:[L('ship_ai','Заслон впереди. Данные «Зонда»: станции не транспортные. Это карантин.')],
  debrief:[L('ship_ai','Сеть Врат — ловушка для всех, кто откроет ворота. «Персей» открыл. Соколов слит с ядром станции. Они зовут его Архонтом.')]},
 // 17 · Разлом — аномалии, три якоря, Прелат
 {brief:[L('ship_ai','Разлом. Гравитационные импульсы смещают корабль, перед импульсом — предупреждение. Три якоря держат разлом открытым.')],
  contact:[],
  change:[],
  objects:[null,null,L('ship_ai','Разлом схлопывается, но последний якорь держит командир.')],
  climax:[L('ship_ai','Прелат: барьеры на всех вокруг и импульсные снаряды. Твой импульс снимает барьеры. Сними его.')],
  debrief:[L('ship_ai','Разлом закрыт, путь к «Маяку» отрезан. Архив Соколова: разлом открыли они — чтобы вернуться домой.'),L('captain','Они бы не вернулись людьми.')]},
 // 18 · Осада — элитная охрана, генераторы, Улей
 {brief:[L('ship_ai','Осадная платформа Пепельного Флота. Отсюда идут все подкрепления. Три генератора питают поток охраны.')],
  contact:[],
  change:[],
  objects:[null,null,L('ship_ai','Поток остановлен. Они эвакуируют командование.')],
  climax:[L('ship_ai','Улей прикрывает эвакуацию. Пока он жив — дроны не кончатся.')],
  debrief:[L('ship_ai','Платформа разбита. Флот отступает к комплексу Архитекторов. Соколов ждал нас с первого сигнала.'),L('captain','Пусть ждёт.')]},
 // 19 · Последний рубеж — все классы, аномалии, блокада, Баллиста и Таран
 {brief:[L('ship_ai','Последний рубеж перед комплексом. Все типы, все элиты, аномалии.'),L('captain','Эфир не выключай.')],
  contact:[],
  change:[L('ship_ai','Три узла блокады под импульсами аномалии. После узлов — кольцо. Промахнёшься — вернётся.')],
  objects:[null,null,L('ship_ai','Проход открыт. Кольцо впереди.')],
  climax:[L('ship_ai','Последние командиры: Баллиста и Таран. Линии заряда и бронированный нос.')],
  debrief:[L('ship_ai','Рубеж пройден. Впереди комплекс — Сердце Бездны. Если Архонт уничтожен, переход схлопнется. Коридор эвакуации рассчитан.')]},
 // 20 · Сердце Бездны — генераторы, Архонт Бездны (4 фазы), финал
 {brief:[L('ship_ai','Финальный комплекс. Сначала внешние генераторы под огнём подкреплений. Потом Архонт: «Персей», слитый с ядром станции.'),L('captain','Заканчиваем то, что они начали.')],
  contact:[],
  change:[L('ship_ai','Три внешних генератора. Подкрепления идут, пока они живы. Ракеты — на генераторы.')],
  climax:[L('ship_ai','Архонт Бездны. Четыре генератора на кольце — сначала они, корпус защищён.')],
  bossPhase:{2:[L('ship_ai','Генераторы погасли. Внешняя броня открыта — четыре сегмента.')],3:[L('ship_ai','Центральный корабль выходит из станции. Корпус «Персея». Изменённый.'),L('captain','Уже не он. Огонь.')],4:[L('ship_ai','Обломки везде — не сталкивайся. Последняя запись Соколова расшифрована.')]},
  debrief:[L('ship_ai','Архонт уничтожен. Переход схлопывается. Коридор эвакуации на твоём курсе.'),L('ship_ai','АРХИВ «ПЕРСЕЯ» // «Скажите дома, что мы не сдались. Что нам было страшно».','Запись из архива «Персея»: «Скажите дома, что мы не сдались. Что нам было страшно».'),L('captain','Скажем, командор.'),L('ship_ai','Переход закрыт за кормой. Бездна молчит.')]}
];

// Эпилог финального экрана и реплики поражения.
const storyEpilogue='Переход схлопнулся за кормой «Вектора» — сектор, которого нет на картах, снова исчез. Ударная группа «Немезида» вышла к Эребу в полном составе, станция «Маяк» эвакуирована. Данные «Зонда» переданы Союзу: сеть Врат Архитекторов — карантин, и человечество узнало об этом вовремя. Артём Соколов и экипаж «Персея» внесены в списки павших — спустя двадцать четыре года.';

// ---------------------------------------------------------------------------
// 3. Ситуативные реплики (общие пулы) — с перезарядкой ≥ 45 с.
//    Почти всё системное говорит бортовой ИИ; капитан не комментирует каждое попадание.
//    miniSpawn/bossSpawn — словари по типу цели (используются вне сценарных кульминаций).
// ---------------------------------------------------------------------------
const storyPools={
 eliteKill:[],
 // Каждый системный пул ниже — минимум 2 варианта: одно и то же предупреждение может
 // сработать много раз за миссию (порог/гистерезис — events.js), и один и тот же текст
 // подряд звучит как баг, а не как система (см. п.7/22 ТЗ). storyPickFresh не даёт
 // storyPick выбрать тот же вариант, что прозвучал прошлый раз (тот же пул, любой уровень).
 miniKill:[L('ship_ai','Командир сбит. Строй ломается.'),L('ship_ai','Командир уничтожен. Оставшиеся теряют координацию.')],
 lowHull:[L('ship_ai','Корпус в красной зоне. Уйди с линии огня, дай щиту подняться.'),L('ship_ai','Критическая прочность корпуса. Выйди из боя на пару секунд — щит наберёт заряд.')],
 shieldDown:[L('ship_ai','Щит упал. AEGIS перезаряжается — уклоняйся.','Щит упал. +Иджис перезаряжается — уклоняйся.'),L('ship_ai','Щит на нуле. Держись на дистанции, пока AEGIS не поднимется.','Щит на нуле. Держись на дистанции, пока +Иджис не поднимется.')],
 emp:[L('ship_ai','Импульс. Всё в радиусе заглохло, барьеры сняты. Добивай.')],
 overheat:[L('ship_ai','Перегрев. Пулемёт отключён до остывания, ракеты работают.'),L('ship_ai','Орудие перегрето. Работай ракетами, пока стволы остывают.')],
 // Разовый (максимум раз за уровень, см. on('combatStart')) сигнал о новой волне
 // противника, замеченной ПОСЛЕ того, как поле боя уже пустело — не о самом первом
 // контакте уровня (его всегда объявляет сценарный contact) и не о каждом спавне
 // (см. п.10/13 ТЗ). {n} в экранном тексте — реальное число целей на момент срабатывания,
 // не выдумываем; voiceText — как у endlessWave ниже, фиксированная фраза без числа
 // (озвучивать заранее не знаем какое число выпадет, поэтому голос — общий).
 reinforcement:[
  L('ship_ai','Подкрепление на подходе. Целей: {n}.','Подкрепление на подходе.'),
  L('ship_ai','В сектор вошла свежая группа. Целей: {n}.','В сектор вошла свежая группа.'),
  L('ship_ai','Новая группа противника на радаре. Целей: {n}.','Новая группа противника на радаре.')
 ],
 // Реальная боевая обратная связь по попаданиям (взамен шаблонного чата, см. запрос
 // пользователя): щит на половине → щит на нуле (shieldDown выше) → первый удар по
 // корпусу без щита → корпус в красной зоне (lowHull выше). Голос — качественный
 // ("на половине"/"критический"), точный процент — только на экране (comms), TTS не
 // умеет произносить произвольные числа на лету. on('shieldHalf'/'hullExposed') ниже.
 shieldHalf:[L('ship_ai','Щит на половине. Не подставляйся под очередь.'),L('ship_ai','Щит слабеет. Держи дистанцию.')],
 hullExposed:[L('ship_ai','Щит не держит. Урон идёт в корпус.'),L('ship_ai','Щит пробит. Теперь каждое попадание — по корпусу.')],
 // Голосом произносим цель миссии сразу после брифинга (п. запроса «озвучивать цели
 // миссии») — по типу задачи (campaign.js: goal), а не по уровню: 9 вариантов на все
 // 20 миссий, не 20 отдельных строк.
 objective:{
  clear:L('ship_ai','Цель: уничтожить все вражеские силы в секторе.'),
  survive:L('ship_ai','Цель: продержаться под атакой до расчётного времени выхода.'),
  escort:L('ship_ai','Цель: сопроводить и защитить союзный корабль.'),
  objects:L('ship_ai','Цель: уничтожить обозначенные объекты.'),
  generators:L('ship_ai','Цель: уничтожить генераторы защиты.'),
  convoy:L('ship_ai','Цель: перехватить и уничтожить весь конвой.'),
  chase:L('ship_ai','Цель: догнать и перехватить цель.'),
  blockade:L('ship_ai','Цель: пробить блокаду и пройти кольцо.'),
  station:L('ship_ai','Цель: удержать союзную станцию.')
 },
 // Реплики поражения — раньше отдельный массив storyLoseLines без анти-повтора; теперь
 // обычный пул, storyPickFresh не даст услышать одно и то же на 2 смертях подряд.
 lose:[L('ship_ai','Капитан не отвечает. Корпус потерян. Передаю координаты штабу.'),L('ship_ai','Сигнал маяка «Вектора» потерян. Запущен поиск пилота.')],
 multiLock:[],
 pickup:[],
 miniSpawn:{hammer:L('ship_ai','Таран. Бронированный нос — бей сбоку или ракетами.'),lancer:L('ship_ai','Баллиста. Три рельсотронных снаряда после заряда — уходи с линии.'),carrier:L('ship_ai','Улей. Выпускает Рой, пока жив. Бей носитель.'),inquisitor:L('ship_ai','Прелат. Барьеры на соседей и импульсные снаряды. Твой импульс снимает барьеры.')},
 bossSpawn:{cerberus:L('ship_ai','Цербер на полигоне. Турели и ракеты — модули сбиваются отдельно.'),leviathan:L('ship_ai','Левиафан. Сначала два генератора щита, потом ядро.'),phantom:L('ship_ai','Фантом. Не верь силуэтам, жди проявления.'),archon:L('ship_ai','Архонт. Генераторы на кольце, потом броня, потом центральный корабль.')},
 bossSpawnExtra:[L('ship_ai','Тяжёлая цель. Модули — в первую очередь.')],
 dualBoss:[L('ship_ai','Две тяжёлые цели. Разводи их по сторонам, не стой между ними.')],
 endlessStart:[L('ship_ai','Учебно-боевой полигон «Немезиды». Без ангара и пауз. Улучшения подбирай в бою.')],
 endlessWave:[L('ship_ai','Волна {n}. Симуляция усложняется.','Новая волна. Симуляция усложняется.')]
};

// ---------------------------------------------------------------------------
// 4. Состояние и настройки
// ---------------------------------------------------------------------------
// debriefPending — истинно с начала levelComplete и до конца ПОСЛЕДНЕЙ реплики разбора
// (см. storyAPI.isPostLevelDebriefPending, campaignDirector); lastScripted — момент
// окончания последней сценарной реплики (для паузы перед situational chatter, п.21 ТЗ);
// lastPick — последний выбранный индекс на пул, чтобы storyPickFresh не повторял его сразу.
const storyState={level:0,shownKeys:new Set(),empUses:0,lastGeneric:-1e9,lastScripted:-1e9,debriefPending:false,lastPick:{},campaign:true,started:false};
// tutorialSeen переживает рестарт/повтор уровня и даже новую кампанию (в отличие от
// shownKeys, который намеренно чистится на каждом start() — см. storyBind): обучающая
// реплика про захват ракеты должна прозвучать один раз за всё время игры на этом
// браузере, а не при каждой повторной попытке уровня 1.
const storySettings={voice:false,tutorialSeen:false};
try{const s=JSON.parse(localStorage.getItem('void-sector-story'));if(s&&typeof s.voice==='boolean')storySettings.voice=s.voice;if(s&&typeof s.tutorialSeen==='boolean')storySettings.tutorialSeen=s.tutorialSeen}catch{}
function storySave(){try{localStorage.setItem('void-sector-story',JSON.stringify(storySettings))}catch{}}
function storyOnce(key){if(storyState.shownKeys.has(key))return false;storyState.shownKeys.add(key);return true}
const storyNow=()=>performance.now()/1000;
const storyPick=arr=>arr[Math.floor(Math.random()*arr.length)];
// Как storyPick, но не выбирает дважды подряд один и тот же вариант того же пула (п.19 ТЗ:
// анти-повтор без NLP/семантических ID — достаточно помнить последний индекс на пул).
// Работает по имени пула в storyPools, а не по самому массиву — так lastPick переживает
// смену уровня естественно (пул общий на всю кампанию, счётчик не сбрасывается в levelBegin).
function storyPickFresh(poolName){
 const arr=storyPools[poolName];if(!arr||!arr.length)return null;
 if(arr.length===1)return arr[0];
 const last=storyState.lastPick[poolName];let idx;
 do{idx=Math.floor(Math.random()*arr.length)}while(idx===last);
 storyState.lastPick[poolName]=idx;
 return arr[idx];
}

// ---------------------------------------------------------------------------
// 5. Панель «ЭФИР»: DOM, стили, портреты
// ---------------------------------------------------------------------------
const storyCSS=`
#comms{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);width:clamp(320px,calc(100vw - 980px),600px);z-index:3;pointer-events:none;display:flex;gap:14px;align-items:stretch;padding:10px 14px 12px;border:1px solid #98f8ed33;background:linear-gradient(180deg,#07121dd9,#050c15e6);box-shadow:0 0 30px #0009,inset 0 0 0 1px #ffffff08;opacity:0;transition:opacity .35s;font-family:Manrope,Arial,sans-serif;color:#e6f0f7}
#comms.on{opacity:1}
#comms:before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 2px,#ffffff05 2px 3px);mix-blend-mode:screen;animation:commsStatic 1.2s steps(6) infinite;opacity:.6}
#comms:after{content:'';position:absolute;left:-1px;right:-1px;top:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--comms,#98f8ed),transparent);opacity:.8}
@keyframes commsStatic{from{background-position:0 0}to{background-position:0 6px}}
#comms .commsLabel{position:absolute;top:-9px;left:14px;font-size:9px;letter-spacing:3px;padding:1px 6px;background:#07121d;color:var(--comms,#98f8ed);border:1px solid #98f8ed33}
#comms .commsPortrait{flex:0 0 54px;width:54px;height:54px;align-self:center;border:1px solid #ffffff14;background:#0a1621}
#comms .commsPortrait svg{width:100%;height:100%;display:block}
#comms .commsBody{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
#comms .commsName{font-size:11px;font-weight:800;letter-spacing:2px;color:var(--comms,#98f8ed);margin-bottom:5px}
#comms .commsText{font-size:15px;line-height:1.45;min-height:44px;color:#eef5fb;text-shadow:0 1px 3px #000}
#comms .commsText i{display:inline-block;width:7px;height:14px;background:var(--comms,#98f8ed);vertical-align:-2px;margin-left:2px;animation:commsCaret .6s steps(2) infinite}
@keyframes commsCaret{to{opacity:0}}
#comms .commsBar{height:2px;background:#ffffff14;margin-top:8px}
#comms .commsBar i{display:block;height:100%;width:100%;background:var(--comms,#98f8ed);transition:width .12s linear}
@media(max-width:1000px){#comms{width:clamp(260px,calc(100vw - 560px),520px);bottom:100px}}
@media(max-width:700px){#comms{width:min(300px,calc(100vw - 120px));bottom:170px;left:20px;transform:none;gap:8px;padding:8px 10px}#comms .commsPortrait{flex-basis:38px;width:38px;height:38px}#comms .commsText{font-size:12px;min-height:34px}#comms .commsName{font-size:9px}}
#storyTranscript{margin:18px 0 6px;padding:14px 18px;border:1px solid #98f8ed22;background:#0c1a2790}
#storyTranscript h3{font-size:11px;letter-spacing:3px;color:#98f8ed;margin:0 0 10px;font-weight:700}
#storyTranscript h3+h3{margin-top:0}
#storyTranscript .line{display:flex;gap:12px;font-size:14px;line-height:1.5;margin:0 0 6px;color:#c6d6e2}
#storyTranscript .line b{flex:0 0 150px;font-size:11px;letter-spacing:1.5px;font-weight:800;padding-top:3px}
#storyTranscript .gap{height:14px}
@media(max-width:700px){#storyTranscript .line{flex-direction:column;gap:2px;font-size:12px}#storyTranscript .line b{flex-basis:auto}}
#modalText .storyLose{display:block;color:#9fd7ff;margin-bottom:10px;font-style:italic}
#modalText .storyEnd{display:block;margin:0 0 10px;font-size:13px;color:#c6d6e2}
#modalText .storyEnd b{letter-spacing:1px;font-size:11px;margin-right:8px}
`;
// Процедурные портреты: капитан — схематичный шлем с визором; ИИ — геометрическое ядро/сигнал, не лицо.
function storyPortrait(who){
 const c=(storyCharacters[who]||storyCharacters.ship_ai).color,g='#0a1621';
 const head=(extra='')=>`<svg viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg"><rect width="54" height="54" fill="${g}"/>${extra}</svg>`;
 if(who==='captain')return head(`<path d="M27 8 L44 18 L44 34 L27 46 L10 34 L10 18 Z" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M14 22 L40 22 L36 30 L18 30 Z" fill="${c}" opacity=".85"/><path d="M20 36 h14" stroke="${c}" stroke-width="1.2"/><circle cx="27" cy="26" r="1.6" fill="${g}"/>`);
 return head(`<circle cx="27" cy="27" r="18" fill="none" stroke="${c}" stroke-width="1.2" stroke-dasharray="6 4"/><circle cx="27" cy="27" r="11" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="27" cy="27" r="4" fill="${c}"/><path d="M27 5 v6 M27 43 v6 M5 27 h6 M43 27 h6" stroke="${c}" stroke-width="1.6"/><path d="M17 36 h4 v-6 h4 v10 h4 v-14 h4 v8 h4" fill="none" stroke="${c}" stroke-width="1.2" opacity=".85"/>`);
}
let storyPanel=null,storyEls=null;
function storyBuildPanel(){
 if(!document.body||storyPanel)return;
 const st=document.createElement('style');st.id='storyStyle';st.textContent=storyCSS;(document.head||document.body).appendChild(st);
 storyPanel=document.createElement('div');storyPanel.id='comms';storyPanel.hidden=true;storyPanel.setAttribute('aria-live','polite');
 storyPanel.innerHTML='<span class="commsLabel">ЭФИР</span><div class="commsPortrait"></div><div class="commsBody"><div class="commsName"></div><div class="commsText"></div><div class="commsBar"><i></i></div></div>';
 document.body.appendChild(storyPanel);
 storyEls={portrait:storyPanel.querySelector('.commsPortrait'),name:storyPanel.querySelector('.commsName'),text:storyPanel.querySelector('.commsText'),bar:storyPanel.querySelector('.commsBar i')};
}

// ---------------------------------------------------------------------------
// 6. Очередь реплик, печатная машинка, тайминг (замирает вне mode==='play')
// ---------------------------------------------------------------------------
const storyQueue=[];let storyCurrent=null,storyElapsed=0,storyVisible=false,storyHideTimer=0,storyLastTick=0;
const storyDuration=text=>Math.max(2.4,1.1+text.length*.045);
function storyHasScripted(){return (storyCurrent&&storyCurrent.scripted)||storyQueue.some(l=>l.scripted)}
// Ситуативный chatter не чаще раза в ~45 с и не раньше STORY_HUSH_SEC после конца
// последней сценарной реплики (п.21 ТЗ: 8-12 с тишины после важного события — берём середину).
const STORY_HUSH_SEC=10;
// Поставить реплику в очередь. scripted=false — ситуативная (может быть отброшена).
// vital=true — боевое предупреждение (щит/корпус): не делит 45-секундный кулдаун с
// обычным чатом (miniKill/reinforcement/pickup) и не запускает его сам — иначе важное
// «щит на половине» могло бы молча потеряться из-за недавней болтовни не по теме.
// Сценарные реплики и пауза после них (STORY_HUSH_SEC) важнее вообще всего — это не меняется.
function storySay(line,scripted=true,vital=false){
 if(!line||!line.text)return false;
 if(!scripted){
  if(storyHasScripted())return false;
  if(!vital&&storyNow()-storyState.lastGeneric<45)return false;
  if(storyNow()-storyState.lastScripted<STORY_HUSH_SEC)return false;
  if(storyCurrent)return false;
  if(!vital)storyState.lastGeneric=storyNow();
 }else{
  if(storyCurrent&&!storyCurrent.scripted)storyElapsed=storyCurrent.duration;// сценарная обрывает играющую ситуативную
  if(storyQueue.length&&!storyQueue[0].scripted)storyQueue.length=0;// и отменяет ещё не начатую ситуативную в очереди (п.8 ТЗ)
 }
 storyQueue.push({who:line.who,text:line.text,voiceText:line.voiceText||null,scripted,duration:storyLineDuration(line)});
 return true;
}
function storySayAll(lines,scripted=true){if(Array.isArray(lines))for(const l of lines)storySay(l,scripted);else if(lines)storySay(lines,scripted)}
// debriefPending сбрасывается и здесь — на случай, если очередь очистили извне
// (выход в меню, ручной restart) раньше, чем разбор миссии доиграл сам; иначе ангар
// мог бы никогда не открыться (см. campaignDirector). Основной путь очистки — normal
// drain в storyTick ниже, это только защита от бага/внешнего вмешательства.
function storyClear(){storyQueue.length=0;storyCurrent=null;storyState.debriefPending=false;storyHidePanel(true)}
function storyShowPanel(){if(!storyPanel)storyBuildPanel();if(!storyPanel)return;clearTimeout(storyHideTimer);storyPanel.hidden=false;requestAnimationFrame(()=>storyPanel.classList.add('on'));storyVisible=true}
function storyHidePanel(immediate=false){
 if(!storyPanel||!storyVisible)return;storyVisible=false;storyPanel.classList.remove('on');
 clearTimeout(storyHideTimer);if(immediate)storyPanel.hidden=true;else storyHideTimer=setTimeout(()=>{if(!storyVisible)storyPanel.hidden=true},380);
 try{globalThis.sfx?.('radioClose')}catch{}
 try{globalThis.audioAPI?.stopVoice?.()}catch{}
}
// ---------- Предзаписанная озвучка (Silero TTS, см. tools/voice/) ----------
// voiceKey — тот же алгоритм (FNV-1a от 'who text'), что и в
// tools/voice/extract_story.mjs, иначе ключи не совпадут с voice-manifest.js.
function fnv1a(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h>>>0)*0x01000193}return (h>>>0).toString(16).padStart(8,'0')}
// Разделитель — NUL ('\0'), не пробел: должен побайтово совпадать с
// normalizeForKey() в tools/voice/extract_story.mjs, иначе ключи разъедутся.
function storyVoiceKey(line){return fnv1a(line.who+'\0'+(line.voiceText||line.text))}
function storyVoiceSrc(line){const e=globalThis.VOICE_MANIFEST?.lines?.[storyVoiceKey(line)];return e?e.src:null}
// Длительность показа реплики: оценка по тексту, но не короче реальной записи (+0.25 с),
// иначе панель закрылась бы и stopVoice() обрезал бы длинную озвучку раньше конца.
function storyLineDuration(line){
 const est=storyDuration(line.text);
 if(!storySettings.voice)return est;
 const e=globalThis.VOICE_MANIFEST?.lines?.[storyVoiceKey(line)];
 return e&&e.duration>0?Math.max(est,e.duration+.25):est;
}
function storySpeak(line){
 if(!storySettings.voice)return;
 const src=storyVoiceSrc(line);
 if(!src){console.warn('story: нет озвучки для реплики',line.who,line.text);return}
 // ~100мс после звука открытия эфира — даёт radioOpen прозвучать отдельно, не внахлёст с голосом.
 setTimeout(()=>{if(storyCurrent!==line)return;try{globalThis.audioAPI?.playVoice?.(src)}catch{}},100);
}
// Одноразовое проигрывание реплики вне очереди/тика (см. storyPatchFinish) —
// экраны победы/поражения не тикают storyTick (mode!=='play'), но озвучка там
// всё равно должна звучать.
function playStoryVoice(line,onended){
 if(!storySettings.voice)return false;
 const src=storyVoiceSrc(line);
 if(!src){console.warn('story: нет озвучки для реплики',line.who,line.text);onended?.();return false}
 try{globalThis.audioAPI?.playVoice?.(src,{onended})}catch{onended?.()}
 return true;
}
function playStoryVoiceSequence(lines){
 if(!storySettings.voice||!lines?.length)return;
 let i=0;const next=()=>{if(i>=lines.length)return;const l=lines[i++];if(!playStoryVoice(l,next))next()};
 next();
}
function storyStartLine(line){
 storyCurrent=line;storyElapsed=0;if(!storyPanel)storyBuildPanel();if(!storyEls)return;
 const c=storyCharacters[line.who]||storyCharacters.ship_ai;
 storyPanel.style.setProperty('--comms',c.color);storyPanel.className=line.who;storyPanel.classList.toggle('on',true);
 storyEls.portrait.innerHTML=storyPortrait(line.who);storyEls.name.textContent=storyName(line.who);storyEls.text.innerHTML='<i></i>';storyEls.bar.style.width='100%';
 storyShowPanel();try{globalThis.sfx?.('radioOpen',{who:line.who})}catch{}storySpeak(line);
 try{const nxt=storyQueue[0];if(nxt)globalThis.audioAPI?.preloadVoice?.(storyVoiceSrc(nxt))}catch{}
}
function storyTick(now){
 requestAnimationFrame(storyTick);
 const dt=Math.min(.1,(now-storyLastTick)/1000||0);storyLastTick=now;
 const m=mode;
 if(m==='shop'||m==='menu'||m==='win'||m==='lose'){if(storyCurrent||storyQueue.length||storyVisible)storyClear();return}
 if(m!=='play')return;// пауза: очередь замирает
 if(!storyCurrent){if(!storyQueue.length){if(storyVisible)storyHidePanel();return}storyStartLine(storyQueue.shift())}
 storyElapsed+=dt;const line=storyCurrent,shown=Math.min(line.text.length,Math.floor(storyElapsed*45));
 if(storyEls){storyEls.text.innerHTML=storyEscape(line.text.slice(0,shown))+(shown<line.text.length?'<i></i>':'');storyEls.bar.style.width=Math.max(0,100-storyElapsed/line.duration*100)+'%'}
 if(storyElapsed>=line.duration){
  storyCurrent=null;
  if(line.scripted)storyState.lastScripted=storyNow();// начинает "тишину" перед следующим ситуативным chatter
  if(!storyQueue.length){
   storyElapsed=0;
   // Реплика доиграла ПОЛНОСТЬЮ (голос учтён в line.duration, см. storyLineDuration) и очередь
   // пуста — если это была последняя реплика post-level debrief, ангару больше нечего ждать.
   if(line.scripted&&storyState.debriefPending)storyState.debriefPending=false;
  }
 }
}
function storyEscape(s){return s.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))}

// ---------------------------------------------------------------------------
// 7. Стенограмма в ангаре (#shop .hangar, перед #shopCategories)
// ---------------------------------------------------------------------------
function storyTranscriptLine(l){return '<p class="line '+l.who+'"><b style="color:'+(storyCharacters[l.who]||storyCharacters.ship_ai).color+'">'+storyName(l.who)+'</b><span>'+storyEscape(l.text)+'</span></p>'}
// Сводка миссии в ангаре. Заполняет фиксированный слот <details id="storyReport"> из
// index.html (свёрнут по умолчанию — не мешает покупать улучшения и не раздувает высоту
// экрана); если слота нет — старый fallback со вставкой блока #storyTranscript перед категориями.
function storyRenderTranscript(level){
 const hangar=document.querySelector('#shop .hangar'),report=$('storyReport');if(!hangar)return;
 const old=$('storyTranscript');if(old)old.remove();
 if(report){report.hidden=true;report.open=false}
 if(gameMode!=='campaign')return;
 const done=storyScript[level],next=storyScript[level+1],nextDef=campaign?.[level+1];
 let html='';
 if(done?.debrief?.length)html+='<h3>ПЕРЕГОВОРЫ</h3>'+done.debrief.map(storyTranscriptLine).join('');
 if(next?.brief?.length&&nextDef){html+=(html?'<div class="gap"></div>':'')+'<h3>БРИФИНГ · '+storyEscape(nextDef.name.toUpperCase())+'</h3>'+next.brief.map(storyTranscriptLine).join('')}
 if(!html)return;
 if(report){
  // В компактном альбомном ангаре (html.compact-landscape, style.css) кнопка-раскрывашка
  // короткая ("СВОДКА") — п.32 ТЗ; на остальных раскладках (десктоп, портрет) остаётся
  // полная подпись с названием следующей миссии, там она умещается свободно.
  const compact=document.documentElement.classList.contains('compact-landscape');
  const summary=compact?'СВОДКА':(nextDef?'СВОДКА МИССИИ · ДАЛЕЕ: '+storyEscape(nextDef.name.toUpperCase()):'СВОДКА МИССИИ');
  report.innerHTML='<summary>'+summary+'</summary><div class="reportBody">'+html+'</div>';report.hidden=false;return;
 }
 const box=document.createElement('div');box.id='storyTranscript';box.innerHTML=html;
 const anchor=$('shopCategories');
 if(anchor&&anchor.parentNode===hangar)hangar.insertBefore(box,anchor);else hangar.appendChild(box);
}

// ---------------------------------------------------------------------------
// 8. Меню и финальный экран
// ---------------------------------------------------------------------------
function storyPatchMenu(){
 const p=document.querySelector('#menu > p:not(#modeInfo)');
 if(p)p.innerHTML='2287 год. Врата Архитекторов открыли сектор, которого нет на картах.<br>Экспедиция «Персей» вошла туда 24 года назад — и вернулась чужой.<br>Ударная группа «Немезида». Перехватчик «Вектор». Ты — его капитан.';
 const loc=document.querySelector('#location p');
 if(loc)loc.innerHTML='Газовый гигант · порог Сектора Пустоты<br>Ударная группа «Немезида» · перехватчик «Вектор»';
}
function storyPatchFinish(win){
 const title=$('modalTitle'),text=$('modalText');if(!text)return;
 const scoreLine=' Счёт: '+(score||0).toLocaleString('ru')+' · '+(gameMode==='campaign'?'Уровень ':'Волна ')+((wave||0)+1)+'.';
 if(win&&gameMode==='campaign'){
  if(title)title.textContent='БЕЗДНА МОЛЧИТ.';
  const fin=storyScript[19].debrief.map(l=>'<span class="storyEnd"><b style="color:'+storyCharacters[l.who].color+'">'+storyName(l.who)+'</b>'+storyEscape(l.text)+'</span>').join('');
  text.innerHTML=fin+storyEscape(storyEpilogue+scoreLine);
  // Экран победы: storyTick тут не тикает (mode==='win'), поэтому озвучка — вне очереди/тика.
  playStoryVoiceSequence(storyScript[19].debrief);
 }else if(!win){
  const l=storyPickFresh('lose');
  text.innerHTML='<span class="storyLose" style="color:'+storyCharacters[l.who].color+'">'+storyName(l.who)+' — '+storyEscape(l.text)+'</span>'+storyEscape(text.textContent||'');
  playStoryVoice(l);
 }
}

// ---------------------------------------------------------------------------
// 9. Подписки на события
// ---------------------------------------------------------------------------
function storyLevel(){return storyScript[storyState.level]||null}
function storyBind(){
 if(typeof globalThis.on!=='function'){console.warn('story.js: шина событий (events.js) не найдена');return}
 on('start',({saved,gameMode:gm})=>{
  storyState.shownKeys.clear();storyState.level=0;storyState.empUses=0;storyState.lastGeneric=-1e9;storyState.lastScripted=-1e9;storyState.lastPick={};storyState.campaign=gm==='campaign';storyState.started=true;storyClear();
  if(gm==='endless')storyState.lastGeneric=-1e9;
 });
 on('levelBegin',({level,gameMode:gm})=>{
  storyState.level=level;storyState.campaign=gm==='campaign';storyClear();
  if(gm!=='campaign'){if(level===0)storySayAll(storyPools.endlessStart);return}// бесконечный режим: дальше см. waveBegin
  const s=storyLevel();if(s&&storyOnce('brief'+level))storySayAll(s.brief);
  // Цель миссии — сразу после брифинга, по типу задачи (campaign.js: goal), один раз за
  // уровень за этот заход (см. запрос «озвучивать цели миссии»).
  const def=typeof campaign!=='undefined'?campaign[level]:null,goalLine=def&&storyPools.objective[def.goal];
  if(goalLine&&storyOnce('objective'+level))storySay(goalLine);
 });
 on('stage',({stage,level})=>{
  if(!storyState.campaign)return;const s=storyLevel();if(!s)return;
  if(stage===1&&storyOnce('contact'+level))storySayAll(s.contact);
  if(stage===2&&storyOnce('change'+level)){
   // Обучение про захват цели ракетой (уровень 1) — не по разу за попытку/рестарт, а
   // ровно один раз за всё время игры на этом браузере (см. storySettings.tutorialSeen).
   if(level===0){if(!storySettings.tutorialSeen){storySayAll(s.change);storySettings.tutorialSeen=true;storySave()}}
   else storySayAll(s.change);
  }
  if(stage===3&&storyOnce('climax'+level))storySayAll(s.climax);
 });
 on('bossPhase',({kind,phase})=>{
  if(!storyState.campaign)return;const s=storyLevel();
  if(s?.bossPhase?.[phase]&&storyOnce('boss'+storyState.level+'_'+phase))storySayAll(s.bossPhase[phase]);
 });
 on('levelComplete',({level})=>{
  if(!storyState.campaign)return;const s=storyLevel();
  // Все реплики разбора миссии — целиком, ДО ангара (не только первая, как раньше: тот
  // вариант обрывал голос фиксированной задержкой в campaignDirector). debriefPending
  // держит ангар закрытым, пока не доиграет последняя строка; см. storyTick/storyClear
  // и storyAPI.isPostLevelDebriefPending, которую опрашивает campaignDirector (campaign.js).
  //
  // Раньше здесь было storyQueue.length=0 перед постановкой debrief — если игрок добивал
  // последнего врага climax'а быстро (climax из 2+ строк, например уровень 3 "Засада":
  // реплика ИИ + ответ капитана "Земной код. Запиши всё."), это молча стирало ещё НЕ
  // начатую вторую строку climax'а из очереди, будто она оборвалась. storySayAll(s.debrief)
  // ниже просто ДОБАВЛЯЕТ debrief в конец очереди — storySay() сам безопасно уберёт разве
  // что зависшую ситуативную (generic) реплику, но никогда не тронет уже стоящую в очереди
  // сценарную (см. её же логику приоритета выше). Debrief проиграет ПОСЛЕ того, как
  // доиграет всё, что реально было запланировано сценарием — так и должно быть.
  if(s?.debrief?.length&&level<19&&storyOnce('debrief'+level)){
   storyState.debriefPending=true;storySayAll(s.debrief);
  }
 });
 on('shopOpen',({level})=>{storyClear();storyRenderTranscript(level)});
 on('finish',({win})=>{storyClear();storyPatchFinish(win)});
 on('exit',()=>storyClear());
 on('structureDestroyed',()=>{
  if(!storyState.campaign)return;const s=storyLevel(),m=mission;if(!s?.objects||!m||m.stage!==2)return;
  const idx=Math.min(2,Math.max(0,(m.objectsDestroyed||1)-1));if(storyOnce('obj'+storyState.level+'_'+idx))storySay(s.objects[idx]);
 });
 // Боевая обратная связь по попаданиям — vital:true (см. storySay): щит/корпус важнее
 // обычного чата, не делят с ним 45-секундный кулдаун (запрос: "попадание — сколько щита
 // осталось, потом щит сел — попадание идёт в корпус" вместо шаблонных фраз не по делу).
 on('shieldHalf',()=>storySay(storyPickFresh('shieldHalf'),false,true));
 on('shieldDown',()=>storySay(storyPickFresh('shieldDown'),false,true));
 on('hullExposed',()=>storySay(storyPickFresh('hullExposed'),false,true));
 on('lowHull',()=>{
  const s=storyState.campaign?storyLevel():null;
  if(s?.lowHull&&storyOnce('lowHull'+storyState.level)){storySay(s.lowHull);return}
  storySay(storyPickFresh('lowHull'),false,true);
 });
 on('emp',()=>{storyState.empUses++;if(storyState.empUses<=1)storySay(storyPools.emp[0],false)});
 on('overheat',()=>storySay(storyPickFresh('overheat'),false));
 on('missileLaunch',({count})=>{if(count>=2)storySay(storyPick(storyPools.multiLock),false)});
 on('pickup',()=>{if(Math.random()<.25)storySay(storyPick(storyPools.pickup),false)});
 on('enemyKilled',({elite,mini,decoy})=>{
  if(decoy)return;
  if(mini)storySay(storyPickFresh('miniKill'),false);
  else if(elite&&Math.random()<.5)storySay(storyPick(storyPools.eliteKill),false);
 });
 // Новая волна замечена ПОСЛЕ того, как поле боя уже пустело (см. eventState.combat в
 // events.js) — не первый контакт уровня (его берёт на себя сценарный contact; за счёт
 // storyHasScripted() внутри storySay эта реплика и не может обогнать/задвоить его,
 // см. п.10 ТЗ) и максимум раз за уровень (не на каждый спавн, п.13 ТЗ). shownKeys
 // помечается только при реально ушедшей реплике — иначе неудачная попытка (её отбросили
 // из-за паузы/приоритета) сожгла бы единственный шанс на этот уровень без результата.
 on('combatStart',()=>{
  if(!storyState.campaign||storyState.debriefPending)return;
  if(storyState.shownKeys.has('reinforce'+storyState.level))return;
  if(storyNow()-storyState.lastScripted<6)return;
  const l=storyPickFresh('reinforcement');if(!l)return;
  const n=String((typeof enemies!=='undefined'?enemies.length:0)||1);
  const said=storySay({who:l.who,text:l.text.replace('{n}',n),voiceText:l.voiceText},false);
  if(said)storyState.shownKeys.add('reinforce'+storyState.level);
 });
 on('miniSpawn',({kind})=>{
  // В кампании командиров объявляет сценарная кульминация; общий пул — для остальных случаев.
  if(storyState.campaign&&storyLevel()?.climax)return;
  storySay(storyPools.miniSpawn[kind],false);
 });
 on('bossSpawn',({kind})=>{
  if(storyState.campaign)return;
  const w=wave||0,dual=w>=39&&(w+1)%20===0;// парная встреча (см. prepareWave)
  if(!storyOnce('boss'+w))return;// второй spawnBoss той же волны не дублируем
  storyState.lastGeneric=-1e9;// босс важнее перезарядки
  storySay(dual?storyPick(storyPools.dualBoss):(storyPools.bossSpawn[kind]||storyPick(storyPools.bossSpawnExtra)),false);
 });
 on('waveBegin',({wave:w,bossWave:bw})=>{
  if(storyState.campaign)return;
  if(w===0||bw)return;// вступление — в levelBegin, босс — в bossSpawn
  if(w%5===0){storyState.lastGeneric=-1e9;const l=storyPick(storyPools.endlessWave);storySay({who:l.who,text:l.text.replace('{n}',String(w+1))},false)}
 });
 // Опрос: союзник ниже 50% и таймер выживания ~10 с.
 setInterval(()=>{
  if(mode!=='play'||!storyState.campaign)return;const m=mission,s=storyLevel();if(!m||!s)return;
  if(s.ally&&m.ally&&m.ally.hp<m.ally.maxHp*.5&&storyOnce('ally'+storyState.level))storySay(s.ally);
  if(s.timer&&m.stage===2&&['survive','escort','station'].includes(m.goal)&&25-m.stageTime<=10&&storyOnce('timer'+storyState.level))storySay(s.timer);
 },250);
}

// ---------------------------------------------------------------------------
// 10. Публичный API
// ---------------------------------------------------------------------------
const storyAPI={
 characters:storyCharacters,script:storyScript,pools:storyPools,state:storyState,settings:storySettings,
 setVoice(v){storySettings.voice=!!v;storySave();if(!v)try{globalThis.audioAPI?.stopVoice?.()}catch{}return storySettings.voice},
 getVoice(){return storySettings.voice},
 // Опрашивается campaignDirector (campaign.js) перед открытием ангара: пока true — миссия
 // ещё не считается завершённой, ангар ждёт. См. п.3 ТЗ (не фиксированный таймер).
 isPostLevelDebriefPending(){return storyState.debriefPending},
 say(who,text,scripted=true){return storySay({who,text},scripted)},
 skip(){if(storyCurrent)storyElapsed=storyCurrent.duration},
 clear:storyClear,
 transcript:storyRenderTranscript,
 lineCount(){let n=0;for(const s of storyScript){for(const k of ['brief','contact','change','climax','debrief','objects'])n+=(s[k]||[]).length;for(const k of ['lowHull','ally','timer'])if(s[k])n++;if(s.bossPhase)for(const p in s.bossPhase)n+=s.bossPhase[p].length}return n}
};
globalThis.storyAPI=storyAPI;

// ---------------------------------------------------------------------------
// 11. Инициализация
// ---------------------------------------------------------------------------
(function storyInit(){
 const boot=()=>{storyBuildPanel();storyPatchMenu();storyBind();storyLastTick=performance.now();requestAnimationFrame(storyTick)};
 if(document.body)boot();else document.addEventListener('DOMContentLoaded',boot,{once:true});
})();
