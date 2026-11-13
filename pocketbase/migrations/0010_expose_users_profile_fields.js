///
/// Torna os campos de perfil do usuário visíveis na API pública (listView/view
/// para o próprio dono e, via migração 0008, para o admin). Sem isso, o painel
/// de usuários do /admin não consegue nem LER e-mail/telefone/CRECI dos demais
/// usuários pela API de records — pois a coleção `users` (auth) esconde campos
/// não-`emailVisibility` de clientes não-superusuário.
///
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')

    // Campos que o admin precisa LER para gerir os usuários.
    const fieldsToExpose = [
      'name',
      'phone',
      'state',
      'city',
      'creci',
      'creci_uf',
      'real_estate',
      'regions',
      'creci_status',
    ]
    for (const name of fieldsToExpose) {
      const field = collection.fields.getByName(name)
      if (field && field.hidden) {
        field.hidden = false
        collection.fields.set(field)
      }
    }

    // O e-mail continua oculto (emailVisibility=false por registro): quem lê
    // e-mail de outro usuário é a rota /backend/v1/appmeulugar/admin/users,
    // que roda com privilégio do app e não depende de emailVisibility.
    app.save(collection)
  },
  (app) => {
    // Down: volta a esconder os campos de perfil.
    const collection = app.findCollectionByNameOrId('users')
    const fieldsToHide = [
      'name',
      'phone',
      'state',
      'city',
      'creci',
      'creci_uf',
      'real_estate',
      'regions',
      'creci_status',
    ]
    for (const name of fieldsToHide) {
      const field = collection.fields.getByName(name)
      if (field && !field.hidden) {
        field.hidden = true
        collection.fields.set(field)
      }
    }
    app.save(collection)
  },
)
