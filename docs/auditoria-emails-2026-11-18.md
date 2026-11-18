# Auditoria de envio de e-mails — 18/11/2026

Auditoria completa da configuração de envio dos e-mails transacionais do
AppMeuLugar, a pedido do usuário, após cliques em botões dos e-mails de teste
não redirecionarem corretamente.

## 1. Origem das URLs nos hooks (auditado)

| Hook                                            | Fonte das URLs                                          | Hardcoded? |
| ----------------------------------------------- | ------------------------------------------------------- | ---------- |
| `pocketbase/hooks/interest_notifications.pb.js` | `secret SITE_URL` (lido a cada envio, via `$os.getenv`) | Não        |
| `pocketbase/hooks/email_test.pb.js`             | `secret SITE_URL` (lido a cada envio)                   | Não        |
| `pocketbase/hooks/optout.pb.js`                 | não gera URLs (rota de destino do descadastro)          | —          |

Conclusão: **nenhuma URL é hardcoded em código**. Trocar o destino global =
trocar o secret `SITE_URL` no painel, sem migração.

Grep por `goskip` em `src/` e `pocketbase/`: **zero ocorrências** (as únicas
menções a goskip estão em comentários de migrações antigas, descrevendo o
problema — 0009 e 0017 —, nunca em URLs emitidas).

## 2. Configuração atual (comprovada)

- Secret `SITE_URL` existe na lista de secrets do backend e vale
  `https://www.appmeulugar.com.br` (alterado pelo usuário na v0.0.26).
- `settings.meta.appUrl` = `https://www.appmeulugar.com.br` (migração
  `0017_email_urls_custom_domain.js`, aplicada; também varreu os templates e
  substituiu qualquer goskip restante).

## 3. Templates no banco (coleção `email_templates`)

Consultas realizadas em `body_html` dos slugs `match_corretor` e
`geral_lista_importada`:

- `body_html ~ 'goskip'` → **0 registros**.
- `body_html ~ '<a href="[link'` (âncora aninhada) → **0 registros**.
- Ambos os templates contêm apenas os placeholders `[link-demanda]` e
  `[link-descadastrar]` — correto: são substituídos no envio pelo hook, que
  gera `<p><a href="URL">rótulo</a></p>` (botão em parágrafo próprio, sem
  âncora externa — correção da migração 0016 vigente).

## 4. URLs exatas que cada botão carrega hoje

Com `SITE_URL = https://www.appmeulugar.com.br`:

**`match_corretor` (teste e real):**

- "Visualizar demanda" → `https://www.appmeulugar.com.br/painel-corretor`
  (no envio real é acrescido `?enviar_para=<id_da_demanda>`; no teste, sem query)
- "Não quero receber estes e-mails" →
  `https://www.appmeulugar.com.br/descadastrar?email=<destinatário URL-encodado>`

**`geral_lista_importada` (teste e real):**

- "Ver demandas" → `https://www.appmeulugar.com.br/buscar?tipo=interesses`
- "Não quero receber estes e-mails" →
  `https://www.appmeulugar.com.br/descadastrar?email=<destinatário>`
  (o mesmo URL também aparece em texto puro no parágrafo de LGPD, variável
  `[link-descadastrar-texto]`)

## 5. Testes de hoje (14:38–14:58 UTC)

- Logs do backend (stream `emails`): os 4 envios `[TESTE]` — 2 do template
  `geral_lista_importada` e 2 do `match_corretor` para
  samuca.silva.vr@gmail.com — estão todos com status **"email sent"**.
  Nenhuma falha oculta.
- A coleção `notification_logs` não registra envios de teste **por design**
  (o hook de teste não grava nela — documentado no cabeçalho do
  `email_test.pb.js`). O único registro real na coleção é de 16/11, status
  "enviado". Não é bug.

## 6. Comportamento ao clicar (verificado ao vivo no domínio próprio)

- `/buscar?tipo=interesses` → abre a busca com as demandas publicadas ✅
- `/painel-corretor` → abre o app (login se não autenticado, painel se
  autenticado) ✅
- `/descadastrar` → **404 do host ao abrir a URL diretamente** ❌ — mesmo
  sintoma em `/privacidade` e `/termos`, rotas que funcionam navegando dentro
  do app. A rota existe no React (`App.tsx`), a página `OptOut.tsx` está
  íntegra e lê `?email=`. Diagnóstico: **o fallback de SPA do hosting no
  domínio próprio ainda não serve o `index.html` em todas as rotas diretas**
  — não é problema dos e-mails nem do React.

## 7. Conclusão

O lado do app está íntegro: URLs corretas, sem goskip, placeholders
renderizados, botão de descadastro clicável em parágrafo próprio, remetente
(`contato@appmeulugar.com.br`), textos aprovados e variáveis **intocados**.

Pendência externa (usuário/HostGator): apontar o domínio
`www.appmeulugar.com.br` com fallback de SPA (todas as rotas → `index.html`).
Até lá, o botão de descadastro dos e-mails dará 404 ao ser clicado; o
descadastro continua possível digitando o e-mail na página acessível pelo
menu do app.
