migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Extend users fields: profile, phone, state, city, creci, creci_uf, real_estate, regions, creci_status
    if (!users.fields.getByName('profile')) {
      users.fields.add(
        new SelectField({
          name: 'profile',
          values: ['interessado', 'corretor', 'admin'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('phone')) {
      users.fields.add(new TextField({ name: 'phone', required: false }))
    }

    if (!users.fields.getByName('state')) {
      users.fields.add(new TextField({ name: 'state', required: false }))
    }

    if (!users.fields.getByName('city')) {
      users.fields.add(new TextField({ name: 'city', required: false }))
    }

    if (!users.fields.getByName('creci')) {
      users.fields.add(new TextField({ name: 'creci', required: false }))
    }

    if (!users.fields.getByName('creci_uf')) {
      users.fields.add(new TextField({ name: 'creci_uf', required: false }))
    }

    if (!users.fields.getByName('real_estate')) {
      users.fields.add(new TextField({ name: 'real_estate', required: false }))
    }

    if (!users.fields.getByName('regions')) {
      users.fields.add(new TextField({ name: 'regions', required: false }))
    }

    if (!users.fields.getByName('creci_status')) {
      users.fields.add(
        new SelectField({
          name: 'creci_status',
          values: ['pendente', 'aprovado', 'rejeitado'],
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // Adjust rules so users can read other users for chats and broker info
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != '' || creci != ''"
    users.updateRule = 'id = @request.auth.id'

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const fieldNames = [
      'profile',
      'phone',
      'state',
      'city',
      'creci',
      'creci_uf',
      'real_estate',
      'regions',
      'creci_status',
    ]
    for (const name of fieldNames) {
      const field = users.fields.getByName(name)
      if (field) users.fields.removeByName(name)
    }
    app.save(users)
  },
)
