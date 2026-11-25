# mix.py : the sound of "Alt Tarafı Balkabağı": voice placement, an original score and sound effects (numpy, no samples).
#   python mix.py            (from this folder; reads audio/cues.json written by `node render.mjs balkabagi --cues`)
# Voice: voice/satir/<id>.wav when they exist (see voice/README.md); without them the mix is music + effects only.
# Score: A minor, built section by section from the marks story.js puts in the cues ('m' cues): a playful plucked
# opening, a heartbeat that speeds up while the pile holds, silence and a slow drone for the slow-motion collapse,
# the crash, a warm resolution, a comic turn for the buried man, a button on the last line, the title.
import sys, json, pathlib
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / 'engine' / 'audio'))
from synth import SR, band, bell, blip, boom, click, env, hz, load, noise, pad, piano, pluck, pop, put, reverb, rng, save, thud, whoosh

AUD = HERE / 'audio'
cfg = json.load(open(AUD / 'cues.json', encoding='utf-8'))
DUR = cfg['DUR']; N = int(DUR * SR)
M = {c['n']: c['t'] for c in cfg['cues'] if c['s'] == 'm'}
who = {L['id']: L.get('kim', 'anlatici') for L in json.load(open(HERE / 'voice' / 'satirlar.json', encoding='utf-8'))}

# ------------------------------------------------------------------ voice
voice = np.zeros(N); spans = []
for lid, t0 in cfg['lines']:
    f = HERE / 'voice' / 'satir' / f'{lid}.wav'
    if not f.exists(): continue
    w = load(f); w = band(w, 70, 12000); w /= max(1e-6, np.sqrt(np.mean(w ** 2))) / .1
    put(voice, t0, w); spans.append((t0, t0 + len(w) / SR))
print('voice lines:', len(spans), 'of', len(cfg['lines']))

# ------------------------------------------------------------------ score
mus = np.zeros(N)
def chord(t, names, dur, amp=.06, bright=1200): put(mus, t, pad([hz(n) for n in names], dur, amp, bright))
def seg(a, b): return M[a], M[b]
# 1. giris: plucked arpeggios, 92 bpm, Am F C G; a bell answers every other bar
a, b = seg('giris', 'sikisma'); B = 60 / 92
prog = [(['A2', 'C3', 'E3', 'A3', 'C4', 'E4'], 'A1'), (['F2', 'A2', 'C3', 'F3', 'A3', 'C4'], 'F1'), (['C3', 'E3', 'G3', 'C4', 'E4', 'G4'], 'C2'), (['G2', 'B2', 'D3', 'G3', 'B3', 'D4'], 'G1')]
t = a + .3; k = 0
while t < b - .2:
    notes, bass = prog[k % 4]
    put(mus, t, piano(hz(bass) * 2, 4 * B, .5))
    chord(t, notes[:3], 4 * B + .4, .025, 900)
    for j in range(8):
        tt = t + j * B / 2
        if tt >= b - .1: break
        put(mus, tt, pluck(hz(notes[[0, 2, 4, 3, 5, 3, 4, 2][j]]) * 2, .7, .6), .32 * (1 if j % 2 == 0 else .7))
    if k % 2 == 1:
        for j, n in enumerate(['E5', 'D5', 'C5'] if k % 4 == 1 else ['G5', 'E5', 'D5']): put(mus, t + 2 * B + j * B * .75, bell(hz(n), 1.6, .4))
    t += 4 * B; k += 1
# 2. sikisma -> cokus: the music stops; a low drone and a heartbeat that speeds up (70 -> 84 -> 100 bpm), a riser at the end
a, b = M['sikisma'], M['cokus']
put(mus, a, piano(hz('A1'), 2.5, .9) + piano(hz('Eb2'), 2.5, .6) + piano(hz('A2'), 2.5, .5))
chord(a + .2, ['A1', 'E2', 'A2'], M['gerilim'] - a + .5, .05, 300)
chord(M['gerilim'], ['A1', 'E2', 'Bb2'], M['tirmanis'] - M['gerilim'] + .5, .055, 380)
chord(M['tirmanis'], ['A1', 'F2', 'C3', 'Eb3'], M['kopus'] - M['tirmanis'] + .5, .06, 450)
chord(M['kopus'], ['A1', 'Eb2', 'Bb2', 'E3'], b - M['kopus'], .07, 600)
def heart(t, amp):
    n = int(.16 * SR); x = np.arange(n) / SR; y = np.sin(2 * np.pi * (48 + 30 * np.exp(-x * 30)) * x) * env(n, .003, .05)
    put(mus, t, y, amp); put(mus, t + .2, y, amp * .65)
