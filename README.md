# cuddly-octo-system

## graphify (kod haritası)

Bu depoda [graphify](tools/graphify/README.md) kurulu: proje bir bilgi grafiğine
(`graphify-out/`) dönüştürülür ve Claude dosyaları tek tek okumadan önce bu
haritayı sorgular.

- Kaynak kod: `tools/graphify/` (sürüm 0.9.121, Apache-2.0)
- Claude Code entegrasyonu: `.claude/skills/graphify/`, `.claude/settings.json` hook'ları, `CLAUDE.md`
- Grafiği yeniden kurmak: `graphify update .` (yalnızca kod, ücretsiz) veya Claude'da `/graphify .`
- Kurulum (yerelde): `uv tool install ./tools/graphify`
