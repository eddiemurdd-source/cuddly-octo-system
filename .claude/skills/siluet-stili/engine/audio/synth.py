# synth.py : the helpers and instruments of mix.py as a module, so a story can write its own score
# (stories/<name>/mix.py imports this). Synthesized with numpy, no samples. engine/audio/mix.py keeps its own copy
# (it is the Uykusuz score and stays as it was).
import subprocess, re
import numpy as np

SR = 48000
rng = np.random.default_rng(11)

def load(p, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(p)] + (['-af', af] if af else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).copy()
def save(p, x):
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=st.astype(np.float32).tobytes(), check=True)
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4); return np.fft.irfft(X * m, len(x))
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))
def put(buf, t, x, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf) and j > i: buf[i:j] += x[:j - i] * g
def hz(n):  # 'D4' -> Hz
    m = re.match(r'([A-G])(b|#)?(-?\d)', n); k = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[m[1]] + {'b': -1, '#': 1, None: 0}[m[2]]
    return 440 * 2 ** ((k + 12 * (int(m[3]) + 1) - 69) / 12)

# ------------------------------------------------------------------ instruments
def piano(f, dur=2.0, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(1, 7):
        x += np.sin(2 * np.pi * f * k * (1 + .0004 * k * k) * t) * (1 / k ** 1.4) * np.exp(-t * (1.2 + k * .9))
    return x * env(n, .004, 9) * vel * .35
def bell(f, dur=2.5, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * r * t) * a * np.exp(-t * d) for r, a, d in [(1, 1, 1.6), (2.76, .35, 3.5), (5.4, .15, 7), (2, .2, 2.5)])
    return x * env(n, .002, 9) * vel * .22
def pad(fs, dur, amp=.06, bright=1200):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in fs:
        for d in (1, 1.0035, .9968): x += ((t * f * d) % 1 * 2 - 1)
    x = band(x, 60, bright) * amp / len(fs)
    return x * np.minimum(1, np.minimum(t / 1.2, (dur - t) / 1.0)).clip(0, 1)
def pluck(f, dur=.9, bright=.5):
    n = int(dur * SR); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * (.996 + bright * .003)
    return band(out, 80, 5000) * env(n, .001, dur * .6) * .5
def noise(n): return rng.standard_normal(n)
def boom(dur=2.6, f0=55, f1=28, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-t * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .003, .9)
    x += band(noise(n), 40, 400) * env(n, .002, .25) * .5
    return x * amp
def whoosh(dur=.7, lo=300, hi=3000, amp=.5, rev=False):
    n = int(dur * SR); t = np.arange(n) / SR; x = noise(n)
    k = np.sin(np.pi * t / dur) ** 2; out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):
        c = lo + (hi - lo) * (i / n if not rev else 1 - i / n); y = band(x[i:i + seg], c * .5, c * 1.6) if len(x[i:i + seg]) > 64 else x[i:i + seg] * 0
        out[i:i + seg] = y
    return out * k * amp
def click(amp=.4):
    n = int(.05 * SR); x = band(noise(n), 1500, 7000) * env(n, .0003, .004)
    y = np.zeros(int(.07 * SR)); y[:n] += x; y[int(.018 * SR):int(.018 * SR) + n] += x * .6; return y * amp
def blip(f=900, dur=.12, amp=.3):
    n = int(dur * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * env(n, .002, dur * .35) * amp
def pop(amp=.35):
    n = int(.09 * SR); t = np.arange(n) / SR; f = 520 * np.exp(-t * 18) + 180; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .03) * amp
def thud(amp=.5):
    n = int(.25 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 40)) * t) * .8 + band(noise(n), 200, 2500) * .5) * env(n, .001, .05) * amp
def reverb(x, dec=1.8, mix=.25):
    n = int(dec * SR); ir = noise(n) * np.exp(-np.arange(n) / SR * 6.9 / dec); ir = band(ir, 200, 6000); ir /= np.sqrt((ir ** 2).sum())
    L = len(x) + n; F = 1 << (L - 1).bit_length(); y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:len(x)]
    return x * (1 - mix) + y * mix * 3

