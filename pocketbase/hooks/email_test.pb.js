// Envio de e-mail de TESTE dos templates (aba "E-mails" do /admin).
//
// Não salva nem altera nada: lê o template pelo slug (somente leitura), preenche
// as variáveis com dados de exemplo e envia para o endereço informado, usando o
// mesmo remetente dos envios reais. Não grava em notification_logs.
//
// Rota: POST /backend/v1/appmeulugar/admin/email-test   body {slug, to}
// Exige auth de usuário com profile = 'admin'.
// Runtime Skip Cloud (JSVM): toda a lógica vive DENTRO do callback.

routerAdd('POST', '/backend/v1/appmeulugar/admin/email-test', (e) => {
  if (!e.auth) {
    throw new UnauthorizedError('Faça login para enviar e-mails de teste.')
  }
  if (!e.hasSuperuserAuth() && e.auth.getString('profile') !== 'admin') {
    throw new ForbiddenError('Acesso restrito a administradores.')
  }

  const body = e.requestInfo().body || {}
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  const to = typeof body.to === 'string' ? body.to.trim() : ''
  if (!slug) {
    throw new BadRequestError('Informe o template a testar.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new BadRequestError('Informe um endereço de e-mail válido.')
  }

  // JSVM: findFirstRecordByFilter(collection, filter, params...) — sem sort/limit/offset.
  // Antes eram passados '', 1, 0 extras, o que quebrava a busca e mascarava o erro
  // como "Template não encontrado." mesmo com o registro existente no banco.
  let rec
  try {
    rec = e.app.findFirstRecordByFilter('email_templates', 'slug = {:slug}', {
      slug: slug,
    })
  } catch (err) {
    console.log('email-test: falha ao buscar template "' + slug + '": ' + String(err))
    throw new NotFoundError('Template não encontrado: "' + slug + '".')
  }
  if (!rec || !rec.getString('subject')) {
    throw new NotFoundError('Template não encontrado: "' + slug + '" (registro vazio).')
  }

  const siteUrl = String($os.getenv('SITE_URL') || '').replace(/\/+$/, '')
  const sample = {
    nome: 'Maria Exemplo',
    descricao: 'apartamento para comprar em São Paulo, com 2 quarto(s) ou mais, até R$ 450.000',
    tipo: 'apartamento',
    finalidade: 'comprar',
    cidade: 'São Paulo',
    estado: 'SP',
    quartos: 2,
    valor: 'R$ 450.000',
    'link-demanda':
      '<p><a href="' +
      siteUrl +
      '/painel-corretor" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;">Visualizar demanda</a></p>',
    'link-descadastrar':
      '<p><a href="' +
      siteUrl +
      '/descadastrar?email=exemplo" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;">Não quero receber estes e-mails</a></p>',
    'link-descadastrar-texto': siteUrl + '/descadastrar?email=exemplo',
  }

  function render(text) {
    let out = String(text || '')
    for (const key in sample) {
      out = out.split('[' + key + ']').join(String(sample[key]))
    }
    return out
  }

  const subject = '[TESTE] ' + render(rec.getString('subject'))
  const html = render(rec.getString('body_html'))

  try {
    const message = new MailerMessage({
      from: { address: 'contato@appmeulugar.com.br', name: 'AppMeuLugar' },
      to: [{ address: to }],
      subject: subject,
      html: html,
      headers: { 'Reply-To': 'AppMeuLugar <contato@appmeulugar.com.br>' },
    })
    e.app.newMailClient().send(message)
  } catch (err) {
    throw new BadRequestError('Não foi possível enviar o e-mail de teste: ' + String(err))
  }

  return e.json(200, { sent: true, to: to, subject: subject })
})
