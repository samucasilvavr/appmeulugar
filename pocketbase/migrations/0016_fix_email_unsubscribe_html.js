/// <reference path="../pb_data/types.d.ts" />
// Conserta o HTML do bloco de descadastro dos e-mails transacionais e garante
// que os links apontem para o endereço de PREVIEW do app.
//
// Problema 1 (HTML quebrado): no template "match_corretor" o botão de
// descadastro [link-descadastrar] (que o hook entrega como <p><a .../></p>)
// estava ANINHADO dentro de outra âncora — <a href="[link-descadastrar]">Não
// quer mais receber?</a>. Âncora dentro de âncora é HTML inválido: o Gmail
// descarta a tag externa e o texto "Não quer mais receber?" vaza solto, sem
// link clicável. Correção: o botão fica em parágrafo próprio, dentro de <p>.
//
// Problema 2 (URL de produção não publicada): settings.meta.appUrl (usado nos
// e-mails nativos do PocketBase) apontava para a produção. Reaponta para o
// preview. Os hooks leem o secret SITE_URL a cada envio — trocá-lo no painel
// já corrige os e-mails de interesse sem migração.
//
// Textos, variáveis e remetente dos templates NÃO mudam — só o HTML do bloco
// de descadastro e o appUrl. Idempotente.
migrate(
  (app) => {
    const previewUrl = 'https://appmeulugar-f377c--preview.goskip.app'

    // ---- 1. settings.meta.appUrl → preview ----
    const settings = app.settings()
    settings.meta.appUrl = previewUrl
    app.save(settings)

    // ---- 2. Template match_corretor: remove a âncora aninhada ----
    const fixTemplates = [
      {
        slug: 'match_corretor',
        // Antes: "...corretor cadastrado no AppMeuLugar. <a href="[link-descadastrar]">Não quer mais receber?</a>"
        // Depois: o botão [link-descadastrar] em parágrafo próprio, sem âncora externa.
        from:
          'corretor cadastrado no AppMeuLugar. ' +
          '<a href="[link-descadastrar]">N&atilde;o quer mais receber?</a></p>',
        to: 'corretor cadastrado no AppMeuLugar.</p>[link-descadastrar]',
      },
      {
        slug: 'geral_lista_importada',
        // Já correto (botão em <p> próprio), mas idempotente: garante a forma boa.
        from:
          'escreva para contato@appmeulugar.com.br ou use o bot&atilde;o ' +
          'abaixo.</p>[link-descadastrar]',
        to:
          'escreva para contato@appmeulugar.com.br ou use o bot&atilde;o ' +
          'abaixo.</p>[link-descadastrar]',
      },
    ]

    for (const t of fixTemplates) {
      let rec
      try {
        rec = app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', { slug: t.slug })
      } catch (_) {
        console.log('0016: template "' + t.slug + '" não encontrado — nada a fazer.')
        continue
      }
      if (!rec) continue

      const body = rec.getString('body_html') || ''
      if (body.indexOf(t.from) !== -1) {
        rec.set('body_html', body.split(t.from).join(t.to))
      } else if (t.slug === 'match_corretor' && body.indexOf('[link-descadastrar]</a>') !== -1) {
        // Forma alternativa já vista no banco: âncora externa com o placeholder
        // dentro do href, mesmo problema — normaliza para o parágrafo próprio.
        rec.set('body_html', body.split('[link-descadastrar]</a>').join('</p>[link-descadastrar]'))
      }
      app.save(rec)
      console.log('0016: template "' + t.slug + '" conferido/ajustado.')
    }
  },
  (app) => {
    // Down: não restaura o HTML quebrado (era um bug); mantém o appUrl como está.
  },
)
