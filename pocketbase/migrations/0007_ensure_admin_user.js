/// <reference path="../pb_data/types.d.ts" />
// Garante o usuário administrador samuca.silva.vr@gmail.com no banco ativo,
// com perfil admin, e-mail verificado e senha Skip@Pass.
//
// Contexto: a 0004 só criava o admin "se não existisse". No banco alvo a
// coleção users estava VAZIA (seeds nunca aplicados), então o login falhava.
// Idempotente: cria o admin se não existir; se existir, apenas regrava
// perfil/verified/senha — nunca duplica (busca por e-mail).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let admin = null
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'samuca.silva.vr@gmail.com')
    } catch (_) {
      admin = null
    }

    const isNew = !admin
    if (isNew) {
      admin = new Record(users)
      admin.setEmail('samuca.silva.vr@gmail.com')
      admin.setPassword('Skip@Pass')
      admin.set('name', 'Samuel Silva (Admin)')
      admin.set('profile', 'admin')
      admin.set('phone', '(11) 98765-4321')
      admin.set('state', 'SP')
      admin.set('city', 'São Paulo')
      admin.set('creci', '99999-F')
      admin.set('creci_uf', 'SP')
      admin.set('creci_status', 'aprovado')
    }

    admin.setPassword('Skip@Pass')
    admin.setVerified(true)
    admin.set('profile', 'admin')
    app.save(admin)

    console.log(
      '0007: admin samuca.silva.vr@gmail.com garantido (id=' + admin.id + ', novo=' + isNew + ')',
    )
  },
  (app) => {
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'samuca.silva.vr@gmail.com')
      app.delete(admin)
    } catch (_) {}
  },
)
