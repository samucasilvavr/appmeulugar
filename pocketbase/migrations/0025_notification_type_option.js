/// <reference path="../pb_data/types.d.ts" />
// 0025 — Correção: adiciona a opção 'nova_apresentacao' ao select
// notification_logs.notification_type (a tentativa dentro da 0024 não surtiu
// efeito: no JSVM o campo da coleção não expõe .get()/.set() de Record — o
// acesso correto é pela propriedade exportada `field.values`).
migrate(
  (app) => {
    const logs = app.findCollectionByNameOrId('notification_logs')
    const field = logs.fields.getByName('notification_type')
    let current = []
    try {
      current = field.values || []
    } catch (_) {
      current = []
    }
    const target = 'nova_apresentacao'
    let has = false
    for (let i = 0; i < current.length; i++) {
      if (String(current[i]) === target) has = true
    }
    if (!has) {
      const next = []
      for (let i = 0; i < current.length; i++) next.push(String(current[i]))
      next.push(target)
      field.values = next
      app.save(logs)
    }
  },
  (app) => {
    // Down: volta o select para os valores originais (best-effort).
    try {
      const logs = app.findCollectionByNameOrId('notification_logs')
      const field = logs.fields.getByName('notification_type')
      const current = field.values || []
      const next = []
      for (let i = 0; i < current.length; i++) {
        if (String(current[i]) !== 'nova_apresentacao') next.push(String(current[i]))
      }
      field.values = next
      app.save(logs)
    } catch (_) {}
  },
)
