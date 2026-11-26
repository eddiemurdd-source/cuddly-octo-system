# make.py : the male narrator of "Disiplin", made offline with Piper TTS (Turkish voice tr_TR-dfki-medium, a man's voice:
# median pitch ~104 Hz raw, ~96 Hz after the shift below).
#   pip install piper-tts faster-whisper     ;  python make.py [L03 L11 ...]      (from this folder)
# The voice is downloaded once into .model/. Piper samples its noise afresh on every run, so one take of a word can come
# out blurred ("Disiplin" -> "Dissetliğin") while the next is clean. So every line is made TAKES times and each take is
# transcribed with Whisper (small, Turkish); the take whose transcript is closest to the text wins (voice/secim.json).
# Without faster-whisper the first take is kept.
# Per take: Piper -> 48 kHz -> a little lower and fuller (rubberband pitch x0.93 with the formants kept, low shelf, presence,
# de-ess, gentle compression) -> silence trimmed to 0.08 s before and 0.25 s after (the skill's convention).
# The reverb is added in the mix (mix.py), so the tails can ring over the music.
import json, pathlib, re, subprocess, sys, urllib.request, wave, difflib
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
MODEL = HERE / '.model' / 'tr_TR-dfki-medium.onnx'
URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx'
TAKES = 5
# delivery: a touch slower than Piper's default, steadier phoneme widths, short pauses at full stops
LENGTH, NOISE, NOISE_W, PAUSE = 1.12, .5, .55, .32
# the weighty lines are read slower still: line -> length scale
PACE = {'L05': 1.2, 'L06': 1.2, 'L09': 1.22, 'L11': 1.18, 'L12': 1.15}
FX = ('aresample=48000,rubberband=pitch=0.93:formant=preserved:transients=smooth,highpass=f=65,'
      'bass=g=3.5:f=130:w=.8,equalizer=f=3000:t=q:w=1.2:g=2.5,equalizer=f=400:t=q:w=1.5:g=-1.5,deesser=i=.35,'
      'acompressor=threshold=-20dB:ratio=3:attack=6:release=90:makeup=2')
SR = 48000

if not MODEL.exists():
    MODEL.parent.mkdir(exist_ok=True)
    for ext in ('', '.json'):
        print('download', URL + ext); urllib.request.urlretrieve(URL + ext, str(MODEL) + ext)
try:
    from faster_whisper import WhisperModel
    ASR = WhisperModel('small', device='cpu', compute_type='int8', download_root=str(HERE / '.model' / 'whisper'))
except ImportError:
    ASR = None; print('faster-whisper not installed: keeping the first take of every line')

NUM = {'37': 'otuz yedi'}
def norm(s):
    s = s.lower().replace('i̇', 'i')
    for k, v in NUM.items(): s = s.replace(k, v)
    return re.sub(r'[^a-zçğıöşü ]', '', s).replace(' ', '')
def score(ref, hyp): return difflib.SequenceMatcher(None, norm(ref), norm(hyp)).ratio()
def transcribe(y):
    a = y[::3].astype(np.float32)                        # 48 kHz -> 16 kHz (the voice is band-limited well below 8 kHz)
    segs, _ = ASR.transcribe(a, language='tr', beam_size=5)
    return ' '.join(s.text.strip() for s in segs)

def trim(x, pre=.08, post=.25, thr=.012):
    a = np.abs(x); k = int(.01 * SR)
    e = np.convolve(a, np.ones(k) / k, mode='same'); idx = np.where(e > thr * a.max() / .5)[0]
    i0 = max(0, idx[0] - int(pre * SR)); i1 = min(len(x), idx[-1] + int(post * SR))
    y = x[i0:i1].copy(); f = int(.012 * SR); y[:f] *= np.linspace(0, 1, f); y[-int(.06 * SR):] *= np.linspace(1, 0, int(.06 * SR))
    return y / max(1e-6, np.abs(y).max()) * .89

def take(text, length, path):
    subprocess.run([sys.executable, '-m', 'piper', '-m', str(MODEL), '-f', str(path), '--length-scale', f'{length:.3f}', '--noise-scale', str(NOISE),
                    '--noise-w-scale', str(NOISE_W), '--sentence-silence', str(PAUSE)], input=text.encode('utf-8'), check=True, capture_output=True)
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-af', FX, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return trim(np.frombuffer(pcm, np.float32))

lines = json.load(open(HERE / 'satirlar.json', encoding='utf-8'))
only = set(sys.argv[1:])
out = HERE / 'satir'; out.mkdir(exist_ok=True); raw = HERE / '.model' / 'raw'; raw.mkdir(exist_ok=True)
sel_f = HERE / 'secim.json'; secim = json.load(open(sel_f, encoding='utf-8')) if sel_f.exists() else {}
for L in lines:
    lid, text = L['id'], L['text']
    if only and lid not in only: continue
    best = None
    for k in range(TAKES if ASR else 1):
        y = take(text, PACE.get(lid, LENGTH), raw / f'{lid}_{k}.wav')
        hyp = transcribe(y) if ASR else ''; sc = score(text, hyp) if ASR else 1
        if best is None or sc > best[0] + 1e-9: best = (sc, k, hyp, y)
        if sc >= .999: break
    sc, k, hyp, y = best
    with wave.open(str(out / f'{lid}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
    secim[lid] = {'text': text, 'take': k, 'asr': hyp, 'score': round(sc, 3), 's': round(len(y) / SR, 3)}
    print(f'{lid}  {len(y) / SR:.2f} s  take {k}  {sc:.2f}  {text}  |  {hyp}')
json.dump(secim, open(sel_f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# every line's length, for the timeline in story.js
allf = {f.stem: round(wave.open(str(f)).getnframes() / SR, 3) for f in sorted(out.glob('L*.wav'))}
json.dump(allf, open(HERE / 'sureler.json', 'w'), indent=1)
print(len(allf), 'lines,', round(sum(allf.values()), 2), 's of voice')
