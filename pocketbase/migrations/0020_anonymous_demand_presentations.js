/// <reference path="../pb_data/types.d.ts" />
// 0020: demandas anônimas (migração 0005, user_id vazio) não têm dono — o campo
// interest_owner_id de presentations deixa de ser obrigatório. Era a causa do
// "Failed to create record." no painel do corretor: o cliente enviava
// interest_owner_id = '' (demanda "Procuro Casa na Asa Sul") em uma relação
// required. O hook presentation_create.pb.js resolve o dono no servidor
// (interest.user_id ou vínculo por contact_email) e o deixa vazio quando a
// demanda é anônima sem conta correspondente. Idempotente.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('presentations')
    const field = col.fields.getByName('interest_owner_id')
    if (field) {
      field.required = false
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('presentations')
    const field = col.fields.getByName('interest_owner_id')
    if (field) {
      field.required = true
      app.save(col)
    }
  },
)
