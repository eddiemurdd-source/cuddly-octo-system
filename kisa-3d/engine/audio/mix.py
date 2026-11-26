# mix.py — voice placement, an original synthesized score and sound effects (numpy, no samples), loudness.
#   python mix.py <story_dir>
# Reads <story>/audio/cues.json (written by render.mjs: DUR, cues, lines) and <story>/voice/satir/<id>.wav,
# writes <story>/audio/{voice,music,sfx,mix}.wav. Target: -14 LUFS integrated, -1.5 dBTP (short-form platforms).
import sys, json, subprocess, pathlib
import numpy as np

SR = 48000
story = pathlib.Path(sys.argv[1]); AUD = story / 'audio'
cfg = json.load(open(AUD / 'cues.json', encoding='utf-8'))
DUR = cfg['DUR']; N = int(DUR * SR) + SR
rng = np.random.default_rng(7)

def load(p, af=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(p)] + (['-af', af] if af else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).copy()
def save(p, x):
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(p)], input=st.astype(np.float32).tobytes(), check=True)
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4); return np.fft.irfft(X * m, len(x))
def tt(d): return np.arange(int(d * SR)) / SR
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))
def put(buf, t, x, g=1.0, pan=0.0):
    i = int(t * SR); j = min(buf.shape[0], i + len(x))
    if i < 0 or j <= i: return
    if buf.ndim == 2:
        buf[i:j, 0] += x[:j - i] * g * min(1, 1 - pan); buf[i:j, 1] += x[:j - i] * g * min(1, 1 + pan)
    else: buf[i:j] += x[:j - i] * g
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def noise(n): return rng.standard_normal(n)
def reverb(x, dur=1.6, wet=0.3, damp=4000):
    n = int(dur * SR); ir = noise(n) * np.exp(-np.arange(n) / SR * 6.9 / dur); ir = band(ir, 200, damp); ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)
    out = np.zeros(L); out[:len(x)] = x; return out + y * wet

# ------------------------------------------------------------------ sound effects
def crack(v=1.0, pitch=1.0, big=False):
    n = int((0.5 if big else 0.18) * SR); t = np.arange(n) / SR
    x = band(noise(n), 900 * pitch, 7000) * np.exp(-t / 0.006)                       # the snap
    x += band(noise(n), 300, 2500) * np.exp(-t / 0.018) * 0.35                      # body
    f = 240 * pitch * (1 + 0.6 * np.exp(-t * 60))
    x += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03) * 0.5             # knuckle "tock"
    if big:
        fb = 46 + 50 * np.exp(-t * 18); x += np.sin(2 * np.pi * np.cumsum(fb) / SR) * env(n, 0.002, 0.22) * 1.6
        x += band(noise(n), 2000, 12000) * np.exp(-t / 0.002) * 1.2
        x = reverb(x, 1.8, 0.35)
    return x * v
def whoosh(d=0.45, lo=300, hi=3200, v=1.0):
    n = int(d * SR); u = np.arange(n) / n
    low, high = band(noise(n), lo, lo * 3), band(noise(n), lo * 3, hi)
    w = np.sin(np.pi * u * 0.5)                                   # the sweep: low rush -> bright air
    return (low * (1 - w) + high * w * 0.8) * np.sin(np.pi * u) ** 1.5 * v * 0.7
def tone(f0, f1, d, wave='sin', a=0.01, rel=0.1):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) if wave == 'sin' else np.sign(np.sin(ph)) * 0.5 if wave == 'sq' else ((ph / np.pi) % 2 - 1) * 0.6
    return x * np.minimum(1, t / a) * np.minimum(1, (d - t) / rel).clip(0, 1)
def bell(f, d=1.6, v=1.0):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * r * t) * g * np.exp(-t * k) for r, g, k in [(1, 1, 2.2), (2.76, 0.4, 4.5), (5.4, 0.2, 9), (2.0, 0.25, 3.2)])
    return x * env(len(t), 0.002, 9) * v * 0.3
