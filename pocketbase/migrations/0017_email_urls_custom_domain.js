/// <reference path="../pb_data/types.d.ts" />
// Aponta os links dos e-mails transacionais para o DOMÍNIO PRÓPRIO do usuário,
// https://www.appmeulugar.com.br — decisão explícita dele (18/11/2026). NUNCA mais
// URLs *.goskip.app: a produção (appmeulugar-f377c.goskip.app) não está publicada
// e o usuário testou de novo e os links ainda caíam na tela "Esse app ainda não
// foi publicado".
//
// Fontes de URL na geração de links:
//  1. Secret SITE_URL — lido a CADA envio pelos hooks interest_notifications.pb.js
//     e email_test.pb.js (trocado no painel, sem migração).
//  2. settings.meta.appUrl — usado pelos e-mails nativos do PocketBase; reapontado
//     aqui. Como o valor anterior era um domínio goskip, o migration varre também
//     os templates e troca QUALQUER goskip restante no HTML pelo domínio próprio.
//
// O domínio www.appmeulugar.com.br hoje aponta para um site HostGator — os links
// só funcionarão de verdade quando ele estiver servindo/redirecionando para o app
// (aviso já dado ao usuário). Textos, variáveis e remetente NÃO mudam. Idempotente.
migrate(
  (app) => {
    const appUrl = 'https://www.appmeulugar.com.br'

    // ---- 1. settings.meta.appUrl → domínio próprio ----
    const settings = app.settings()
    settings.meta.appUrl = appUrl
    app.save(settings)

    // ---- 2. Templates: troca qualquer URL goskip remanescente no HTML ----
    let templates = []
    try {
      templates = app.findRecordsByFilter('email_templates', '', '', 500, 0)
    } catch (err) {
      console.log('0017: falha ao listar email_templates: ' + err)
    }
    for (let i = 0; i < templates.length; i++) {
      const rec = templates[i]
      const body = rec.getString('body_html') || ''
      if (body.indexOf('goskip') === -1) continue
      // Substitui qualquer URL http(s) de domínio goskip pela base do domínio próprio
      const fixed = body.replace(/https?:\/\/[a-z0-9.-]*goskip\.app[^"'<>\s)]*/gi, appUrl)
      rec.set('body_html', fixed)
      app.save(rec)
      console.log('0017: template "' + rec.getString('slug') + '" teve URLs goskip substituídas.')
    }

    console.log('0017: appUrl e templates apontando para ' + appUrl)
  },
  (app) => {
    // Down: não restaura URLs goskip (decisão do usuário: nunca mais usar).
  },
)
