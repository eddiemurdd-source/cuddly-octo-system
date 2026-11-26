# mix.py : the sound of "Disiplin": the narrator, an original score and the effects, synthesized with numpy (no samples).
#   python mix.py            (from this folder; reads audio/cues.json written by `node render.mjs disiplin --cues`)
# Score, from the 'm' marks story.js puts in the cues:
#   gece    D minor drone, a few slow piano notes, rain           kalk   a heartbeat and a reversed swell into the stand
#   montaj  the bars close: a low hit, then a 120 bpm drive (kick, clap, hats, bass, plucked ostinato) Dm Bb F C
#   safak   the drums stop as the bars open, a warm chord         kart   ticks and a thinking piano motif
#   kart2   a riser and ticks that speed up, a breath of silence, the hit on "Otuz yedi kat"
#   cati    F major, warm pad and piano, birds                    baslik a boom under the title, the last chord, fade
import sys, json, pathlib, subprocess
import numpy as np
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / 'engine' / 'audio'))
from synth import SR, band, bell, blip, boom, click, env, hz, load, noise, pad, piano, pluck, pop, put, reverb, rng, save, thud, whoosh

AUD = HERE / 'audio'
cfg = json.load(open(AUD / 'cues.json', encoding='utf-8'))
DUR = cfg['DUR']; N = int(DUR * SR)
M = {c['n']: c['t'] for c in cfg['cues'] if c['s'] == 'm'}

# ------------------------------------------------------------------ voice: a little room around the narrator
voice = np.zeros(N); spans = []
for lid, t0 in cfg['lines']:
    w = load(HERE / 'voice' / 'satir' / f'{lid}.wav'); w = band(w, 70, 12000); w /= max(1e-6, np.sqrt(np.mean(w ** 2))) / .1
    put(voice, t0, w); spans.append((t0, t0 + len(w) / SR))
voice = reverb(voice, 1.3, .1)
print('voice lines:', len(spans))

# ------------------------------------------------------------------ score
mus = np.zeros(N)
def chord(t, names, dur, amp=.06, bright=1200): put(mus, t, pad([hz(n) for n in names], dur, amp, bright))
def kick(amp=1.0):
    n = int(.35 * SR); t = np.arange(n) / SR; f = 45 + 90 * np.exp(-t * 28)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .16) + band(noise(n), 1500, 6000) * env(n, .0005, .004) * .3) * amp
def clap(amp=.4):
    n = int(.25 * SR); x = band(noise(n), 900, 5000); e = env(n, .001, .05)
    for d in (.008, .017): k = int(d * SR); e[k:] += env(n - k, .001, .05) * .7
    return x * e * amp
def hat(amp=.12, dec=.025): n = int(.12 * SR); return band(noise(n), 6000, 14000) * env(n, .0005, dec) * amp
def bass(f, dur, amp=.35):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .15 * np.sign(np.sin(2 * np.pi * f * t))
    return band(x, 30, 900) * env(n, .004, dur * .7) * amp
def heart(t, amp):
    n = int(.16 * SR); x = np.arange(n) / SR; y = np.sin(2 * np.pi * (48 + 30 * np.exp(-x * 30)) * x) * env(n, .003, .05)
    put(mus, t, y, amp); put(mus, t + .2, y, amp * .65)

