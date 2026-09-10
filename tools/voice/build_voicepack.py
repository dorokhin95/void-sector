#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""VOID SECTOR — voice pipeline: build_voicepack.py

Единственный entrypoint полной сборки voice pack:
    python tools/voice/build_voicepack.py            # production (yandex, утверждённые голоса)
    python tools/voice/build_voicepack.py --provider silero --out-root tools/voice/_work/devpack  # dev preview

Шаги:
 1. extract (strict): node extract_story.mjs --strict — speakers ⊆ allowed, entries ≤ max,
    PC/Mobile story.js идентичны.
 2. generate: master WAV (generate_voice.py) — без fallback голосов.
 3. dsp+encode: ffmpeg, профиль по роли (voices.json "dsp"), mp3 mono 48k 96k.
 4. sync: одинаковые файлы в КАЖДЫЙ target (VOID-SECTOR и VOID-SECTOR-MOBILE) —
    каждая версия остаётся самостоятельным static root, без путей '../'.
 5. manifest: voice-manifest.js в корне каждого target (duration из ffprobe).
 6. prune: удалить mp3/директории, не входящие в манифест (старые спикеры).
 7. validate: 100% строк в манифесте, файлы существуют, size>0, duration>0,
    speakers допустимы, orphaned нет, failed нет → иначе exit 1.
 8. report + GATE 3 listening sample (tools/voice/previews/gate3/index.html).
