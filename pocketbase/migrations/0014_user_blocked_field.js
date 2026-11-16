/// <reference path="../pb_data/types.d.ts" />
// 0014 — LGPD/admin: campo `blocked` em users.
// Bloqueio reversível imposto pelo admin em /admin (botões Bloquear/Desbloquear).
// Efeitos (ver pocketbase/hooks/blocked_users.pb.js):
//  - login e refresh de token recusados (OnRecordAuthRequest)
//  - usuário bloqueado não recebe e-mails transacionais
//  - imóveis/demandas do bloqueado continuam existindo, mas o hook de e-mails
//    e as consultas de match filtram pelo campo.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('blocked')) {
      users.fields.add(new Field({ type: 'bool', name: 'blocked' }))
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const f = users.fields.getByName('blocked')
    if (f) {
      users.fields.removeByName('blocked')
      app.save(users)
    }
  },
)
