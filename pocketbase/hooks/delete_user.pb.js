// Exclusão definitiva de usuário pelo admin (LGPD: direito de eliminação).
//
// ROTA: DELETE /backend/v1/appmeulugar/admin/users/{id}
// (o gate requireAppAdmin e as demais rotas de gestão vivem em admin_users.pb.js —
//  este arquivo contém apenas o handler de exclusão, para manter admin_users.pb.js
//  dentro do limite de leitura e separar responsabilidades.)
//
// Remove o usuário JUNTO com todos os registros vinculados a ele:
//   favoritos, apresentações (como comprador ou corretor), mensagens enviadas,
//   conversas (como comprador ou corretor), interesses e imóveis.
// O admin nunca exclui o próprio usuário (proteção contra lockout).
//
// Runtime JSVM: lógica 100% inline no callback.
routerAdd(
  'DELETE',
  '/backend/v1/appmeulugar/admin/users/{id}',
  (e) => {
    const id = e.request.pathValue('id')
    let record
    try {
      record = e.app.findRecordById('users', id)
    } catch (_) {
      throw new NotFoundError('Usuário não encontrado.')
    }

    // Proteção: o admin nunca exclui o próprio usuário (evita lockout).
    if (record.id === e.auth.id) {
      throw new BadRequestError('Você não pode excluir o seu próprio usuário.')
    }

    const app = e.app
    const removed = {
      interests: 0,
      properties: 0,
      presentations: 0,
      chats: 0,
      favorites: 0,
      messages: 0,
    }

    function deleteAll(collection, filter, params, key) {
      try {
        const rows = app.findRecordsByFilter(collection, filter, '', 500, 0, params)
        for (var i = 0; i < rows.length; i++) {
          try {
            app.delete(rows[i])
            removed[key]++
          } catch (_) {}
        }
      } catch (_) {}
    }

    // Favoritos primeiro (referenciam interests/properties), depois vínculos diretos.
    deleteAll('favorites', 'user_id = {:uid}', { uid: id }, 'favorites')
    deleteAll('presentations', 'interest_owner_id = {:uid}', { uid: id }, 'presentations')
    deleteAll('presentations', 'broker_id = {:uid}', { uid: id }, 'presentations')
    deleteAll('messages', 'sender_id = {:uid}', { uid: id }, 'messages')
    deleteAll('chats', 'buyer_id = {:uid}', { uid: id }, 'chats')
    deleteAll('chats', 'broker_id = {:uid}', { uid: id }, 'chats')
    deleteAll('interests', 'user_id = {:uid}', { uid: id }, 'interests')
    deleteAll('properties', 'user_id = {:uid}', { uid: id }, 'properties')

    try {
      app.delete(record)
    } catch (err) {
      throw new BadRequestError(
        'Não foi possível excluir o usuário: ' + String((err && err.message) || err || ''),
      )
    }
    return e.json(200, { deleted: true, removed: removed })
  },
  (e) => {
    if (!e.auth) {
      throw new UnauthorizedError('Faça login para acessar a gestão de usuários.')
    }
    if (!e.hasSuperuserAuth() && e.auth.getString('profile') !== 'admin') {
      throw new ForbiddenError('Acesso restrito a administradores.')
    }
    return e.next()
  },
)
