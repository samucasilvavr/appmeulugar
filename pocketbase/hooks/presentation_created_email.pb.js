// E-mail ao INTERESSADO quando recebe uma NOVA APRESENTAÇÃO de um corretor.
//
// Gatilho: create em `presentations` (o envio é feito pelo corretor no painel).
// Antes deste hook o interessado só ficava sabendo abrindo o app no painel.
//
// Regras (decisão do usuário, 19/11/2026):
//  - Destinatário: dono da demanda. Interesse COM user_id → e-mail da conta;
//    interesse ANÔNIMO (user_id vazio, migração 0005) → interest.contact_email;
//    sem nenhum dos dois → nada a enviar (sai sem erro).
//  - Template editável no /admin (aba E-mails), slug 'nova_apresentacao'
//    (criado pela migração 0024). Fallback inline caso não exista.
//  - Remetente contato@appmeulugar.com.br; link base fixa
//    https://www.appmeulugar.com.br inline (JSVM: $os.getenv lido no corpo do
//    callback; o secret SITE_URL antigo NÃO é mais lido; override opcional
//    SITE_URL_OVERRIDE). Botão "Ver apresentação" → /painel-interessado.
//  - Respeita opt-out/descadastro (optout_notifications, imported_contacts
//    descadastrado, notification_logs status='descadastrado').
//  - Deduplicação: chave presentation:<id> em notification_logs, mesmo padrão
//    do hook de aceite (apresentacao_aceita).
//  - Toda tentativa (enviado/falha) vira registro em notification_logs (tipo
//    'nova_apresentacao'). Erro de e-mail NUNCA impede a criação: tudo vive em
//    try/catch e e.next() já rodou.
//  - Runtime JSVM: TODA a lógica vive DENTRO do callback (sem require, sem
//    funções top-level; findFirstRecordByFilter só com (coleção, filtro, params)).
onRecordAfterCreateSuccess((e) => {
  e.next()
  try {
    var record = e.record
    var app = e.app

    var presentationId = record.id
    var interestId = record.getString('interest_id')
    var brokerId = record.getString('broker_id')
    var interestOwnerId = record.getString('interest_owner_id')
    if (!interestId) return

    // ---- Dono da demanda: user_id → contact_email (demanda anônima) ----
    var interest = null
    try {
      interest = app.findRecordById('interests', interestId)
    } catch (_) {
      return
    }
    if (!interest) return

    var email = ''
    var recipientName = ''
    var recipientType = 'interessado'
    // Dono da demanda: interest_owner_id → user_id → contact_email (anônima).
    var ownerId = interestOwnerId || interest.getString('user_id')
    if (ownerId) {
      try {
        var owner = app.findRecordById('users', ownerId)
        if (owner) {
          email = owner.getString('email')
          recipientName = owner.getString('name') || ''
          recipientType = owner.getString('profile') === 'corretor' ? 'corretor' : 'interessado'
        }
      } catch (_) {}
    }
    if (!email) {
      // Demanda anônima: e-mail de contato informado na publicação.
      var contactEmail = String(interest.getString('contact_email') || '')
        .trim()
        .toLowerCase()
      if (contactEmail && contactEmail.indexOf('@') !== -1) email = contactEmail
    }
    if (!email) return

    // ---- Opt-out / descadastro (mesma checagem tripla dos outros hooks) ----
    var optedOut = false
    try {
      var u = app.findFirstRecordByFilter('users', 'email = {:email}', { email: email })
      if (u && u.getBool('optout_notifications')) optedOut = true
    } catch (_) {}
    if (!optedOut) {
      try {
        var c = app.findFirstRecordByFilter(
          'imported_contacts',
          "email = {:email} && authorization_status = 'descadastrado'",
          { email: email },
        )
        if (c) optedOut = true
      } catch (_) {}
    }
    if (!optedOut) {
      try {
        var lg = app.findRecordsByFilter(
          'notification_logs',
          "recipient_email = {:email} && status = 'descadastrado'",
          '',
          1,
          0,
          { email: email },
        )
        if (lg.length > 0) optedOut = true
      } catch (_) {}
    }
    if (optedOut) {
      try {
        var logCol = app.findCollectionByNameOrId('notification_logs')
        var skipLog = new Record(logCol)
        skipLog.set('recipient_email', email)
        skipLog.set('recipient_name', recipientName)
        skipLog.set('recipient_type', recipientType)
        skipLog.set('subject', 'Nova apresentação — envio suprimido (descadastro)')
        skipLog.set('notification_type', 'nova_apresentacao')
        skipLog.set('status', 'descadastrado')
        skipLog.set('details', 'presentation:' + presentationId)
        app.save(skipLog)
      } catch (_) {}
      return
    }

    // ---- Deduplicação por apresentação (chave presentation:<id>) ----
    try {
      var sent = app.findRecordsByFilter(
        'notification_logs',
        "recipient_email = {:email} && notification_type = 'nova_apresentacao' && status = 'enviado' && details ~ {:key}",
        '',
        1,
        0,
        { email: email, key: 'presentation:' + presentationId },
      )
      if (sent.length > 0) return
    } catch (errLogs) {
      console.error('nova_apresentacao: falha ao checar duplicidade: ' + errLogs)
    }

    // ---- Dados do corretor e da demanda ----
    var brokerName = ''
    if (brokerId) {
      try {
        var broker = app.findRecordById('users', brokerId)
        if (broker) brokerName = broker.getString('name') || ''
      } catch (_) {}
    }
    if (!brokerName) {
      try {
        var prop = app.findRecordById('properties', record.getString('property_id'))
        if (prop) {
          var propBroker = null
          try {
            propBroker = app.findRecordById('users', prop.getString('user_id'))
          } catch (_) {}
          if (propBroker) brokerName = propBroker.getString('name') || ''
        }
      } catch (_) {}
    }

    var interestTitle = interest.getString('title') || ''
    var interestType = interest.getString('property_type') || 'imóvel'
    var interestCity = interest.getString('city') || ''
    var purpose = interest.getString('purpose') === 'alugar' ? 'alugar' : 'comprar'
    var demandaDesc =
      interestType + ' para ' + purpose + (interestCity ? ' em ' + interestCity : '')

    var NOTIF_FROM_ADDRESS = 'contato@appmeulugar.com.br'
    var NOTIF_FROM_NAME = 'AppMeuLugar'

    function siteUrl() {
      return (
        String($os.getenv('SITE_URL_OVERRIDE') || '').replace(/\/+$/, '') ||
        'https://www.appmeulugar.com.br'
      )
    }

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function button(href, label) {
      return (
        '<p><a href="' +
        escapeHtml(href) +
        '" style="display:inline-block;padding:10px 18px;' +
        'background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;">' +
        escapeHtml(label) +
        '</a></p>'
      )
    }

    // Template editável no /admin (aba E-mails). Fallback inline caso o
    // registro não exista (JSVM: findFirstRecordByFilter só com 3 argumentos).
    var subject = 'Você recebeu uma nova apresentação no AppMeuLugar'
    var body =
      '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
      '<p>Ol&aacute;, [nome-interessado].</p>' +
      '<p>Boa not&iacute;cia: o corretor <strong>[nome-corretor]</strong> apresentou um im&oacute;vel ' +
      'para a sua demanda <strong>[demanda]</strong> ([tipo] para [finalidade] em [cidade]).</p>' +
      '<p>A apresenta&ccedil;&atilde;o est&aacute; aguardando a sua resposta no painel do interessado ' +
      '&mdash; voc&ecirc; analisa com calma e s&oacute; abre contato se gostar.</p>' +
      '[link-ver-apresentacao]' +
      '<p style="font-size:12px;color:#6b7280;">Voc&ecirc; recebeu este e-mail porque publicou uma ' +
      'demanda no AppMeuLugar. ' +
      '<a href="[link-descadastrar]">N&atilde;o quer mais receber?</a></p>' +
      '</div>'
    try {
      var tpl = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'nova_apresentacao',
      })
      if (tpl) {
        if (tpl.getString('subject')) subject = tpl.getString('subject')
        if (tpl.getString('body_html')) body = tpl.getString('body_html')
      }
    } catch (_) {}

    var panelLink = siteUrl() + '/painel-interessado'
    var unsubscribeUrl = siteUrl() + '/descadastrar?email=' + encodeURIComponent(email)

    function render(tplText) {
      var out = String(tplText)
      var vars = {
        'nome-interessado': recipientName || 'tudo bem',
        'nome-corretor': brokerName || 'um corretor verificado',
        demanda: interestTitle || demandaDesc,
        tipo: interestType,
        finalidade: purpose,
        cidade: interestCity,
        'link-ver-apresentacao': button(panelLink, 'Ver apresentação'),
        'link-apresentacao-texto': panelLink,
        'link-descadastrar': button(unsubscribeUrl, 'Não quero receber estes e-mails'),
        'link-descadastrar-texto': unsubscribeUrl,
      }
      for (var key in vars) {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) continue
        out = out.split('[' + key + ']').join(String(vars[key] == null ? '' : vars[key]))
      }
      return out
    }

    var finalSubject = render(subject)
    var finalHtml = render(body)

    // Envio — erro NUNCA interrompe a criação (este callback roda APÓS o
    // e.next(); qualquer exceção ainda assim é capturada aqui e só logada).
    var sendError = ''
    try {
      var message = new MailerMessage({
        from: { address: NOTIF_FROM_ADDRESS, name: NOTIF_FROM_NAME },
        to: [{ address: email }],
        subject: finalSubject,
        html: finalHtml,
        headers: { 'Reply-To': NOTIF_FROM_NAME + ' <' + NOTIF_FROM_ADDRESS + '>' },
      })
      app.newMailClient().send(message)
    } catch (err) {
      sendError = String(err)
    }

    try {
      var col = app.findCollectionByNameOrId('notification_logs')
      var log = new Record(col)
      log.set('recipient_email', email)
      log.set('recipient_name', recipientName)
      log.set('recipient_type', recipientType)
      log.set('subject', finalSubject)
      log.set('notification_type', 'nova_apresentacao')
      log.set('status', sendError ? 'falha' : 'enviado')
      log.set(
        'details',
        'presentation:' +
          presentationId +
          '; interest:' +
          interestId +
          (sendError ? '; erro: ' + sendError : ''),
      )
      app.save(log)
    } catch (err) {
      console.error('nova_apresentacao: falha ao gravar notification_logs: ' + err)
    }
  } catch (err) {
    console.error('nova_apresentacao: notificação falhou (apresentação preservada): ' + err)
  }
}, 'presentations')
