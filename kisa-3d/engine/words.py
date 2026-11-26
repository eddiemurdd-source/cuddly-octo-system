# words.py — word timestamps for captions (faster-whisper), plus a transcript check.  python words.py <story_dir> [model]
import sys, json, pathlib, subprocess
import numpy as np
from faster_whisper import WhisperModel
story = pathlib.Path(sys.argv[1]); name = sys.argv[2] if len(sys.argv) > 2 else 'small'
m = WhisperModel(name, device='cpu', compute_type='int8')
res = {}
for L in json.load(open(story / 'voice' / 'satirlar.json', encoding='utf-8')):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(story / 'voice' / 'satir' / f"{L['id']}.wav"), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    segs, _ = m.transcribe(np.frombuffer(pcm, np.float32), language='tr', word_timestamps=True, beam_size=5)
    words = [{'w': w.word.strip(), 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in s.words]
    res[L['id']] = words
    print(L['id'], ' '.join(w['w'] for w in words))
json.dump(res, open(story / 'voice' / 'kelimeler.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
