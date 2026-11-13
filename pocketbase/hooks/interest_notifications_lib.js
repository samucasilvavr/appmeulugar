// Lógica de notificação por e-mail de interesses (carregada por interest_notifications.pb.js).
// Envio pelo mailer nativo do PocketBase ($app.newMailClient). Toda tentativa
// (envio ou falha) vira registro em notification_logs. Erros são capturados
// aqui: nunca interrompem a publicação do interesse.

const NOTIF_FROM_ADDRESS = 'contato@appmeulugar.com.br'
const NOTIF_FROM_NAME = 'AppMeuLugar'

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

function writeLog(app, data) {
  try {
    const collection = app.findCollectionByNameOrId('notification_logs')
    const record = new Record(collection)
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

// true when a successful send of this type already exists for this address and interest
function alreadySent(app, email, notificationType, interestId) {
  try {
    const rows = app.findRecordsByFilter(
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

// Sends one message through the native mailer. Never throws.
function sendMail(app, to, subject, html) {
  try {
    const message = new MailerMessage({
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

// Generic description of the demand (no personal data of the buyer)
function describe(interest) {
  const bedrooms = interest.getInt('min_bedrooms')
  const maxPrice = interest.getFloat('max_price')
  const purpose = interest.getString('purpose') === 'alugar' ? 'para alugar' : 'para comprar'
  let text =
    interest.getString('property_type') + ' ' + purpose + ' em ' + interest.getString('city')
  if (bedrooms > 0) text += ', com ' + bedrooms + ' quarto(s) ou mais'
  if (maxPrice > 0) text += ', até ' + money(maxPrice)
  return text
}

function notifyBroker(app, interest, broker, propertyIds) {
  const interestId = interest.id
  const email = broker.getString('email')
  const subject = 'Novo interessado procurando imóvel em ' + interest.getString('city')
  if (alreadySent(app, email, 'match_demanda', interestId)) return

  const link = siteUrl() + '/painel-corretor?enviar_para=' + interestId
  const html =
    '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
    '<p>Olá, ' +
    escapeHtml(broker.getString('name') || 'corretor') +
    '.</p>' +
    '<p>Uma pessoa está procurando ' +
    escapeHtml(describe(interest)) +
    '. ' +
    'Você possui um imóvel compatível.</p>' +
    '<p>Acesse o AppMeuLugar para conhecer essa oportunidade.</p>' +
    button(link, 'Visualizar demanda') +
    '</div>'

  const result = sendMail(app, email, subject, html)
  writeLog(app, {
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

function notifyImportedContacts(app, interest) {
  const interestId = interest.id
  const state = interest.getString('state')
  const subject = 'Novo interesse de imóvel publicado em ' + state
  let contacts = []
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

  const link = siteUrl() + '/buscar?tipo=interesses'
  for (const contact of contacts) {
    const email = contact.getString('email')
    if (!email) continue
    if (alreadySent(app, email, 'geral', interestId)) continue

    const html =
      '<div style="font-family:Arial,sans-serif;color:#1f2937;">' +
      '<p>Olá, ' +
      escapeHtml(contact.getString('name') || 'tudo bem') +
      '.</p>' +
      '<p>Houve um novo interesse de imóvel publicado em ' +
      escapeHtml(state) +
      ': ' +
      escapeHtml(describe(interest)) +
      '.</p>' +
      '<p>Veja as demandas publicadas na página pública do AppMeuLugar.</p>' +
      button(link, 'Ver demandas') +
      '</div>'

    const result = sendMail(app, email, subject, html)
    writeLog(app, {
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

function dispatchInterest(app, interest) {
  if (interest.getString('status') !== 'ativo') return
  const interestId = interest.id

  let properties = []
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

  // Same mandatory price rule as services/matching.ts (up to 10% above the ceiling)
  const maxPrice = interest.getFloat('max_price')
  const byBroker = {}
  for (const property of properties) {
    const price = property.getFloat('price')
    if (maxPrice > 0 && price > maxPrice * 1.1) continue
    const ownerId = property.getString('user_id')
    if (!ownerId || ownerId === interest.getString('user_id')) continue
    if (!byBroker[ownerId]) byBroker[ownerId] = []
    byBroker[ownerId].push(property.id)
  }

  const brokerIds = Object.keys(byBroker)
  if (brokerIds.length === 0) {
    notifyImportedContacts(app, interest)
    return
  }

  for (const brokerId of brokerIds) {
    try {
      const broker = app.findRecordById('users', brokerId)
      if (broker.getString('profile') !== 'corretor') continue
      if (!broker.getString('email')) continue
      notifyBroker(app, interest, broker, byBroker[brokerId])
    } catch (err) {
      console.error('broker notification failed for interest ' + interestId + ': ' + err)
    }
  }
}

module.exports = { dispatchInterest }
