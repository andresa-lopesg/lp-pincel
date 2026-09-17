# SOIE — Atelier de Pincéis

Landing page (primeira dobra) do pincel SOIE N°02, construída a partir do design
system SOIE. HTML estático, sem build: basta abrir o `index.html` ou servir a pasta.

## Conteúdo

- `index.html` — página única: navbar, hero com vídeo, seletor de acabamento, marquee
- `pincel.MP4` — vídeo do produto na primeira dobra (mudo, em loop)
- `Gemini_Generated_Image_ernkcgernkcgernk.jpg` — poster do vídeo
- `assets/templates/digital-architect.aura.build/assets/` — Tailwind, Iconify e a
  fonte Inter servidos localmente

## Rodar localmente

```bash
python3 -m http.server 8848
# http://localhost:8848/index.html
```

## Notas técnicas

- Tipografia: Inter Tight (display), Inter (texto), Instrument Serif (itálico), JetBrains Mono (labels)
- Animações via IntersectionObserver, com `prefers-reduced-motion` respeitado
- O vídeo usa `mix-blend-mode: multiply` sobre o gradiente do painel e retoma sozinho
  quando a aba volta a ficar visível
