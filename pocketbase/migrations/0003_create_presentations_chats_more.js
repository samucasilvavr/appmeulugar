migrate(
  (app) => {
    const propertiesCol = app.findCollectionByNameOrId('properties')
    const interestsCol = app.findCollectionByNameOrId('interests')

    // 3. presentations (Apresentações de corretores para uma demanda)
    const presentations = new Collection({
      name: 'presentations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (broker_id = @request.auth.id || interest_owner_id = @request.auth.id)",
      deleteRule: "@request.auth.id != '' && broker_id = @request.auth.id",
      fields: [
        {
          name: 'interest_id',
          type: 'relation',
          collectionId: interestsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'interest_owner_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'property_id',
          type: 'relation',
          collectionId: propertiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'broker_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'message', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'aceita', 'recusada', 'expirada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'rejection_reason', type: 'text', required: false },
        { name: 'responded_at', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pres_interest ON presentations (interest_id)',
        'CREATE INDEX idx_pres_broker ON presentations (broker_id)',
        'CREATE INDEX idx_pres_status ON presentations (status)',
      ],
    })
    app.save(presentations)

    const presentationsCol = app.findCollectionByNameOrId('presentations')

    // 4. chats (Conversas internas abertas após aceite)
    const chats = new Collection({
      name: 'chats',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (buyer_id = @request.auth.id || broker_id = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (buyer_id = @request.auth.id || broker_id = @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (buyer_id = @request.auth.id || broker_id = @request.auth.id)",
      deleteRule:
        "@request.auth.id != '' && (buyer_id = @request.auth.id || broker_id = @request.auth.id)",
      fields: [
        {
          name: 'presentation_id',
          type: 'relation',
          collectionId: presentationsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'interest_id',
          type: 'relation',
          collectionId: interestsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'property_id',
          type: 'relation',
          collectionId: propertiesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'buyer_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'broker_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'share_contact', type: 'bool', required: false },
        { name: 'last_message', type: 'text', required: false },
        { name: 'last_message_time', type: 'date', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'arquivado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_chats_buyer ON chats (buyer_id)',
        'CREATE INDEX idx_chats_broker ON chats (broker_id)',
      ],
    })
    app.save(chats)

    const chatsCol = app.findCollectionByNameOrId('chats')

    // 5. messages (Mensagens do chat)
    const messages = new Collection({
      name: 'messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && sender_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && sender_id = @request.auth.id",
      fields: [
        {
          name: 'chat_id',
          type: 'relation',
          collectionId: chatsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'sender_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'text', type: 'text', required: true },
        { name: 'is_read', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_msgs_chat ON messages (chat_id, created ASC)'],
    })
    app.save(messages)

    // 6. favorites (Favoritos do interessado)
    const favorites = new Collection({
      name: 'favorites',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
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
        {
          name: 'property_id',
          type: 'relation',
          collectionId: propertiesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_fav_user_prop ON favorites (user_id, property_id)'],
    })
    app.save(favorites)

    // 7. imported_contacts (Contatos importados CSV/XLSX pela administração)
    const importedContacts = new Collection({
      name: 'imported_contacts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text', required: false },
        { name: 'state', type: 'text', required: false },
        { name: 'city', type: 'text', required: false },
        { name: 'creci', type: 'text', required: false },
        { name: 'source', type: 'text', required: false },
        {
          name: 'authorization_status',
          type: 'select',
          values: ['autorizado', 'pendente', 'descadastrado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(importedContacts)

    // 8. notification_logs (Registros de notificações, envios, falhas e descadastros)
    const notificationLogs = new Collection({
      name: 'notification_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'recipient_email', type: 'email', required: true },
        { name: 'recipient_name', type: 'text', required: false },
        {
          name: 'recipient_type',
          type: 'select',
          values: ['corretor', 'interessado', 'contato_importado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'subject', type: 'text', required: true },
        {
          name: 'notification_type',
          type: 'select',
          values: [
            'match_demanda',
            'apresentacao_recebida',
            'apresentacao_aceita',
            'mensagem_chat',
            'geral',
          ],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['enviado', 'falha', 'descadastrado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'details', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(notificationLogs)
  },
  (app) => {
    const toDelete = [
      'notification_logs',
      'imported_contacts',
      'favorites',
      'messages',
      'chats',
      'presentations',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
