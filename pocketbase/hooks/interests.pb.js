/// <reference path="../pb_data/types.d.ts" />
//
// Fluxo "interesse sem cadastro":
//
// 1. PRIVACIDADE — os campos contact_name/contact_email/contact_phone de um
//    interesse NUNCA aparecem na API pública. Eles só são serializados quando
//    o registro já pertence a um usuário autenticado que é o próprio dono
//    (durante o cadastro/owner view). Corretores e visitantes veem apenas os
//    dados públicos (cidade, tipo, quartos, faixa de valor...).
//
// 2. VINCULAÇÃO POSTERIOR — quando alguém cria conta (profile=interessado)
//    usando o mesmo e-mail informado num interesse anônimo, esse interesse
//    passa a pertencer à conta automaticamente (user_id = novo usuário).
//
// Idempotente: se o interesse já tem dono, nada é alterado.
onRecordEnrich('interests').add((e) => {
  const record = e.record
  const auth = e.requestInfo?.auth

  const ownerId = record.getString('user_id')
  const isOwner = !!auth && ownerId !== '' && auth.id === ownerId

  if (!isOwner) {
    // Visitantes (inclusive corretores) nunca veem o contato do interessado
    record.hide('contact_name', 'contact_email', 'contact_phone')
  }
  return e.next()
})

// Vincula interesses anônimos ao novo interessado que se cadastra
// com o mesmo e-mail informado no contato (case-insensitive).
onRecordAfterCreateSuccess('users').add((e) => {
  const user = e.record
  if (user.getString('profile') !== 'interessado') {
    return e.next()
  }

  const email = user.getString('email').trim().toLowerCase()
  if (!email) return e.next()

  try {
    const records = $app.findRecordsByFilter(
      'interests',
      "user_id = '' && contact_email != ''",
      '-created',
      50,
      0,
    )
    for (const r of records) {
      const contactEmail = r.getString('contact_email').trim().toLowerCase()
      if (contactEmail === email) {
        r.set('user_id', user.id)
        $app.save(r)
      }
    }
  } catch (err) {
    console.log('interest claim on signup failed:', err)
  }

  return e.next()
})

// Criação de interesse anônimo direto pela API: exige contato. A criação
// autenticada (usuário já cadastrado) segue o caminho normal da regra
// user_id = @request.auth.id e não passa por aqui.
onRecordCreate('interests').add((e) => {
  const record = e.record
  const isAnonymous = record.getString('user_id') === ''

  if (isAnonymous) {
    const hasName = record.getString('contact_name').trim() !== ''
    const hasEmail = record.getString('contact_email').trim() !== ''
    const hasPhone = record.getString('contact_phone').trim() !== ''

    if (!hasName || (!hasEmail && !hasPhone)) {
      throw new BadRequestError(
        'Para publicar sem cadastro, informe seu nome e um contato (telefone ou e-mail).',
      )
    }
    if (hasEmail && record.getString('contact_email').indexOf('@') === -1) {
      throw new BadRequestError('E-mail de contato inválido.')
    }
  }

  return e.next()
})
