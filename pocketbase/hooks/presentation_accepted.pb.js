// E-mail ao CORRETOR quando o interessado ACEITA a apresentação e a conversa abre.
//
// Gatilho: update em `presentations` onde status passou a 'aceita' (o aceite é
// feito pelo interessado). O chat é criado em seguida pelo frontend
// (services/presentations.ts), mas o e-mail parte daqui, no servidor, logo no
// aceite — antes o corretor só ficava sabendo abrindo o app.
//
// Regras (decisão do usuário, 19/11/2026):
//  - Template editável no /admin (aba E-mails), slug 'aceite_apresentacao'.
//  - Remetente contato@appmeulugar.com.br; link base fixa
//    https://www.appmeulugar.com.br inline (JSVM: $os.getenv lido no corpo do
//    callback; o secret SITE_URL antigo NÃO é mais lido; override opcional
//    SITE_URL_OVERRIDE).
//  - Respeita opt-out/descadastro do corretor (optout_notifications, users
//    blocked, imported_contacts descadastrado, notification_logs descadastrado).
//  - Sem envio duplicado para o mesmo aceite (chave presentation:<id> em
//    notification_logs + guarda do responded_at original).
//  - Toda tentativa (enviado/falha) vira registro em notification_logs. Erros
//    nunca interrompem o aceite.
//  - Runtime JSVM: TODA a lógica vive DENTRO do callback (sem require, sem
//    funções top-level; findFirstRecordByFilter só com (coleção, filtro, params)).
onRecordAfterUpdateSuccess((e) => {
  e.next()
  try {
    var record = e.record
    var app = e.app

    // Só interessa o momento exato em que status passou a 'aceita'.
    if (record.getString('status') !== 'aceita') return
    if (record.original().getString('status') === 'aceita') return
    if (!record.getString('responded_at')) return

    var presentationId = record.id
    var brokerId = record.getString('broker_id')
    if (!brokerId) return

    var broker = null
    try {
      broker = app.findRecordById('users', brokerId)
    } catch (_) {
      return
    }
    if (!broker) return

    var email = broker.getString('email')
    if (!email) return
    if (broker.getBool('blocked')) return
    if (broker.getBool('optout_notifications')) return

    // Guarda de duplicidade: um e-mail 'enviado' deste tipo já existe para
    // esta apresentação (chave presentation:<id> gravada em details).
    var alreadySent = false
    try {
      var sent = app.findRecordsByFilter(
        'notification_logs',
        "recipient_email = {:email} && notification_type = 'apresentacao_aceita' && status = 'enviado' && details ~ {:key}",
        '',
        1,
        0,
        { email: email, key: 'presentation:' + presentationId },
      )
      if (sent.length > 0) alreadySent = true
    } catch (errLogs) {
      console.error('aceite_apresentacao: falha ao checar duplicidade: ' + errLogs)
    }
    if (alreadySent) return

    // Opt-out / descadastro (mesma checagem tripla do fluxo de interesses).
    var optedOut = false
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
    if (optedOut) {
      try {
        var logCol = app.findCollectionByNameOrId('notification_logs')
        var skipLog = new Record(logCol)
        skipLog.set('recipient_email', email)
        skipLog.set('recipient_name', broker.getString('name') || '')
        skipLog.set('recipient_type', 'corretor')
        skipLog.set('subject', 'Apresentação aceita — envio suprimido (descadastro)')
        skipLog.set('notification_type', 'apresentacao_aceita')
        skipLog.set('status', 'descadastrado')
        skipLog.set('details', 'presentation:' + presentationId)
        app.save(skipLog)
      } catch (_) {}
      return
    }

    // Dados para o e-mail: imóvel apresentado e demanda de origem.
    var propertyTitle = ''
    var interestTitle = ''
    var buyerName = ''
    try {
      var property = app.findRecordById('properties', record.getString('property_id'))
      if (property) propertyTitle = property.getString('title')
    } catch (_) {}
    try {
      var interest = app.findRecordById('interests', record.getString('interest_id'))
      if (interest) interestTitle = interest.getString('title')
    } catch (_) {}
    var buyerId = record.getString('interest_owner_id')
    if (buyerId) {
      try {
        var buyer = app.findRecordById('users', buyerId)
        if (buyer) buyerName = buyer.getString('name')
      } catch (_) {}
    }

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

    function writeLog(status, details) {
      try {
        var collection = app.findCollectionByNameOrId('notification_logs')
        var log = new Record(collection)
        log.set('recipient_email', email)
        log.set('recipient_name', broker.getString('name') || '')
        log.set('recipient_type', 'corretor')
        log.set('subject', subject)
        log.set('notification_type', 'apresentacao_aceita')
        log.set('status', status)
        log.set('details', 'presentation:' + presentationId + (details ? '; ' + details : ''))
        app.save(log)
      } catch (err) {
        console.error('aceite_apresentacao: falha ao gravar notification_logs: ' + err)
      }
    }

    // Template editável no /admin (aba E-mails). Fallback inline caso o
    // registro não exista (JSVM: findFirstRecordByFilter só com 3 argumentos).
    var subject = 'Boa notícia! Seu interessado aceitou sua apresentação'
    var body =
      '<div style="font-family:Arial,sans-serif;color:#1f2937;"><p>Ol&aacute;, [nome].</p>' +
      '<p>Boa not&iacute;cia: [interessado] aceitou a sua apresenta&ccedil;&atilde;o e a conversa j&aacute; est&aacute; ' +
      'aberta no AppMeuLugar.</p>' +
      '<p><strong>Im&oacute;vel apresentado:</strong> [imovel]<br>' +
      '<strong>Demanda:</strong> [demanda]</p>' +
      '<p>Acesse o painel do corretor e responda o quanto antes &mdash; respostas r&aacute;pidas ' +
      'aumentam muito a chance de fechamento.</p>' +
      '[link-abrir-conversa]' +
      '<p style="font-size:12px;color:#6b7280;">Voc&ecirc; recebeu este e-mail porque &eacute; corretor ' +
      'cadastrado no AppMeuLugar. ' +
      '<a href="[link-descadastrar]">N&atilde;o quer mais receber?</a></p>' +
      '</div>'
    try {
      var tpl = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
        slug: 'aceite_apresentacao',
      })
      if (tpl) {
        if (tpl.getString('subject')) subject = tpl.getString('subject')
        if (tpl.getString('body_html')) body = tpl.getString('body_html')
      }
    } catch (_) {}

    // O chat nasce logo após o aceite (frontend). Como o id do chat ainda não
    // existe no momento do gatilho, o link cai no painel de conversas do
    // corretor, que abre a conversa mais recente por padrão (sort -updated) —
    // e é justamente a que acabou de nascer.
    var chatLink = siteUrl() + '/conversas'
    var unsubscribeUrl = siteUrl() + '/descadastrar?email=' + encodeURIComponent(email)

    function render(tplText) {
      var out = String(tplText)
      var vars = {
        nome: broker.getString('name') || 'corretor',
        interessado: buyerName || 'O interessado',
        imovel: propertyTitle || 'Imóvel apresentado',
        demanda: interestTitle || 'Demanda de origem',
        'link-abrir-conversa': button(chatLink, 'Abrir conversa'),
        'link-conversa-texto': chatLink,
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

    writeLog(sendError ? 'falha' : 'enviado', sendError ? 'erro: ' + sendError : '')
  } catch (err) {
    console.error('aceite_apresentacao: notificação falhou (aceite preservado): ' + err)
  }
}, 'presentations')
