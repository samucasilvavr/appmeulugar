/// <reference path="../pb_data/types.d.ts" />
// 0015 — Carteirinha CRECI (foto) em users.
// O corretor pode anexar a foto da carteirinha no cadastro (JPG/PNG/WEBP, até
// 5 MB). Com a foto anexada o cadastro nasce com creci_status = 'aprovado'
// (acesso imediato) e flag creci_review = true, marcando-o para conferência
// posterior pelo admin no /admin. Sem a foto: 'pendente' (aprovação manual).
// Idempotente: reexecutar não duplica os campos.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    let changed = false
    if (!users.fields.getByName('creci_photo')) {
      users.fields.add(
        new Field({
          name: 'creci_photo',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880, // 5 MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
      changed = true
    }
    if (!users.fields.getByName('creci_review')) {
      users.fields.add(new Field({ name: 'creci_review', type: 'bool' }))
      changed = true
    }
    if (changed) app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    let changed = false
    if (users.fields.getByName('creci_photo')) {
      users.fields.removeByName('creci_photo')
      changed = true
    }
    if (users.fields.getByName('creci_review')) {
      users.fields.removeByName('creci_review')
      changed = true
    }
    if (changed) app.save(users)
  },
)
