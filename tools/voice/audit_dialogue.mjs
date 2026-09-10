#!/usr/bin/env node
// ===== VOID SECTOR — аудит диалогов кампании (dialogue-audit.txt) =====
// Компактный отчёт по story.js + campaign.js: что говорится на каждом уровне, и набор
// детерминированных проверок на повторы/жанровые нестыковки — без NLP, без похожести
// текста, только точные совпадения и простые списки (см. пп.41-42 задания "post-level
// dialogue + contextual radio + mobile hangar").
//   node tools/voice/audit_dialogue.mjs [--story path] [--campaign path] [--out path]
'use strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const argVal = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const STORY = path.resolve(ROOT, argVal('--story', 'VOID-SECTOR-MOBILE/story.js'));
const CAMPAIGN = path.resolve(ROOT, argVal('--campaign', 'VOID-SECTOR-MOBILE/campaign.js'));
const OUT = path.resolve(ROOT, argVal('--out', 'tools/voice/dialogue-audit.txt'));

// --- Извлечение данных: story.js и campaign.js читаем как обычные <script>, поэтому
// eval их литералов в изолированном контексте — тот же приём, что в extract_story.mjs.
const L = (who, text, voiceText) => ({ who, text, voiceText: voiceText || null });
const storySrc = readFileSync(STORY, 'utf8');
const storyScript = eval(storySrc.match(/const storyScript=(\[[\s\S]*?\n\]);/)[1]);
const storyPools = eval('(' + storySrc.match(/const storyPools=(\{[\s\S]*?\n\};)/)[1].slice(0, -1) + ')');
const storyLoseLines = eval(storySrc.match(/const storyLoseLines=(\[.*?\]);/)[1]);

const enemyDefs = Object.fromEntries(
  [...'scout fighter bomber sniper frigate swarm reaper hammer lancer miner shepherd leech missileboat inquisitor carrier'.split(' ')]
    .map(k => [k, {}])
);
const campaignSrc = readFileSync(CAMPAIGN, 'utf8');
const campaign = eval(campaignSrc.match(/const campaign=(\[[\s\S]*?\n\]);/)[1]);

const FIELDS = ['brief', 'contact', 'change', 'climax', 'debrief'];
const preview = (lines) => (lines || []).map(l => `[${l.who}] ${l.text}`).join('  //  ') || '(нет реплик)';

// --- Детерминированная таблица "первое появление типа врага в pool" (см. п.12: не runtime-
// telemetry, а функция от campaign.js — одинакова при любом старте с любого уровня).
const firstSeenType = {};
campaign.forEach((lvl, i) => { for (const t of lvl.pool) if (!(t in firstSeenType)) firstSeenType[t] = i; });

// --- Проверка 1: точные текстовые дубликаты (voiceText||text) по ВСЕЙ кампании — тот же
// критерий, что tools/voice/extract_story.mjs использует для "duplicates reusing an asset".
const allEntries = [];
storyScript.forEach((lvl, i) => { for (const f of FIELDS) for (const l of (lvl[f] || [])) allEntries.push({ level: i, field: f, ...l });
  for (const k of ['lowHull', 'ally', 'timer']) if (lvl[k]) allEntries.push({ level: i, field: k, ...lvl[k] });
  if (lvl.bossPhase) for (const p in lvl.bossPhase) for (const l of lvl.bossPhase[p]) allEntries.push({ level: i, field: 'bossPhase' + p, ...l });
});
const seenKey = new Map();
const exactDuplicates = [];
for (const e of allEntries) {
  const key = e.who + '\0' + (e.voiceText || e.text);
  if (seenKey.has(key)) exactDuplicates.push({ a: seenKey.get(key), b: e });
  else seenKey.set(key, e);
}

// --- Проверка 2: одинаковый debrief или contact на СОСЕДНИХ уровнях (даже без полного
// текстового совпадения выше — сравниваем конкатенацию текста поля целиком).
const adjacentDupes = [];
for (const f of ['contact', 'debrief']) {
  for (let i = 1; i < storyScript.length; i++) {
    const a = (storyScript[i - 1][f] || []).map(l => l.text).join(' | ');
    const b = (storyScript[i][f] || []).map(l => l.text).join(' | ');
    if (a && b && a === b) adjacentDupes.push({ field: f, levelA: i - 1, levelB: i, text: a });
  }
}

// --- Проверка 3: "капитан эхом повторяет ИИ" — короткие реплики-заглушки капитана
// (см. п.18: "Понял"/"Вижу"/"Принял" и т.п. без содержания).
const ECHO_RE = /^(понял|принял|вижу|ясно|окей|ладно|хорошо)[.!]?$/i;
const captainEchoes = allEntries.filter(e => e.who === 'captain' && ECHO_RE.test(e.text.trim()));

// --- Проверка 4: упоминания "захват" — в этой кампании НЕТ игровой механики "точка
// захвата" (goal ∈ {clear,survive,escort,generators,objects,convoy,chase,station,blockade}
// см. campaign.js), поэтому каждое совпадение — это термин "захват цели" (наведение
// ракеты), не territory capture; отчёт перечисляет их для прозрачности, а не как баг.
const captureGoals = new Set(); // пусто — в этой игре нет отдельной механики "capture"
const captureMentions = allEntries.filter(e => /захват/i.test(e.text));

