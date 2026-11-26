# tts.py — voice lines with Piper (offline, Turkish dfki voice).  python tts.py <story_dir> <model.onnx> [length_scale]
import sys, json, wave, pathlib
from piper import PiperVoice, SynthesisConfig
story = pathlib.Path(sys.argv[1]); model = sys.argv[2]; ls = float(sys.argv[3]) if len(sys.argv) > 3 else 0.92
voice = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.75)
out = story / 'voice' / 'satir'; out.mkdir(parents=True, exist_ok=True)
for L in json.load(open(story / 'voice' / 'satirlar.json', encoding='utf-8')):
    with wave.open(str(out / f"{L['id']}.wav"), 'wb') as w:
        voice.synthesize_wav(L['metin'], w, syn_config=cfg)
    with wave.open(str(out / f"{L['id']}.wav")) as w: print(L['id'], round(w.getnframes() / w.getframerate(), 2))
