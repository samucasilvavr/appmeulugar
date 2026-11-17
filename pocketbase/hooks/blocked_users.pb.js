// Bloqueio de usuários (LGPD/admin) — PARTE 2: recusa de login.
//
// A rota PATCH /backend/v1/appmeulugar/admin/users/{id}/block e a rota DELETE
// vivem em admin_users.pb.js (junto das demais rotas de gestão de usuários).
// Este arquivo contém apenas o gate de autenticação: um usuário com
// blocked = true não consegue fazer login (nem renovar token) e recebe 403.
// Admins (profile = 'admin') nunca são bloqueados pela rota — proteção extra.
//
// Runtime JSVM: lógica 100% inline no callback.

onRecordAuthRequest((e) => {
  var record = e.record
  if (record && record.collection().name === 'users' && record.getBool('blocked')) {
    throw new ForbiddenError(
      'Sua conta está bloqueada. Entre em contato com contato@appmeulugar.com.br.',
    )
  }
  e.next()
}, 'users')
