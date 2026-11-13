/// <reference path="../pb_data/types.d.ts" />
// Endurece as regras do fluxo "interesse sem cadastro":
// - criação SEMPRE exige dono: autenticado cria para si (o visitante anônimo
//   entra pelo hook onRecordCreate de interests, que só aceita interesse com
//   nome + contato e sem dono);
// - update/delete continuam restritos ao dono autenticado;
// - mantém o interesse público em list/view (cards não expõem contato —
//   o hook interests.pb.js oculta os campos contact_* na serialização).
// Idempotente.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('interests')
    col.createRule = 'user_id = @request.auth.id'
    col.updateRule = 'user_id = @request.auth.id'
    col.deleteRule = 'user_id = @request.auth.id'
    col.listRule = ''
    col.viewRule = ''
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('interests')
    col.createRule =
      "(@request.auth.id != '' && user_id = @request.auth.id) || (@request.auth.id = '' && user_id = '')"
    col.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.listRule = ''
    col.viewRule = ''
    app.save(col)
  },
)
