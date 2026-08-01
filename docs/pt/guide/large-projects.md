# Projetos grandes e cache

O PageFlow evita renderizar todas as rotas como documentos ativos ao mesmo tempo. Sua estratégia de renderização e cache é limitada para manter grafos grandes exploráveis.

## Renderização da viewport

Somente prévias DOM próximas e objetos de cena do LeaferJS são montados. Páginas distantes usam representações compactas. Uma página selecionada é promovida a um iframe ativo.

## Níveis de miniaturas

Páginas próximas podem usar prévias detalhadas. Páginas distantes usam miniaturas WebP compactas, e páginas longas podem ser divididas em blocos montados na viewport. Miniaturas antigas permanecem visíveis enquanto novas são capturadas.

## Fila de captura

Antes da captura, o PageFlow aguarda fontes, imagens e um DOM estável. O trabalho ocorre em uma página por vez, com prioridade para a página selecionada e as páginas visíveis.

## Layout e busca

Grafos com mais de 1.000 páginas podem mover o layout para um Worker. Um índice espacial encontra as páginas visíveis sem percorrer o grafo inteiro a cada atualização da viewport.

## Local do cache

As miniaturas persistentes são armazenadas em:

```text
.unplugin-pageflow/cache
```

Os caches de memória e disco usam limites LRU fixos. O diretório é uma saída descartável de desenvolvimento e pode ser removido quando você precisar de uma captura totalmente nova.

## Recomendações práticas

- Agrupe rotas com segmentos de caminho significativos.
- Forneça exemplos estáveis de parâmetros dinâmicos.
- Mantenha as páginas de prévia determinísticas usando dados de fixture.
- Use o sinal de prontidão para páginas assíncronas demoradas.
