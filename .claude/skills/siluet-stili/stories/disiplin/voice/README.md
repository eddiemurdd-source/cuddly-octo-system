# Disiplin: seslendirme

Tek ses: erkek anlatıcı. Satırlar `satirlar.json` içinde (12 satır), her biri `satir/L01.wav … L12.wav` (48 kHz, mono).

## Nasıl üretildi

`python make.py` (bu klasörden). Gerekenler: `pip install piper-tts faster-whisper`, ffmpeg.

- **Ses:** Piper TTS, `tr_TR-dfki-medium` (Türkçe, erkek). İlk çalıştırmada `.model/` içine indirilir (63 MB, repoya girmez). İnternet yalnızca bu indirme için gerekiyor; sentez çevrimdışı.
- **Okuma:** length-scale 1,12 (ağır satırlar 1,15–1,22), noise 0,5, noise-w 0,55, cümle arası 0,32 sn.
- **Ton:** perde olduğu gibi (ortanca ~104 Hz); 130 Hz'de +3,5 dB alçak raf, 3 kHz'de +2,5 dB, 400 Hz'de -1,5 dB, de-esser, 3:1 kompresyon. Yankı yok, ne burada ne mikste: ilk sürümdeki perde kaydırma (rubberband ×0,93) ve 1,3 sn'lik yankı anlatıcıyı yankılı yapıyordu.
- **Yeniden işleme:** `python make.py --yeniden` seçili kayıtları (`secim.json`) yeni Piper çalıştırmadan, güncel efekt zinciriyle yeniden işler; süreler değişmez.
- **Kırpma:** baştaki boşluk 0,08 sn'ye, sondaki 0,25 sn'ye (skill'in kuralı).
- **Seçim:** Piper her çalıştırmada farklı okuyor. Her satır 5 kez üretiliyor, Whisper (small, Türkçe) ile yazıya dökülüyor, metne en yakın kayıt seçiliyor. Sonuç `secim.json` içinde; 12 satırın 12'si birebir.

Tek bir satırı yenilemek: `python make.py L05`. Sonra `sureler.json` güncellenir; satır uzadıysa `story.js` içindeki `LINES` zamanlarına bakın.

## Başka bir sesle

Kendi kaydınızı ya da başka bir TTS'i (ör. Google AI Studio) kullanmak isterseniz dosyaları aynı adlarla `satir/` içine koyun. Süreler değişirse `LINES` zamanlarını kaydırın, sonra `node render.mjs disiplin --cues` ve `python mix.py`.