"""
from __future__ import annotations
import argparse
import json
import os
import random
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LINES_JSON = os.path.join(HERE, "story-lines.json")
REPORT_JSON = os.path.join(HERE, "voice-build-report.json")
sys.path.insert(0, HERE)
import generate_voice as gv  # noqa: E402


def which(name):
    b = shutil.which(name)
    if not b:
        raise SystemExit(f"{name} не найден на PATH")
    return b


def step_extract():
    print("=== 1/8 extract (strict) ===")
    proc = subprocess.run([which("node"), os.path.join(HERE, "extract_story.mjs"), "--strict", "--out", LINES_JSON],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    print(proc.stdout)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit("extract_story.mjs --strict: проверка сценария не пройдена")
    return gv.load_json(LINES_JSON)


def dsp_chain(profile):
    c = profile["compressor"]
    chain = (f"highpass=f={profile['highpassHz']},lowpass=f={profile['lowpassHz']},"
             f"acompressor=threshold={c['threshold']}dB:ratio={c['ratio']}:attack={c['attack']}:release={c['release']}")
    p = profile.get("presence")
    if p:
        chain += f",equalizer=f={p['hz']}:width_type=q:w=1.2:g={p['gainDb']}"
    col = profile.get("coloration")
    if col:
        chain += f",equalizer=f={col['hz']}:width_type=q:w=4:g={col['gainDb']}"
    l = profile["loudnorm"]
    chain += f",loudnorm=I={l['I']}:TP={l['TP']}:LRA={l['LRA']}"
    return chain


def step_encode(gen_results, voices_cfg, target_roots):
    print("=== 3-4/8 dsp + encode + sync ===")
    ff, fp = which("ffmpeg"), which("ffprobe")
    out = voices_cfg["output"]
    asset_dir = out["assetDir"].replace("/", os.sep)
    primary = target_roots[0]
    records = []
    for i, rec in enumerate(gen_results, 1):
        if not rec["ok"]:
            records.append({**rec, "duration": None, "bytes": 0})
            continue
        who, key = rec["who"], rec["voiceKey"]
        rel = f"{out['assetDir']}/{who}/{key}.{out['format']}"
        mp3 = os.path.join(primary, asset_dir, who, key + "." + out["format"])
        os.makedirs(os.path.dirname(mp3), exist_ok=True)
        if not (os.path.isfile(mp3) and os.path.getsize(mp3) > 0):
            profile = voices_cfg["dsp"][voices_cfg["characters"][who]["dsp"]]
            proc = subprocess.run([ff, "-y", "-loglevel", "error", "-i", rec["wavPath"], "-af", dsp_chain(profile),
                                    "-ac", str(out["channels"]), "-ar", str(out["sampleRate"]), "-b:a", out["bitrate"], mp3],
                                   capture_output=True, text=True)
            if proc.returncode != 0 or not os.path.isfile(mp3):
                records.append({**rec, "ok": False, "error": "ffmpeg: " + proc.stderr[-600:], "duration": None, "bytes": 0})
                continue
        for other in target_roots[1:]:
            dst = os.path.join(other, asset_dir, who, key + "." + out["format"])
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if not (os.path.isfile(dst) and os.path.getsize(dst) == os.path.getsize(mp3)):
                shutil.copyfile(mp3, dst)
        dur = subprocess.run([fp, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3],
                              capture_output=True, text=True).stdout.strip()
        try:
            duration = float(dur)
        except ValueError:
            duration = 0.0
        records.append({**rec, "relSrc": rel, "duration": duration, "bytes": os.path.getsize(mp3)})
        if i % 25 == 0 or i == len(gen_results):
            print(f"  encoded {i}/{len(gen_results)}")
    return records


def step_manifest(records, voices_cfg, target_roots):
    print("=== 5/8 manifest ===")
    lines = {}
    for r in records:
        if r.get("ok") and r.get("relSrc"):
            lines[r["voiceKey"]] = {"src": r["relSrc"], "duration": round(r["duration"], 3), "who": r["who"]}
    manifest = {"version": voices_cfg["output"].get("manifestVersion", 2), "lines": lines}
    js = ("'use strict';\n"
          "// ===== VOID SECTOR — манифест озвучки диалогов (сгенерирован tools/voice/build_voicepack.py) =====\n"
          "// НЕ редактировать вручную — перезаписывается при каждом запуске voice-пайплайна, одинаково для PC и Mobile.\n"
          "// key = FNV-1a от (персонаж + '\\0' + (voiceText||text)), см. storyVoiceKey() в story.js\n"
          "// и normalizeForKey()/fnv1a() в tools/voice/extract_story.mjs — оба должны совпадать.\n"
          f"globalThis.VOICE_MANIFEST={json.dumps(manifest, ensure_ascii=False, indent=1)};\n")
    for root in target_roots:
        with open(os.path.join(root, voices_cfg["output"]["manifestFile"]), "w", encoding="utf-8", newline="\n") as f:
            f.write(js)
    return lines


def step_prune(manifest_lines, voices_cfg, target_roots):
    """Удаляет из assets/voice/ru всё, чего нет в манифесте (старые спикеры, устаревшие ключи)."""
    print("=== 6/8 prune orphans ===")
    keep = {l["src"].replace("/", os.sep) for l in manifest_lines.values()}
    removed = []
    asset_dir = voices_cfg["output"]["assetDir"].replace("/", os.sep)
    for root in target_roots:
        base = os.path.join(root, asset_dir)
        if not os.path.isdir(base):
            continue
        for dirpath, _dirs, files in os.walk(base, topdown=False):
            for fn in files:
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root)
                if rel not in keep:
                    os.remove(full)
                    removed.append(rel)
            if not os.listdir(dirpath):
                os.rmdir(dirpath)
    print(f"  removed {len(removed)} orphaned file(s)")
    return removed


def step_validate(story_data, manifest_lines, records, voices_cfg, target_roots):
    print("=== 7/8 validate ===")
    allowed = set(voices_cfg["validation"]["allowedSpeakers"])
    entries = story_data["entries"]
    problems = []
    covered = 0
    for e in entries:
        m = manifest_lines.get(e["voiceKey"])
        if not m:
            problems.append(f"missing manifest: {e['voiceKey']} {e['who']} «{e['text'][:60]}»")
            continue
        if m["who"] not in allowed:
            problems.append(f"speaker not allowed: {m['who']} ({e['voiceKey']})")
        if not (m["duration"] > 0):
            problems.append(f"duration<=0: {e['voiceKey']}")
        for root in target_roots:
            p = os.path.join(root, m["src"].replace("/", os.sep))
            if not os.path.isfile(p) or os.path.getsize(p) == 0:
                problems.append(f"file missing/empty: {os.path.relpath(p, ROOT)}")
        covered += 1
    failed = [r["voiceKey"] for r in records if not r.get("ok")]
    if failed:
        problems.append("failed generation: " + ", ".join(failed))
    # orphans после prune быть не должно
    keep = {l["src"].replace("/", os.sep) for l in manifest_lines.values()}
    asset_dir = voices_cfg["output"]["assetDir"].replace("/", os.sep)
    for root in target_roots:
        base = os.path.join(root, asset_dir)
        for dirpath, _d, files in os.walk(base):
            for fn in files:
                rel = os.path.relpath(os.path.join(dirpath, fn), root)
                if rel not in keep:
                    problems.append(f"orphan: {rel}")
    by_who = {}
    for e in entries:
        by_who[e["who"]] = by_who.get(e["who"], 0) + 1
    print(f"entries: {len(entries)}  covered: {covered}  failed: {len(failed)}  problems: {len(problems)}")
    for who, n in by_who.items():
        print(f"  {who}: {n} lines")
    for p in problems[:40]:
        print("  !", p)
    print("VOICE PACK VALID" if not problems else "VOICE PACK INVALID")
    return {"entries": len(entries), "covered": covered, "failed": failed, "problems": problems,
            "byWho": by_who, "valid": not problems}


def step_gate3_sample(story_data, manifest_lines, records, target_roots):
    """GATE 3: первые 5 реплик, 10 случайных, все со словарными подстановками — HTML для прослушивания."""
    entries = [e for e in story_data["entries"] if e["voiceKey"] in manifest_lines]
    rnd = random.Random(7)
    first5 = entries[:5]
    pool = [e for e in entries[5:]]
    rand10 = rnd.sample(pool, min(10, len(pool)))
    hits = {r["voiceKey"]: r.get("dictHits", []) for r in records}
    dict_lines = [e for e in entries if hits.get(e["voiceKey"])]
    out_dir = os.path.join(HERE, "previews", "gate3")
    os.makedirs(out_dir, exist_ok=True)
    rel_root = os.path.relpath(target_roots[0], out_dir).replace("\\", "/")

    def block(title, items):
        rows = "".join(
            f"<tr><td>{e['who']}</td><td>{e['text']}</td><td><small>{', '.join(hits.get(e['voiceKey'], []))}</small></td>"
            f"<td><audio controls preload='none' src='{rel_root}/{manifest_lines[e['voiceKey']]['src']}'></audio></td></tr>"
            for e in items)
        return f"<h2>{title} ({len(items)})</h2><table><tr><th>speaker</th><th>текст</th><th>словарь</th><th></th></tr>{rows}</table>"

    html = ("<!doctype html><html lang='ru'><head><meta charset='utf-8'><title>GATE 3 — выборка production-озвучки</title>"
            "<style>body{background:#070c17;color:#eef;font:14px Arial;padding:24px}table{border-collapse:collapse;width:100%}"
            "td,th{border-bottom:1px solid #223;padding:6px 8px;text-align:left;vertical-align:top}h2{color:#98f8ed;font-size:15px;letter-spacing:2px}</style></head><body>"
            "<h1>GATE 3 — прослушивание production voice pack</h1><p>Если что-то звучит неверно (ударение, интонация, обрезка) — исправить pronunciation.json / voiceText и пересобрать только затронутые реплики.</p>"
            + block("Первые 5 реплик", first5) + block("10 случайных", rand10) + block("Все реплики со словарём произношения", dict_lines)
            + "</body></html>")
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"GATE 3 listening sample: {os.path.relpath(os.path.join(out_dir, 'index.html'), ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--provider", default=None, help="yandex (production, default) | silero (dev preview)")
    ap.add_argument("--out-root", default=None, help="dev: альтернативный корень вместо production targets (создаст <root>/VOID-SECTOR и /VOID-SECTOR-MOBILE)")
    ap.add_argument("--voices", default=os.path.join(HERE, "voices.json"))
    args = ap.parse_args()

    voices_cfg = gv.load_voices(args.voices)
    provider = args.provider or voices_cfg.get("provider", "yandex")
    if provider != "yandex" and not args.out_root:
        raise SystemExit("Не-production провайдер (" + provider + ") можно собирать только с --out-root (dev preview), чтобы не подменить production pack.")
    target_roots = [os.path.join(args.out_root or ROOT, t) for t in voices_cfg["output"]["targets"]]
    for r in target_roots:
        os.makedirs(r, exist_ok=True)

    story_data = step_extract()
    print("=== 2/8 generate ===")
    work = os.path.join(HERE, "_work", f"master_wav_{provider}")
    gen_results, gen_report = gv.generate_all(LINES_JSON, work, voices_cfg, provider_name=provider)
    records = step_encode(gen_results, voices_cfg, target_roots)
    manifest_lines = step_manifest(records, voices_cfg, target_roots)
    removed = step_prune(manifest_lines, voices_cfg, target_roots)
    validation = step_validate(story_data, manifest_lines, records, voices_cfg, target_roots)
    step_gate3_sample(story_data, manifest_lines, records, target_roots)

    total_duration = sum(r.get("duration") or 0 for r in records if r.get("ok"))
    total_bytes = sum(r.get("bytes") or 0 for r in records if r.get("ok"))
    report = {
        "provider": provider,
        "voices": {who: {k: c.get(k) for k in ("voice", "role", "speed", "dsp")} for who, c in voices_cfg["characters"].items()},
        "entries": validation["entries"], "covered": validation["covered"], "uniqueAssets": len(manifest_lines),
        "byWho": validation["byWho"], "failed": validation["failed"], "problems": validation["problems"],
        "warnings": gen_report.get("warnings", []), "prunedFiles": removed,
        "totalDuration": round(total_duration, 2), "totalBytes": total_bytes,
        "targets": [os.path.relpath(r, ROOT) for r in target_roots],
    }
    print("=== 8/8 report ===")
    with open(REPORT_JSON if not args.out_root else os.path.join(args.out_root, "voice-build-report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(f"voice pack: {total_bytes / 1024 / 1024:.2f} MB, {total_duration / 60:.1f} min, captain {validation['byWho'].get('captain', 0)} / ship_ai {validation['byWho'].get('ship_ai', 0)}")
    if not validation["valid"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
