/// <reference path="../pb_data/types.d.ts" />
// delete_user.pb.js — Exclusão DEFINITIVA de usuário pelo admin (LGPD: direito de eliminação).
//
// DELETE /backend/v1/appmeulugar/admin/users/{id}
//
// Trata registros vinculados antes de remover o users (a coleção users não tem
// cascadeDelete nos relations de properties/interests/chats/presentations):
//   apresentações (como broker ou owner) -> excluídas
//   chats (como buyer ou broker) -> mensagens excluídas, chats excluídos
//   favoritos, imóveis e demandas do usuário -> excluídos
// Por fim o próprio registro do usuário é excluído (auth record do PocketBase).
//
// IMPORTANTE (runtime JSVM): toda a lógica fica inline no corpo do callback.
routerAdd(
  'DELETE',
  '/backend/v1/appmeulugar/admin/users/{id}',
  (c) => {
    const info = $apis.requestInfo(c)
    const admin = info.auth

    if (!admin || admin.collection().name !== 'users' || admin.get('profile') !== 'admin') {
      throw new ApiError(403, 'Acesso restrito a administradores.')
    }

    const id = c.pathParam('id')
    if (!id) throw new ApiError(400, 'ID do usuário é obrigatório.')

    const target = $app.findRecordById('users', id)
    if (!target) throw new ApiError(404, 'Usuário não encontrado.')

    // Proteção contra lockout: admin não pode excluir a si mesmo nem outro admin.
    if (target.id === admin.id) {
      throw new ApiError(400, 'Você não pode excluir a sua própria conta de administrador.')
    }
    if (target.get('profile') === 'admin') {
      throw new ApiError(400, 'Não é permitido excluir outro administrador pela interface.')
    }

    const removed = {
      presentations: 0,
      chats: 0,
      messages: 0,
      favorites: 0,
      properties: 0,
      interests: 0,
      user: 0,
    }

    // 1. Apresentações onde o usuário é broker ou owner do interesse.
    const presBroker = $app.findRecordsByFilter(
      'presentations',
      'broker_id = {:uid} || interest_owner_id = {:uid}',
      '',
      0,
      0,
      { uid: id },
    )
    for (const p of presBroker) {
      $app.delete(p)
      removed.presentations++
    }

    // 2. Chats onde o usuário é buyer ou broker — mensagens primeiro.
    const chats = $app.findRecordsByFilter(
      'chats',
      'buyer_id = {:uid} || broker_id = {:uid}',
      '',
      0,
      0,
      { uid: id },
    )
    for (const chat of chats) {
      const msgs = $app.findRecordsByFilter('messages', 'chat_id = {:cid}', '', 0, 0, {
        cid: chat.id,
      })
      for (const m of msgs) {
        $app.delete(m)
        removed.messages++
      }
      $app.delete(chat)
      removed.chats++
    }

    // 3. Favoritos do usuário.
    const favs = $app.findRecordsByFilter('favorites', 'user_id = {:uid}', '', 0, 0, { uid: id })
    for (const f of favs) {
      $app.delete(f)
      removed.favorites++
    }

    // 4. Imóveis do usuário (apresentações que referenciam esses imóveis já foram removidas em 1).
    const props = $app.findRecordsByFilter('properties', 'user_id = {:uid}', '', 0, 0, { uid: id })
    for (const p of props) {
      $app.delete(p)
      removed.properties++
    }

    // 5. Demandas do usuário.
    const ints = $app.findRecordsByFilter('interests', 'user_id = {:uid}', '', 0, 0, { uid: id })
    for (const i of ints) {
      $app.delete(i)
      removed.interests++
    }

    // 6. O próprio usuário (auth record).
    $app.delete(target)
    removed.user++

    return c.json(200, { ok: true, removed })
  },
  $apis.requireAuth(),
)
