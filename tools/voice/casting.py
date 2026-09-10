#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""VOID SECTOR — кастинг голосов (Yandex SpeechKit v3), два раунда с approval gate.

Раунд A (shortlist, 4 фразы × каждый кандидат из voices.json "casting"):
    python tools/voice/casting.py --round A
→ tools/voice/previews/casting/roundA/index.html — открыть и выбрать до 2 капитанов и 2 ИИ (GATE 1).

Раунд B (стресс-тест произношения для 2+2 финалистов, 12 фраз):
    python tools/voice/casting.py --round B --captain kirill:strict --captain alexander:neutral --ai julia:strict --ai marina:neutral
→ tools/voice/previews/casting/roundB/index.html — выбрать ровно одного капитана и одного ИИ (GATE 2),
  затем вписать voice/role в voices.json "characters" и запускать build_voicepack.py.

Скрипт НЕ выбирает голос сам — только генерирует одинаковые фразы для A/B-сравнения.
Превью не коммитятся (tools/voice/previews/ в .gitignore). Credentials — только из окружения.
"""
from __future__ import annotations
import argparse
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import generate_voice as gv  # noqa: E402


def parse_candidates(items, defaults):
    if not items:
        return defaults
    out = []
    for it in items:
        voice, _, role = it.partition(":")
        out.append({"voice": voice.strip(), "role": role.strip() or None})
    return out


def encode_preview(ff, wav, mp3):
    subprocess.run([ff, "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=9",
                    "-ac", "1", "-ar", "48000", "-b:a", "96k", mp3], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--round", required=True, choices=["A", "B"])
    ap.add_argument("--captain", action="append", help="кандидат капитана voice:role (раунд B)")
    ap.add_argument("--ai", action="append", help="кандидат ИИ voice:role (раунд B)")
    ap.add_argument("--voices", default=os.path.join(HERE, "voices.json"))
    args = ap.parse_args()

    cfg = gv.load_voices(args.voices)
    casting = cfg["casting"]
    phrases = casting["roundA"] if args.round == "A" else casting["roundB"]
    roles = {
        "captain": casting["captain"] if args.round == "A" else parse_candidates(args.captain, casting["captain"][:2]),
        "ship_ai": casting["ship_ai"] if args.round == "A" else parse_candidates(args.ai, casting["ship_ai"][:2]),
    }
    if args.round == "B" and (len(roles["captain"]) > 2 or len(roles["ship_ai"]) > 2):
        raise SystemExit("Раунд B: максимум 2 кандидата на роль (GATE 1 должен был сократить список)")

    provider = gv.make_provider("yandex", cfg)  # кастинг только production-провайдером; без ключей — понятная ошибка
    pron = gv.load_pronunciation()
    ff = shutil.which("ffmpeg")
    if not ff:
        raise SystemExit("ffmpeg не найден на PATH")
    out_dir = os.path.join(HERE, "previews", "casting", "round" + args.round)
    os.makedirs(out_dir, exist_ok=True)

    table = {}  # role -> candidate label -> [mp3 rel paths]
    for role, cands in roles.items():
        for c in cands:
            label = f"{c['voice']}/{c['role'] or 'default'}"
            files = []
            for i, phrase in enumerate(phrases):
                text = gv.normalize_voice_text(phrase, pron)
                stem = f"{role}_{c['voice']}_{c['role'] or 'default'}_{i + 1:02d}"
                wav = os.path.join(out_dir, stem + ".wav")
                mp3 = os.path.join(out_dir, stem + ".mp3")
                if not os.path.isfile(mp3):
                    print(f"[{role}] {label} #{i + 1}: {text}")
                    provider.synth_to_file(wav, text, {"voice": c["voice"], "role": c["role"], "speed": 1.0})
                    encode_preview(ff, wav, mp3)
                    os.remove(wav)
                files.append(os.path.basename(mp3))
            table.setdefault(role, {})[label] = files

    # HTML: строки — фразы, столбцы — кандидаты; одинаковые фразы рядом для A/B
    parts = ["<!doctype html><html lang='ru'><head><meta charset='utf-8'><title>Кастинг голосов — раунд " + args.round + "</title>",
             "<style>body{background:#070c17;color:#eef;font:14px Arial;padding:24px}table{border-collapse:collapse;margin:8px 0 28px;width:100%}",
             "td,th{border-bottom:1px solid #223;padding:6px 8px;vertical-align:top;text-align:left}th{color:#98f8ed;letter-spacing:1px}",
             "h1{font-size:20px}h2{font-size:15px;letter-spacing:2px;color:#98f8ed}audio{width:220px}.ph{color:#a8bccc;max-width:320px}</style></head><body>",
             f"<h1>Кастинг голосов · раунд {args.round}</h1>",
             "<p>GATE " + ("1: выбери до 2 кандидатов на капитана и до 2 на ИИ." if args.round == "A" else "2: выбери ровно одного капитана и одного ИИ; отметь слова с неверным ударением — они пойдут в pronunciation.json.") + "</p>"]
    for role, cands in table.items():
        labels = list(cands.keys())
        parts.append(f"<h2>{'КАПИТАН' if role == 'captain' else 'БОРТОВОЙ ИИ'}</h2><table><tr><th>фраза</th>" + "".join(f"<th>{l}</th>" for l in labels) + "</tr>")
        for i, phrase in enumerate(phrases):
            parts.append(f"<tr><td class='ph'>{phrase}</td>" + "".join(
                f"<td><audio controls preload='none' src='{cands[l][i]}'></audio></td>" for l in labels) + "</tr>")
        parts.append("</table>")
    parts.append("</body></html>")
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write("".join(parts))
    print("\nГотово:", os.path.relpath(os.path.join(out_dir, "index.html"), os.path.dirname(os.path.dirname(HERE))))
    print("Открыть в браузере, прослушать, вернуться с выбором — скрипт ничего не решает сам.")


if __name__ == "__main__":
    main()
