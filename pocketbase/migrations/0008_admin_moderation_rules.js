/// <reference path="../pb_data/types.d.ts" />
// Permite que o ADMINISTREADOR autenticado (profile = 'admin') atualize
// registros de users, properties e interests pelo painel /admin.
//
// Contexto: o update de users era "id = @request.auth.id" — só o próprio dono
// podia se editar, então o admin não conseguia aprovar/rejeitar o CRECI de um
// corretor (erro "Erro ao atualizar CRECI"). O mesmo vale para a moderação de
// imóveis e demandas (properties/intersts: apenas o dono podia alterar).
//
// Regra de segurança: o admin só pode tocar em campos de moderação
// (creci_status, status); NUNCA em profile (não pode se promover nem promover
// ninguém) e nunca nos campos de credenciais. Idempotente.
migrate(
  (app) => {
    // --- users: dono edita a si mesmo, admin edita campos de moderação ---
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.updateRule =
      "(id = @request.auth.id && @request.body.profile:changed = false && @request.body.creci_status:changed = false) || (@request.auth.profile = 'admin' && @request.body.profile:changed = false)"
    app.save(users)

    // --- properties: dono edita as suas, admin só o status (moderação) ---
    const properties = app.findCollectionByNameOrId('properties')
    properties.updateRule =
      "(user_id = @request.auth.id && @request.body.status:changed = false) || (@request.auth.profile = 'admin' && @request.body.user_id:changed = false)"
    app.save(properties)

    // --- interests: dono edita os seus, admin só o status (moderação) ---
    const interests = app.findCollectionByNameOrId('interests')
    interests.updateRule =
      "(user_id = @request.auth.id && @request.body.status:changed = false) || (@request.auth.profile = 'admin' && @request.body.user_id:changed = false)"
    app.save(interests)
  },
  (app) => {
    // Reverte para as regras anteriores às moderações.
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.updateRule = 'id = @request.auth.id'
    app.save(users)

    const properties = app.findCollectionByNameOrId('properties')
    properties.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(properties)

    const interests = app.findCollectionByNameOrId('interests')
    interests.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(interests)
  },
)
