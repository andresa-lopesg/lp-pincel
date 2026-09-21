# Mapa de seções

Inventário do que existe na LP hoje, para a navegação parar de prometer o que a página não entrega.
Conferido em 21/09/2026 contra o `index.html`.

## As quatro dobras

| # | `id` | Título na página | Trabalho da dobra | Linha |
|---|------|------------------|-------------------|-------|
| 01 | `hero` | Toque de seda. | Apresenta a peça e o vídeo da aplicação. Dois CTAs: reservar e descer para a anatomia. | 227 |
| 02 | `anatomia` | Anatomia de um gesto invisível. | Seis fichas técnicas ligadas à lente que percorre o pincel: cúpula, fibra, densidade, férula, equilíbrio e acabamento. | 377 |
| 03 | `ritual` | Seis gestos. Uma segunda pele. | A aplicação passo a passo, do rosto limpo ao acabamento. | 566 |
| 04 | `fecho` | Falta um gesto. O seu. | Escassez do Lote 02, preço, garantias e o formulário de reserva. | 757 |

Fora das dobras: `header#navbar` (linha 180), o menu lateral `#drawer` (208), o `footer` (905) e dois elementos de interface que o JS controla, `#modal` (937) e `#toast` (954).

## Navegação

Os mesmos quatro destinos aparecem em três lugares, e os três precisam andar juntos:

| Lugar | Linha | Itens |
|-------|-------|-------|
| Menu do topo (desktop) | 186 | Anatomia, Ritual, Reserva |
| Menu lateral (mobile) | 210 | Anatomia, Ritual, Reserva |
| Rodapé | 914 | Início, Anatomia, Ritual, Reserva |

O rodapé abre com Início porque já está no fim da página. O topo não precisa desse item: a marca no canto esquerdo leva para `#hero`.

## Regra para mexer aqui

1. A seção nasce primeiro, com `id` e conteúdo real. Só depois entra no menu.
2. Entrou no menu, entra nos três: topo, gaveta e rodapé.
3. Todo `id` de dobra precisa de `scroll-margin-top:90px` no `soie.css`, senão o header fixo de 73px cobre o título.
4. Nenhum link pode apontar para uma âncora que não existe. Para conferir:

```bash
python3 - <<'PY'
import io, re
s = io.open('index.html', encoding='utf-8').read()
ids = set(re.findall(r'id="([^"]+)"', s))
print([h for h in set(re.findall(r'href="#([^"]+)"', s)) if h not in ids] or 'nenhuma âncora quebrada')
PY
```

Rodando agora: nenhuma âncora quebrada. Coleção, Atelier e Cuidado saíram do menu, e o antigo "Ver o cuidado e a lavagem" não existe mais.

`#brush-body` e `#fin-seal-path` também aparecem em `href`, mas são referências internas de SVG (`<use>` e `textPath`), não navegação.

## O que ficou de fora de propósito

Coleção, Atelier e Cuidado eram itens de menu sem página. Enquanto o conteúdo não existir, ficam aqui como pauta, não como link:

- **Coleção**: só faz sentido quando houver um N°01 ou N°03.
- **Atelier**: história da fabricação. Hoje vive em pedaços dentro da dobra 02.
- **Cuidado e lavagem**: instrução de pós-venda. Provavelmente e-mail ou cartão na caixa, não dobra de LP.
