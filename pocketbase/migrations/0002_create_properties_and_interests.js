migrate(
  (app) => {
    // 1. properties (Imóveis)
    const properties = new Collection({
      name: 'properties',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text', required: false },
        {
          name: 'purpose',
          type: 'select',
          values: ['comprar', 'alugar'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'property_type',
          type: 'select',
          values: ['apartamento', 'casa', 'cobertura', 'terreno', 'comercial', 'rural'],
          maxSelect: 1,
          required: true,
        },
        { name: 'state', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'neighborhood', type: 'text', required: false },
        { name: 'address', type: 'text', required: false },
        { name: 'hide_exact_address', type: 'bool', required: false },
        { name: 'price', type: 'number', required: false, min: 0 },
        { name: 'condo_fee', type: 'number', required: false, min: 0 },
        { name: 'iptu', type: 'number', required: false, min: 0 },
        { name: 'area', type: 'number', required: false, min: 0 },
        { name: 'bedrooms', type: 'number', required: false, min: 0 },
        { name: 'bathrooms', type: 'number', required: false, min: 0 },
        { name: 'parking_spaces', type: 'number', required: false, min: 0 },
        { name: 'features', type: 'json', required: false },
        {
          name: 'images',
          type: 'file',
          maxSelect: 10,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          required: false,
        },
        { name: 'photos_urls', type: 'json', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'pausado', 'encerrado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_props_city_state ON properties (state, city)',
        'CREATE INDEX idx_props_purpose ON properties (purpose)',
        'CREATE INDEX idx_props_status ON properties (status)',
      ],
    })
    app.save(properties)

    // 2. interests (Interesses / Demandas de compra ou aluguel)
    const interests = new Collection({
      name: 'interests',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'title', type: 'text', required: true },
        {
          name: 'purpose',
          type: 'select',
          values: ['comprar', 'alugar'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'property_type',
          type: 'select',
          values: ['apartamento', 'casa', 'cobertura', 'terreno', 'comercial', 'rural'],
          maxSelect: 1,
          required: true,
        },
        { name: 'state', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'neighborhoods', type: 'text', required: false },
        { name: 'min_price', type: 'number', required: false, min: 0 },
        { name: 'max_price', type: 'number', required: false, min: 0 },
        { name: 'min_bedrooms', type: 'number', required: false, min: 0 },
        { name: 'min_bathrooms', type: 'number', required: false, min: 0 },
        { name: 'min_parking_spaces', type: 'number', required: false, min: 0 },
        { name: 'min_area', type: 'number', required: false, min: 0 },
        { name: 'preferences', type: 'json', required: false },
        { name: 'notes', type: 'text', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'pausado', 'encerrado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_interests_city_state ON interests (state, city)',
        'CREATE INDEX idx_interests_purpose ON interests (purpose)',
        'CREATE INDEX idx_interests_status ON interests (status)',
      ],
    })
    app.save(interests)
  },
  (app) => {
    try {
      const interests = app.findCollectionByNameOrId('interests')
      app.delete(interests)
    } catch (_) {}
    try {
      const properties = app.findCollectionByNameOrId('properties')
      app.delete(properties)
    } catch (_) {}
  },
)
