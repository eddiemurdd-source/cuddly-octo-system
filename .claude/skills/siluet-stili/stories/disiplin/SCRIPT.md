# Disiplin

30 saniyelik disiplin motivasyon filmi. 16:9, 1920×1080, 24 kare/sn, silüet stili, erkek anlatıcı.

Kurgu referans hook'unun iskeletini izliyor (`analiz/script.md`): güç iş başında → sayı karşılaştırması → başlık. Burada "güç" disiplin: dar bant, "kalkıyorsun" sözünde kapanıyor ve disiplin çalıştığı sürece (koşu, şınav, masa) kapalı kalıyor.

## Metin (38 kelime)

| # | Satır | Başlangıç | Süre |
|---|---|---|---|
| L01 | Saat sabahın beşi. Bütün şehir uyuyor. | 0,5 sn | 3,66 sn |
| L02 | Canın istemiyor. | 4,75 sn | 1,34 sn |
| L03 | Yine de kalkıyorsun. | 6,65 sn | 1,47 sn |
| L04 | Kimse izlemiyorken. | 8,5 sn | 1,47 sn |
| L05 | Yağmurda. | 10,1 sn | 1,10 sn |
| L06 | Yorgunken. | 11,55 sn | 1,06 sn |
| L07 | Her gün, sadece yüzde bir daha iyi. | 14,7 sn | 2,44 sn |
| L08 | Bir yıl sonra? | 18,1 sn | 1,29 sn |
| L09 | Otuz yedi kat. | 19,75 sn | 1,52 sn |
| L10 | Motivasyon gelir, gider. | 21,5 sn | 1,89 sn |
| L11 | Ama disiplin kalır. | 23,75 sn | 1,60 sn |
| L12 | Yarın değil. Bugün başla. | 26,9 sn | 2,64 sn |

21,5 sn ses, 8,5 sn sözsüz (müzik, efekt, görüntü). Satırlar `voice/satirlar.json`, zamanlar `story.js` içindeki `LINES` dizisinde. Kelime zamanları Whisper ile ölçüldü; önemli anlar bunlara bağlı: "beşi" (saat 05:00'a döner) 1,5 sn, "kalkıyorsun" (bant kapanır, ayağa kalkar) 7,1 sn, "Otuz yedi" (vuruş, 37 KAT) 19,83 sn, "bugün" (BUGÜN BAŞLA.) 28,24 sn.

## Ses

Piper TTS, Türkçe erkek ses `tr_TR-dfki-medium`, tamamen çevrimdışı (`voice/make.py`). Ortanca perde 104 Hz. Alçak raf, varlık bandı, de-esser ve hafif kompresyon; ses **kuru**.

İlk sürümde ses rubberband ile ×0,93 kalınlaştırılmış ve mikste 1,3 sn'lik yankı eklenmişti; anlatıcı yankılanıyordu. Bir kelimenin -20 dB'den -45 dB'ye düşme süresi kuru seste ~130 ms, perde kaydırmadan sonra 160 ms, ilk miksde 545 ms ölçüldü. İkisi de kaldırıldı (şimdi ~180 ms, bant filtresi ve kompresyon dahil). Aynı kayıtlar yeniden işlendi (`python make.py --yeniden`), süreler ve senkron değişmedi.

Piper her çalıştırmada gürültüsünü yeniden örnekliyor; aynı kelime bir seferde net, bir seferde bulanık çıkabiliyor ("Disiplin" → "Dissetliğin"). Bu yüzden her satır 5 kez üretilip Whisper (small, Türkçe) ile yazıya döküldü; metne en yakın kayıt seçildi (`voice/secim.json`). 12 satırın 12'si birebir.

Miksin kendisi de Whisper ile kontrol edildi: müzik ses altında %74 bastırılıyor, efekt ve ortam %55. %50 bastırmada "Yağmurda" ve "Canın" koşunun müziği altında kayboluyordu.

## Sinema bandı

| Saniye | Nerede | Neden |
|---|---|---|
| 7,1–13,55 | "kalk" planının içinde, "kalkıyorsun" sözünde kapanıyor; koşu, yağmur, şınav ve masa boyunca kapalı | Disiplin iş başında. Pencere şafağa dönerken açılıyor |

Toplam 6,45 sn, filmin %21,5'i (referans hook'larında %0–22).

