#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""VOID SECTOR — voice pipeline: build_voicepack.py

ОДИН entrypoint (п.30 задания):
    python tools/voice/build_voicepack.py

Делает самостоятельно, без ручных промежуточных шагов:
 1. extract   — node extract_story.mjs -> story-lines.json (391 entries / 390 unique)
 2. normalize — normalizeVoiceText (generate_voice.py)
 3. stress    — silero-stress accentor, fault-tolerant
 4. generate  — Silero TTS v5_cis_base -> master WAV mono 24kHz (resumable)
 5-6. radio + encode — один проход ffmpeg (highpass/lowpass/presence EQ/
      compressor/loudnorm -> mp3 mono 24kHz 48kbps), доп. цепочка для
      'unknown' (Соколов)
 7. manifest  — VOID-SECTOR-MOBILE/voice-manifest.js (duration из ffprobe)
 8. validate  — 391/391 coverage assert
 9. report    — tools/voice/voice-build-report.json

Никогда не останавливается на единичной ошибке ударения/генерации/ffmpeg —
все проблемы копятся в отчёте, а не блокируют оставшиеся реплики.
"""
from __future__ import annotations
import json
import os
import subprocess
import sys
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))  # .../VOID-SECTOR-PC
MOBILE = os.path.join(ROOT, "VOID-SECTOR-MOBILE")
ASSETS_ROOT = os.path.join(MOBILE, "assets", "voice", "ru")
WORK = os.path.join(HERE, "_work")
MASTER_WAV_DIR = os.path.join(WORK, "master_wav")
LINES_JSON = os.path.join(HERE, "story-lines.json")
VOICES_JSON = os.path.join(HERE, "voices.json")
REPORT_JSON = os.path.join(HERE, "voice-build-report.json")
MANIFEST_JS = os.path.join(MOBILE, "voice-manifest.js")

sys.path.insert(0, HERE)
import generate_voice as gv  # noqa: E402


def step_extract():
    print("=== 1/9 extract_story.mjs ===")
    node = shutil.which("node") or "node"
    proc = subprocess.run([node, os.path.join(HERE, "extract_story.mjs"), "--out", LINES_JSON],
                           capture_output=True, text=True)
    print(proc.stdout)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit("extract_story.mjs failed")
    with open(LINES_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def step_generate(voices_cfg):
    print("=== 2-4/9 normalize + stress + generate (Silero TTS) ===")
    speaker_map = {who: cfg["resolved"] for who, cfg in voices_cfg["characters"].items()}
    sample_rate = voices_cfg["model"]["master_sample_rate"]
    model_id = voices_cfg["model"]["id"]
    results, report = gv.generate_all(LINES_JSON, MASTER_WAV_DIR, speaker_map,
                                       model_id=model_id, sample_rate=sample_rate)
    return results, report


def ffmpeg_bin():
    b = shutil.which("ffmpeg")
    if not b:
        raise SystemExit("ffmpeg not found on PATH")
    return b


def ffprobe_bin():
    b = shutil.which("ffprobe")
    if not b:
        raise SystemExit("ffprobe not found on PATH")
    return b


def radio_filter_chain(who, cfg):
    r = cfg["radio"]
    chain = (f"highpass=f={r['highpassHz']},lowpass=f={r['lowpassHz']},"
             f"equalizer=f={r['presence']['hz']}:width_type=q:w=1:g={r['presence']['gainDb']},"
             f"acompressor=threshold=-18dB:ratio={r['compressionRatio']}:attack=5:release=50")
    if who == cfg["unknownRadio"]["who"]:
        u = cfg["unknownRadio"]
        chain += (f",lowpass=f={u['extraLowpassHz']},"
                  f"acompressor=threshold=-18dB:ratio={u['extraCompressionRatio']}:attack=5:release=50,"
                  f"volume={u['saturationDriveDb']}dB,asoftclip=type=tanh,volume=-{u['saturationDriveDb']}dB")
    chain += f",loudnorm=I={r['targetLUFS']}:TP={r['truePeakDb']}:LRA=11"
    return chain


def step_radio_and_encode(gen_results, voices_cfg):
    print("=== 5-6/9 radio processing + mp3 encode (ffmpeg, one pass) ===")
    ff = ffmpeg_bin()
    fp = ffprobe_bin()
    out_records = []
    for i, rec in enumerate(gen_results, 1):
        if not rec["ok"]:
            out_records.append({**rec, "mp3Path": None, "duration": None, "bytes": 0})
            continue
        who = rec["who"]
        voice_key = rec["voiceKey"]
        out_dir = os.path.join(ASSETS_ROOT, who)
        os.makedirs(out_dir, exist_ok=True)
        mp3_path = os.path.join(out_dir, voice_key + ".mp3")
        rel_src = f"assets/voice/ru/{who}/{voice_key}.mp3"
        if os.path.isfile(mp3_path) and os.path.getsize(mp3_path) > 0:
            pass  # resumable: не перекодируем уже готовый файл
        else:
            chain = radio_filter_chain(who, voices_cfg)
            proc = subprocess.run([ff, "-y", "-loglevel", "error", "-i", rec["wavPath"],
                                    "-af", chain, "-ac", "1", "-ar", "24000", "-b:a", "48k", mp3_path],
                                   capture_output=True, text=True)
            if proc.returncode != 0 or not os.path.isfile(mp3_path):
                rec["error"] = "ffmpeg failed: " + proc.stderr[-800:]
                rec["ok"] = False
                out_records.append({**rec, "mp3Path": None, "duration": None, "bytes": 0})
                continue
        dur_proc = subprocess.run([fp, "-v", "error", "-show_entries", "format=duration",
                                    "-of", "csv=p=0", mp3_path], capture_output=True, text=True)
        try:
            duration = float(dur_proc.stdout.strip())
        except ValueError:
            duration = 0.0
        size = os.path.getsize(mp3_path)
        out_records.append({**rec, "mp3Path": mp3_path, "relSrc": rel_src,
                             "duration": duration, "bytes": size})
        if i % 25 == 0 or i == len(gen_results):
            print(f"  encoded {i}/{len(gen_results)}")
    return out_records


def step_manifest(encoded_records):
    print("=== 7/9 voice-manifest.js ===")
    lines = {}
    for rec in encoded_records:
        if not rec.get("ok") or not rec.get("relSrc"):
            continue
        lines[rec["voiceKey"]] = {"src": rec["relSrc"], "duration": round(rec["duration"], 3), "who": rec["who"]}
    js = ("'use strict';\n"
          "// ===== VOID SECTOR — манифест озвучки диалогов (сгенерирован tools/voice/build_voicepack.py) =====\n"
          "// НЕ редактировать вручную — перезаписывается при каждом запуске voice-пайплайна.\n"
          "// key = FNV-1a от (персонаж + ' ' + (voiceText||text)), см. storyVoiceKey() в story.js\n"
          "// и normalizeForKey()/fnv1a() в tools/voice/extract_story.mjs — оба должны совпадать.\n"
          f"globalThis.VOICE_MANIFEST={json.dumps({'version': 1, 'lines': lines}, ensure_ascii=False, indent=1)};\n")
    with open(MANIFEST_JS, "w", encoding="utf-8", newline="\n") as f:
        f.write(js)
    return lines


def step_validate(story_data, manifest_lines, encoded_records):
    print("=== 8/9 validate 391/391 ===")
    entries = story_data["entries"]
    covered = 0
    missing = []
    failed_keys = [r["voiceKey"] for r in encoded_records if not r.get("ok")]
    for e in entries:
        key = e["voiceKey"]
        entry = manifest_lines.get(key)
        ok = bool(entry) and entry.get("duration", 0) > 0
        if ok:
            path = os.path.join(MOBILE, entry["src"].replace("/", os.sep))
            ok = os.path.isfile(path) and os.path.getsize(path) > 0
        if ok:
            covered += 1
        else:
            missing.append({"index": e["index"], "who": e["who"], "text": e["text"], "voiceKey": key})
    total = len(entries)
    print(f"dialogue entries: {total}")
    print(f"covered: {covered}")
    print(f"missing: {len(missing)}")
    print(f"failed (generation/encode errors): {len(failed_keys)}")
    valid = len(missing) == 0
    print("VOICE PACK VALID" if valid else "VOICE PACK INVALID")
    return {"entries": total, "covered": covered, "missing": missing, "failed": failed_keys, "valid": valid}


def step_qa(encoded_records):
    """Автоматическое QA без ожидания ручного подтверждения (п.28)."""
    warnings = []
    for rec in encoded_records:
        if not rec.get("ok"):
            continue
        dur = rec.get("duration") or 0
        if dur == 0:
            warnings.append(f"{rec['voiceKey']}: zero-length audio")
        elif dur < 0.25:
            warnings.append(f"{rec['voiceKey']}: duration {dur:.2f}s < 0.25s (подозрительно коротко)")
        elif dur > 30:
            warnings.append(f"{rec['voiceKey']}: duration {dur:.2f}s > 30s (подозрительно длинно)")
        if rec.get("bytes", 0) == 0:
            warnings.append(f"{rec['voiceKey']}: 0 bytes on disk")
    return warnings


def step_review_recommended(story_data, gen_report):
    """REVIEW_RECOMMENDED (п.29) — не блокирует релиз, только список на ручную проверку."""
    review = []
    for tok in story_data.get("unknownTokens", []):
        review.append({"reason": "unknown-token", "token": tok["token"], "count": tok["count"],
                        "examples": tok["examples"]})
    for w in gen_report.get("warnings", []):
        if "accentor failed" in w:
            review.append({"reason": "accentor-failed", "detail": w})
    return review


def main():
    with open(VOICES_JSON, "r", encoding="utf-8") as f:
        voices_cfg = json.load(f)

    story_data = step_extract()
    gen_results, gen_report = step_generate(voices_cfg)
    encoded_records = step_radio_and_encode(gen_results, voices_cfg)
    manifest_lines = step_manifest(encoded_records)
    validation = step_validate(story_data, manifest_lines, encoded_records)
    qa_warnings = step_qa(encoded_records)
    review_recommended = step_review_recommended(story_data, gen_report)

    total_duration = sum((r.get("duration") or 0) for r in encoded_records if r.get("ok"))
    total_bytes = sum((r.get("bytes") or 0) for r in encoded_records if r.get("ok"))
    unique_assets = len({r["voiceKey"] for r in encoded_records if r.get("ok")})

    report = {
        "entries": validation["entries"],
        "covered": validation["covered"],
        "uniqueAssets": unique_assets,
        "missing": validation["missing"],
        "failed": validation["failed"],
        "warnings": gen_report.get("warnings", []) + qa_warnings,
        "reviewRecommended": review_recommended,
        "totalDuration": round(total_duration, 2),
        "totalBytes": total_bytes,
        "speakerFallbacks": {who: c for who, c in voices_cfg["characters"].items() if c.get("fallback")},
        "modelId": voices_cfg["model"]["id"],
    }
    print("=== 9/9 report ===")
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(f"total voice pack size: {total_bytes/1024/1024:.2f} MB, total duration: {total_duration/60:.1f} min")
    print(f"report written to {REPORT_JSON}")

    if not validation["valid"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
