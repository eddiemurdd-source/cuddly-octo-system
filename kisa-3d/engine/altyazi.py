# altyazi.py — map the script's words onto whisper's word timings -> voice/altyazi.json
#   python altyazi.py <story_dir>
# Whisper may split or merge words ("sıvıyla" -> "sıvı ile"); when counts differ, the script's words are spread over the
# spoken span by syllable count (Turkish: one vowel = one syllable) with extra weight for punctuation pauses.
import sys, json, pathlib, re
story = pathlib.Path(sys.argv[1])
lines = json.load(open(story / 'voice' / 'satirlar.json', encoding='utf-8'))
wt = json.load(open(story / 'voice' / 'kelimeler.json', encoding='utf-8'))
syl = lambda w: max(1, len(re.findall(r'[aeıioöuüâîûAEIİOÖUÜ]', w)))
out = []
for L in lines:
    words = L['metin'].split(); W = wt[L['id']]
    if len(W) == len(words):
        ws = [{'w': w, 's': x['s'], 'e': x['e']} for w, x in zip(words, W)]
    else:
        s0, e0 = W[0]['s'], W[-1]['e']
        wgt = [syl(w) + (1.6 if re.search(r'[.?!…]$', w) else 0.8 if w.endswith(',') else 0) for w in words]
        tot = sum(wgt); t = s0; ws = []
        for w, g in zip(words, wgt):
            d = (e0 - s0) * g / tot; ws.append({'w': w, 's': round(t, 2), 'e': round(t + d * (0.8 if g > syl(w) else 1), 2)}); t += d
    out.append({'id': L['id'], 'words': ws})
    print(L['id'], 'direct' if len(W) == len(words) else f'spread ({len(W)} vs {len(words)})')
json.dump(out, open(story / 'voice' / 'altyazi.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
