"""Offline asset-authoring tool, never loaded by the game. Set JSC_VOICE_MODEL_DIR to a separately obtained Tiny Voca/Dizione model bundle."""
import os, sys, json, subprocess, time, hashlib
sys.dont_write_bytecode = True
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / 'public/assets/voice'
if not os.environ.get('JSC_VOICE_MODEL_DIR'):
    raise SystemExit('Set JSC_VOICE_MODEL_DIR to your offline narration-authoring assets. No model is bundled with the game.')
MODEL_ROOT = Path(os.environ['JSC_VOICE_MODEL_DIR']).expanduser().resolve()
os.environ['DIZIONE_DATA'] = str(MODEL_ROOT / 'phonemizer')
sys.path.insert(0, str(MODEL_ROOT / 'python'))
import numpy as np
import onnxruntime as ort
from dizione.engine import Phonemizer
from dizione.symbols import tokenize
overrides = json.loads((MODEL_ROOT / 'pronunciation.json').read_text())
p = Phonemizer(overrides=overrides)
opts = ort.SessionOptions(); opts.intra_op_num_threads = 4
session = ort.InferenceSession(str(MODEL_ROOT / 'model.onnx'), opts, providers=['CPUExecutionProvider'])
config = json.loads((MODEL_ROOT / 'config.json').read_text())
records = json.loads((ROOT / 'script.json').read_text())
(ROOT / 'clips').mkdir(exist_ok=True)
manifest = {'model': 'tiny-voca', 'version': 'a46fbe0c8514cb32f5e80be987e6c96ef0540f8d', 'settings': {'speed': 1, 'pitch_shift': 0, 'pitch_range': 1}, 'clips': {}}
def fit(text):
    phones = tokenize(p.pieces(text))
    if len(phones.ids) <= config['model']['max_tokens'] - 12: return [phones]
    words = text.split(); mid = len(words) // 2
    if not mid: raise ValueError('Cannot fit utterance: ' + text)
    return fit(' '.join(words[:mid])) + fit(' '.join(words[mid:]))
started = time.time()
for i, rec in enumerate(records):
    dest = ROOT / rec['file']
    segments = []
    if not dest.exists() or '--force' in sys.argv:
        chunks = []; offset = 0
        for sentence in rec['sentences']:
            start = offset
            for phones in fit(sentence):
                audio = session.run(['audio'], {'tokens': np.array([phones.ids], dtype=np.int64), 'stress': np.array([phones.stress], dtype=np.int64), 'voice': np.array([0 if rec['voice'] == 'F2' else 1], dtype=np.int64), 'speed': np.array([1], dtype=np.float32), 'pitch_shift': np.array([0], dtype=np.float32), 'pitch_range': np.array([1], dtype=np.float32)})[0]
                chunks.extend([audio.flatten(), np.zeros(2400, dtype=np.float32)])
                offset += audio.size + 2400
            segments.append({'text': sentence, 'start': start / 24000, 'duration': (offset - start) / 24000})
        samples = np.concatenate(chunks).astype('<f4')
        if not np.isfinite(samples).all() or np.max(np.abs(samples)) < 0.001:
            raise ValueError('Invalid or silent audio: ' + rec['text'])
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-f', 'f32le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0', '-af', 'alimiter=limit=0.85:level=false', '-codec:a', 'libmp3lame', '-b:a', '64k', '-y', str(dest)], input=samples.tobytes(), check=True)
    else:
        previous = json.loads((ROOT / 'manifest.json').read_text()) if (ROOT / 'manifest.json').exists() else {'clips': {}}
        segments = previous['clips'].get(rec['key'], {}).get('segments', [])
    entry = dict(rec); entry['bytes'] = dest.stat().st_size; entry['sha256'] = hashlib.sha256(dest.read_bytes()).hexdigest()
    entry['segments'] = segments
    manifest['clips'][rec['key']] = entry
    print(f'{i+1}/{len(records)} {rec["voice"]}: {rec["text"][:65]}', flush=True)
(ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2))
print('Finished in', round(time.time() - started, 2), 'seconds')
