// satirlar.js : the voice lines of "Alt Tarafı Balkabağı" and the timeline built from them.
// [id, who, text, gap before (s)]. who: anlatici (the narrator, "ben"), kiz (the little sister), adam (the man), ben (the
// narrator speaking inside the scene).
// Until the recorded lines exist, a line lasts words / 2.25 + 0.35 s (the reference narrates ~2 words a second; the
// Uykusuz TTS lines ran 2.0-2.4). Once voice/satir/*.wav exist, `python sureler.py` writes voice/sureler.json with the
// real lengths and every shot, move and cue follows, because they are all placed relative to the lines.
export const SATIR = [
  ['L01', 'anlatici', 'Küçük kız kardeşimi kocaman bir balkabağı yığınının tepesinden indiriyordum.', 1.6],
  ['L02', 'anlatici', 'O sırada en büyük balkabağını arayan bir adam, yığının tam en altından bir tane çekti.', .45],
  ['L03', 'ben', 'Hayır!', .3],
  ['L04', 'anlatici', 'Tam o anda aynı boydaki iki balkabağı yuvarlanıp kardeşimin bacağını sıkıştırdı.', .35],
  ['L05', 'kiz', 'Ah, bacağım!', .3],
  ['L06', 'anlatici', 'Sarıldığı küçük balkabağı da düşüp arkamdaki saman balyalarının arasına yuvarlandı.', .4],
  ['L07', 'anlatici', 'Adam bacağına bir göz attı, omuz silkti:', .7],
  ['L08', 'adam', 'Sakin ol, alt tarafı balkabağı.', .25],
  ['L09', 'anlatici', 'Onu umursamadım, kardeşimi belinden tuttum.', .7],
  ['L10', 'ben', 'Sıkı tutun, yanındayım.', .25],
  ['L11', 'anlatici', 'Ama yığının ortasında sıkışmıştı ve üstündeki balkabakları sallanmaya başladı.', .5],
  ['L12', 'anlatici', 'Olduğum yerde dondum. Çünkü çekersem, yığın ikimizin üstüne çökecekti.', .45],
  ['L13', 'anlatici', 'Ama tam yanımda adam, bir tane daha almak için elini uzatıyordu bile.', .55],
  ['L14', 'anlatici', 'Hemen iki balkabağını birbirinden ayırmaya çalıştım, ama o kadar sıkı dizilmişlerdi ki kıpırdamadılar.', .5],
  ['L15', 'anlatici', 'Tepeden bir balkabağı yuvarlanıp tam başının önüne düştü.', .4],
  ['L16', 'anlatici', 'Midem kasıldı. Bir sonraki onun üstüne düşebilirdi.', .55],
  ['L17', 'anlatici', 'Omzumu üstteki balkabaklarının altına soktum. Onları kaldırırken bir yandan da bacağının çevresini kazıyordum.', .6],
  ['L18', 'anlatici', 'Ama çok ağırlardı ve üstüme doğru kaymaya başladılar.', .4],
  ['L19', 'anlatici', 'Bacaklarım titremeye başladı. Onları kardeşimin üstünden tutan tek şey bendim.', .45],
  ['L20', 'ben', 'Dur! Kardeşim sıkıştı!', .45],
  ['L21', 'anlatici', 'Adam hiç oralı olmadı, kazmaya devam etti.', .35],
  ['L22', 'adam', 'Zaten üstüne tırmanmaması gerekiyordu.', .25],
  ['L23', 'anlatici', 'Bir tane daha sertçe çekip çıkardı. Yığın tam başımızın üstünde çatırdadı.', .45],
  ['L24', 'anlatici', 'Sonra iki koluyla en alttaki en büyük balkabağına sarıldı, sertçe çekti ve bütün yığın çöktü.', .55],
  ['L25', 'anlatici', 'Ama yığın kayarken, kardeşimin bacağını sıkıştıran iki balkabağı birbirinden ayrıldı.', .5],
  ['L26', 'anlatici', 'Onu koltuk altlarından yakaladım, çekip kurtardım ve her şey gürültüyle çökerken kendimi onunla birlikte saman balyalarının üstüne attım.', .35],
  ['L27', 'anlatici', 'Yuvarlanma durunca sevinçten ağlamaya başladım. Kardeşimin bir çiziği bile yoktu.', 3.2],
  ['L28', 'anlatici', 'Ama onu ezecek olan yığın, adamı boynuna kadar gömmüştü. En büyük balkabağı da tam tepesinde duruyordu.', .9],
  ['L29', 'anlatici', 'Ağzındaki toprağı tükürüp bağırdı:', .9],
  ['L30', 'adam', 'Hadi, çıkarın beni!', .25],
  ['L31', 'anlatici', 'Ben de hemen kardeşimin küçük balkabağını samanların arasından çekip kucağına koydum.', .9],
  ['L32', 'anlatici', 'Kardeşim gülümsedi. Ben de adama bakıp dedim ki:', .6],
  ['L33', 'ben', 'Sakin ol, alt tarafı balkabağı.', .5],
];
export const TAIL = 7.0;                     // the title after the last line

const words = s => s.split(/\s+/).filter(Boolean).length;
// T[id] = start, E[id] = end (s). sure: { id: seconds } from voice/sureler.json, or null
export function timeline(sure) {
  const T = {}, E = {}, LINES = [];
  let t = 0;
  for (const [id, , text, gap] of SATIR) {
    t += gap;
    const d = sure?.[id] ?? words(text) / 2.25 + .35;
    T[id] = +t.toFixed(3); E[id] = +(t + d).toFixed(3); LINES.push([id, T[id]]);
    t += d;
  }
  return { T, E, LINES, DUR: Math.ceil((t + TAIL) * 24) / 24 };
}