def sfx(c):
    k = c['type']; v = c.get('v', 1.0); p = c.get('pitch', 1.0)
    if k == 'pop': return crack(v, p), 0.9
    if k == 'bigpop': return crack(1.0, 0.9, big=True), 1.0
    if k == 'bubble': return tone(180, 720, 0.12) * env(int(0.12 * SR), 0.004, 0.06) * 0.5, 0.8
    if k == 'whoosh': return whoosh(0.42), 0.3
    if k == 'dive': return whoosh(0.6, 120, 1500) + tone(70, 35, 0.6) * env(int(0.6 * SR), 0.01, 0.25), 0.7
    if k == 'xray':
        d = 0.9; t = tt(d); x = sum(np.sin(2 * np.pi * f * t) for f in (1318.5, 1975.5, 2637)) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t))
        return x * np.sin(np.pi * t / d) ** 2 * 0.08 + tone(200, 420, d) * np.sin(np.pi * t / d) * 0.25, 0.7
    if k == 'swell': d = 1.4; t = tt(d); return band(noise(len(t)), 200, 900) * np.sin(np.pi * t / d) ** 2 * 0.25 + tone(220, 220, d) * np.sin(np.pi * t / d) * 0.12, 0.6
    if k == 'liquid':
        d = 1.6; x = band(noise(int(d * SR)), 80, 600) * 0.2 * np.sin(np.pi * tt(d) / d)
        for i in range(6): put(x, 0.1 + i * 0.23 + rng.random() * 0.08, tone(140 + rng.random() * 200, 400 + rng.random() * 300, 0.09) * 0.35)
        return x, 0.6
    if k == 'fizz':
        d = 1.8; n = int(d * SR); x = np.zeros(n); idx = rng.integers(0, n - 200, 900)
        for i in idx: x[i:i + 60] += noise(60) * np.exp(-np.arange(60) / 10) * rng.random()
        return band(x, 3000, 12000) * np.sin(np.pi * tt(d) / d) * 0.5, 0.55
    if k == 'clink': return bell(2350, 1.2, 0.8) + bell(3520, 1.2, 0.4), 0.6
    if k == 'stretch': d = 1.1; return tone(90, 60, d, 'saw') * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tt(d))) * 0.25, 0.55
    if k == 'gauge': return tone(900, 160, 1.4, 'sin') * 0.25 + tone(905, 162, 1.4, 'sin') * 0.2, 0.55
    if k == 'riser': d = 0.6; t = tt(d); return band(noise(len(t)), 500, 6000) * (t / d) ** 2 * 0.5 + tone(200, 900, d, 'saw') * (t / d) ** 2 * 0.15, 0.6
    if k == 'thunk': return tone(140, 90, 0.12) * env(int(0.12 * SR), 0.002, 0.04) * 0.8, 0.7
    if k == 'error': return np.concatenate([tone(330, 330, 0.14, 'sq'), np.zeros(int(0.05 * SR)), tone(262, 262, 0.2, 'sq')]) * 0.18, 0.55
    if k == 'tick': return band(noise(int(0.03 * SR)), 2500, 9000) * env(int(0.03 * SR), 0.0005, 0.004) * 0.8 * v, 0.55
    if k == 'ding': return bell(1760, 2.0, 0.9), 0.6
    if k == 'counter':
        d = c.get('dur', 3); n = int(d * SR); x = np.zeros(n)
        for i in range(int(d / 0.055)): put(x, i * 0.055, band(noise(400), 3000, 9000) * np.exp(-np.arange(400) / 60) * 0.25)
        return x * np.minimum(1, tt(d) / 0.3), 0.35
    if k == 'check': return bell(1318.5 * p, 0.9, 0.7) + bell(1975.5 * p, 0.9, 0.5), 0.55
    if k == 'medal':
        x = sum(bell(f, 2.2, 0.6) for f in (1046.5, 1318.5, 1568, 2093))
        for i in range(14): put(x, 0.05 * i + rng.random() * 0.05, bell(3000 + rng.random() * 3000, 0.4, 0.25))
        return reverb(x, 1.6, 0.3), 0.6
    if k == 'grr': d = 1.4; t = tt(d); return (tone(55, 52, d, 'saw') + tone(82.4, 78, d, 'saw')) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * t)) * np.minimum(1, t / 0.4) * 0.3, 0.6
    if k == 'thud': return tone(70, 38, 0.6) * env(int(0.6 * SR), 0.002, 0.18) * 1.2, 0.9
    raise ValueError(k)

# ------------------------------------------------------------------ score: curious marimba groove, i-VI-III-VII in D minor
BPM = 104; B = 60 / BPM
def marimba(f, v=1.0):
    t = tt(0.9); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 28) + 0.1 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t * 60)) * env(len(t), 0.002, 9) * v
