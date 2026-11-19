/// <reference path="../pb_data/types.d.ts" />
// 0021 — E-mail de aceite de apresentação ao corretor + ajuste do texto da
// lista importada (pedido do usuário em 19/11/2026).
//
// 1. Novo template editável (aba E-mails do /admin): slug 'aceite_apresentacao'.
//    Enviado ao corretor quando o interessado aceita a apresentação e a conversa
//    abre (hook presentation_accepted.pb.js). Placeholder do botão:
//    [link-abrir-conversa] → painel de conversas do corretor.
//    Idempotente: cria apenas se o slug ainda não existir (não pisa edição do
//    admin em envios futuros).
// 2. Texto visível sobre os contatos importados termina em "corretores":
//    - corpo do template 'geral_lista_importada' (a origem da importação
//      continua registrada internamente em imported_contacts.source).
//    - campo source dos contatos importados gravado como
//      "Caixa Econômica Federal — credenciados (importado em ...)".
migrate(
  (app) => {
    // ---- 1. Template 'aceite_apresentacao' ----
    let existing
    try {
      // JSVM: findFirstRecordByFilter(collection, filter, params) — sem extras.
      existing = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'aceite_apresentacao',
      })
    } catch (_) {
      existing = null
    }
    if (!existing) {
      const templates = app.findCollectionByNameOrId('email_templates')
      const r = new Record(templates)
      r.set('slug', 'aceite_apresentacao')
      r.set('title', 'Apresentação aceita — corretor (conversa aberta)')
      r.set(
        'description',
        'Enviado ao corretor quando o interessado ACEITA sua apresentação e a conversa interna é aberta.',
      )
      r.set('subject', 'Boa notícia! Seu interessado aceitou sua apresentação')
      r.set(
        'body_html',
        '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
          '<p>Ol&aacute;, [nome].</p>' +
          '<p>Boa not&iacute;cia: [interessado] aceitou a sua apresenta&ccedil;&atilde;o e a conversa j&aacute; est&aacute; ' +
          'aberta no AppMeuLugar.</p>' +
          '<p><strong>Im&oacute;vel apresentado:</strong> [imovel]<br>' +
          '<strong>Demanda:</strong> [demanda]</p>' +
          '<p>Acesse o painel do corretor e responda o quanto antes &mdash; respostas r&aacute;pidas ' +
          'aumentam muito a chance de fechamento.</p>' +
          '[link-abrir-conversa]' +
          '<p style="font-size:12px;color:#6b7280;">Voc&ecirc; recebeu este e-mail porque &eacute; corretor ' +
          'cadastrado no AppMeuLugar. ' +
          '<a href="[link-descadastrar]">N&atilde;o quer mais receber?</a></p>' +
          '</div>',
      )
      r.set(
        'variables',
        '[nome], [interessado], [imovel], [demanda], [link-abrir-conversa], [link-descadastrar]',
      )
      app.save(r)
    }

    // ---- 2a. Texto do template geral_lista_importada termina em "corretores" ----
    // O default vivo no hook (interest_notifications.pb.js) também carrega o
    // trecho; o replace é aplicado SEMPRE a este template, e a checagem garante
    // que só dispara quando o trecho ainda existe (idempotente e tolerante às
    // variantes com entidades HTML ou texto plano).
    try {
      const geral = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'geral_lista_importada',
      })
      if (geral) {
        const body = geral.getString('body_html') || ''
        // Formas conhecidas no banco (0012): "com base em lista p&uacute;blica de
        // corretores credenciados da Caixa Econ&ocirc;mica Federal" — cobre
        // também variante "credenciados da Caixa..." e texto plano.
        let novo = body.replace(
          /(?:lista|em lista) p(?:&uacute;|ú)blica de (?:credenciados da Caixa Econ(?:&ocirc;|ô)mica Federal|corretores credenciados da Caixa Econ(?:&ocirc;|ô)mica Federal)/g,
          'lista p&uacute;blica de corretores',
        )
        novo = novo.replace(
          /corretores credenciados da Caixa Econ(?:&ocirc;|ô)mica Federal/g,
          'corretores',
        )
        if (novo !== body) {
          geral.set('body_html', novo)
          app.save(geral)
        }
      }
    } catch (err) {
      console.error('0021: falha ao ajustar geral_lista_importada: ' + err)
    }

    // ---- 2b. Texto visível da origem dos contatos importados ----
    app
      .db()
      .newQuery(
        "UPDATE imported_contacts SET source = 'Lista p&uacute;blica de corretores (importado em ' || " +
          "substr(source, length('Caixa Econômica Federal — credenciados (importado em ') + 1) " +
          "WHERE source LIKE 'Caixa Econômica Federal — credenciados (importado em %'",
      )
      .execute()
  },
  (app) => {
    // Down: remove o template criado (o texto dos contatos permanece ajustado).
    try {
      const r = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'aceite_apresentacao',
      })
      if (r) app.delete(r)
    } catch (_) {}
  },
)
