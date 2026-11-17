/// <reference path="../pb_data/types.d.ts" />
// creci_review.pb.js
// Cadastro de corretor: quando o registro de usuário é criado com a foto da
// carteirinha (creci_photo), marca creci_review = true — a conta nasce
// 'aprovada' (acesso imediato) e fica sinalizada para conferência posterior
// pelo admin no /admin. Sem foto: creci_status permanece 'pendente'
// (aprovação manual) e creci_review fica indefinido.
//
// Regras JSVM: toda a lógica vive inline no corpo do callback.
onRecordCreate((e) => {
  const record = e.record
  try {
    if (record && record.get('profile') === 'corretor') {
      const photo = record.get('creci_photo')
      const status = record.get('creci_status')
      if (photo && photo.name && status === 'aprovado') {
        record.set('creci_review', true)
      }
    }
  } catch (err) {
    console.error('creci_review: falha ao sinalizar conferência:', err)
  }
  e.next()
}, 'users')