# gece: the city asleep
a, b = M['gece'], M['kalk']
chord(a, ['D2', 'A2', 'D3'], b - a + .8, .06, 520)
for tt, n in [(.6, 'A4'), (2.0, 'F4'), (3.4, 'D4'), (4.9, 'E4'), (5.9, 'C4')]: put(mus, tt, piano(hz(n), 2.6, .55))
put(mus, .1, band(noise(int(3 * SR)), 30, 160) * np.exp(-np.arange(int(3 * SR)) / SR * 1.4) * np.minimum(1, np.arange(int(3 * SR)) / (.6 * SR)) * .35)   # far thunder
# kalk: a heartbeat under "Canın istemiyor / Yine de kalkıyorsun", a reversed swell into the stand
for tt in np.arange(5.3, M['montaj'] - .2, .82): heart(tt, .45)
rs = int(1.4 * SR); put(mus, M['montaj'] - 1.4, band(noise(rs), 200, 3000) * np.linspace(0, 1, rs) ** 3 * .16)
# montaj: 120 bpm from the bars closing to the bars opening
a = M['montaj']; b = max(c['t'] for c in cfg['cues'] if c['s'] == 'ac'); B = .5
put(mus, a, boom(1.8, 62, 32, .5))
prog = [(['D3', 'F3', 'A3'], 'D2'), (['Bb2', 'D3', 'F3'], 'Bb1'), (['F3', 'A3', 'C4'], 'F2'), (['C3', 'E3', 'G3'], 'C2')]
t = a + B; k = 0
while t < b - .05:
    notes, root = prog[(k // 4) % 4]
    if k % 4 == 0: chord(t, notes, 4 * B + .3, .045, 1100)
    put(mus, t, kick(.85))
    if k % 2 == 1: put(mus, t, clap(.32))
    for j in range(2): put(mus, t + j * B / 2, hat(.1 if j else .07))
    for j in range(2): put(mus, t + j * B / 2, bass(hz(root), B / 2 * .9, .3))
    for j in range(4):
        n = notes[[0, 1, 2, 1][j]]; put(mus, t + j * B / 4, pluck(hz(n) * 2, .35, .7), .22)
    t += B; k += 1
# safak: the drums stop with the bars; a warm F chord and the dawn
a = b
chord(a, ['F2', 'C3', 'A3', 'E4'], M['kart'] - a + .6, .05, 1500)
for j, n in enumerate(['A4', 'C5', 'E5']): put(mus, a + .1 + j * .3, bell(hz(n), 1.8, .5))
# kart: thinking. A low pulse, ticks, a piano motif
a, b = M['kart'], M['kart2']
chord(a, ['D2', 'A2', 'F3'], b - a + .3, .045, 600)
for j, n in enumerate(['D5', 'F5', 'A5', 'G5', 'F5', 'E5']): put(mus, a + .5 + j * .55, piano(hz(n), 1.4, .32))
for tt in np.arange(a + .3, b, .5): put(mus, tt, blip(2400, .03, .08))
# kart2: the year rushes in. Ticks that speed up, a riser, silence, the hit
a, h = M['kart2'], M['vurus']
chord(a, ['D2', 'A2', 'D3'], h - a, .05, 500)
tt = a + .1
while tt < h - .15: put(mus, tt, blip(2400, .03, .09)); tt += max(.045, .32 - (tt - a) * .17)
rs = int((h - a - .15) * SR); x = np.arange(rs) / SR
put(mus, a, (band(noise(rs), 1500, 9000) * .5 + np.sin(2 * np.pi * np.cumsum(220 + 660 * (x / x[-1]) ** 2) / SR) * .12) * np.linspace(0, 1, rs) ** 2.5 * .3)
put(mus, h - .04, boom(2.2, 58, 28, .8)); put(mus, h, (piano(hz('D3'), 2.5, .9) + piano(hz('A3'), 2.5, .7) + piano(hz('D4'), 2.5, .7) + piano(hz('F4'), 2.5, .6)) * .6)
chord(h, ['Bb1', 'F2', 'D3', 'F3'], M['cati'] - h + .5, .07, 1400)
# cati: sunrise, F major
a, b = M['cati'], M['baslik']
chord(a, ['F2', 'C3', 'A3', 'C4'], 2.2, .06, 1600); chord(a + 2.1, ['D2', 'A2', 'F3', 'A3'], b - a - 2.0, .06, 1600)
for j, n in enumerate(['C5', 'A4', 'F4', 'G4', 'A4', 'C5', 'D5', 'C5']): put(mus, a + .4 + j * .52, piano(hz(n), 1.8, .42))
# baslik: the boom under the title, Bb - F, a bell melody, fade
a = M['baslik']
chord(a + .3, ['Bb1', 'F2', 'D3', 'F3', 'Bb3'], 2.2, .08, 1800); chord(a + 2.4, ['F2', 'C3', 'A3', 'C4', 'F4'], DUR - a - 2.3, .08, 1700)
for j, n in enumerate(['F5', 'E5', 'D5', 'C5', 'A4', 'C5', 'D5', 'F5']): put(mus, a + .45 + j * .45, bell(hz(n), 2.0, .5))
mus = reverb(mus, 2.2, .26)
fade = np.ones(N); k = int(.9 * SR); fade[-k:] = np.linspace(1, 0, k) ** 1.5; mus *= fade

# ------------------------------------------------------------------ sfx
sfx = np.zeros(N)
def beep(f, dur=.09, amp=.25): n = int(dur * SR); t = np.arange(n) / SR; return np.sign(np.sin(2 * np.pi * f * t)) * .5 * env(n, .002, dur) * amp
for c in cfg['cues']:
    t0, s, g = c['t'], c['s'], c.get('g', 1.0)
    if s == 'cut': put(sfx, t0 - .1, whoosh(.3, 800, 3000, .07))
    elif s == 'flip': put(sfx, t0, click(.3)); put(sfx, t0, blip(1800, .06, .12))
    elif s == 'switch': put(sfx, t0, band(click(.5), 300, 2500))
    elif s == 'alarm':
        tt = t0
        while tt < t0 + c['d'] - .05:
            x = np.zeros(int(.3 * SR)); x[:int(.09 * SR)] += beep(1320); x[int(.14 * SR):int(.23 * SR)] += beep(1320)
            put(sfx, tt, band(x, 400, 1600) * .35 if tt < 4.6 else x)      # through the wall until we cut inside
            tt += .5
    elif s == 'tap': put(sfx, t0, click(.35)); put(sfx, t0, thud(.15))
    elif s == 'stand': n = int(.6 * SR); put(sfx, t0, band(noise(n), 700, 4000) * env(n, .08, .18) * .12); put(sfx, t0 + .55, thud(.25))
    elif s == 'step':
        put(sfx, t0, thud(.32 * g))
        n = int(.18 * SR); put(sfx, t0 + .01, band(noise(n), 1200, 7000) * env(n, .002, .05) * .2 * g)          # the splash
    elif s == 'breath': n = int(.5 * SR); put(sfx, t0 - .1, band(noise(n), 300, 2200) * env(n, .06, .12) * .1)
    elif s == 'page': n = int(.25 * SR); put(sfx, t0 - .05, band(noise(n), 2000, 9000) * env(n, .01, .05) * .14)
    elif s == 'chair': put(sfx, t0 + .1, thud(.12))
    elif s == 'whoosh': put(sfx, t0 - .35, whoosh(.8, 250, 3500, .3))
    elif s == 'whoosh2': put(sfx, t0 - .3, whoosh(.9, 3000, 300, .28, rev=True))
    elif s == 'hit': put(sfx, t0, band(noise(int(.35 * SR)), 800, 8000) * env(int(.35 * SR), .001, .07) * .3)
    elif s == 'boom':
        rs = int(1.2 * SR); put(sfx, t0 - 1.2, band(noise(rs), 1500, 9000) * np.linspace(0, 1, rs) ** 3 * .2)
        put(sfx, t0, boom(2.4, 60, 30, .6))
    elif s == 'dar':
        n = int(1.6 * SR); tt = np.arange(n) / SR; f = 44 + 28 * np.exp(-tt * 2.5); ph = 2 * np.pi * np.cumsum(f) / SR
        e = np.minimum(1, tt / .14) * np.exp(-tt / .55)
        put(sfx, t0 - .08, (np.sin(ph) * .52 + np.sin(2 * ph) * .18 + band(noise(n), 60, 320) * .25) * e)
        put(sfx, t0 - .3, whoosh(.55, 900, 140, .16, rev=True))
    elif s == 'ac': put(sfx, t0, whoosh(.4, 500, 2600, .07))

# ambience: rain outside (loud in the street, behind glass in the room), birds and a little wind on the roof
amb = np.zeros(N); T = np.arange(N) / SR
rain = band(noise(N), 500, 7000) * .045 + band(noise(N), 80, 500) * .03
drops = np.zeros(N)
for j in range(int(DUR * 40)): put(drops, rng.uniform(0, DUR), band(noise(int(.01 * SR)), 2000, 9000) * env(int(.01 * SR), .0005, .002) * rng.uniform(.05, .15))
rain += drops
def gate(a, b, fade=.15): return np.clip(np.minimum((T - a) / fade, (b - T) / fade), 0, 1)
out = gate(0, 4.6) + gate(8.4, 11.3); inside = gate(4.6, 8.4) + gate(11.3, M['kart'])
amb += rain * out + band(rain, 80, 1200) * inside * .6
wind = band(noise(N), 100, 800) * (.6 + .4 * np.sin(T * .5)) * .02; amb += wind * gate(M['cati'], DUR)
for j in range(14):
    tt = M['cati'] + .3 + rng.uniform(0, DUR - M['cati'] - 1); n = int(.12 * SR); x = np.arange(n) / SR
    put(amb, tt, np.sin(2 * np.pi * np.cumsum(3000 + 1500 * np.sin(x * 90)) / SR) * env(n, .005, .04) * .045)

# ------------------------------------------------------------------ duck the music under the voice, sum, loudness
vo = np.zeros(N)
for a, b in spans: vo[int(a * SR):int(b * SR)] = 1
k = int(.2 * SR); vo = np.convolve(vo, np.ones(k) / k, mode='same')
# the narrator stays 8-10 dB over everything else inside his lines (checked by transcribing the finished mix with Whisper:
# at a 50 % duck "Yağmurda" and "Canın" were lost under the drive)
music = mus * (1 - .74 * vo)
pre = voice * 1.4 + music * .8 + sfx * .8 * (1 - .55 * vo) + amb * (1 - .55 * vo)
save(AUD / 'voice.wav', voice); save(AUD / 'music.wav', music); save(AUD / 'sfx.wav', sfx + amb); save(AUD / 'premix.wav', pre)
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(AUD / 'premix.wav'), '-af', 'loudnorm=I=-15:TP=-1.5:LRA=8:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
af = f"loudnorm=I=-15:TP=-1.5:LRA=8:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(AUD / 'premix.wav'), '-af', af, '-ar', '48000', str(AUD / 'mix.wav')], check=True)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(AUD / 'mix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('mix', ' '.join(l.strip() for l in r.splitlines() if l.strip().startswith(('I:', 'Peak:'))))
