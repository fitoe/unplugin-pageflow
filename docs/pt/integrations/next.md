# Next.js

O Next.js não oferece uma interface de plugin Vite, por isso o PageFlow usa um sidecar da mesma origem exclusivo para desenvolvimento.

## Prepare o PageFlow

Instale o pacote como dependência de desenvolvimento e confirme que a aplicação Next.js está em execução.

```bash
pnpm add -D unplugin-pageflow
pnpm next dev
```

## Inicie o sidecar

Execute a CLI na raiz da aplicação:

```bash
pageflow-next --dir . --host 127.0.0.1 --port 3000
```

A CLI descobre as rotas baseadas em arquivos compatíveis do Next.js e exibe a URL do PageFlow.

## Opções

- `--dir` seleciona o diretório do projeto Next.js.
- `--host` seleciona o host de desenvolvimento.
- `--port` identifica a porta de desenvolvimento do Next.js usada na configuração do sidecar.

## Somente desenvolvimento

O sidecar não faz parte de `next build` e não é usado pelo servidor de produção. Mantenha-o em scripts locais de desenvolvimento, não em definições de processos de produção.

## Solução de problemas

- Inicie o Next.js antes de abrir as prévias das páginas.
- Use um host e uma porta disponíveis.
- Confirme que as páginas são renderizadas diretamente na mesma sessão do navegador.
- Use autenticação e dados locais ou de teste.
