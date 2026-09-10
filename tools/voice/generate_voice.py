#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""VOID SECTOR — voice pipeline: generate_voice.py

Синтез master-WAV (mono) на каждую уникальную реплику из story-lines.json
(см. extract_story.mjs) через провайдера TTS с предварительной нормализацией
текста и словарём произношения (pronunciation.json).

Провайдеры (см. voices.json "providers"):
  yandex — production. Yandex SpeechKit v3 REST, голос/роль берутся из
           voices.json "characters" и ДОЛЖНЫ быть заполнены (после GATE 2).
           Никакого автоматического fallback: нет ключа, нет голоса,
           ошибка API — генерация этой реплики падает, build падает.
  silero — только dev/offline preview по явному --provider silero.
           Не используется в production и не является fallback.

Credentials только из окружения: YANDEX_API_KEY (Api-Key) либо
YANDEX_IAM_TOKEN (Bearer) + YANDEX_FOLDER_ID. В лог не выводятся.

Resumable: уже существующий валидный WAV для voiceKey пропускается.
"""
from __future__ import annotations
import argparse
import base64
import contextlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Нормализация текста под TTS (см. voices.json.normalization)
# ---------------------------------------------------------------------------
_ELLIPSIS_RE = re.compile(r"\.\.\.|…")
_DASH_RE = re.compile(r"\s*(?:--|—|–)\s*")
_UI_RE = re.compile(r"\s*(?://|→|\||>>)\s*")
_BRACE_N_RE = re.compile(r"\{n\}")
_UNSAFE_RE = re.compile(r"[^0-9A-Za-zА-Яа-яЁё' +.,!?:;\-\s]")
_WS_RE = re.compile(r"\s+")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_voices(path=None):
    return load_json(path or os.path.join(HERE, "voices.json"))


def load_pronunciation(path=None):
    d = load_json(path or os.path.join(HERE, "pronunciation.json"))
    return {k: v for k, v in d.items() if not k.startswith("_")}


def normalize_voice_text(text, pronunciation):
    """Готовит voiceText к синтезу: убирает кавычки-ёлочки и служебные UI-обозначения
    ('//', '→'), превращает многоточия/тире в паузу-запятую, раскрывает словарь
    произношения (сначала более длинные ключи), чистит небезопасные символы,
    гарантирует конечную пунктуацию. Экранный текст (line.text) не трогается."""
    t = text
    t = _BRACE_N_RE.sub("", t)
    t = t.replace("«", "").replace("»", "")
    t = _UI_RE.sub(", ", t)
    t = _ELLIPSIS_RE.sub(", ", t)
    t = _DASH_RE.sub(", ", t)
    for key in sorted(pronunciation.keys(), key=len, reverse=True):
        pattern = re.compile(r"(?<![\wА-Яа-яЁё])" + re.escape(key) + r"(?![\wА-Яа-яЁё])", re.IGNORECASE)
        t = pattern.sub(pronunciation[key], t)
    t = _UNSAFE_RE.sub("", t)
    t = re.sub(r"\s+([,.!?:;])", r"\1", t)
    t = re.sub(r"([,.!?:;])\s*,", r"\1", t)  # ", ," после замен тире/UI-токенов
    t = _WS_RE.sub(" ", t).strip()
    if t and t[-1] not in ".!?":
        t += "."
    return t


def dictionary_hits(text, pronunciation):
    """Какие ключи словаря сработали бы в этом тексте (для REVIEW/GATE 3 выборки)."""
    hits = []
    for key in pronunciation:
        if re.search(r"(?<![\wА-Яа-яЁё])" + re.escape(key) + r"(?![\wА-Яа-яЁё])", text, re.IGNORECASE):
            hits.append(key)
    return hits


# ---------------------------------------------------------------------------
# WAV helpers
# ---------------------------------------------------------------------------
def save_wav_pcm16(path, pcm_bytes, sample_rate):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with contextlib.closing(wave.open(path, "wb")) as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm_bytes)


def save_wav_tensor(path, audio_tensor, sample_rate):
    import numpy as np
    arr = audio_tensor.detach().cpu().numpy() if hasattr(audio_tensor, "detach") else np.asarray(audio_tensor)
    arr = np.clip(arr, -1.0, 1.0)
    save_wav_pcm16(path, (arr * 32767.0).astype("<i2").tobytes(), sample_rate)


def wav_is_valid(path):
    if not os.path.isfile(path) or os.path.getsize(path) == 0:
        return False
    try:
        with contextlib.closing(wave.open(path, "rb")) as w:
            return w.getnframes() > 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Провайдеры
# ---------------------------------------------------------------------------
class ProviderError(RuntimeError):
    pass


class YandexProvider:
    """Yandex SpeechKit v3 REST (utteranceSynthesis). Голос/роль — из конфига
    персонажа; отсутствие голоса или ошибка API = исключение, без подмены."""
    name = "yandex"
    auto_stress = False
    ENDPOINT = "https://tts.api.cloud.yandex.net/tts/v3/utteranceSynthesis"

    def __init__(self, cfg):
        self.sample_rate = int(cfg.get("masterSampleRate", 48000))
        api_key = os.environ.get("YANDEX_API_KEY", "").strip()
        iam = os.environ.get("YANDEX_IAM_TOKEN", "").strip()
        self.folder = os.environ.get("YANDEX_FOLDER_ID", "").strip()
        if api_key:
            self._auth = "Api-Key " + api_key
        elif iam:
            self._auth = "Bearer " + iam
            if not self.folder:
                raise ProviderError("YANDEX_IAM_TOKEN задан, но нет YANDEX_FOLDER_ID (обязателен для IAM-токена)")
        else:
            raise ProviderError("Нет credentials Yandex SpeechKit: задайте YANDEX_API_KEY (или YANDEX_IAM_TOKEN + YANDEX_FOLDER_ID) в окружении")

    def synth_wav(self, text, voice, role=None, speed=1.0, retries=2):
        if not voice:
            raise ProviderError("голос не задан (voices.json characters.*.voice = null — кастинг не завершён)")
        hints = [{"voice": voice}]
        if role:
            hints.append({"role": role})
        hints.append({"speed": str(speed)})
        body = {
            "text": text,
            "hints": hints,
            "outputAudioSpec": {"rawAudio": {"audioEncoding": "LINEAR16_PCM", "sampleRateHertz": str(self.sample_rate)}},
            "loudnessNormalizationType": "LUFS",
        }
        headers = {"Authorization": self._auth, "Content-Type": "application/json"}
        if self.folder:
            headers["x-folder-id"] = self.folder
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        last = None
        for attempt in range(retries + 1):
            req = urllib.request.Request(self.ENDPOINT, data=data, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    raw = resp.read().decode("utf-8")
                return self._pcm_from_stream(raw)
            except urllib.error.HTTPError as e:
                detail = ""
                try:
                    detail = e.read().decode("utf-8", "replace")[:400]
                except Exception:
                    pass
                # 4xx — не повторяем (неверный голос/роль/текст), 5xx/429 — повторим
                if 400 <= e.code < 500 and e.code != 429:
                    raise ProviderError(f"Yandex TTS HTTP {e.code} для voice={voice} role={role}: {detail}") from None
                last = f"HTTP {e.code}: {detail}"
            except (urllib.error.URLError, TimeoutError) as e:
                last = f"network: {e}"
            time.sleep(1.5 * (attempt + 1))
        raise ProviderError(f"Yandex TTS не ответил после {retries + 1} попыток: {last}")

    @staticmethod
    def _pcm_from_stream(raw):
        """Ответ v3 REST — поток JSON-объектов (по одному на строку) с result.audioChunk.data (base64)."""
        chunks = []
        objs = []
        try:
            objs.append(json.loads(raw))
        except json.JSONDecodeError:
            for line in raw.splitlines():
                line = line.strip()
                if line:
                    objs.append(json.loads(line))
        for o in objs:
            if "error" in o:
                raise ProviderError("Yandex TTS error: " + json.dumps(o["error"], ensure_ascii=False)[:400])
            res = o.get("result", o)
            chunk = res.get("audioChunk") or {}
            if chunk.get("data"):
                chunks.append(base64.b64decode(chunk["data"]))
        pcm = b"".join(chunks)
        if not pcm:
            raise ProviderError("Yandex TTS вернул пустой аудио-поток")
        return pcm

    def synth_to_file(self, path, text, character_cfg):
        pcm = self.synth_wav(text, character_cfg.get("voice"), character_cfg.get("role"), character_cfg.get("speed", 1.0))
        save_wav_pcm16(path, pcm, self.sample_rate)


class SileroProvider:
    """Dev/offline preview. Модель и accentor загружаются один раз."""
    name = "silero"
    auto_stress = True

    def __init__(self, cfg):
        import torch
        from silero import silero_tts
        torch.set_grad_enabled(False)
        self.sample_rate = int(cfg.get("masterSampleRate", 24000))
        self.model, _ = silero_tts(language=cfg.get("language", "ru"), speaker=cfg.get("modelId", "v5_cis_base"))
        try:
            self.model.to(torch.device("cpu"))
        except Exception:
            pass
        self.dev_speakers = cfg.get("devSpeakers", {})
        self.accentor = None
        try:
            from silero_stress import load_accentor
            self.accentor = load_accentor(lang="ru")
        except Exception as e:  # accentor — опционален
            print(f"WARNING: silero-stress недоступен ({e}), ударения не расставляются", file=sys.stderr)

    def stress(self, text):
        if self.accentor is None:
            return text, None
        try:
            return self.accentor(text), None
        except Exception as e:
            return text, str(e)

    def synth_to_file(self, path, text, character_cfg, who=None):
        speaker = self.dev_speakers.get(who)
        if not speaker or speaker not in getattr(self.model, "speakers", [speaker]):
            raise ProviderError(f"silero dev speaker для '{who}' не найден в модели: {speaker}")
        audio = self.model.apply_tts(text=text, speaker=speaker, sample_rate=self.sample_rate)
        save_wav_tensor(path, audio, self.sample_rate)


def make_provider(name, voices_cfg):
    pcfg = voices_cfg.get("providers", {}).get(name)
    if not pcfg:
        raise ProviderError(f"провайдер '{name}' не описан в voices.json")
    if name == "yandex":
        return YandexProvider(pcfg)
    if name == "silero":
        return SileroProvider(pcfg)
    raise ProviderError(f"неизвестный провайдер '{name}'")


def require_production_ready(voices_cfg, provider_name):
    """Production (yandex): у каждого персонажа должен быть утверждённый голос."""
    if provider_name != "yandex":
        return
    missing = [who for who, c in voices_cfg["characters"].items() if not c.get("voice")]
    if missing:
        raise ProviderError("В voices.json не заполнен production-голос для: " + ", ".join(missing)
                            + " — сначала кастинг (GATE 1/2), затем build. Автоподбор голоса запрещён.")


# ---------------------------------------------------------------------------
# Основной resumable-проход
# ---------------------------------------------------------------------------
def generate_all(lines_path, out_dir, voices_cfg, provider_name="yandex", report=None, progress=True):
    data = load_json(lines_path)
    unique = data["uniqueEntries"]
    pronunciation = load_pronunciation()
    report = report if report is not None else {}
    report.setdefault("errors", [])
    report.setdefault("warnings", [])

    require_production_ready(voices_cfg, provider_name)
    provider = make_provider(provider_name, voices_cfg)
    characters = voices_cfg["characters"]

    results = []
    total = len(unique)
    for i, u in enumerate(unique, 1):
        who, voice_key = u["who"], u["voiceKey"]
        raw_text = u.get("voiceText") or u["text"]
        wav_path = os.path.join(out_dir, who, voice_key + ".wav")
        rec = {"voiceKey": voice_key, "who": who, "text": u["text"], "voiceText": u.get("voiceText"),
               "provider": provider.name, "wavPath": wav_path, "ok": False, "error": None,
               "dictHits": dictionary_hits(raw_text, pronunciation)}
        if progress:
            print(f"[{i:03d}/{total:03d}] {who:8s} {voice_key} ...", flush=True)
        if who not in characters:
            rec["error"] = f"speaker '{who}' отсутствует в voices.json characters"
            report["errors"].append(rec["error"])
            results.append(rec)
            continue
        if wav_is_valid(wav_path):
            rec["ok"] = True
            rec["skipped"] = True
            results.append(rec)
            continue

        normalized = normalize_voice_text(raw_text, pronunciation)
        rec["ttsText"] = normalized
        last_err = None
        for attempt in range(2):
            try:
                text_for_tts = normalized
                if provider.auto_stress:
                    text_for_tts, serr = provider.stress(normalized)
                    if serr:
                        report["warnings"].append(f"{voice_key}: accentor failed ({serr}), unstressed")
                if provider.name == "silero":
                    provider.synth_to_file(wav_path, text_for_tts, characters[who], who=who)
                else:
                    provider.synth_to_file(wav_path, text_for_tts, characters[who])
                rec["ok"] = True
                rec["retries"] = attempt
                break
            except ProviderError as e:
                last_err = str(e)
                if "HTTP 4" in last_err or "credentials" in last_err or "не задан" in last_err:
                    break  # конфигурационная ошибка — повтор бессмыслен
            except Exception as e:  # noqa: BLE001
                last_err = f"{type(e).__name__}: {e}"
            time.sleep(0.3)
        if not rec["ok"]:
            rec["error"] = last_err
            report["errors"].append(f"{voice_key} ({who}): {last_err}")
        results.append(rec)
    return results, report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lines", default=os.path.join(HERE, "story-lines.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "_work", "master_wav"))
    ap.add_argument("--voices", default=os.path.join(HERE, "voices.json"))
    ap.add_argument("--provider", default=None, help="yandex (production, default из voices.json) | silero (dev preview)")
    args = ap.parse_args()
    voices_cfg = load_voices(args.voices)
    provider = args.provider or voices_cfg.get("provider", "yandex")
    results, report = generate_all(args.lines, args.out, voices_cfg, provider_name=provider)
    ok = sum(1 for r in results if r["ok"])
    print(f"\nOK: {ok}/{len(results)}  failed: {len(results) - ok}")
    if ok != len(results):
        print("FAILED:", ", ".join(r["voiceKey"] for r in results if not r["ok"]), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