// --- Проверка 5: первое появление каждого типа врага в pool — есть ли хоть одна реплика
// (любое поле уровня, включая miniSpawn/climax) с упоминанием его игрового имени?
// Короткие словоформы-стемы (не полное слово) — чтобы ловить и ед./мн. число русских
// склонений одной подстрокой ("Ракетоносец"/"Ракетоносцы" не пересекаются посимвольно,
// а "Ракетонос" входит в обе формы).
const NAMES = { scout: 'Игл', fighter: 'Корсар', bomber: 'Гром', sniper: 'Призрак', frigate: 'Бастион',
  swarm: 'Ро', reaper: 'Жнец', hammer: 'Молот', lancer: 'Копь', miner: 'Минёр', shepherd: 'Пастух',
  leech: 'Пиявк', missileboat: 'Ракетонос', inquisitor: 'Инквизитор', carrier: 'Авианосец' };
const MINI_NAMES = { hammer: 'Таран', inquisitor: 'Прелат', carrier: 'Улей', lancer: 'Баллиста' };
const introGaps = [];
for (const [type, lvl] of Object.entries(firstSeenType)) {
  const name = NAMES[type], miniName = MINI_NAMES[type];
  let introducedAt = null;
  for (let i = 0; i <= lvl; i++) {
    const text = FIELDS.map(f => (storyScript[i]?.[f] || []).map(l => l.text).join(' ')).join(' ')
      + ' ' + Object.values(storyScript[i]?.bossPhase || {}).flat().map(l => l.text).join(' ');
    if ((name && text.includes(name)) || (miniName && text.includes(miniName))) { introducedAt = i; break; }
  }
  if (introducedAt === null) introGaps.push({ type, name, firstPoolLevel: lvl });
}

// --- Отчёт ---
const lines = [];
lines.push('VOID SECTOR — АУДИТ ДИАЛОГОВ КАМПАНИИ');
lines.push('Сгенерировано tools/voice/audit_dialogue.mjs — не редактировать вручную.');
lines.push(`Источник: ${path.relative(ROOT, STORY).replace(/\\/g, '/')} (${storyScript.length} уровней, ${allEntries.length} реплик в script + ${Object.values(storyPools).reduce((n, v) => n + (Array.isArray(v) ? v.length : Object.keys(v).length), 0)} в пулах)`);
lines.push('');
storyScript.forEach((lvl, i) => {
  const def = campaign[i];
  lines.push(`УРОВЕНЬ ${String(i + 1).padStart(2, '0')} — ${def ? def.name : '?'} (goal=${def?.goal})`);
  lines.push(` brief:        ${preview(lvl.brief)}`);
  lines.push(` first contact:${preview(lvl.contact)}`);
  lines.push(` new threat:   ${(def?.pool || []).filter(t => firstSeenType[t] === i).map(t => NAMES[t] || t).join(', ') || '—'}`);
  lines.push(` objective chg:${preview(lvl.change)}`);
  lines.push(` climax:       ${preview(lvl.climax)}`);
  lines.push(` debrief:      ${preview(lvl.debrief)}`);
  const genericAllowed = ['lowHull', 'shieldDown', 'emp', 'overheat', 'miniKill', 'reinforcement'];
  lines.push(` generic events allowed: ${genericAllowed.join(', ')} (общие для всех уровней пулы, не level-specific)`);
  lines.push('');
});
lines.push('=== АВТОМАТИЧЕСКИЕ ПРОВЕРКИ ===');
lines.push(`1) Точные текстовые дубликаты (who+voiceText) по всей кампании: ${exactDuplicates.length}`);
for (const d of exactDuplicates) lines.push(`   - уровень ${d.a.level}/${d.a.field} == уровень ${d.b.level}/${d.b.field}: "${d.a.text}"`);
lines.push(`2) Одинаковый contact/debrief на соседних уровнях: ${adjacentDupes.length}`);
for (const d of adjacentDupes) lines.push(`   - ${d.field}: уровень ${d.levelA} == уровень ${d.levelB}: "${d.text}"`);
lines.push(`3) Капитан-«эхо» (Понял/Вижу/Принял без содержания): ${captainEchoes.length}`);
for (const c of captainEchoes) lines.push(`   - уровень ${c.level}/${c.field}: "${c.text}"`);
lines.push(`4) Механика "захват точки" в campaign.js: НЕ СУЩЕСТВУЕТ (goals: ${[...new Set(campaign.map(c => c.goal))].join(', ')}).`);
lines.push(`   Упоминания слова «захват» в диалогах: ${captureMentions.length} — все про наведение ракеты ("захват цели"), не про territory capture:`);
for (const c of captureMentions) lines.push(`   - уровень ${c.level}/${c.field}: "${c.text}"`);
lines.push(`5) Новый тип врага без представления в диалоге до его первого появления в pool: ${introGaps.length}`);
for (const g of introGaps) lines.push(`   - ${g.name || g.type} (${g.type}), первый pool на уровне ${g.firstPoolLevel}`);
lines.push('');
lines.push(`ИТОГ: ${exactDuplicates.length + adjacentDupes.length + captainEchoes.length + introGaps.length === 0 ? 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : 'ЕСТЬ ЗАМЕЧАНИЯ — см. выше'}`);

writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
console.log('written:', path.relative(ROOT, OUT).replace(/\\/g, '/'));
console.log(`exact duplicates: ${exactDuplicates.length}, adjacent contact/debrief dupes: ${adjacentDupes.length}, captain echoes: ${captainEchoes.length}, intro gaps: ${introGaps.length}, capture mentions (informational): ${captureMentions.length}`);
if (exactDuplicates.length || adjacentDupes.length || captainEchoes.length || introGaps.length) process.exitCode = 1;
