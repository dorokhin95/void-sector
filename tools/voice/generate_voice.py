#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""VOID SECTOR — voice pipeline: generate_voice.py

Генерирует ОДИН master WAV (mono, 24000 Hz) на каждую УНИКАЛЬНУЮ реплику
из tools/voice/story-lines.json (см. extract_story.mjs) через Silero TTS
(v5_cis_base) с предварительной нормализацией текста и ударением
(silero-stress). Модель и accentor загружаются РОВНО ОДИН раз за запуск.

Resumable: уже существующий валидный WAV для данного voiceKey пропускается,
так что повторный запуск на середине build не пересоздаёт готовые файлы.

Использование как модуль (см. build_voicepack.py) или отдельно:
    python tools/voice/generate_voice.py \
        --lines tools/voice/story-lines.json \
        --out tools/voice/_work/master_wav \
        --report tools/voice/voice-build-report.json
"""
from __future__ import annotations
import argparse
import json
import os
import re
import sys
import time
import wave
import contextlib

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Нормализация текста под TTS (см. voices.json.normalization)
# ---------------------------------------------------------------------------
_ELLIPSIS_RE = re.compile(r"\.\.\.|…")
_DASH_RE = re.compile(r"\s*(?:--|—|–)\s*")
_BRACE_N_RE = re.compile(r"\{n\}")
_UNSAFE_RE = re.compile(r"[^0-9A-Za-zА-Яа-яЁё' +.,!?:;\-\s]")
_WS_RE = re.compile(r"\s+")


def load_pronunciation(path=None):
    path = path or os.path.join(HERE, "pronunciation.json")
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)
    return {k: v for k, v in d.items() if not k.startswith("_")}


def normalize_voice_text(text, pronunciation):
    """Готовит voiceText к синтезу: убирает кавычки-ёлочки, превращает
    многоточия/тире в паузу-запятую, раскрывает словарь произношения
    (сначала более длинные ключи — напр. '2260-х' раньше отдельного '2260'),
    чистит небезопасные символы, гарантирует конечную пунктуацию.
    Оригинальный видимый текст (line.text) эта функция никогда не трогает —
    она вызывается только на копии, уходящей в TTS.
    """
    t = text
    t = _BRACE_N_RE.sub("", t)  # предохранитель: все динамические {n}-реплики уже должны иметь явный voiceText
    t = t.replace("«", "").replace("»", "")  # « »
    t = _ELLIPSIS_RE.sub(", ", t)
    t = _DASH_RE.sub(", ", t)
    for key in sorted(pronunciation.keys(), key=len, reverse=True):
        pattern = re.compile(r"\b" + re.escape(key) + r"\b", re.IGNORECASE)
        t = pattern.sub(pronunciation[key], t)
    t = _UNSAFE_RE.sub("", t)
    t = _WS_RE.sub(" ", t).strip()
    if t and t[-1] not in ".!?":
        t += "."
    return t


# ---------------------------------------------------------------------------
# Модель + accentor — загружаются один раз через load_engine()
# ---------------------------------------------------------------------------
class Engine:
    def __init__(self, model, accentor, sample_rate):
        self.model = model
        self.accentor = accentor
        self.sample_rate = sample_rate


def load_engine(model_id="v5_cis_base", sample_rate=24000, language="ru"):
    import torch
    from silero import silero_tts

    torch.set_grad_enabled(False)
    model, _example = silero_tts(language=language, speaker=model_id)
    try:
        model.to(torch.device("cpu"))
    except Exception:
        pass

    accentor = None
    try:
        from silero_stress import load_accentor
        accentor = load_accentor(lang="ru")
    except Exception as e:
        print(f"WARNING: silero-stress accentor unavailable ({e}) — "
              f"продолжаем без ударений (accentor будет no-op).", file=sys.stderr)

    return Engine(model, accentor, sample_rate)


def apply_stress(engine, text):
    """try/except-обёртка (п.6 спеки) — ошибка accentor НИКОГДА не должна
    прерывать генерацию остальных реплик; при сбое возвращаем текст как есть
    и сообщаем причину вызывающему коду (для voice-build-report.json)."""
    if engine.accentor is None:
        return text, None
    try:
        return engine.accentor(text), None
    except Exception as e:
        return text, str(e)


def synth(engine, text, speaker):
    """Возвращает 1-D numpy float32 массив (моно) на sample_rate движка."""
    audio = engine.model.apply_tts(text=text, speaker=speaker, sample_rate=engine.sample_rate)
    return audio


def save_wav(path, audio_tensor, sample_rate):
    import numpy as np
    arr = audio_tensor.detach().cpu().numpy() if hasattr(audio_tensor, "detach") else np.asarray(audio_tensor)
    arr = np.clip(arr, -1.0, 1.0)
    pcm16 = (arr * 32767.0).astype("<i2")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with contextlib.closing(wave.open(path, "wb")) as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm16.tobytes())


def wav_is_valid(path):
    if not os.path.isfile(path) or os.path.getsize(path) == 0:
        return False
    try:
        with contextlib.closing(wave.open(path, "rb")) as w:
            return w.getnframes() > 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Основной resumable-проход по уникальным репликам
# ---------------------------------------------------------------------------
def generate_all(lines_path, out_dir, speaker_map, report=None, model_id="v5_cis_base",
                  sample_rate=24000, progress=True):
    """lines_path — story-lines.json (extract_story.mjs).
    speaker_map — {who: resolved_speaker_id} (см. voices.json.characters[who].resolved).
    Возвращает список записей {voiceKey,who,text,voiceText,wavPath,ok,error,retries,durationSec}.
    """
    with open(lines_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    unique = data["uniqueEntries"]
    pronunciation = load_pronunciation()

    if report is None:
        report = {"errors": [], "warnings": []}
    report.setdefault("errors", [])
    report.setdefault("warnings", [])

    engine = load_engine(model_id=model_id, sample_rate=sample_rate)
    results = []
    total = len(unique)
    for i, u in enumerate(unique, 1):
        who = u["who"]
        voice_key = u["voiceKey"]
        raw_text = u.get("voiceText") or u["text"]
        speaker = speaker_map.get(who)
        wav_path = os.path.join(out_dir, who, voice_key + ".wav")
        rec = {"voiceKey": voice_key, "who": who, "text": u["text"], "voiceText": u.get("voiceText"),
               "speaker": speaker, "wavPath": wav_path, "ok": False, "error": None, "retries": 0}

        if progress:
            print(f"[{i:03d}/{total:03d}] {who:10s} {voice_key} ...", flush=True)

        if speaker is None:
            rec["error"] = f"no speaker mapping for character '{who}'"
            report["errors"].append(rec["error"])
            results.append(rec)
            continue

        if wav_is_valid(wav_path):
            rec["ok"] = True
            rec["skipped"] = True
            results.append(rec)
            continue

        normalized = normalize_voice_text(raw_text, pronunciation)

        def _attempt(use_stress):
            text_for_tts = normalized
            stress_err = None
            if use_stress:
                text_for_tts, stress_err = apply_stress(engine, normalized)
                if stress_err:
                    report["warnings"].append(f"{voice_key}: accentor failed ({stress_err}), continuing unstressed")
            audio = synth(engine, text_for_tts, speaker)
            save_wav(wav_path, audio, sample_rate)
            return text_for_tts

        ok = False
        last_err = None
        # Попытка 1: с ударением. Попытка 2 (retry): снова с ударением (на случай
        # временной ошибки). Попытка 3: без ударения вовсе. Если и она падает —
        # запись помечается failed, но остальные реплики продолжают генерироваться.
        for attempt, use_stress in enumerate([True, True, False], start=1):
            try:
                _attempt(use_stress)
                ok = True
                rec["retries"] = attempt - 1
                rec["stressed"] = use_stress
                break
            except Exception as e:
                last_err = str(e)
                time.sleep(0.05)
        rec["ok"] = ok
        if not ok:
            rec["error"] = last_err
            report["errors"].append(f"{voice_key} ({who}): {last_err}")
        results.append(rec)

    return results, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", default=os.path.join(HERE, "story-lines.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "_work", "master_wav"))
    ap.add_argument("--voices", default=os.path.join(HERE, "voices.json"))
    ap.add_argument("--report", default=os.path.join(HERE, "voice-build-report.json"))
    args = ap.parse_args()

    with open(args.voices, "r", encoding="utf-8") as f:
        voices_cfg = json.load(f)
    speaker_map = {who: cfg["resolved"] for who, cfg in voices_cfg["characters"].items()}
    sample_rate = voices_cfg["model"]["master_sample_rate"]
    model_id = voices_cfg["model"]["id"]

    results, report = generate_all(args.lines, args.out, speaker_map,
                                    model_id=model_id, sample_rate=sample_rate)
    ok = sum(1 for r in results if r["ok"])
    failed = [r for r in results if not r["ok"]]
    print(f"\ngenerated/skipped OK: {ok}/{len(results)}  failed: {len(failed)}")
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump({"results": results, "errors": report["errors"], "warnings": report["warnings"]},
                   f, ensure_ascii=False, indent=1)
    if failed:
        print("FAILED voiceKeys:", ", ".join(r["voiceKey"] for r in failed), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
