/// <reference path="../pb_data/types.d.ts" />
// 0012 — LGPD e templates de e-mail editáveis.
//
// 1. Coleção `email_templates`: guarda assunto + corpo (HTML) dos e-mails
//    transacionais de notificação de interesse. Corpo é suportado por `body_html`
//    (editável no admin). Variáveis [cidade], [tipo], [quartos], [valor],
//    [link-demanda], [link-descadastrar] etc. são substituídas no envio.
//    Regras: leitura/escrita apenas para o admin do app; o envio roda em hooks
//    com privilégio do app e não depende destas regras.
// 2. `imported_contacts`: bloqueio de descadastro em nível de coleção —
//    descadastrado não volta a receber por engano e ganha dedupe por e-mail
//    (uniq) via UNIQUE index. Idempotente.
migrate(
  (app) => {
    // ---- 1. Coleção email_templates ----
    let templates
    try {
      templates = app.findCollectionByNameOrId('email_templates')
    } catch (_) {
      templates = new Collection({
        name: 'email_templates',
        listRule: "@request.auth.profile = 'admin'",
        viewRule: "@request.auth.profile = 'admin'",
        createRule: "@request.auth.profile = 'admin'",
        updateRule: "@request.auth.profile = 'admin'",
        deleteRule: "@request.auth.profile = 'admin'",
        fields: [
          { name: 'slug', type: 'text', required: true, min: 2, max: 100 },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'description', type: 'text', max: 500 },
          { name: 'subject', type: 'text', required: true, max: 300 },
          { name: 'body_html', type: 'text', required: true },
          { name: 'variables', type: 'text', max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_email_templates_slug ON email_templates (slug)'],
      })
      app.save(templates)
    }

    // ---- 2. imported_contacts: dedupe + bloqueio de descadastro ----
    const contacts = app.findCollectionByNameOrId('imported_contacts')

    // Descadastro: regra da coleção impede o contato de se READMITIR sozinho.
    // O admin continua podendo READMITIR (status autorizado) via update da coleção.
    contacts.updateRule =
      "@request.auth.profile = 'admin' || " +
      "(authorization_status != 'descadastrado' && @request.body.authorization_status:changed = false)"

    // Dedupe por e-mail: mantém o registro mais antigo quando houver duplicados.
    app
      .db()
      .newQuery(
        "DELETE FROM imported_contacts WHERE email IS NOT NULL AND email != '' AND id NOT IN (" +
          "SELECT MIN(id) FROM imported_contacts WHERE email IS NOT NULL AND email != '' GROUP BY lower(email))",
      )
      .execute()

    contacts.addIndex('idx_imported_contacts_email', true, 'lower(email)', '')
    app.save(contacts)

    // ---- 3. Sementes dos dois templates de interesse (idempotente) ----
    const seedTemplates = [
      {
        slug: 'match_corretor',
        title: 'Interesse com imóvel compatível — corretor cadastrado',
        description:
          'Enviado a corretores CADASTRADOS com imóvel compatível quando uma demanda é publicada.',
        subject: 'Novo interessado procurando imóvel em [cidade]',
        body_html:
          '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
          '<p>Ol&aacute;, [nome].</p>' +
          '<p>Uma pessoa est&aacute; procurando [tipo] para [finalidade] em [cidade], com ' +
          '[quartos] quarto(s) ou mais, at&eacute; [valor].</p>' +
          '<p>Voc&ecirc; possui um im&oacute;vel compat&iacute;vel com essa busca. Acesse o AppMeuLugar ' +
          'para conhecer essa oportunidade e enviar sua apresenta&ccedil;&atilde;o.</p>' +
          '[link-demanda]' +
          '<p style="font-size:12px;color:#6b7280;">Voc&ecirc; recebeu este e-mail porque &eacute; ' +
          'corretor cadastrado no AppMeuLugar. ' +
          '<a href="[link-descadastrar]">N&atilde;o quer mais receber?</a></p>' +
          '</div>',
        variables:
          '[nome], [tipo], [finalidade], [cidade], [quartos], [valor], [link-demanda], [link-descadastrar]',
      },
      {
        slug: 'geral_lista_importada',
        title: 'Novo interesse publicado — lista importada (sem match)',
        description:
          'Enviado aos contatos da LISTA IMPORTADA quando não há imóvel compatível cadastrado.',
        subject: 'Novo interesse de imóvel publicado em [estado]',
        body_html:
          '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
          '<p>Ol&aacute;, [nome].</p>' +
          '<p>Houve um novo interesse de im&oacute;vel publicado em [estado]: ' +
          '[tipo] para [finalidade] em [cidade], com [quartos] quarto(s) ou mais, ' +
          'at&eacute; [valor].</p>' +
          '<p>Vale saber: n&atilde;o temos seus dados cadastrais &mdash; este envio foi feito com base ' +
          'em lista p&uacute;blica de corretores credenciados da Caixa Econ&ocirc;mica Federal.</p>' +
          '<p>Veja as demandas publicadas na p&aacute;gina p&uacute;blica do AppMeuLugar.</p>' +
          '[link-demanda]' +
          '<p>Para n&atilde;o receber mais estes avisos, &eacute; simples: responda este e-mail ' +
          'solicitando o descadastro, escreva para contato@appmeulugar.com.br ou use o bot&atilde;o ' +
          'abaixo.</p>' +
          '[link-descadastrar]' +
          '<p style="font-size:12px;color:#6b7280;">AppMeuLugar &mdash; o im&oacute;vel certo encontra voc&ecirc;.</p>' +
          '</div>',
        variables:
          '[nome], [estado], [tipo], [finalidade], [cidade], [quartos], [valor], [link-demanda], [link-descadastrar]',
      },
    ]
    for (const t of seedTemplates) {
      let existing
      try {
        existing = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', '', 1, 0, {
          slug: t.slug,
        })
      } catch (_) {
        existing = null
      }
      if (existing) {
        // Reaplica defaults apenas se o campo estiver vazio (não pisa edição do admin).
        if (!existing.getString('subject')) existing.set('subject', t.subject)
        if (!existing.getString('body_html')) existing.set('body_html', t.body_html)
        app.save(existing)
      } else {
        const r = new Record(templates)
        r.set('slug', t.slug)
        r.set('title', t.title)
        r.set('description', t.description)
        r.set('subject', t.subject)
        r.set('body_html', t.body_html)
        r.set('variables', t.variables)
        app.save(r)
      }
    }
  },
  (app) => {
    // Down: remove a coleção e o índice de dedupe.
    try {
      const collection = app.findCollectionByNameOrId('email_templates')
      app.delete(collection)
    } catch (_) {}

    try {
      const contacts = app.findCollectionByNameOrId('imported_contacts')
      contacts.removeIndex('idx_imported_contacts_email')
      contacts.updateRule = ''
      app.save(contacts)
    } catch (_) {}
  },
)
