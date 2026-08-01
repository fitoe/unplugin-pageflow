# Usando a tela

A tela do PageFlow foi criada para explorar um grafo de rotas, não para editar dados da aplicação.

## Mover e ampliar

- Role ou use um trackpad para ampliar ao redor do ponteiro.
- Arraste o espaço vazio da tela para mover a área visível.
- Selecione um cartão de página para focá-lo e revelar suas relações.
- Use os controles de viewport do navegador para comparar prévias em dispositivos móveis e computadores.

## Focar uma página

Selecionar uma página traz as páginas conectadas para a área visível, transforma a prévia escolhida em um iframe ativo e mostra os pontos de navegação. A visão focada é útil quando o grafo completo contém mais contexto do que o necessário.

## Explorar grupos de rotas

Rotas com segmentos de caminho compartilhados podem aparecer como um conjunto. Abra-o para examinar o próximo nível. O PageFlow mantém uma trilha para o grupo ativo e anima as transições entre níveis, preservando o contexto atual.

## Ler conexões

As conexões são direcionais. Uma linha de saída indica que a página de origem contém uma forma conhecida de chegar ao destino. A ausência de uma linha nem sempre significa que a navegação é impossível: destinos calculados são descobertos apenas quando a aplicação os expõe.

## Atualizar prévias

O PageFlow captura páginas desatualizadas em uma fila limitada. A página selecionada e as páginas visíveis têm prioridade. Alterações em rotas e links são entregues por HMR, enquanto as miniaturas existentes permanecem visíveis até as novas ficarem prontas.

## Dicas

- Comece pela página inicial ou rota principal de entrada.
- Entre em um grupo de rotas por vez em aplicações grandes.
- Use dados de teste antes de focar páginas que realizam gravações na inicialização.
- Se uma página nunca ficar pronta, adicione um [sinal explícito de prontidão](/pt/reference/configuration#prontidão-da-prévia).