t = a + 1.2
while t < b - .4:
    bpm = 70 if t < M['tirmanis'] else 84 if t < M['kopus'] else 100
    heart(t, .5 + .25 * (t - a) / (b - a)); t += 60 / bpm
rs = int(min(3.5, b - M['kopus']) * SR); put(mus, b - rs / SR, band(noise(rs), 1500, 9000) * np.linspace(0, 1, rs) ** 2.5 * .14)
# 3. cokus -> carpma: slow motion. A deep drone, a slow heartbeat (40 bpm), a held high string
a, b = M['cokus'], M['carpma']
chord(a + .1, ['A1', 'E2', 'A2', 'C3'], b - a + .2, .07, 260)
n = int((b - a) * SR); x = np.arange(n) / SR; put(mus, a + .3, np.sin(2 * np.pi * hz('E5') * x) * np.minimum(1, x / 3) * np.minimum(1, (b - a - x) / .3).clip(0) * .018)
t = a + 1.0
while t < b - .5: heart(t, .55); t += 1.5
# 4. rahat: warm resolution in C major, piano
a, b = M['rahat'], M['komik']
chord(a, ['C3', 'G3', 'E4'], b - a + .5, .05, 1500)
for j, n in enumerate(['E5', 'D5', 'C5', 'G4', 'A4', 'C5', 'D5', 'E5']): put(mus, a + .6 + j * .62, piano(hz(n), 1.8, .5))
# 5. komik: a bouncy staccato bass and plucks for the buried man
a, b = M['komik'], M['sicak']; B = 60 / 104
t = a + .1; k = 0
while t < b - .2:
    put(mus, t, pluck(hz(['A2', 'E2', 'A2', 'E2', 'D2', 'A1', 'D2', 'E2'][k % 8]), .35, .3), .9)
    if k % 2: put(mus, t, pluck(hz(['C4', 'E4', 'A4', 'G4'][(k // 2) % 4]), .25, .7), .35)
    t += B; k += 1
# 6. sicak: warm again, F - C - G - Am
a, b = M['sicak'], M['final']
for j, ch in enumerate([['F2', 'C3', 'A3'], ['C3', 'G3', 'E4'], ['G2', 'D3', 'B3'], ['A2', 'E3', 'C4']]):
    tt = a + j * (b - a) / 4; chord(tt, ch, (b - a) / 4 + .4, .045, 1400)
for j, n in enumerate(['C5', 'A4', 'G4', 'E4', 'G4', 'A4', 'C5', 'D5']): put(mus, a + .4 + j * (b - a - .8) / 8, piano(hz(n), 1.4, .38))
# 7. final: the button ("ba-dum") on the last line, then the title swell and a boom
a = M['final']
put(mus, a, pluck(hz('E3'), .4, .5), 1.0); put(mus, a + .22, pluck(hz('A2'), .6, .5), 1.1); put(mus, a + .22, thud(.5))
a, b = M['baslik'], M['son']
chord(a - .2, ['F2', 'C3', 'A3', 'C4'], b - a + .3, .07, 1700)
for j, n in enumerate(['A4', 'C5', 'E5', 'D5', 'C5', 'A4', 'G4', 'A4']): put(mus, a + .3 + j * .55, bell(hz(n), 2.0, .55))
mus = reverb(mus, 2.2, .28)
fade = np.ones(N); k = int(1.5 * SR); fade[-k:] = np.linspace(1, 0, k); mus *= fade

# ------------------------------------------------------------------ sfx
sfx = np.zeros(N)
def creak(dur=.9, f0=140):
    n = int(dur * SR); x = np.arange(n) / SR; f = f0 * (1 + .25 * np.sin(x * 7)) + 40 * x
    sig = ((np.cumsum(f) / SR) % 1 * 2 - 1) * (1 + .6 * noise(n))
    return band(sig, 250, 2200) * env(n, .08, dur * .5) * .09
def rumble(dur=2.5, amp=.5):
    n = int(dur * SR); return band(noise(n), 30, 220) * np.minimum(1, np.arange(n) / (.15 * SR)) * np.exp(-np.arange(n) / SR / dur * 1.5) * amp
for c in cfg['cues']:
    t0, s, g = c['t'], c['s'], c.get('g', 1.0)
    if s == 'cut': put(sfx, t0 - .1, whoosh(.3, 800, 3000, .08 * g))
    elif s == 'pull': put(sfx, t0, band(noise(int(.25 * SR)), 300, 2000) * env(int(.25 * SR), .01, .06) * .2 * g); put(sfx, t0 + .05, thud(.35 * g))
    elif s == 'thump': put(sfx, t0, thud(.45 * g)); put(sfx, t0, boom(.4, 80, 50, .15 * g))
    elif s == 'straw': put(sfx, t0, band(noise(int(.5 * SR)), 2000, 9000) * env(int(.5 * SR), .02, .12) * .12 * g)
    elif s == 'creak': put(sfx, t0, creak(1.0), g); put(sfx, t0 + .6, creak(.7, 170), .8 * g)
    elif s == 'rumble':
        put(sfx, t0, rumble(3.0, .55)); put(sfx, t0, boom(2.2, 60, 32, .5))
        for j in range(10): put(sfx, t0 + .05 + j * .05 + rng.uniform(0, .03), thud(.3 * rng.uniform(.5, 1)))
    elif s == 'crash':
        put(sfx, t0, boom(3.0, 58, 28, .8)); put(sfx, t0, rumble(2.0, .6))
        for j in range(26): put(sfx, t0 + .02 + j * .045 + rng.uniform(0, .03), thud(.45 * rng.uniform(.5, 1)))
        put(sfx, t0, band(noise(int(.8 * SR)), 1800, 9000) * env(int(.8 * SR), .005, .2) * .18)
    elif s == 'spit':
        n = int(.3 * SR); put(sfx, t0, band(noise(n), 900, 6000) * env(n, .005, .05) * .25)
    elif s == 'dar':
        n = int(1.6 * SR); tt = np.arange(n) / SR; f = 44 + 28 * np.exp(-tt * 2.5); ph = 2 * np.pi * np.cumsum(f) / SR
        e = np.minimum(1, tt / .14) * np.exp(-tt / .55)
        put(sfx, t0 - .08, (np.sin(ph) * .52 + np.sin(2 * ph) * .18 + band(noise(n), 60, 320) * .25) * e)
        put(sfx, t0 - .3, whoosh(.55, 900, 140, .16, rev=True))
    elif s == 'ac': put(sfx, t0, whoosh(.4, 500, 2600, .07))
# ambience: wind over the field, distant crows, the crowd far away; quieter during the slow motion
amb = np.zeros(N)
wind = band(noise(N), 100, 900) * (.6 + .4 * np.sin(np.arange(N) / SR * .4)); amb += wind * .03
for j in range(10):
    tt = rng.uniform(2, DUR - 4); n = int(.35 * SR); x = np.arange(n) / SR
    put(amb, tt, band(((np.cumsum(700 + 200 * np.sin(x * 40)) / SR) % 1 * 2 - 1), 500, 3000) * env(n, .02, .08) * .02)
slow = np.ones(N); i0, i1 = int(M['cokus'] * SR), int(M['carpma'] * SR); slow[i0:i1] = .3; amb *= np.convolve(slow, np.ones(int(.3 * SR)) / int(.3 * SR), mode='same')

# ------------------------------------------------------------------ duck the music under the voice, sum, loudness
vo = np.zeros(N)
for a, b in spans: vo[int(a * SR):int(b * SR)] = 1
k = int(.25 * SR); vo = np.convolve(vo, np.ones(k) / k, mode='same')
music = mus * (1 - .55 * vo)
pre = voice + music + sfx * .9 + amb
save(AUD / 'voice.wav', voice); save(AUD / 'music.wav', music); save(AUD / 'sfx.wav', sfx + amb); save(AUD / 'premix.wav', pre)
import subprocess
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(AUD / 'premix.wav'), '-af', 'loudnorm=I=-15:TP=-1.5:LRA=8:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = f"loudnorm=I=-15:TP=-1.5:LRA=8:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(AUD / 'premix.wav'), '-af', af, '-ar', '48000', str(AUD / 'mix.wav')], check=True)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(AUD / 'mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('mix', ' '.join(l.strip() for l in r.splitlines() if l.strip().startswith(('I:', 'Peak:'))))
