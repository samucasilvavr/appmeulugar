/// <reference path="../pb_data/types.d.ts" />
// 0024 — Template editável 'nova_apresentacao' (aba E-mails do /admin) e opção
// 'nova_apresentacao' no select notification_logs.notification_type.
//
// E-mail ao INTERESSADO quando um corretor envia uma apresentação para a
// demanda dele (hook presentation_created_email.pb.js). Idempotente: cria
// apenas se o slug ainda não existir (não pisa a edição do admin depois).
// Placeholder do botão: [link-ver-apresentacao] → /painel-interessado.
migrate(
  (app) => {
    // ---- 0. Opção 'nova_apresentacao' no select notification_type ----
    try {
      const logs = app.findCollectionByNameOrId('notification_logs')
      const field = logs.fields.getByName('notification_type')
      let values = []
      try {
        values = JSON.parse(JSON.stringify(field.get('values') || []))
      } catch (_) {
        values = []
      }
      if (!values || !values.length) {
        values = [
          'match_demanda',
          'apresentacao_recebida',
          'apresentacao_aceita',
          'mensagem_chat',
          'geral',
        ]
      }
      if (values.indexOf('nova_apresentacao') === -1) {
        values.push('nova_apresentacao')
        field.set('values', values)
        app.save(logs)
      }
    } catch (err) {
      console.error('0024: falha ao ampliar notification_type: ' + err)
    }

    let existing
    try {
      // JSVM: findFirstRecordByFilter(collection, filter, params) — sem extras.
      existing = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'nova_apresentacao',
      })
    } catch (_) {
      existing = null
    }
    if (!existing) {
      const templates = app.findCollectionByNameOrId('email_templates')
      const r = new Record(templates)
      r.set('slug', 'nova_apresentacao')
      r.set('title', 'Nova apresentação recebida — interessado')
      r.set(
        'description',
        'Enviado ao interessado quando um corretor envia uma apresentação para a demanda dele.',
      )
      r.set('subject', 'Você recebeu uma nova apresentação no AppMeuLugar')
      r.set(
        'body_html',
        '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
          '<p>Ol&aacute;, [nome-interessado].</p>' +
          '<p>Boa not&iacute;cia: o corretor <strong>[nome-corretor]</strong> apresentou um im&oacute;vel ' +
          'para a sua demanda <strong>[demanda]</strong> ([tipo] para [finalidade] em [cidade]).</p>' +
          '<p>A apresenta&ccedil;&atilde;o est&aacute; aguardando a sua resposta no painel do interessado ' +
          '&mdash; voc&ecirc; analisa com calma e s&oacute; abre contato se gostar.</p>' +
          '[link-ver-apresentacao]' +
          '<p style="font-size:12px;color:#6b7280;">Voc&ecirc; recebeu este e-mail porque publicou uma ' +
          'demanda no AppMeuLugar. ' +
          '<a href="[link-descadastrar]">N&atilde;o quer mais receber?</a></p>' +
          '</div>',
      )
      r.set(
        'variables',
        '[nome-interessado], [nome-corretor], [demanda], [tipo], [finalidade], [cidade], [link-ver-apresentacao], [link-descadastrar]',
      )
      app.save(r)
    }
  },
  (app) => {
    // Down: remove o template criado.
    try {
      const r = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'nova_apresentacao',
      })
      if (r) app.delete(r)
    } catch (_) {}
  },
)
