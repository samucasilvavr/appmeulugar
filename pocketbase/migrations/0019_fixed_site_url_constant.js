/// <reference path="../pb_data/types.d.ts" />
// 0019 — Elimina DEFINITYIVAMENTE a variável do secret SITE_URL na origem dos
// links dos e-mails (18/11/2026): os hooks email_test.pb.js e
// interest_notifications.pb.js agora usam uma constante fixa
// https://www.appmeulugar.com.br (override opcional pelo secret
// SITE_URL_OVERRIDE). O secret SITE_URL antigo NÃO é mais lido por nenhum hook.
//
// Esta migração neutraliza os OUTROS caminhos que ainda poderiam emitir URL
// goskip ou de preview, SEM alterar textos, remetente ou placeholders:
//   1. settings.meta.appUrl (usado pelos e-mails nativos do PocketBase) →
//      https://www.appmeulugar.com.br.
//   2. Varredura final em subject/body_html de TODOS os templates de e-mail:
//      qualquer http(s)://...goskip.* restante vira o domínio próprio.
// Idempotente. Down: não restaura (decisão do usuário: nunca mais goskip).
migrate(
  (app) => {
    const appUrl = 'https://www.appmeulugar.com.br'

    // ---- 1. settings.meta.appUrl → domínio próprio ----
    try {
      const settings = app.settings()
      if (settings.meta.appUrl !== appUrl) {
        settings.meta.appUrl = appUrl
        app.save(settings)
        console.log('0019: settings.meta.appUrl → ' + appUrl)
      }
    } catch (err) {
      console.log('0019: settings.meta não aplicadas: ' + err)
    }

    // ---- 2. Zero URL goskip em qualquer template (rede de segurança final) ----
    let templates = []
    try {
      templates = app.findRecordsByFilter('email_templates', '', '', 100, 0)
    } catch (err) {
      console.log('0019: falha ao listar email_templates: ' + err)
      templates = []
    }

    let fixed = 0
    for (let i = 0; i < templates.length; i++) {
      const rec = templates[i]
      const slug = rec.getString('slug')
      const body = rec.getString('body_html') || ''
      const subject = rec.getString('subject') || ''
      const fixedBody = body.replace(/https?:\/\/[a-z0-9.-]*goskip\.[a-z.]+[^"'<>\s)]*/gi, appUrl)
      const fixedSubject = subject.replace(
        /https?:\/\/[a-z0-9.-]*goskip\.[a-z.]+[^"'<>\s)]*/gi,
        appUrl,
      )
      if (fixedBody !== body || fixedSubject !== subject) {
        rec.set('body_html', fixedBody)
        rec.set('subject', fixedSubject)
        app.save(rec)
        fixed++
        console.log('0019: template "' + slug + '" teve URLs goskip substituídas.')
      }
    }
    if (fixed === 0) console.log('0019: nenhum template com URL goskip — nada a fazer.')

    console.log('0019: concluída — base fixa dos links em ' + appUrl + '.')
  },
  (app) => {
    // Down: não restaura (decisão do usuário: nunca mais goskip).
  },
)
