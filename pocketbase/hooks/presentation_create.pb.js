/// <reference path="../pb_data/types.d.ts" />
// presentation_create.pb.js — criação de apresentação no painel do corretor.
//
// Regras (JSVM: toda a lógica inline no corpo do callback — sem require, sem
// funções top-level referenciadas dentro do callback):
//  1. interest_owner_id resolvido no SERVIDOR: a demanda pode ser anônima
//     (migração 0005, user_id vazio) — o cliente não consegue enviá-lo (era a
//     causa do "Failed to create record."). Ordem: interest.user_id → vínculo
//     por contact_email em users → vazio (demanda 100% anônima; a migração
//     0020 tornou o campo opcional).
//  2. Regras de negócio reforçadas no servidor (antes só no cliente):
//     máximo de 5 apresentações pendentes por demanda; imóvel precisa existir,
//     estar ativo e pertencer ao corretor autenticado (portfólio próprio);
//     mesmo imóvel não vai duas vezes para a mesma demanda; e o corretor não
//     apresenta imóvel para a própria demanda.
//  3. broker_id sempre = usuário autenticado (nunca confia no cliente).
onRecordCreate((e) => {
  var record = e.record
  var bizError = ''

  try {
    var authId = ''
    try {
      var info = e.requestInfo()
      if (info && info.auth) authId = info.auth.id
    } catch (_) {}

    // 1. Resolução do dono da demanda (interesses anônimos têm user_id vazio)
    if (!record.getString('interest_owner_id')) {
      try {
        var interest = e.app.findRecordById('interests', record.getString('interest_id'))
        var ownerId = interest.getString('user_id')
        if (!ownerId) {
          var email = String(interest.getString('contact_email') || '')
            .trim()
            .toLowerCase()
          if (email && email.indexOf('@') !== -1) {
            try {
              var linked = e.app.findFirstRecordByFilter('users', 'email = {:email}', {
                email: email,
              })
              if (linked) ownerId = linked.id
            } catch (_) {}
          }
        }
        if (ownerId) record.set('interest_owner_id', ownerId)
      } catch (err) {
        console.error('presentation_create: falha ao resolver o dono da demanda: ' + err)
      }
    }

    // broker_id é sempre o usuário autenticado (origem confiável = servidor)
    if (authId) {
      record.set('broker_id', authId)

      // 2a. O imóvel deve existir, estar ativo e ser do portfólio do corretor
      var property = null
      try {
        property = e.app.findRecordById('properties', record.getString('property_id'))
      } catch (_) {}
      if (!property) {
        bizError = 'Imóvel não encontrado.'
      } else if (property.getString('user_id') !== authId) {
        bizError = 'O imóvel apresentado deve pertencer ao seu portfólio.'
      } else if (property.getString('status') !== 'ativo') {
        bizError = 'O imóvel precisa estar ativo no seu portfólio.'
      }

      if (!bizError) {
        var interestId = record.getString('interest_id')

        // 2b. O corretor nunca apresenta imóvel para a própria demanda
        var ownerId2 = record.getString('interest_owner_id')
        if (ownerId2 && ownerId2 === authId) {
          bizError = 'Você não pode apresentar um imóvel para a sua própria demanda.'
        }

        // 2c. Mesmo imóvel duas vezes na mesma demanda
        if (!bizError) {
          try {
            var dupes = e.app.findRecordsByFilter(
              'presentations',
              'interest_id = {:i} && property_id = {:p} && broker_id = {:b}',
              '',
              1,
              0,
              { i: interestId, p: record.getString('property_id'), b: authId },
            )
            if (dupes.length > 0) {
              bizError = 'Você já enviou este imóvel para esta demanda.'
            }
          } catch (_) {}
        }

        // 2d. Máximo de 5 apresentações pendentes por demanda (regra anti-spam)
        if (!bizError) {
          var pending = 0
          try {
            var rows = e.app.findRecordsByFilter(
              'presentations',
              "interest_id = {:i} && status = 'pendente'",
              '',
              500,
              0,
              { i: interestId },
            )
            pending = rows.length
          } catch (_) {}
          if (pending >= 5) {
            bizError =
              'Esta demanda já atingiu o limite máximo de 5 apresentações pendentes simultâneas.'
          }
        }
      }
    }

    if (bizError) {
      throw new BadRequestError(bizError)
    }
  } catch (err) {
    // BadRequestError deve seguir como resposta 400 ao cliente com a mensagem
    // de negócio; qualquer outro erro não pode abortar a criação em silêncio
    // com "Failed to create record." — vira 400 com mensagem clara.
    var msg = String((err && err.message) || err)
    if (
      String((err && err.name) || '') === 'BadRequestError' ||
      msg.indexOf('apresentação') !== -1 ||
      msg.indexOf('portfólio') !== -1 ||
      msg.indexOf('demanda') !== -1 ||
      msg.indexOf('Imóvel') !== -1
    ) {
      throw err
    }
    console.error('presentation_create: falha na preparação do record: ' + err)
    throw new BadRequestError('Não foi possível registrar a apresentação. Tente novamente.')
  }

  e.next()
}, 'presentations')
