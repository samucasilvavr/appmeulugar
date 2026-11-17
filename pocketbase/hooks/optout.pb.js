// Descadastro de notificações (LGPD) — rota PÚBLICA (sem auth).
//
//  GET  /backend/v1/appmeulugar/optout?email=...  → status do e-mail
//  POST /backend/v1/appmeulugar/optout  body {email}  → marca descadastrado
//
// Aplica-se a DOIS destinos:
//  1. imported_contacts — o contato deixa de receber os avisos "sem match"
//     (authorization_status = 'descadastrado'; o hook de interesses filtra).
//  2. users (corretores) — o próprio usuário pode marcar optout_notifications
//     de notificações gerais; o hook de interesses ignora corretor com o campo ativo.
//
// E-mail desconhecido: cria imported_contacts 'descadastrado' (bloqueia
// reimportação) + notification_logs de auditoria.
//
// Runtime JSVM: lógica 100% inline no callback.
routerAdd(
  'GET',
  '/backend/v1/appmeulugar/optout',
  (e) => {
    var email = String(e.request.url.query().get('email') || '')
      .trim()
      .toLowerCase()
    if (!email || email.indexOf('@') === -1) {
      throw new BadRequestError('Informe um e-mail válido.')
    }

    var result = { email: email, found: false, status: '', type: '' }

    // Contato importado?
    try {
      var contact = e.app.findFirstRecordByFilter(
        'imported_contacts',
        'email = {:email}',
        '',
        1,
        0,
        { email: email },
      )
      if (contact) {
        result.found = true
        result.type = 'contato_importado'
        result.status = contact.getString('authorization_status')
        return e.json(200, result)
      }
    } catch (_) {}

    // Usuário cadastrado?
    try {
      var user = e.app.findFirstRecordByFilter('users', 'email = {:email}', '', 1, 0, {
        email: email,
      })
      if (user) {
        result.found = true
        result.type = 'usuario'
        result.status = user.getString('profile') === 'corretor' ? 'corretor' : 'interessado'
      }
    } catch (_) {}

    return e.json(200, result)
  },
  (e) => {
    return e.next()
  },
)

routerAdd(
  'POST',
  '/backend/v1/appmeulugar/optout',
  (e) => {
    var body = e.requestInfo().body || {}
    var email = String(body.email || '')
      .trim()
      .toLowerCase()
    if (!email || email.indexOf('@') === -1 || email.length > 254) {
      throw new BadRequestError('Informe um e-mail válido.')
    }

    var result = { email: email, updated: false, type: '' }

    // 1. Contato importado → authorization_status = 'descadastrado'
    try {
      var contact = e.app.findFirstRecordByFilter(
        'imported_contacts',
        'email = {:email}',
        '',
        1,
        0,
        { email: email },
      )
      if (contact) {
        if (contact.getString('authorization_status') !== 'descadastrado') {
          contact.set('authorization_status', 'descadastrado')
          e.app.save(contact)
        }
        result.updated = true
        result.type = 'contato_importado'
        return e.json(200, result)
      }
    } catch (_) {}

    // 2. Usuário cadastrado → optout_notifications = true
    try {
      var user = e.app.findFirstRecordByFilter('users', 'email = {:email}', '', 1, 0, {
        email: email,
      })
      if (user) {
        user.set('optout_notifications', true)
        e.app.save(user)
        result.updated = true
        result.type = 'usuario'
        return e.json(200, result)
      }
    } catch (_) {}

    // 3. E-mail desconhecido: registra o bloqueio em DOIS lugares para que
    //    futuros envios e futuras importações o respeitem:
    //      a) imported_contacts com authorization_status='descadastrado'
    //         — assim o dedupe por e-mail da importação nunca o recria;
    //      b) notification_logs com status='descadastrado' (trilha de auditoria).
    try {
      var contactsCol = e.app.findCollectionByNameOrId('imported_contacts')
      var contact2 = new Record(contactsCol)
      contact2.set('email', email)
      contact2.set('name', '')
      contact2.set('source', 'Descadastro direto (nunca importado)')
      contact2.set('authorization_status', 'descadastrado')
      e.app.save(contact2)

      var logs = e.app.findCollectionByNameOrId('notification_logs')
      var record = new Record(logs)
      record.set('recipient_email', email)
      record.set('recipient_name', '')
      record.set('recipient_type', 'contato_importado')
      record.set('subject', 'Descadastro de notificações')
      record.set('notification_type', 'geral')
      record.set('status', 'descadastrado')
      record.set('details', 'optout:sem-registro')
      e.app.save(record)

      result.updated = true
      result.type = 'sem_registro'
    } catch (err) {
      console.error('optout save failed: ' + err)
      throw new BadRequestError('Não foi possível registrar o descadastro.')
    }

    return e.json(200, result)
  },
  (e) => {
    return e.next()
  },
)
