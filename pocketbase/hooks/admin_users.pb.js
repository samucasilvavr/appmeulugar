// Rotas exclusivas do ADMINISTRADOR (profile = 'admin') para gestão de usuários.
//
// Por que rotas customizadas: o usuário autenticado comum (mesmo o admin do app,
// que NÃO é superusuário do PocketBase) não pode ler nem alterar o e-mail de
// outros usuários — emailVisibility=false esconde o e-mail e a API de records
// rejeita alterações de credenciais de outro auth record.
//
// Rotas (todas exigem auth de usuário com profile = 'admin'):
//   GET   /backend/v1/appmeulugar/admin/users        — lista TODOS os usuários (com e-mail)
//   PATCH /backend/v1/appmeulugar/admin/users/{id}   — edita qualquer campo (nome, e-mail,
//         telefone, estado, cidade, CRECI, UF, imobiliária, regiões, perfil,
//         status do CRECI, status da conta = verified)
//   POST  /backend/v1/appmeulugar/admin/users        — cria novo usuário (perfil livre,
//         inclusive 'admin') com nome, e-mail e senha
//   PATCH /backend/v1/appmeulugar/admin/users/{id}/block  body {blocked:true|false}
//         — bloqueia (impede login/uso) ou desbloqueia o usuário
//
// A listagem e a edição expõem também creci_photo (nome do arquivo da foto da
// carteirinha CRECI) e creci_review (conferência posterior pendente): o admin
// vê a foto e aprova a conferência com PATCH { creci_review: false }.
//
// A exclusão definitiva (DELETE /backend/v1/appmeulugar/admin/users/{id}, com
// limpeza de interesses/imóveis/apresentações/chats/favoritos) vive em
// delete_user.pb.js.
//
// Nota de runtime: o JSVM do PocketBase executa callbacks em pools de VM
// separados — TODA a lógica precisa viver DENTRO de cada callback, sem
// referenciar declarações de topo de arquivo. Nunca expõe hash de senha.

function requireAppAdmin(e) {
  if (!e.auth) {
    throw new UnauthorizedError('Faça login para acessar a gestão de usuários.')
  }
  if (!e.hasSuperuserAuth() && e.auth.getString('profile') !== 'admin') {
    throw new ForbiddenError('Acesso restrito a administradores.')
  }
  return e.next()
}

routerAdd(
  'GET',
  '/backend/v1/appmeulugar/admin/users',
  (e) => {
    function publicUser(u) {
      return {
        id: u.id,
        email: u.email(),
        name: u.getString('name'),
        profile: u.getString('profile'),
        phone: u.getString('phone'),
        state: u.getString('state'),
        city: u.getString('city'),
        creci: u.getString('creci'),
        creci_uf: u.getString('creci_uf'),
        real_estate: u.getString('real_estate'),
        regions: u.getString('regions'),
        creci_status: u.getString('creci_status'),
        creci_review: u.getBool('creci_review'),
        creci_photo: u.getString('creci_photo'),
        blocked: u.getBool('blocked'),
        verified: u.getBool('verified'),
        created: u.getString('created'),
        updated: u.getString('updated'),
      }
    }

    const records = e.app.findRecordsByFilter('users', '', '-created', 500, 0)
    return e.json(200, { items: records.map(publicUser) })
  },
  requireAppAdmin,
)

// ---- BLOQUEAR / DESBLOQUEAR ----
routerAdd(
  'PATCH',
  '/backend/v1/appmeulugar/admin/users/{id}/block',
  (e) => {
    const id = e.request.pathValue('id')
    let record
    try {
      record = e.app.findRecordById('users', id)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }
    const body = e.requestInfo().body || {}

    // Proteção: um admin não pode bloquear o próprio acesso de admin.
    if (record.id === e.auth.id && body.blocked !== false) {
      throw new BadRequestError('Você não pode bloquear o seu próprio usuário.')
    }

    record.set('blocked', !!body.blocked)
    try {
      e.app.save(record)
    } catch (err) {
      throw new BadRequestError(
        'Não foi possível atualizar o bloqueio: ' + String((err && err.message) || err || ''),
      )
    }
    return e.json(200, { item: { id: record.id, blocked: record.getBool('blocked') } })
  },
  requireAppAdmin,
)

// (A exclusão com limpeza de vínculos vive em delete_user.pb.js.)

