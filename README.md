# SOIE · Atelier de Pincéis

Landing page do pincel SOIE N°02. HTML estático: para ver, basta servir a pasta.
O único passo de build é o Tailwind, e a folha gerada está versionada, então dá
para abrir a página sem rodar nada.

## Estrutura

```
index.html                  a página inteira
MAPA-DE-SECOES.md           inventário das dobras e regra da navegação
assets/css/tailwind.css     gerado por build/ (não editar à mão)
assets/css/soie.css         os estilos da marca
assets/js/soie.js           todo o comportamento, em 15 blocos numerados
assets/img/                 imagens servidas ao navegador (WebP)
assets/video/               pincel.mp4 e pincel.webm, comprimidos
assets/templates/           Iconify e a fonte Inter servidos localmente
build/                      config do Tailwind e a página que gera a imagem de compartilhamento
raw/                        material de trabalho: originais, frames, testes (fora do Git)
```

## Rodar localmente

```bash
python3 -m http.server 8848
# http://localhost:8848/index.html
```

Abrir por `file://` também funciona, mas o console acusa um erro de origem que
não aparece quando a página é servida.

## Regerar o CSS

```bash
cd build
npm run css     # uma vez
npm run watch   # durante o desenvolvimento
```

## Regerar a imagem de compartilhamento

`build/og.html` é o cartão que vira `assets/img/og-soie-n02.jpg`. Abra a página
em 1200x630, tire um print e converta para JPEG. Se o domínio mudar, ajuste as
três URLs no `<head>` do `index.html`: `canonical`, `og:url` e o `@id` do JSON-LD.

## Notas técnicas

- Tipografia: Inter Tight (display), Inter (texto), Instrument Serif (itálico), JetBrains Mono (labels)
- Um único `requestAnimationFrame` compartilhado move todas as animações
- O vídeo só é baixado quando a dobra se aproxima, via IntersectionObserver
- `prefers-reduced-motion` desliga as animações; abaixo de 1024px o efeito de lente não roda