def bass(f, d, v=1.0):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 1.6) * np.minimum(1, (d - t) / 0.05).clip(0, 1) * v
def pad(fs, d, v=1.0):
    t = tt(d); x = sum(((t * f * dt) % 1 * 2 - 1) for f in fs for dt in (1, 1.004, 0.996))
    return band(x, 80, 1400) * np.minimum(1, np.minimum(t / 0.8, (d - t) / 0.8)).clip(0, 1) * v / len(fs) * 0.2
CH = [(62, [62, 65, 69, 74]), (58, [58, 62, 65, 70]), (65, [65, 69, 72, 77]), (60, [60, 64, 67, 72])]   # Dm Bb F C
MEL = [0, None, 2, 1, None, 3, 2, None]                                                                # chord-tone index per 8th
def music(sections):
    out = np.zeros((N, 2))
    for (a, b, kind) in sections:
        sec = np.zeros((N, 2)); bar = 4 * B; nb = int(np.ceil((b - a) / bar))
        for i in range(nb):
            t0 = a + i * bar; root, tones = CH[i % 4]
            p = pad([hz(m) for m in tones[:3]], bar + 0.6, 0.6 if kind == 'soft' else 0.35)
            put(sec, t0, p, 1.0, -0.2); put(sec, t0, p, 0.8, 0.2)
            if kind != 'groove': continue
            for e in range(8):
                m = MEL[(e + i * 3) % 8]
                if m is not None: put(sec, t0 + e * B / 2, marimba(hz(tones[m] + 12), 0.28 if e % 2 == 0 else 0.2), 1.0, 0.25 * (1 if e % 2 else -1))
            for q in (0, 2.5): put(sec, t0 + q * B, bass(hz(root - 24), B * 1.4, 0.5))
            for e in range(8): put(sec, t0 + e * B / 2, band(noise(2400), 5000, 12000) * env(2400, 0.003, 0.02) * (0.06 if e % 2 else 0.03), 1.0, 0.3)
            put(sec, t0, band(noise(12000), 40, 200) * env(12000, 0.002, 0.05) * 0.5 + tone(60, 45, 0.25) * env(12000, 0.002, 0.08) * 0.6)
            put(sec, t0 + 2 * B, band(noise(8000), 800, 6000) * env(8000, 0.002, 0.06) * 0.15)
        i0, i1, f = int(a * SR), int(b * SR), int(0.35 * SR)
        sec[i1 - f:i1] *= np.linspace(1, 0, f)[:, None]; sec[i1:] = 0
        sec[i0:i0 + int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
        out += sec
    return out

# ------------------------------------------------------------------ assemble
voice = np.zeros(N)
for L in cfg['lines']:
    x = load(story / 'voice' / 'satir' / f"{L['id']}.wav", 'highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=4:release=90:makeup=2,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=220:t=q:w=1:g=1.5')
    x /= np.max(np.abs(x)) + 1e-9; put(voice, L['t'], x * 0.8)
voice = reverb(voice, 0.5, 0.06)[:N]

POP = next(c['t'] for c in cfg['cues'] if c['type'] == 'bigpop')
END = max(c['t'] for c in cfg['cues'] if c['type'] == 'thud')
mus = music([(1.15, POP - 0.65, 'groove'), (POP + 0.5, 30.6, 'soft'), (30.6, END - 0.02, 'groove')])
mus[int((END - 0.02) * SR):] = 0
# duck under the voice
e = np.convolve(np.abs(voice), np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')
g = np.ones(N); a_up, a_dn = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.3 * SR)); s = 0.0
tgt = 1 - 0.6 * np.clip(e / 0.05, 0, 1)
for i in range(0, N, 64):
    k = tgt[i]; s = k + (s - k) * (a_up ** 64 if k < s else a_dn ** 64); g[i:i + 64] = s
mus *= g[:, None] * 0.55

fx = np.zeros((N, 2))
for c in cfg['cues']:
    x, gain = sfx(c); put(fx, c['t'], x, gain, pan=float(rng.uniform(-0.15, 0.15)))

fx *= 0.72
mix = mus + fx + voice[:, None]
mix = mix[:int(DUR * SR)]
for name, x in (('voice', voice[:int(DUR * SR)]), ('music', mus[:int(DUR * SR)]), ('sfx', fx[:int(DUR * SR)])): save(AUD / f'{name}.wav', x)
save(AUD / 'premix.wav', mix / (np.max(np.abs(mix)) + 1e-9) * 0.9)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(AUD / 'premix.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), str(AUD / 'mix.wav')], check=True)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(AUD / 'mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('mix ->', AUD / 'mix.wav'); print('\n'.join(l for l in r.splitlines()[-12:] if 'I:' in l or 'Peak:' in l))
