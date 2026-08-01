# Perguntas frequentes

## O PageFlow é executado em produção?

Não. O PageFlow é uma ferramenta de desenvolvimento. Seu runtime e seus endpoints são excluídos dos builds de produção.

## Ele substitui um roteador ou executor de testes?

Não. Ele lê rotas das integrações compatíveis e executa apenas os comandos de teste configurados explicitamente.

## Ele pode ignorar a autenticação?

Não. As prévias usam a sessão atual do navegador e a autorização normal da aplicação.

## O PageFlow clica automaticamente em todos os controles?

Não. Ele detecta destinos de navegação compatíveis, mas não percorre o produto clicando automaticamente nos controles.

## Por que um destino calculado está ausente?

Um destino montado em tempo de execução pode não existir até ocorrer a interação relevante. Prefira um link compatível ou forneça uma indicação explícita quando o adaptador do framework permitir.

## As prévias podem alterar dados?

O código de inicialização da aplicação continua sendo executado. O modo de prévia bloqueia a navegação por âncoras e o envio de formulários no frame controlado, mas não pode impedir efeitos colaterais da inicialização. Use dados locais ou de teste.

## Onde as miniaturas são armazenadas?

As miniaturas persistentes ficam em `.unplugin-pageflow/cache`. O diretório pode ser excluído com segurança enquanto o servidor de desenvolvimento estiver parado.

## Quais frameworks são compatíveis?

Consulte a [matriz de compatibilidade](/pt/reference/compatibility) atual.

## Como relatar um erro?

Abra uma issue no [GitHub](https://github.com/fitoe/unplugin-pageflow/issues) com o framework, as versões, a configuração mínima, o padrão de rota e a saída relevante do console.
