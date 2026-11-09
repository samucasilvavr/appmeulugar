migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const propertiesCol = app.findCollectionByNameOrId('properties')
    const interestsCol = app.findCollectionByNameOrId('interests')
    const presentationsCol = app.findCollectionByNameOrId('presentations')
    const chatsCol = app.findCollectionByNameOrId('chats')
    const messagesCol = app.findCollectionByNameOrId('messages')

    // 1. Seed Admin user (samuca.silva.vr@gmail.com)
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'samuca.silva.vr@gmail.com')
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('samuca.silva.vr@gmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Samuel Silva (Admin)')
      adminUser.set('profile', 'admin')
      adminUser.set('phone', '(11) 98765-4321')
      adminUser.set('state', 'SP')
      adminUser.set('city', 'São Paulo')
      adminUser.set('creci', '99999-F')
      adminUser.set('creci_uf', 'SP')
      adminUser.set('creci_status', 'aprovado')
      app.save(adminUser)
    }

    // 2. Seed Broker user (corretor)
    let brokerUser
    try {
      brokerUser = app.findAuthRecordByEmail('_pb_users_auth_', 'corretor.carlos@meulugar.com.br')
    } catch (_) {
      brokerUser = new Record(users)
      brokerUser.setEmail('corretor.carlos@meulugar.com.br')
      brokerUser.setPassword('Skip@Pass')
      brokerUser.setVerified(true)
      brokerUser.set('name', 'Carlos Eduardo Mendes')
      brokerUser.set('profile', 'corretor')
      brokerUser.set('phone', '(11) 97123-4567')
      brokerUser.set('state', 'SP')
      brokerUser.set('city', 'São Paulo')
      brokerUser.set('creci', '123456-F')
      brokerUser.set('creci_uf', 'SP')
      brokerUser.set('real_estate', 'Mendes Imóveis Prime')
      brokerUser.set('regions', 'Pinheiros, Vila Madalena, Perdizes, Jardins')
      brokerUser.set('creci_status', 'aprovado')
      app.save(brokerUser)
    }

    // 3. Seed Buyer user (interessado)
    let buyerUser
    try {
      buyerUser = app.findAuthRecordByEmail('_pb_users_auth_', 'mariana.costa@gmail.com')
    } catch (_) {
      buyerUser = new Record(users)
      buyerUser.setEmail('mariana.costa@gmail.com')
      buyerUser.setPassword('Skip@Pass')
      buyerUser.setVerified(true)
      buyerUser.set('name', 'Mariana Costa')
      buyerUser.set('profile', 'interessado')
      buyerUser.set('phone', '(11) 98888-1122')
      buyerUser.set('state', 'SP')
      buyerUser.set('city', 'São Paulo')
      app.save(buyerUser)
    }

    // 4. Seed Properties
    const prop1 = new Record(propertiesCol)
    prop1.set('user_id', brokerUser.id)
    prop1.set('title', 'Apartamento moderno em Pinheiros com varanda gourmet')
    prop1.set(
      'description',
      'Apartamento de alto padrão, reformado recentemente com acabamentos de primeira linha, varanda envidraçada integrada à sala, 2 suítes e cozinha planejada.',
    )
    prop1.set('purpose', 'comprar')
    prop1.set('property_type', 'apartamento')
    prop1.set('state', 'SP')
    prop1.set('city', 'São Paulo')
    prop1.set('neighborhood', 'Pinheiros')
    prop1.set('address', 'Rua dos Pinheiros, 850')
    prop1.set('hide_exact_address', true)
    prop1.set('price', 890000)
    prop1.set('condo_fee', 850)
    prop1.set('iptu', 220)
    prop1.set('area', 82)
    prop1.set('bedrooms', 2)
    prop1.set('bathrooms', 2)
    prop1.set('parking_spaces', 1)
    prop1.set(
      'features',
      JSON.stringify([
        'Varanda Gourmet',
        'Piscina',
        'Academia',
        'Pet Friendly',
        'Ar-condicionado',
        'Elevador',
      ]),
    )
    prop1.set(
      'photos_urls',
      JSON.stringify([
        'https://img.usecurling.com/p/800/600?q=apartment%20living%20room&color=blue',
        'https://img.usecurling.com/p/800/600?q=modern%20kitchen&color=gray',
        'https://img.usecurling.com/p/800/600?q=balcony%20view&color=white',
      ]),
    )
    prop1.set('status', 'ativo')
    app.save(prop1)

    const prop2 = new Record(propertiesCol)
    prop2.set('user_id', brokerUser.id)
    prop2.set('title', 'Casa charmosa e ensolarada em Perdizes com quintal')
    prop2.set(
      'description',
      'Excelente casa residencial em rua tranquila e arborizada. Quintal espaçoso com churrasqueira, 3 dormitórios sendo 1 suíte, 2 vagas de garagem.',
    )
    prop2.set('purpose', 'comprar')
    prop2.set('property_type', 'casa')
    prop2.set('state', 'SP')
    prop2.set('city', 'São Paulo')
    prop2.set('neighborhood', 'Perdizes')
    prop2.set('address', 'Rua Doutor Homem de Melo')
    prop2.set('hide_exact_address', false)
    prop2.set('price', 1250000)
    prop2.set('condo_fee', 0)
    prop2.set('iptu', 380)
    prop2.set('area', 165)
    prop2.set('bedrooms', 3)
    prop2.set('bathrooms', 3)
    prop2.set('parking_spaces', 2)
    prop2.set(
      'features',
      JSON.stringify([
        'Churrasqueira',
        'Quintal',
        'Armários Embutidos',
        'Rua Tranquila',
        'Portão Eletrônico',
      ]),
    )
    prop2.set(
      'photos_urls',
      JSON.stringify([
        'https://img.usecurling.com/p/800/600?q=house%20facade&color=green',
        'https://img.usecurling.com/p/800/600?q=house%20backyard&color=yellow',
        'https://img.usecurling.com/p/800/600?q=bedroom%20cozy&color=white',
      ]),
    )
    prop2.set('status', 'ativo')
    app.save(prop2)

    const prop3 = new Record(propertiesCol)
    prop3.set('user_id', brokerUser.id)
    prop3.set('title', 'Studio decorado para locação na Vila Madalena')
    prop3.set(
      'description',
      'Studio totalmente mobiliado e decorado, ao lado da estação de metrô Vila Madalena. Condomínio com lazer completo no rooftop, lavanderia e coworking.',
    )
    prop3.set('purpose', 'alugar')
    prop3.set('property_type', 'apartamento')
    prop3.set('state', 'SP')
    prop3.set('city', 'São Paulo')
    prop3.set('neighborhood', 'Vila Madalena')
    prop3.set('price', 3800)
    prop3.set('condo_fee', 580)
    prop3.set('iptu', 110)
    prop3.set('area', 38)
    prop3.set('bedrooms', 1)
    prop3.set('bathrooms', 1)
    prop3.set('parking_spaces', 0)
    prop3.set(
      'features',
      JSON.stringify([
        'Mobiliado',
        'Rooftop',
        'Piscina',
        'Coworking',
        'Lavanderia Coletiva',
        'Próximo ao Metrô',
      ]),
    )
    prop3.set(
      'photos_urls',
      JSON.stringify([
        'https://img.usecurling.com/p/800/600?q=studio%20apartment&color=orange',
        'https://img.usecurling.com/p/800/600?q=modern%20bathroom&color=gray',
      ]),
    )
    prop3.set('status', 'ativo')
    app.save(prop3)

    // 5. Seed Interests (Demandas da Mariana e outras)
    const interest1 = new Record(interestsCol)
    interest1.set('user_id', buyerUser.id)
    interest1.set('title', 'Procuro apartamento de 2 ou 3 quartos em Pinheiros ou Perdizes')
    interest1.set('purpose', 'comprar')
    interest1.set('property_type', 'apartamento')
    interest1.set('state', 'SP')
    interest1.set('city', 'São Paulo')
    interest1.set('neighborhoods', 'Pinheiros, Perdizes, Vila Madalena')
    interest1.set('min_price', 700000)
    interest1.set('max_price', 950000)
    interest1.set('min_bedrooms', 2)
    interest1.set('min_bathrooms', 1)
    interest1.set('min_parking_spaces', 1)
    interest1.set('min_area', 70)
    interest1.set('preferences', JSON.stringify(['Varanda', 'Piscina', 'Elevador', 'Andar Alto']))
    interest1.set(
      'notes',
      'Tenho carta de crédito aprovada para compra à vista/financiamento rápido. Busco imóvel pronto para morar.',
    )
    interest1.set('status', 'ativo')
    app.save(interest1)

    const interest2 = new Record(interestsCol)
    interest2.set('user_id', buyerUser.id)
    interest2.set('title', 'Aluguel de studio ou 1 dormitório perto de metrô na Zona Oeste')
    interest2.set('purpose', 'alugar')
    interest2.set('property_type', 'apartamento')
    interest2.set('state', 'SP')
    interest2.set('city', 'São Paulo')
    interest2.set('neighborhoods', 'Pinheiros, Vila Madalena')
    interest2.set('min_price', 2500)
    interest2.set('max_price', 4200)
    interest2.set('min_bedrooms', 1)
    interest2.set('min_bathrooms', 1)
    interest2.set('min_parking_spaces', 0)
    interest2.set('min_area', 30)
    interest2.set('preferences', JSON.stringify(['Mobiliado', 'Próximo ao Metrô']))
    interest2.set('notes', 'Início da locação previsto para o próximo mês.')
    interest2.set('status', 'ativo')
    app.save(interest2)

    // 6. Seed Presentation (Corretor Carlos apresentou prop1 para interest1)
    const presentation = new Record(presentationsCol)
    presentation.set('interest_id', interest1.id)
    presentation.set('interest_owner_id', buyerUser.id)
    presentation.set('property_id', prop1.id)
    presentation.set('broker_id', brokerUser.id)
    presentation.set(
      'message',
      'Olá Mariana! Vi seu interesse e tenho este apartamento exatamente com o perfil que procura em Pinheiros: 82m², 2 suítes, varanda gourmet e lazer completo.',
    )
    presentation.set('status', 'aceita')
    app.save(presentation)

    // 7. Seed Chat (aberto após aceite)
    const chat = new Record(chatsCol)
    chat.set('presentation_id', presentation.id)
    chat.set('interest_id', interest1.id)
    chat.set('property_id', prop1.id)
    chat.set('buyer_id', buyerUser.id)
    chat.set('broker_id', brokerUser.id)
    chat.set('share_contact', true)
    chat.set('last_message', 'Perfeito Carlos! Podemos agendar a visita no sábado de manhã?')
    chat.set('status', 'ativo')
    app.save(chat)

    // 8. Seed Messages
    const msg1 = new Record(messagesCol)
    msg1.set('chat_id', chat.id)
    msg1.set('sender_id', brokerUser.id)
    msg1.set(
      'text',
      'Olá Mariana! Obrigado por aceitar a apresentação. Estou à disposição para tirar qualquer dúvida sobre o imóvel ou agendar uma visita!',
    )
    app.save(msg1)

    const msg2 = new Record(messagesCol)
    msg2.set('chat_id', chat.id)
    msg2.set('sender_id', buyerUser.id)
    msg2.set('text', 'Olá Carlos! Achei o imóvel lindo. O condomínio aceita pets grandes?')
    app.save(msg2)

    const msg3 = new Record(messagesCol)
    msg3.set('chat_id', chat.id)
    msg3.set('sender_id', brokerUser.id)
    msg3.set('text', 'Sim, é totalmente pet friendly e conta até com espaço pet no térreo!')
    app.save(msg3)

    const msg4 = new Record(messagesCol)
    msg4.set('chat_id', chat.id)
    msg4.set('sender_id', buyerUser.id)
    msg4.set('text', 'Perfeito Carlos! Podemos agendar a visita no sábado de manhã?')
    app.save(msg4)

    // 9. Seed Imported Contacts
    const importedContactsCol = app.findCollectionByNameOrId('imported_contacts')
    const contacts = [
      {
        name: 'Ana Paula Ferreira',
        email: 'anapaula.imoveis@sp.com.br',
        phone: '(11) 98111-2233',
        state: 'SP',
        city: 'São Paulo',
        creci: '145230-F',
        source: 'Creci SP Encontro 2024',
        authorization_status: 'autorizado',
      },
      {
        name: 'Roberto Alencar',
        email: 'roberto.alencar@rjbrokers.com',
        phone: '(21) 99222-3344',
        state: 'RJ',
        city: 'Rio de Janeiro',
        creci: '052311-F',
        source: 'Importação Feirão RJ',
        authorization_status: 'autorizado',
      },
      {
        name: 'Juliana Silveira',
        email: 'juliana.broker@sulimoveis.com.br',
        phone: '(41) 97333-4455',
        state: 'PR',
        city: 'Curitiba',
        creci: '028912-F',
        source: 'Lista Parceiros PR',
        authorization_status: 'pendente',
      },
    ]
    for (const c of contacts) {
      const r = new Record(importedContactsCol)
      r.set('name', c.name)
      r.set('email', c.email)
      r.set('phone', c.phone)
      r.set('state', c.state)
      r.set('city', c.city)
      r.set('creci', c.creci)
      r.set('source', c.source)
      r.set('authorization_status', c.authorization_status)
      app.save(r)
    }

    // 10. Seed Notification Logs
    const notificationLogsCol = app.findCollectionByNameOrId('notification_logs')
    const logs = [
      {
        recipient_email: 'corretor.carlos@meulugar.com.br',
        recipient_name: 'Carlos Eduardo Mendes',
        recipient_type: 'corretor',
        subject: 'Nova demanda compatível: Apartamento em Pinheiros',
        notification_type: 'match_demanda',
        status: 'enviado',
        details: 'Demanda de Mariana Costa compatível com seu portfólio (Pinheiros/SP)',
      },
      {
        recipient_email: 'mariana.costa@gmail.com',
        recipient_name: 'Mariana Costa',
        recipient_type: 'interessado',
        subject: 'Você recebeu uma apresentação para sua busca em Pinheiros',
        notification_type: 'apresentacao_recebida',
        status: 'enviado',
        details: 'Corretor Carlos Eduardo Mendes enviou uma apresentação',
      },
    ]
    for (const l of logs) {
      const r = new Record(notificationLogsCol)
      r.set('recipient_email', l.recipient_email)
      r.set('recipient_name', l.recipient_name)
      r.set('recipient_type', l.recipient_type)
      r.set('subject', l.subject)
      r.set('notification_type', l.notification_type)
      r.set('status', l.status)
      r.set('details', l.details)
      app.save(r)
    }
  },
  (app) => {
    // down logic is optional or handled by dropping collections
  },
)
