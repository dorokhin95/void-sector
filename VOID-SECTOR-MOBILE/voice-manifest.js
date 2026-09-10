'use strict';
// ===== VOID SECTOR — манифест озвучки диалогов (плейсхолдер) =====
// Файл перезаписывается tools/voice/build_voicepack.py одновременно для PC и Mobile
// (единый voice pack). Пока пак не сгенерирован — пустой манифест: story.js молча
// продолжает показывать субтитры и пишет console.warn на каждую реплику без записи.
globalThis.VOICE_MANIFEST={version:2,lines:{}};
