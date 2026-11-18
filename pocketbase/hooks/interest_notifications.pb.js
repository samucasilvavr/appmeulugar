// Dispara as notificações por e-mail quando um interesse é publicado ou editado.
// Regras de negócio (decisão do usuário):
//  - Com match (imóvel ativo de corretor compatível): e-mail direto ao corretor.
//  - Sem match: aviso geral (template geral_lista_importada) aos CORRETORES CADASTRADOS
//    (creci aprovado, notificações habilitadas, não bloqueados, mesmo estado da demanda)
//    e aos contatos importados "autorizado" do mesmo estado.
//  - Pendentes/descadastrados não recebem nada.
//  - Sem e-mail duplicado para o mesmo par interesse/destinatário (alreadySent).
// IMPORTANTE (runtime Skip Cloud JSVM): o corpo de um callback roda em uma VM separada,
// então NEM require() NEM funções top-level são visíveis dentro dele.
// Por isso toda a lógica vive dentro do corpo do único callback (interestNotificationHandler).
// Envio pelo mailer nativo do PocketBase ($app.newMailClient). Toda tentativa
// (envio ou falha) vira registro em notification_logs. Erros nunca interrompem
// a publicação do interesse.

var interestNotificationHandler = function (e) {
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

    // Lê o template editável do admin (email_templates). Nunca lança.
    function loadTemplate(slug, fallbackSubject, fallbackBody) {
      try {
        var rec = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', '', 1, 0, {
          slug: slug,
        })
        if (rec) {
          return {
            subject: rec.getString('subject') || fallbackSubject,
            body: rec.getString('body_html') || fallbackBody,
          }
        }
      } catch (_) {}
      return { subject: fallbackSubject, body: fallbackBody }
    }

    // Substitui as variáveis [xxx] do template editável.
    function renderTemplate(tpl, vars) {
      var out = String(tpl)
      for (var key in vars) {
        if (!Object.prototype.hasOwnProperty.call(vars, key)) continue
        out = out.split('[' + key + ']').join(String(vars[key] == null ? '' : vars[key]))
      }
      return out
    }

    function isOptedOut(email) {
      // 1. Corretor cadastrado marcou descadastro de notificações.
      try {
        var u = app.findFirstRecordByFilter('users', 'email = {:email}', '', 1, 0, {
          email: email,
        })
        if (u && u.getBool('optout_notifications')) return true
      } catch (_) {}
      // 2. Contato importado descadastrado.
      try {
        var c = app.findFirstRecordByFilter(
          'imported_contacts',
          "email = {:email} && authorization_status = 'descadastrado'",
          '',
          1,
          0,
          { email: email },
        )
        if (c) return true
      } catch (_) {}
      // 3. Descadastro registrado em notification_logs (status='descadastrado').
      try {
        var lg = app.findRecordsByFilter(
          'notification_logs',
          "recipient_email = {:email} && status = 'descadastrado'",
          '',
          1,
          0,
          { email: email },
        )
        if (lg.length > 0) return true
      } catch (_) {}
      return false
    }

    function notifyBroker(broker, propertyIds) {
      var interestId = interest.id
      var email = broker.getString('email')
      if (isOptedOut(email)) return
      if (alreadySent(email, 'match_demanda', interestId)) return

      var tpl = loadTemplate(
        'match_corretor',
        'Novo interessado procurando imóvel em [cidade]',
        '<div style="font-family:Arial,sans-serif;color:#1f2937;"><p>Olá, [nome].</p>' +
          '<p>Uma pessoa está procurando [descricao]. Você possui um imóvel compatível.</p>' +
          '<p>Acesse o AppMeuLugar para conhecer essa oportunidade.</p>' +
          '[link-visualizar-demanda]</div>',
      )
      var link = siteUrl() + '/painel-corretor?enviar_para=' + interestId
      var html = renderTemplate(tpl.body, {
        nome: broker.getString('name') || 'corretor',
        descricao: describe(),
        tipo: interest.getString('property_type'),
        finalidade: interest.getString('purpose') === 'alugar' ? 'alugar' : 'comprar',
        cidade: interest.getString('city'),
        estado: interest.getString('state'),
        quartos:
          interest.getInt('min_bedrooms') > 0 ? interest.getInt('min_bedrooms') : 'não informado',
        valor: money(interest.getFloat('max_price')),
        'link-visualizar-demanda': button(link, 'Visualizar demanda'),
        'link-ver-demandas': button(siteUrl() + '/buscar?tipo=interesses', 'Ver demandas'),
        'link-descadastrar': button(
          siteUrl() + '/descadastrar?email=' + encodeURIComponent(email),
          'Não quero receber estes e-mails',
        ),
        'link-descadastrar-texto': siteUrl() + '/descadastrar?email=' + encodeURIComponent(email),
      })
      var subject = renderTemplate(tpl.subject, {
        nome: broker.getString('name') || 'corretor',
        tipo: interest.getString('property_type'),
        cidade: interest.getString('city'),
        estado: interest.getString('state'),
        quartos:
          interest.getInt('min_bedrooms') > 0 ? interest.getInt('min_bedrooms') : 'não informado',
        valor: money(interest.getFloat('max_price')),
      })

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

    // Destinatários do aviso geral (sem match): corretores cadastrados do mesmo
    // estado (aprovados, notificações habilitadas, não bloqueados) e contatos
    // importados autorizados do mesmo estado. Corretores vêm primeiro, para que
    // a checagem de duplicidade por e-mail impeça o contato de receber de novo.
    function collectGeneralRecipients(state, ownerId) {
      var list = []
      try {
        var brokers = app.findRecordsByFilter(
          'users',
          "profile = 'corretor' && creci_status = 'aprovado' && state = {:state}",
          '',
          500,
          0,
          { state: state },
        )
        for (var i = 0; i < brokers.length; i++) {
          var b = brokers[i]
          if (b.id === ownerId) continue
          if (b.getBool('optout_notifications') || b.getBool('blocked')) continue
          if (!b.getString('email')) continue
          list.push({
            email: b.getString('email'),
            name: b.getString('name'),
            recipientType: 'corretor',
          })
        }
      } catch (err) {
        console.error('broker general lookup failed: ' + err)
      }
      try {
        var contacts = app.findRecordsByFilter(
          'imported_contacts',
          "state = {:state} && authorization_status = 'autorizado'",
          '',
          500,
          0,
          { state: state },
        )
        for (var j = 0; j < contacts.length; j++) {
          list.push({
            email: contacts[j].getString('email'),
            name: contacts[j].getString('name'),
            recipientType: 'contato_importado',
          })
        }
      } catch (err) {
        console.error('imported_contacts lookup failed: ' + err)
      }
      return list
    }

    function notifyGeneral() {
      var interestId = interest.id
      var state = interest.getString('state')
      var recipients = collectGeneralRecipients(state, interest.getString('user_id'))
      if (recipients.length === 0) return

      var tpl = loadTemplate(
        'geral_lista_importada',
        'Novo interesse de imóvel publicado em [estado]',
        '<div style="font-family:Arial,sans-serif;color:#1f2937;"><p>Olá, [nome].</p>' +
          '<p>Houve um novo interesse de imóvel publicado em [estado]: [descricao].</p>' +
          '<p>Como não temos seus dados cadastrais, este aviso foi enviado com base em ' +
          'uma lista pública de credenciados da Caixa Econômica Federal.</p>' +
          '<p>Veja as demandas publicadas na página pública do AppMeuLugar.</p>' +
          '[link-ver-demandas]' +
          '<p style="font-size:12px;color:#6b7280;">Para não receber mais estes e-mails, ' +
          'responda esta mensagem solicitando o descadastro ou use o link: [link-descadastrar-texto]</p>' +
          '</div>',
      )
      var link = siteUrl() + '/buscar?tipo=interesses'
      for (var i = 0; i < recipients.length; i++) {
        var recipient = recipients[i]
        var email = recipient.email
        if (!email) continue
        if (isOptedOut(email)) continue
        if (alreadySent(email, 'geral', interestId)) continue

        var unsubscribeUrl = siteUrl() + '/descadastrar?email=' + encodeURIComponent(email)
        var html = renderTemplate(tpl.body, {
          nome: recipient.name || 'tudo bem',
          descricao: describe(),
          tipo: interest.getString('property_type'),
          finalidade: interest.getString('purpose') === 'alugar' ? 'alugar' : 'comprar',
          cidade: interest.getString('city'),
          estado: state,
          quartos:
            interest.getInt('min_bedrooms') > 0 ? interest.getInt('min_bedrooms') : 'não informado',
          valor: money(interest.getFloat('max_price')),
          'link-visualizar-demanda': button(siteUrl() + '/painel-corretor', 'Visualizar demanda'),
          'link-ver-demandas': button(link, 'Ver demandas'),
          'link-descadastrar': button(unsubscribeUrl, 'Não quero receber estes e-mails'),
          'link-descadastrar-texto': unsubscribeUrl,
        })
        var subject = renderTemplate(tpl.subject, {
          nome: recipient.name || 'tudo bem',
          tipo: interest.getString('property_type'),
          cidade: interest.getString('city'),
          estado: state,
          quartos:
            interest.getInt('min_bedrooms') > 0 ? interest.getInt('min_bedrooms') : 'não informado',
          valor: money(interest.getFloat('max_price')),
        })

        var result = sendMail(email, subject, html)
        writeLog({
          email: email,
          name: recipient.name,
          recipientType: recipient.recipientType,
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
      notifyGeneral()
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

onRecordAfterCreateSuccess(interestNotificationHandler, 'interests')

onRecordAfterUpdateSuccess(interestNotificationHandler, 'interests')
