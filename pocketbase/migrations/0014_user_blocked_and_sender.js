/// <reference path="../pb_data/types.d.ts" />
// 0014 — Bloqueio de usuários + remetente oficial dos e-mails.
//
// 1. `users.blocked` (bool): usuário bloqueado NÃO consegue logar (hook
//    onRecordAuthRequest em user_admin.pb.js rejeita o token) e, ao ser
//    bloqueado, seus imóveis/demandas são pausados (saem das buscas e do
//    match). Reversível: desbloquear reativa as publicações.
// 2. Remetente dos e-mails transacionais (verificação de e-mail, redefinição
//    de senha etc.) do PocketBase = contato@appmeulugar.com.br. Idempotente.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('blocked')) {
      users.fields.add(
        new BoolField({
          name: 'blocked',
        }),
      )
      app.save(users)
    }

    try {
      const settings = app.settings()
      if (settings.meta.senderAddress !== 'contato@appmeulugar.com.br') {
        settings.meta.senderAddress = 'contato@appmeulugar.com.br'
        settings.meta.senderName = 'AppMeuLugar'
        app.save(settings)
      }
    } catch (err) {
      console.log('0014: settings de remetente não aplicadas: ' + err)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const field = users.fields.getByName('blocked')
    if (field) {
      users.fields.removeByName('blocked')
      app.save(users)
    }
  },
)
