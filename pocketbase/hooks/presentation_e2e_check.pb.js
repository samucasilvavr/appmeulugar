/// <reference path="../pb_data/types.d.ts" />
// presentation_e2e_check.pb.js — VERIFICAÇÃO E2E TEMPORÁRIA (remover após validar).
//
// Reproduz o fluxo real do /painel-corretor por HTTP de verdade: cria dois
// corretores de teste e um imóvel de teste (via $app), autentica cada um via
// POST /api/collections/users/auth-with-password e cria apresentações via
// POST /api/collections/presentations/records COM o token de cada um —
// passando pelo createRule real e pelo hook presentation_create.pb.js.
// Valida: (1) criação OK com payload real do cliente; (2) imóvel de outro
// corretor é rejeitado (portfólio próprio); (3) imóvel duplicado na mesma
// demanda é rejeitado. Remove TODOS os records de teste ao final.
//
// Proteção mínima enquanto existe: exige o parâmetro ?key=... — rota a REMOVER
// antes do commit.
routerAdd('GET', '/backend/v1/appmeulugar/test/presentation-e2e', (e) => {
  var KEY = 'e2e-x7k9q2v5m8t3w6z1'
  if (String(e.request.url.query().get('key') || '') !== KEY) {
    throw new ForbiddenError('Chave inválida.')
  }

  var result = { steps: [] }
  function step(name, data) {
    result.steps.push({ name: name, data: data })
  }

  var INTEREST_ID = String(e.request.url.query().get('interest_id') || '')
  if (!INTEREST_ID) throw new BadRequestError('Informe interest_id da demanda de teste.')

  var instanceUrl = String($os.getenv('PB_INSTANCE_URL') || '').replace(/\/+$/, '')
  if (!instanceUrl) throw new BadRequestError('PB_INSTANCE_URL ausente.')

  var suffix = Date.now()
  var emailA = 'e2e.broker.a.' + suffix + '@teste-local.com'
  var emailB = 'e2e.broker.b.' + suffix + '@teste-local.com'
  var PASSWORD = 'E2eTeste!9x'
  var propertyId = ''
  var userA = null
  var userB = null
  var createdIds = []

  // ---- fixtures via $app (removidos no fim) ----
  try {
    var usersCol = e.app.findCollectionByNameOrId('users')

    function makeBroker(em) {
      var u = new Record(usersCol)
      u.setEmail(em)
      u.setPassword(PASSWORD)
      u.set('name', 'Corretor E2E ' + em.slice(11, 19))
      u.set('profile', 'corretor')
      u.set('creci_status', 'aprovado')
      u.setVerified(true)
      e.app.save(u)
      return u
    }

    userA = makeBroker(emailA)
    userB = makeBroker(emailB)

    var propsCol = e.app.findCollectionByNameOrId('properties')
    var prop = new Record(propsCol)
    prop.set('user_id', userA.id)
    prop.set('title', '[TESTE E2E] Imóvel do corretor A')
    prop.set('price', 1000000)
    prop.set('property_type', 'casa')
    prop.set('purpose', 'comprar')
    prop.set('state', 'DF')
    prop.set('city', 'Brasília')
    prop.set('status', 'ativo')
    e.app.save(prop)
    propertyId = prop.id
    step('fixtures', { userA: userA.id, userB: userB.id, propertyId: propertyId })
  } catch (err) {
    step('fixtures', { error: String(err) })
    return e.json(200, result)
  }

  // ---- chamadas HTTP REAIS (como o cliente do navegador faz) ----
  function apiLogin(em) {
    var res = $http.send({
      url: instanceUrl + '/api/collections/users/auth-with-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: em, password: PASSWORD }),
    })
    try {
      return JSON.parse(String(res.body))
    } catch (_) {
      return {}
    }
  }

  function apiCreatePresentation(token, propId) {
    var res = $http.send({
      url: instanceUrl + '/api/collections/presentations/records',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        interest_id: INTEREST_ID,
        property_id: propId,
        message: '[TESTE E2E] Apresentação de validação.',
        status: 'pendente',
      }),
    })
    var body = {}
    try {
      body = JSON.parse(String(res.body))
    } catch (_) {}
    var status = res.statusCode != null ? res.statusCode : res.status
    return { status: status, body: body }
  }

  try {
    var loginA = apiLogin(emailA)
    if (!loginA.token) {
      step('login_A', { error: loginA })
      return e.json(200, result)
    }
    step('login_A', { ok: true, userId: loginA.record.id })

    // 1. Criação real com o payload do cliente — deve ser 200
    var create1 = apiCreatePresentation(loginA.token, propertyId)
    step('create_valid', { status: create1.status, body: create1.body })
    if (create1.status === 200 && create1.body.id) {
      createdIds.push(create1.body.id)
      result.createOk = true
      result.ownerResolved = String(create1.body.interest_owner_id || '') !== ''
      result.brokerSet = String(create1.body.broker_id || '') === String(loginA.record.id)
    }

    // 2. Imóvel de OUTRO corretor — deve ser 400 (regra do portfólio próprio)
    var loginB = apiLogin(emailB)
    if (loginB.token) {
      var create2 = apiCreatePresentation(loginB.token, propertyId)
      step('portfolio_rule', {
        status: create2.status,
        rejected: create2.status !== 200,
        message: create2.body.message || '',
      })
    }

    // 3. Mesmo imóvel duas vezes na mesma demanda — deve ser 400
    if (loginA.token) {
      var create3 = apiCreatePresentation(loginA.token, propertyId)
      step('duplicate_rule', {
        status: create3.status,
        rejected: create3.status !== 200,
        message: create3.body.message || '',
      })
    }
  } catch (err) {
    step('http', { error: String(err) })
  }

  // ---- limpeza de TUDO que foi criado ----
  for (var i = 0; i < createdIds.length; i++) {
    try {
      e.app.delete(e.app.findRecordById('presentations', createdIds[i]))
    } catch (err) {}
  }
  try {
    if (propertyId) e.app.delete(e.app.findRecordById('properties', propertyId))
  } catch (err) {
    step('cleanup_property', { error: String(err) })
  }
  try {
    if (userA) e.app.delete(e.app.findRecordById('users', userA.id))
  } catch (err) {
    step('cleanup_userA', { error: String(err) })
  }
  try {
    if (userB) e.app.delete(e.app.findRecordById('users', userB.id))
  } catch (err) {
    step('cleanup_userB', { error: String(err) })
  }
  step('cleanup', { done: true })

  return e.json(200, result)
})
