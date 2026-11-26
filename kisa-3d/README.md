# kisa-3d

**Dikey (9:16) 3D bilgi videoları: koddan, kare kare.** Kısa, anlatıcılı, 3D animasyonlu "vücudunda aslında ne oluyor?" videoları için küçük bir motor ve ilk hikâye.

İlk hikâye: **Parmak çıtlatınca ne olur?** (`stories/citlatma/`). 59 saniye, 1080×1920, 30 kare/sn, Türkçe anlatım ve kelime kelime altyazı.

| Plan | Ne görülüyor |
|---|---|
| 0–5 sn | El yumruk olurken parmaklar sırayla çıtlıyor; röntgen: "ses kemikten gelmiyor" |
| 5–19 sn | Eklemin içine dalış: kemik uçları, kıkırdak, eklem kapsülü, eklem sıvısı, çözünmüş gaz; kapalı gazoz benzetmesi |
| 20–30 sn | Parmak bükülüyor, eklem aralığı açılıyor, basınç düşüyor, **ÇIT**: gaz kabarcığı |
| 30–37 sn | Hemen tekrar çıtlamıyor; kabarcık ~20 dakikada çözülüyor |
| 37–54 sn | 60 yıl boyunca yalnızca sol elini çıtlatan doktor; iki elde de artrit yok; Ig Nobel |
| 54–59 sn | Son: yanındakinin sinirleri |

Her şey koddan üretiliyor: el, kemikler, eklem, gazoz şişesi, madalya, müzik ve efektler. Hazır model, görüntü ya da ses örneği yok.

## Nasıl çalışıyor

- **El modeli** (`engine/src/hand.js`): avuç, parmak boğumları, başparmak ve önkol bir *işaretli uzaklık fonksiyonu* (SDF) olarak tanımlı. `sdfmesh.js` bunu "surface nets" ile pürüzsüz bir mesh'e çeviriyor. Deri ağırlıkları her köşenin kemik parçalarına uzaklığından otomatik hesaplanıyor, yani el gerçek bir iskeletle bükülüyor. Deri gölgelendiricisi boğum kırışıklıklarını, gözenekleri, kenarlardan sızan ışığı ve röntgen geçişini çiziyor.
- **Sahneler** (`stories/citlatma/`): `studio.js` (karanlık stüdyo, bokeh, üç nokta ışık), `joint.js` (kesitli eklem: kemik uçları, kıkırdak, esneyen kapsül, sıvı, gaz parçacıkları, kabarcık, şok halkası), `bottle.js` (gazoz).
- **Kurgu** (`story.js`): her kare `t` zamanının saf bir fonksiyonu. Planlar, kamera, pozlar ve olaylar anlatımın kelime zamanlarına bağlı.
- **Üst katman** (`overlay.js`): kelime kelime altyazı, etiketler, "ÇIT!" patlamaları, basınç göstergesi, 20 dakika saati, sayaçlar.
- **Görüntü sonrası** (`engine/src/post.js`): MSAA HDR → alan derinliği → bloom → ACES, vinyet, gren, renk sapması, hızlı geçişler için zoom bulanıklığı.
- **Ses** (`engine/audio/mix.py`): anlatım yerleşimi, numpy ile sentezlenmiş marimba müziği (anlatımın altında otomatik kısılıyor) ve efektler; -14 LUFS.

## Kurulum

Gerekenler: Node 18+, Python 3.10+, ffmpeg, Playwright'ın Chromium'u (GPU gerekmez; SwiftShader ile çalışır).

```bash
cd engine && npm install
pip install numpy piper-tts faster-whisper
```

## Kullanım

`engine/` klasöründen:

```bash
# 1) seslendirme (Piper, çevrimdışı Türkçe ses) ve kelime zamanları
python tts.py ../stories/citlatma /yol/tr_TR-dfki-medium.onnx 0.92
python words.py ../stories/citlatma small        # faster-whisper ile kelime zamanları
python altyazi.py ../stories/citlatma             # senaryodaki kelimelere eşle -> voice/altyazi.json

# 2) kontak sayfası (taslak, yarım çözünürlük)
node render.mjs citlatma --stills=1,9,26,44,52 --scale=0.5

# 3) ses ipuçları ve miks
node render.mjs citlatma --cues
python audio/mix.py ../stories/citlatma

# 4) tam render
node render.mjs citlatma --r3d=0.75
```

Çıktı: `stories/citlatma/out/citlatma.mp4`.

Seçenekler: `--scale=0.5` taslak, `--r3d=0.75` 3D katmanı %75 çözünürlükte çizip büyütür (yazılar yine tam çözünürlükte; GPU olmayan makinede süreyi yarıya indirir), `--from=20 --to=30` bir parça, `--mute=1` sessiz, `--crf=17` kalite, `--workers=N` paralel tarayıcı (GPU varsa işe yarar; SwiftShader zaten tüm çekirdekleri kullanır). `node prof.mjs citlatma 12,44` aşama aşama süre ölçer.

Ses modeli: `tr_TR-dfki-medium` ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/main/tr/tr_TR/dfki/medium)). Daha doğal bir ses için satırları başka bir TTS ile ya da kendi sesinizle `voice/satir/L01.wav …` olarak değiştirip 1. adımdaki `words.py` ve `altyazi.py`'yi yeniden çalıştırmanız yeterli.

## Bilgi kaynakları

- Çıtlama sesi, eklem sıvısındaki gazın ani basınç düşüşüyle kabarcık oluşturmasıdır (Kawchuk ve ark., *PLOS ONE*, 2015, gerçek zamanlı MR).
- Aynı eklem yaklaşık 20 dakika tekrar çıtlamaz (Unsworth ve ark., *Ann. Rheum. Dis.*, 1971).
- Donald Unger 60 yıl boyunca yalnızca sol elinin parmaklarını çıtlattı; iki elde de artrit yoktu (*Arthritis & Rheumatism*, 1998). 2009 Ig Nobel Tıp Ödülü.

## Lisans

MIT.