## Planlar (13 plan, 12 kesme, 3 flaş)

| Saniye | Plan | Ne oluyor |
|---|---|---|
| 0–2,4 | sehir | Gece, yağmur. Sokağa karşıdan geniş plan: ortada alçak bina, iki yanda uzun komşular, aralarındaki gökyüzü bandında ay. Bütün pencereler karanlık. Sağ üstte saat 04:59; "beşi" sözünde 05:00 |
| 2,4–4,6 | pencere | Cepheye yakın plan. 3,9 sn'de alarm çalıyor, tek pencere yanıyor: içeride yatağında doğrulan bir silüet |
| 4,6–6,6 | yatak | Odada, yatağın ucunda çökmüş oturuyor. Telefon çalıyor; uzanıp kapatıyor (5,0 sn). Mavi gece ışığı |
| 6,6–8,4 | kalk | Alçak açı. "kalkıyorsun" sözünde bant kapanıyor, görüntü soğuyor, ayağa kalkıyor |
| 8,4–10 | kosu | Boş, ıslak sokakta yalnız koşuyor; fenerlerin ışığı yağmurdan süzülüyor. Kamera onunla kayıyor |
| 10–11,3 | yagmur | Yan yakın plan, takip: bere, yağmur, ter damlaları |
| 11,3–12,8 | sinav | Yerde şınav, masa lambası yanık |
| 12,8–14,4 | masa | Masada kitap okuyor, sayfa çeviriyor; pencere şafağa dönüyor, bant açılıyor |
| 14,4–18 | kart | Flaş. Lacivert kart: "HER GÜN %1 DAHA İYİ". 1,01ⁿ (turuncu) ve 0,99ⁿ (mavi) eğrileri; küçük adam turuncu eğrinin ucunda koşuyor |
| 18–21,3 | kart2 | "Bir yıl sonra?": yıl hızla doluyor, eğri dikleşiyor. "Otuz yedi" sözünde vuruş: 37 KAT, 1,01³⁶⁵ ≈ 37,8; adam tepede kollarını kaldırıyor. Altta 0,99³⁶⁵ ≈ 0,03 |
| 21,3–23,6 | cati | Flaş. Şafakta çatı, yağmur bitmiş, su birikintilerinde gökyüzü. Elleri dizlerinde soluklanıyor, nefesi buhar; doğrulup güneşe bakıyor |
| 23,6–25,6 | cati2 | Güneşe karşı yakın plan. "disiplin" sözünde çenesini kaldırıp gülümsüyor |
| 25,6–30 | baslik | Geniş plan, başlık: MOTİVASYON BİTER. / DİSİPLİN KALIR. "bugün" sözünde BUGÜN BAŞLA.; kararma |

## Olgular

| İddia | Dayanak | Metindeki karar |
|---|---|---|
| Her gün %1 daha iyi → bir yılda ~37,8 kat | 1,01³⁶⁵ = e^(365 · ln 1,01) ≈ 37,78 | Ses "otuz yedi kat", ekranda "37 KAT" ve "1,01³⁶⁵ ≈ 37,8" |
| Her gün %1 daha kötü → ~0,03 | 0,99³⁶⁵ ≈ 0,0255 | Ekranda "0,99³⁶⁵ ≈ 0,03" |

**Bitmiş video:** [`ornek/disiplin.mp4`](../../ornek/disiplin.mp4) (1920×1080, sesli, 30 sn)

## Yeniden üretmek

```bash
cd stories/disiplin/voice && python make.py          # ses (pip install piper-tts faster-whisper)
cd ../../../engine
node render.mjs disiplin --stills=1,4.3,7.9,10.6,11.4,13.9,20.4,23.1,27 --scale=0.5
node render.mjs disiplin --cues
cd ../stories/disiplin && python mix.py              # ses + müzik + efekt -> audio/mix.wav (-15 LUFS)
cd ../../engine && node render.mjs disiplin --name=disiplin_v1
```
