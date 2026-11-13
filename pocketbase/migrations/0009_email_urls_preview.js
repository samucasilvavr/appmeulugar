/// <reference path="../pb_data/types.d.ts" />
// Aponta os links dos e-mails transacionais do PocketBase (verificação de
// conta e recuperação de senha) para o ENDEREÇO DE PREVIEW do app.
//
// Contexto: produção (appmeulugar-f377c.goskip.app) não está publicada — os
// links dos e-mails caíam em "Produção não publicada". O app ativo hoje é o
// preview. Quando o domínio próprio entrar no ar, basta trocar o valor de
// SITE_URL (Skip Cloud panel → Secrets) e reverter esta migração/rodar de novo
// — o hook lê o valor corrente, não um valor fixo.
//
// A URL vem do secret SITE_URL; como fallback (quando o secret não existe) usa
// o endereço de preview. Idempotente.
migrate(
  (app) => {
    let siteUrl = String($os.getenv('SITE_URL') || '').replace(/\/+$/, '')
    if (!siteUrl) siteUrl = 'https://appmeulugar-f377c--preview.goskip.app'

    const settings = app.settings()
    settings.meta.appUrl = siteUrl

    // Templates de e-mail: a variável {APP_URL} é substituída pelo appUrl.
    // Reescrevemos os templates garantindo o texto/link corretos em pt-BR.
    settings.meta.verificationTemplate = {
      subject: 'Confirme seu e-mail — AppMeuLugar',
      body:
        '<p>Olá,</p>' +
        '<p>Obrigado por se cadastrar no AppMeuLugar. Clique no botão abaixo para confirmar seu e-mail:</p>' +
        '<p><a href="{APP_URL}/verificar-email?token={TOKEN}" ' +
        'style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;' +
        'text-decoration:none;border-radius:6px;">Confirmar meu e-mail</a></p>' +
        '<p>Se você não criou uma conta, ignore este e-mail.</p>' +
        '<p style="font-size:12px;color:#6b7280;">AppMeuLugar — o imóvel certo encontra você.</p>',
    }

    settings.meta.resetPasswordTemplate = {
      subject: 'Redefinir sua senha — AppMeuLugar',
      body:
        '<p>Olá,</p>' +
        '<p>Recebemos uma solicitação para redefinir a senha da sua conta AppMeuLugar. ' +
        'Clique no botão abaixo para escolher uma nova senha:</p>' +
        '<p><a href="{APP_URL}/redefinir-senha?token={TOKEN}" ' +
        'style="display:inline-block;padding:10px 18px;background:#0f766e;color:#ffffff;' +
        'text-decoration:none;border-radius:6px;">Redefinir senha</a></p>' +
        '<p>Se você não solicitou isso, ignore este e-mail e sua senha permanecerá a mesma.</p>' +
        '<p style="font-size:12px;color:#6b7280;">AppMeuLugar — o imóvel certo encontra você.</p>',
    }

    app.save(settings)

    console.log('0009: appUrl e templates de e-mail apontando para ' + siteUrl)
  },
  (app) => {
    // Reverte para os templates padrão do PocketBase (ainda com o appUrl de preview).
    const settings = app.settings()
    settings.meta.verificationTemplate = {
      subject: 'Verify your {APP_NAME} email',
      body:
        '<p>Hello,</p>\n' +
        '<p>Thank you for joining us at {APP_NAME}.</p>\n' +
        '<p>Click on the button below to verify your email address.</p>\n' +
        '<p>{ACTION_URL}</p>\n' +
        '<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
    }
    settings.meta.resetPasswordTemplate = {
      subject: 'Reset your {APP_NAME} password',
      body:
        '<p>Hello,</p>\n' +
        '<p>Click on the button below to reset your password.</p>\n' +
        '<p>{ACTION_URL}</p>\n' +
        '<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>',
    }
    app.save(settings)
  },
)
