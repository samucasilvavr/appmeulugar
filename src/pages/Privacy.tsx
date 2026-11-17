import { Link } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

const CONTACT = 'contato@appmeulugar.com.br'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-2 text-2xl font-bold">Política de Privacidade</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Última atualização: 16/11/2026 — AppMeuLugar (appmeulugar.com.br). Em caso de dúvida,
            escreva para{' '}
            <a className="text-primary underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>

          <div className="space-y-6">
            <Section title="1. Quem somos e o que esta política cobre">
              <p>
                O AppMeuLugar é uma plataforma que conecta pessoas que procuram imóveis
                (interessados) a corretores e imobiliárias credenciados. Esta política explica quais
                dados pessoais coletamos, como os usamos, com quem os compartilhamos e quais são os
                seus direitos, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
                13.709/2018 — LGPD).
              </p>
            </Section>

            <Section title="2. Dados que coletamos">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Dados de cadastro:</strong> nome, e-mail, telefone e — para corretores —
                  número e situação do CRECI.
                </li>
                <li>
                  <strong>Dados de uso:</strong> interesses publicados (tipo de imóvel, cidade,
                  faixa de preço, quartos), imóveis anunciados, favoritos e mensagens trocadas na
                  plataforma.
                </li>
                <li>
                  <strong>Contatos de listas públicas:</strong> a plataforma importa, de listas
                  públicas de corretores credenciados (por exemplo, a relação de credenciados da
                  Caixa Econômica Federal), nome, e-mail, telefone, CRECI e UF. Esses dados são
                  usados apenas para avisar sobre interesses compatíveis — veja a seção 4.
                </li>
              </ul>
            </Section>

            <Section title="3. Para que usamos os dados">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Operar a plataforma: criar sua conta, publicar interesses e imóveis, permitir o
                  contato entre as partes.
                </li>
                <li>
                  <strong>Match:</strong> quando um interessado publica uma demanda, buscamos
                  corretores cadastrados com imóveis compatíveis e avisamos cada lado por e-mail.
                </li>
                <li>
                  <strong>Notificações:</strong> avisos por e-mail sobre novos interessados e
                  matches. Você pode se descadastrar a qualquer momento (seção 6).
                </li>
              </ul>
            </Section>

            <Section title="4. Compartilhamento de contato — só com autorização">
              <p>
                Seus dados de contato <strong>não são públicos</strong>. O contato entre interessado
                e corretor só acontece quando VOCÊ autoriza: ao publicar um interesse ou um imóvel
                você escolhe se quer compartilhar seu contato; sem essa autorização, o outro lado vê
                apenas a descrição da demanda ou do imóvel, nunca seu e-mail ou telefone.
              </p>
              <p>
                Sobre contatos de listas públicas: enviamos no máximo um aviso informativo por
                interesse, com link de descadastro em toda mensagem, e registramos os envios para
                não repetir mensagens ao mesmo destinatário.
              </p>
            </Section>

            <Section title="5. Segurança e retenção">
              <p>
                Os dados são armazenados em servidores com acesso restrito, criptografia em trânsito
                (HTTPS) e controle de acesso por perfil. Mantemos seus dados enquanto sua conta
                existir ou enquanto necessário para cumprir obrigações legais; contatos importados
                que pedirem descadastro têm o envio bloqueado imediatamente.
              </p>
            </Section>

            <Section title="6. Seus direitos (LGPD)">
              <p>A qualquer momento, você pode:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Confirmar a existência de tratamento dos seus dados e acessá-los;</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                <li>
                  <strong>Descadastrar-se das notificações</strong> — use o link de descadastro nos
                  e-mails ou a página{' '}
                  <Link className="text-primary underline" to="/descadastrar">
                    /descadastrar
                  </Link>
                  ;
                </li>
                <li>
                  Pedir a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados
                  em desacordo com a lei;
                </li>
                <li>Pedir a portabilidade dos seus dados;</li>
                <li>Revogar o consentimento (sem prejuízo do que já foi feito até então);</li>
                <li>Pedir informação sobre com quem compartilhamos seus dados.</li>
              </ul>
              <p>
                Para exercer qualquer um desses direitos, escreva para{' '}
                <a className="text-primary underline" href={`mailto:${CONTACT}`}>
                  {CONTACT}
                </a>{' '}
                — respondemos em até 15 dias.
              </p>
            </Section>

            <Section title="7. Alterações desta política">
              <p>
                Podemos atualizar esta política para refletir mudanças no produto ou na legislação.
                A versão vigente estará sempre nesta página.
              </p>
            </Section>

            <p className="text-sm">
              <Link className="text-primary underline" to="/termos">
                Ver também os Termos de Uso
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
