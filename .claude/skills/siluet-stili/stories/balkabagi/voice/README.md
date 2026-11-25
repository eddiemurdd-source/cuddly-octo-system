# Alt Tarafı Balkabağı: seslendirme

Satırlar `satirlar.json` içinde (33 satır). Her satır ayrı bir dosya olarak `satir/L01.wav … satir/L33.wav` adıyla buraya konur.

## Roller

| Rol | Kim | Satırlar | Ses tarifi (İngilizce stil talimatı, metin Türkçe) |
|---|---|---|---|
| anlatici | Büyük kardeş, hikâyeyi anlatıyor | L01, L02, L04, L06, L07, L09, L11–L19, L21, L23–L29, L31, L32 | `Young storyteller in native Turkish, retelling a scary moment that ended well. Warm, natural, a little breathless in the tense parts. Natural conversational pace.` |
| ben | Büyük kardeş, sahnenin içinde konuşuyor | L03, L10, L20, L33 | aynı ses. L03 ve L20 bağırarak, L10 sakinleştirerek, L33 tatlı-sert, alaycı |
| kiz | Küçük kız kardeş | L05 | `Little girl in native Turkish, in pain and scared. Short.` |
| adam | Kaba adam | L08, L22, L30 | `Gruff, careless middle-aged man in native Turkish. L08 and L22 dismissive, L30 angry and muffled.` |

Uykusuz'daki gibi Google AI Studio (Gemini TTS) kullanılabilir: her satır ayrı üretilir, baştaki boşluk 0,08 sn'ye, sondaki 0,25 sn'ye kırpılır.

## Sonra

```bash
cd stories/balkabagi
python sureler.py                       # satırların gerçek süreleri -> voice/sureler.json
cd ../../engine
node render.mjs balkabagi --cues        # zamanlama satırlara göre yeniden hesaplanır
python ../stories/balkabagi/mix.py      # ses + müzik + efekt -> audio/mix.wav
node render.mjs balkabagi --name=balkabagi_v1
```

Bütün planlar, hareketler ve ses ipuçları satırlara göre yerleştiği için film kendini gerçek seslere göre yeniden zamanlar.