// ---- EDITAR usuário (PATCH com todos os campos) ----
routerAdd(
  'PATCH',
  '/backend/v1/appmeulugar/admin/users/{id}',
  (e) => {
    const ALLOWED_PROFILES = ['interessado', 'corretor', 'admin']
    const ALLOWED_CRECI_STATUS = ['pendente', 'aprovado', 'rejeitado', '']

    function str(v) {
      return typeof v === 'string' ? v.trim() : ''
    }

    function publicUser(u) {
      return {
        id: u.id,
        email: u.email(),
        name: u.getString('name'),
        profile: u.getString('profile'),
        phone: u.getString('phone'),
        state: u.getString('state'),
        city: u.getString('city'),
        creci: u.getString('creci'),
        creci_uf: u.getString('creci_uf'),
        real_estate: u.getString('real_estate'),
        regions: u.getString('regions'),
        creci_status: u.getString('creci_status'),
        creci_review: u.getBool('creci_review'),
        creci_photo: u.getString('creci_photo'),
        blocked: u.getBool('blocked'),
        verified: u.getBool('verified'),
        created: u.getString('created'),
        updated: u.getString('updated'),
      }
    }

    const id = e.request.pathValue('id')
    let record
    try {
      record = e.app.findRecordById('users', id)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    const body = e.requestInfo().body || {}

    // Proteção: um admin não pode remover o próprio acesso de admin.
    if (record.id === e.auth.id && 'profile' in body && str(body.profile) !== 'admin') {
      throw new BadRequestError('Você não pode remover seu próprio perfil de administrador.')
    }

    const simple = ['name', 'phone', 'state', 'city', 'creci', 'creci_uf', 'real_estate', 'regions']
    for (const f of simple) {
      if (f in body) record.set(f, str(body[f]))
    }

    if ('profile' in body) {
      const p = str(body.profile)
      if (ALLOWED_PROFILES.indexOf(p) === -1) {
        throw new BadRequestError('Perfil inválido: ' + (p || '(vazio)'))
      }
      record.set('profile', p)
    }

    if ('creci_status' in body) {
      const s = str(body.creci_status)
      if (ALLOWED_CRECI_STATUS.indexOf(s) === -1) {
        throw new BadRequestError('Status do CRECI inválido: ' + s)
      }
      record.set('creci_status', s)
    }

    // Conferência da carteirinha: o admin confirma a conferência limpando a
    // flag (creci_review=false). A foto não é alterável por aqui — só removendo
    // o usuário ou substituindo o arquivo no painel do PocketBase.
    if ('creci_review' in body) {
      record.set('creci_review', !!body.creci_review)
    }

    if ('email' in body) {
      const email = str(body.email)
      if (!email || email.indexOf('@') === -1) {
        throw new BadRequestError('Informe um e-mail válido.')
      }
      record.setEmail(email)
    }

    if ('password' in body && str(body.password) !== '') {
      record.setPassword(str(body.password))
    }

    if ('verified' in body) {
      record.setVerified(!!body.verified)
    }

    // Campos de credenciais (e-mail/senha) não podem ficar vazios.
    if (!record.email()) {
      throw new BadRequestError('O usuário precisa de um e-mail válido.')
    }

    try {
      e.app.save(record)
    } catch (err) {
      const msg = String((err && err.message) || err || '')
      if (msg.indexOf('email') !== -1 && msg.toLowerCase().indexOf('unique') !== -1) {
        throw new BadRequestError('Já existe uma conta com este e-mail.')
      }
      throw new BadRequestError('Não foi possível salvar: ' + (msg || 'erro desconhecido'))
    }
    return e.json(200, { item: publicUser(record) })
  },
  requireAppAdmin,
)

routerAdd(
  'POST',
  '/backend/v1/appmeulugar/admin/users',
  (e) => {
    const ALLOWED_PROFILES = ['interessado', 'corretor', 'admin']
    const ALLOWED_CRECI_STATUS = ['pendente', 'aprovado', 'rejeitado', '']

    function str(v) {
      return typeof v === 'string' ? v.trim() : ''
    }

    function publicUser(u) {
      return {
        id: u.id,
        email: u.email(),
        name: u.getString('name'),
        profile: u.getString('profile'),
        phone: u.getString('phone'),
        state: u.getString('state'),
        city: u.getString('city'),
        creci: u.getString('creci'),
        creci_uf: u.getString('creci_uf'),
        real_estate: u.getString('real_estate'),
        regions: u.getString('regions'),
        creci_status: u.getString('creci_status'),
        verified: u.getBool('verified'),
        created: u.getString('created'),
        updated: u.getString('updated'),
      }
    }

    const body = e.requestInfo().body || {}

    const name = str(body.name)
    const email = str(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    const profile = str(body.profile) || 'admin'

    if (!name) throw new BadRequestError('Informe o nome do novo usuário.')
    if (!email || email.indexOf('@') === -1) {
      throw new BadRequestError('Informe um e-mail válido.')
    }
    if (password.length < 8) {
      throw new BadRequestError('A senha deve ter no mínimo 8 caracteres.')
    }
    if (ALLOWED_PROFILES.indexOf(profile) === -1) {
      throw new BadRequestError('Perfil inválido: ' + profile)
    }

    // E-mail deve ser único (findAuthRecordByEmail lança quando não encontra).
    let emailTaken = false
    try {
      e.app.findAuthRecordByEmail('users', email)
      emailTaken = true
    } catch (_) {
      emailTaken = false
    }
    if (emailTaken) {
      throw new BadRequestError('Já existe uma conta com este e-mail.')
    }

    const users = e.app.findCollectionByNameOrId('users')
    const record = new Record(users)
    record.setEmail(email)
    record.setPassword(password)
    record.setVerified(true)
    record.set('name', name)
    record.set('profile', profile)
    if ('phone' in body) record.set('phone', str(body.phone))
    if ('state' in body) record.set('state', str(body.state))
    if ('city' in body) record.set('city', str(body.city))
    if ('creci' in body) record.set('creci', str(body.creci))
    if ('creci_uf' in body) record.set('creci_uf', str(body.creci_uf))
    if ('real_estate' in body) record.set('real_estate', str(body.real_estate))
    if ('regions' in body) record.set('regions', str(body.regions))
    if (profile === 'corretor' && !('creci_status' in body)) {
      record.set('creci_status', 'pendente')
    } else if (
      'creci_status' in body &&
      ALLOWED_CRECI_STATUS.indexOf(str(body.creci_status)) !== -1
    ) {
      record.set('creci_status', str(body.creci_status))
    }

    try {
      e.app.save(record)
    } catch (err) {
      const msg = String((err && err.message) || err || '')
      if (msg.indexOf('email') !== -1 && msg.toLowerCase().indexOf('unique') !== -1) {
        throw new BadRequestError('Já existe uma conta com este e-mail.')
      }
      throw new BadRequestError('Não foi possível criar a conta: ' + (msg || 'erro desconhecido'))
    }
    return e.json(200, { item: publicUser(record) })
  },
  requireAppAdmin,
)
