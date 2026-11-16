/// <reference path="../pb_data/types.d.ts" />
// 0013 — Campo de descadastro de notificações para usuários cadastrados.
//
// `users.optout_notifications` (bool): quando true, o corretor cadastrado não
// recebe mais os e-mails de "novo interesse" (hook interest_notifications).
// É escrito APENAS pela rota pública de descadastro
// (/backend/v1/appmeulugar/optout) e pelo admin — oculto da API de records.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('optout_notifications')) {
      users.fields.add(
        new BoolField({
          name: 'optout_notifications',
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const field = users.fields.getByName('optout_notifications')
    if (field) {
      users.fields.removeByName('optout_notifications')
      app.save(users)
    }
  },
)
