// Dispara as notificações por e-mail quando um interesse é publicado ou editado.
// Regras de negócio (decisão do usuário):
//  - Com match (imóvel ativo de corretor compatível): e-mail direto ao corretor.
//  - Sem match: aviso geral aos contatos importados "autorizado" do mesmo estado.
//  - Pendentes/descadastrados não recebem nada.
//  - Sem e-mail duplicado para o mesmo par interesse/destinatário (alreadySent).
// IMPORTANTE (runtime Skip Cloud): o corpo de um callback roda em uma VM separada,
// então NEM require() de outro arquivo NEM funções/constantes top-level estão
// disponíveis dentro dele — era isso que causava o "GoError: Invalid module".
// Por isso toda a lógica vive inline no corpo de cada callback (duplicada nos dois).
// Envio pelo mailer nativo do PocketBase ($app.newMailClient). Toda tentativa
// (envio ou falha) vira registro em notification_logs. Erros nunca interrompem
// a publicação do interesse.

function interestNotificationBody() {
  return function (e) {
    e.next()
    try {
      var app = e.app
      var interest = e.record
      var NOTIF_FROM_ADDRESS = 'contato@appmeulugar.com.br'
      var NOTIF_FROM_NAME = 'AppMeuLugar'

      function siteUrl() {
        return String($os.getenv('SITE_URL') || '').replace(/\/+$/, '')
      }

      function escapeHtml(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      }

      function money(value) {
        return (
          'R$ ' +
          Math.round(Number(value))
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        )
      }

      function writeLog(data) {
        try {
          var collection = app.findCollectionByNameOrId('notification_logs')
          var record = new Record(collection)
          record.set('recipient_email', data.email)
          record.set('recipient_name', data.name || '')
          record.set('recipient_type', data.recipientType)
          record.set('subject', data.subject)
          record.set('notification_type', data.notificationType)
          record.set('status', data.status)
          record.set('details', data.details || '')
          app.save(record)
        } catch (err) {
          console.error('notification_logs write failed: ' + err)
        }
      }

      // true quando um envio bem-sucedido deste tipo já existe para este e-mail/interesse
      function alreadySent(email, notificationType, interestId) {
        try {
          var rows = app.findRecordsByFilter(
            'notification_logs',
            "recipient_email = {:email} && notification_type = {:type} && status = 'enviado' && details ~ {:key}",
            '',
            1,
            0,
            { email: email, type: notificationType, key: 'interest:' + interestId },
          )
          return rows.length > 0
        } catch (err) {
          return false
        }
      }

      // Envia uma mensagem pelo mailer nativo. Nunca lança.
      function sendMail(to, subject, html) {
        try {
          var message = new MailerMessage({
            from: { address: NOTIF_FROM_ADDRESS, name: NOTIF_FROM_NAME },
            to: [{ address: to }],
            subject: subject,
            html: html,
            headers: { 'Reply-To': NOTIF_FROM_NAME + ' <' + NOTIF_FROM_ADDRESS + '>' },
          })
          app.newMailClient().send(message)
          return { ok: true, error: '' }
        } catch (err) {
          return { ok: false, error: String(err) }
        }
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

      // Descrição genérica da demanda (sem dados pessoais do comprador)
      function describe() {
        var bedrooms = interest.getInt('min_bedrooms')
        var maxPrice = interest.getFloat('max_price')
        var purpose = interest.getString('purpose') === 'alugar' ? 'para alugar' : 'para comprar'
        var text =
          interest.getString('property_type') + ' ' + purpose + ' em ' + interest.getString('city')
        if (bedrooms > 0) text += ', com ' + bedrooms + ' quarto(s) ou mais'
        if (maxPrice > 0) text += ', até ' + money(maxPrice)
        return text
      }

      function notifyBroker(broker, propertyIds) {
        var interestId = interest.id
        var email = broker.getString('email')
        var subject = 'Novo interessado procurando imóvel em ' + interest.getString('city')
        if (alreadySent(email, 'match_demanda', interestId)) return

        var link = siteUrl() + '/painel-corretor?enviar_para=' + interestId
        var html =
          '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
          '<p>Olá, ' +
          escapeHtml(broker.getString('name') || 'corretor') +
          '.</p>' +
          '<p>Uma pessoa está procurando ' +
          escapeHtml(describe()) +
          '. ' +
          'Você possui um imóvel compatível.</p>' +
          '<p>Acesse o AppMeuLugar para conhecer essa oportunidade.</p>' +
          button(link, 'Visualizar demanda') +
          '</div>'

        var result = sendMail(email, subject, html)
        writeLog({
          email: email,
          name: broker.getString('name'),
          recipientType: 'corretor',
          subject: subject,
          notificationType: 'match_demanda',
          status: result.ok ? 'enviado' : 'falha',
          details:
            'interest:' +
            interestId +
            '; properties:' +
            propertyIds.join(',') +
            (result.ok ? '' : '; erro: ' + result.error),
        })
      }

      function notifyImportedContacts() {
        var interestId = interest.id
        var state = interest.getString('state')
        var subject = 'Novo interesse de imóvel publicado em ' + state
        var contacts = []
        try {
          contacts = app.findRecordsByFilter(
            'imported_contacts',
            "state = {:state} && authorization_status = 'autorizado'",
            '',
            500,
            0,
            { state: state },
          )
        } catch (err) {
          console.error('imported_contacts lookup failed: ' + err)
          return
        }

        var link = siteUrl() + '/buscar?tipo=interesses'
        for (var i = 0; i < contacts.length; i++) {
          var contact = contacts[i]
          var email = contact.getString('email')
          if (!email) continue
          if (alreadySent(email, 'geral', interestId)) continue

          var html =
            '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
            '<p>Olá, ' +
            escapeHtml(contact.getString('name') || 'tudo bem') +
            '.</p>' +
            '<p>Houve um novo interesse de imóvel publicado em ' +
            escapeHtml(state) +
            ': ' +
            escapeHtml(describe()) +
            '.</p>' +
            '<p>Veja as demandas publicadas na página pública do AppMeuLugar.</p>' +
            button(link, 'Ver demandas') +
            '</div>'

          var result = sendMail(email, subject, html)
          writeLog({
            email: email,
            name: contact.getString('name'),
            recipientType: 'contato_importado',
            subject: subject,
            notificationType: 'geral',
            status: result.ok ? 'enviado' : 'falha',
            details: 'interest:' + interestId + (result.ok ? '' : '; erro: ' + result.error),
          })
        }
      }

      // ---- dispatch ----
      if (interest.getString('status') !== 'ativo') return
      var interestId = interest.id

      var properties = []
      try {
        properties = app.findRecordsByFilter(
          'properties',
          "status = 'ativo' && purpose = {:purpose} && property_type = {:ptype} && state = {:state} && city = {:city}",
          '',
          500,
          0,
          {
            purpose: interest.getString('purpose'),
            ptype: interest.getString('property_type'),
            state: interest.getString('state'),
            city: interest.getString('city'),
          },
        )
      } catch (err) {
        properties = []
      }

      // Mesma regra obrigatória de preço de services/matching.ts (até 10% acima do teto)
      var maxPrice = interest.getFloat('max_price')
      var byBroker = {}
      for (var p = 0; p < properties.length; p++) {
        var property = properties[p]
        var price = property.getFloat('price')
        if (maxPrice > 0 && price > maxPrice * 1.1) continue
        var ownerId = property.getString('user_id')
        if (!ownerId || ownerId === interest.getString('user_id')) continue
        if (!byBroker[ownerId]) byBroker[ownerId] = []
        byBroker[ownerId].push(property.id)
      }

      var brokerIds = Object.keys(byBroker)
      if (brokerIds.length === 0) {
        notifyImportedContacts()
        return
      }

      for (var b = 0; b < brokerIds.length; b++) {
        try {
          var broker = app.findRecordById('users', brokerIds[b])
          if (broker.getString('profile') !== 'corretor') continue
          if (!broker.getString('email')) continue
          notifyBroker(broker, byBroker[brokerIds[b]])
        } catch (err) {
          console.error('broker notification failed for interest ' + interestId + ': ' + err)
        }
      }
    } catch (err) {
      console.error('interest notification failed: ' + err)
    }
  }
}

onRecordAfterCreateSuccess(interestNotificationBody(), 'interests')

onRecordAfterUpdateSuccess(interestNotificationBody(), 'interests')
