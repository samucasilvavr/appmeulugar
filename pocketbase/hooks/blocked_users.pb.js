/// <reference path="../pb_data/types.d.ts" />
// blocked_users.pb.js — Bloqueio de usuários pelo admin (LGPD/uso da plataforma).
// Campo `blocked` em users (migração 0014). Efeitos:
//   - OnRecordAuthRequest: login e refresh de token de usuário bloqueado são recusados (403).
//   - O hook de e-mails (interest_notifications.pb.js) também ignora usuários bloqueados.
routerAdd(
  'POST',
  '/backend/v1/appmeulugar/admin/users/{id}/block',
  (c) => {
    const info = $apis.requestInfo(c)
    const admin = info.auth

    // Apenas administradores do app.
    if (!admin || admin.collection().name !== 'users' || admin.get('profile') !== 'admin') {
      throw new ApiError(403, 'Acesso restrito a administradores.')
    }

    const id = c.pathParam('id')
    if (!id) throw new ApiError(400, 'ID do usuário é obrigatório.')

    const target = $app.findRecordById('users', id)
    if (!target) throw new ApiError(404, 'Usuário não encontrado.')

    if (target.get('profile') === 'admin') {
      throw new ApiError(400, 'Não é permitido bloquear um administrador.')
    }

    const body = info.body || {}
    const blocked = !!body.blocked

    target.set('blocked', blocked)
    $app.save(target)

    return c.json(200, {
      ok: true,
      id: target.id,
      blocked: target.getBool('blocked'),
    })
  },
  $apis.requireAuth(),
)

// Bloqueia login/refresh de usuário bloqueado (bloqueio reversível via /admin).
onRecordAuthRequest((e) => {
  const record = e.record
  if (record && record.collection().name === 'users' && record.getBool('blocked')) {
    throw new ApiError(403, 'Sua conta está bloqueada. Fale com contato@appmeulugar.com.br.')
  }
  e.next()
}, 'users')

// GET /backend/v1/appmeulugar/admin/users/{id} — útil para conferir o estado pós-ação.
routerAdd(
  'GET',
  '/backend/v1/appmeulugar/admin/users/{id}',
  (c) => {
    const info = $apis.requestInfo(c)
    const admin = info.auth
    if (!admin || admin.collection().name !== 'users' || admin.get('profile') !== 'admin') {
      throw new ApiError(403, 'Acesso restrito a administradores.')
    }
    const id = c.pathParam('id')
    const target = $app.findRecordById('users', id)
    if (!target) throw new ApiError(404, 'Usuário não encontrado.')
    return c.json(200, {
      id: target.id,
      blocked: target.getBool('blocked'),
      profile: target.get('profile'),
      email: target.get('email'),
      name: target.get('name'),
    })
  },
  $apis.requireAuth(),
)
