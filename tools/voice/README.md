# VOID SECTOR — голосовой пайплайн (tools/voice)

Озвучка диалогов кампании: **два голоса** — `captain` (игрок, командир «Вектора»)
и `ship_ai` (женский бортовой ИИ). Один и тот же prerecorded voice pack для PC и
Mobile; в игре нет ни браузерного `speechSynthesis`, ни TTS-моделей на устройстве —
только статические `.mp3` + `voice-manifest.js`.

## Порядок работы (с обязательными gate'ами)

```text
1. сценарий      story.js → node tools/voice/extract_story.mjs --strict   (speakers = {captain, ship_ai}, ≤160 реплик — voices.json validation.maxEntries)
2. кастинг A     python tools/voice/casting.py --round A                    → previews/casting/roundA/index.html   GATE 1
3. кастинг B     python tools/voice/casting.py --round B --captain v:r --captain v:r --ai v:r --ai v:r
                                                                            → previews/casting/roundB/index.html   GATE 2
4. закрепить     voices.json → characters.captain / characters.ship_ai: voice, role (speed, dsp)
5. сборка        python tools/voice/build_voicepack.py                      → assets/voice/ru/ в ОБЕ версии + manifest
6. прослушать    previews/gate3/index.html (первые 5, 10 случайных, все со словарём)      GATE 3
```

Gate'ы — человеческие: скрипты **не выбирают голос сами** и не заменяют
отсутствующий голос «похожим». Если в `voices.json` голос не заполнен или
провайдер вернул ошибку — build падает с сообщением.

## Провайдер

Production — **Yandex SpeechKit v3** (`ru-RU`, REST `utteranceSynthesis`,
LINEAR16 PCM 48 kHz). Credentials только из окружения, в репозитории и логах их нет:

```bash
export YANDEX_API_KEY=...          # Api-Key сервисного аккаунта
# либо
export YANDEX_IAM_TOKEN=...  YANDEX_FOLDER_ID=...
```

`silero` (локальная модель `v5_cis_base`) оставлен **только** как dev/offline
превью по явному `--provider silero --out-root <dir>`; в production-каталоги он
писать не может и fallback'ом не является.

## Файлы

| файл | назначение |
|---|---|
| `extract_story.mjs` | статически парсит `VOID-SECTOR-MOBILE/story.js` (не исполняет), находит каждый `L(who,text[,voiceText])`, считает стабильный `voiceKey = fnv1a8(who + '\0' + (voiceText\|\|text))`; `--strict` — acceptance сценария |
| `generate_voice.py` | нормализация текста (`normalize_voice_text`), словарь произношения, провайдеры, resumable-генерация master WAV |
| `build_voicepack.py` | единый entrypoint: extract → generate → DSP/encode → sync в оба target'а → manifest → prune orphaned → validate → report + GATE 3 sample |
| `casting.py` | раунды A/B кастинга, HTML для A/B-сравнения |
| `voices.json` | provider, кандидаты кастинга, **утверждённые голоса**, DSP-профили по роли, формат вывода, правила валидации |
| `pronunciation.json` | обязательный production-словарь: ударения для вымышленных имён (`+` перед ударной гласной), аббревиатуры (`AEGIS`, `EMP`), числа словами |
| `story-lines.json` | снимок извлечённых реплик (регенерируется) |
| `voice-build-report.json` | результат последней сборки |

## voiceText и словарь

`L(who, displayText, voiceText)` — третий аргумент только для TTS: экранный
`«Ковчег-3»` → голос `«Ковчег-три»`, `АРХИВ «ПЕРСЕЯ» // …` → `Запись из архива…`.
`normalize_voice_text` дополнительно убирает `«»`, превращает `…`/`—`/`//`/`→` в
паузу-запятую, применяет словарь (ключи по границе слова, сначала длинные) и
чистит небезопасные символы. Ключ `voiceKey` считается от **сырого** текста, поэтому
правка словаря не меняет имена файлов — чтобы пересоздать затронутые реплики,
удали их mp3 (build их досоздаст) или запусти сборку с чистым `_work/`.

## DSP

Профили в `voices.json.dsp` — лёгкие (captain: HP 150 / LP 6.8 kHz, мягкая
компрессия; ship_ai: HP 120 / LP 9 kHz, едва заметная «терминальная» окраска
5.5 kHz). Никакого vocoder/pitch-shift/телефонной трубки. Выход: MP3 mono 48 kHz
96 kbps.

## Manifest и рантайм

`voice-manifest.js` (`{version:2, lines:{voiceKey:{src,duration,who}}}`) пишется в
корень **и** `VOID-SECTOR/`, **и** `VOID-SECTOR-MOBILE/` — каждая версия остаётся
самостоятельным static root без `../`. `story.js` (общий файл для обеих версий)
ищет реплику по `storyVoiceKey()`, играет через `audioAPI.playVoice()`, а длительность
показа берёт как `max(оценка по тексту, duration + 0.25 с)` — голос не обрезается
закрытием панели. Мобильный service worker кэширует mp3 по требованию (Cache First).
