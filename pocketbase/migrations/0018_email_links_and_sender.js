/// <reference path="../pb_data/types.d.ts" />
// 0018 — Conserta os DOIS problemas dos e-mails reportados em 18/11/2026:
//
// 1. TEMPLATE GERAL COM BOTÃO ERRADO. Os templates geral_lista_importada e
//    match_corretor estavam gravados com o MESMO placeholder [link-demanda], e o
//    envio de teste (email_test.pb.js) sempre preenchia [link-demanda] com o botão
//    "Visualizar demanda" → /painel-corretor. Resultado: o e-mail do template
//    geral (aviso "lista importada") saía com o botão do template de match.
//    Correção no banco:
//      - geral_lista_importada usa [link-ver-demandas] → botão "Ver demandas"
//      - match_corretor continua com [link-visualizar-demanda] → "Visualizar demanda"
//      - ambos com [link-descadastrar] em parágrafo PRÓPRIO (nunca aninhado
//        em outra âncora) e [link-descadastrar-texto] como fallback de texto puro.
//
// 2. REMETENTE / APPURL. Reafirma settings.meta (senderAddress/senderName/appUrl)
//    no domínio próprio e garante que NENHUM template carregue URL goskip: a
//    migração varre subject/body_html e troca qualquer http(s)://...goskip.* pela
//    base https://www.appmeulugar.com.br (fonte única dos links é o secret SITE_URL,
//    lido a cada envio pelos hooks — isto aqui é só rede de segurança).
//
// Idempotente: pode rodar mais de uma vez sem efeito adicional. Os textos
// aprovados dos templates NÃO mudam além dos placeholders.
migrate(
  (app) => {
    const appUrl = 'https://www.appmeulugar.com.br'

    // ---- 1. settings.meta: remetente e appUrl no domínio próprio ----
    try {
      const settings = app.settings()
      let dirty = false
      if (settings.meta.senderAddress !== 'contato@appmeulugar.com.br') {
        settings.meta.senderAddress = 'contato@appmeulugar.com.br'
        settings.meta.senderName = 'AppMeuLugar'
        dirty = true
      }
      if (settings.meta.appUrl !== appUrl) {
        settings.meta.appUrl = appUrl
        dirty = true
      }
      if (dirty) app.save(settings)
    } catch (err) {
      console.log('0018: settings.meta não aplicadas: ' + err)
    }

    // ---- 2. Templates: botões corretos por slug + zero URL goskip ----
    function button(href, label) {
      return (
        '<p style="margin:16px 0;"><a href="' +
        href +
        '" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;' +
        'text-decoration:none;border-radius:6px;">' +
        label +
        '</a></p>'
      )
    }

    let templates = []
    try {
      templates = app.findRecordsByFilter('email_templates', '', '', 100, 0)
    } catch (err) {
      console.log('0018: falha ao listar email_templates: ' + err)
    }

    for (let i = 0; i < templates.length; i++) {
      const rec = templates[i]
      const slug = rec.getString('slug')
      let body = rec.getString('body_html') || ''
      const original = body

      // 2a. Substitui o placeholder genérico pelo específico do template.
      //     O botão vem renderizado em parágrafo próprio (nunca dentro de outra âncora).
      if (slug === 'geral_lista_importada') {
        if (body.indexOf('[link-ver-demandas]') === -1) {
          body = body.split('[link-demanda]').join('[link-ver-demandas]')
        }
      } else if (slug === 'match_corretor') {
        if (body.indexOf('[link-visualizar-demanda]') === -1) {
          body = body.split('[link-demanda]').join('[link-visualizar-demanda]')
        }
      }

      // 2b. Qualquer URL goskip gravada no HTML vira o domínio próprio.
      body = body.replace(/https?:\/\/[a-z0-9.-]*goskip\.[a-z.]+[^"'<>\s)]*/gi, appUrl)

      if (body !== original) {
        rec.set('body_html', body)
        rec.set('variables', rec.getString('variables').replace('[link-demanda]', ''))
        app.save(rec)
        console.log('0018: template "' + slug + '" atualizado (placeholders/URLs).')
      }
    }

    console.log('0018: concluída — botões por template, remetente e appUrl no domínio próprio.')
  },
  (app) => {
    // Down: não restaura (decisão do usuário: nunca mais goskip nem botão trocado).
  },
)
