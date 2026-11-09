/// <reference path="../pb_data/types.d.ts" />
// Permite publicar interesse sem cadastro: user_id opcional + campos de contato
// do visitante (nunca exibidos publicamente). Idempotente.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('interests')

    // user_id deixa de ser obrigatório (interesses anônimos)
    const ownerField = col.fields.getByName('user_id')
    if (ownerField) {
      ownerField.required = false
    }

    // Contato mínimo informado pelo visitante (dados privados)
    const hasField = (name) => {
      try {
        return !!col.fields.getByName(name)
      } catch (_) {
        return false
      }
    }
    if (!hasField('contact_name')) {
      col.fields.add(new TextField({ name: 'contact_name', required: false, max: 120 }))
    }
    if (!hasField('contact_email')) {
      col.fields.add(new EmailField({ name: 'contact_email', required: false }))
    }
    if (!hasField('contact_phone')) {
      col.fields.add(new TextField({ name: 'contact_phone', required: false, max: 40 }))
    }

    // Criação pública: autenticado cria para si; visitante cria sem dono
    col.createRule =
      "(@request.auth.id != '' && user_id = @request.auth.id) || (@request.auth.id = '' && user_id = '')"

    // Índice para vinculação por e-mail
    const emailIndex = 'CREATE INDEX idx_interests_contact_email ON interests (contact_email)'
    const alreadyIndexed = (col.indexes || []).some((i) => i.indexOf('contact_email') !== -1)
    if (!alreadyIndexed) {
      col.indexes = [...(col.indexes || []), emailIndex]
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('interests')
    col.createRule = "@request.auth.id != ''"
    try {
      const ownerField = col.fields.getByName('user_id')
      ownerField.required = true
    } catch (_) {}
    for (const name of ['contact_name', 'contact_email', 'contact_phone']) {
      try {
        col.fields.removeByName(name)
      } catch (_) {}
    }
    col.indexes = (col.indexes || []).filter((i) => i.indexOf('contact_email') === -1)
    app.save(col)
  },
)
