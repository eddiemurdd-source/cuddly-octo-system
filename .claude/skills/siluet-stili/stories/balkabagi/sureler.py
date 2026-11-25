# sureler.py : measures the recorded lines and writes voice/sureler.json ({"L01": 4.12, ...}).
#   python sureler.py
# story.js reads it at start-up: every line, shot, move and sound cue is placed relative to the lines, so the film
# re-times itself to the real voice. Then: node render.mjs balkabagi --cues ; python mix.py ; node render.mjs balkabagi
import json, pathlib, subprocess
HERE = pathlib.Path(__file__).resolve().parent
out = {}
for f in sorted((HERE / 'voice' / 'satir').glob('L*.wav')):
    d = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True, check=True).stdout
    out[f.stem] = round(float(d), 3)
json.dump(out, open(HERE / 'voice' / 'sureler.json', 'w'), indent=1)
print(len(out), 'lines,', round(sum(out.values()), 1), 's of voice')
