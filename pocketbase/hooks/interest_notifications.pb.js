// Dispara as notificações por e-mail quando um interesse é publicado ou editado.
// A lógica fica em interest_notifications_lib.js. Erros nunca interrompem a publicação.

onRecordAfterCreateSuccess((e) => {
  e.next()
  try {
    const lib = require(`${__hooks}/interest_notifications_lib.js`)
    lib.dispatchInterest(e.app, e.record)
  } catch (err) {
    console.error('interest notification (create) failed: ' + err)
  }
}, 'interests')

onRecordAfterUpdateSuccess((e) => {
  e.next()
  try {
    const lib = require(`${__hooks}/interest_notifications_lib.js`)
    lib.dispatchInterest(e.app, e.record)
  } catch (err) {
    console.error('interest notification (update) failed: ' + err)
  }
}, 'interests')
