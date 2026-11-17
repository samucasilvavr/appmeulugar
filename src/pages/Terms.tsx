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

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="mb-2 text-2xl font-bold">Termos de Uso</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Última atualização: 16/11/2026 — AppMeuLugar (appmeulugar.com.br). Em caso de dúvida,
            escreva para{' '}
            <a className="text-primary underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>

          <div className="space-y-6">
            <Section title="1. Aceitação dos termos">
              <p>
                Ao criar uma conta ou usar o AppMeuLugar, você declara ter lido e aceito estes
                Termos de Uso e a{' '}
                <Link className="text-primary underline" to="/privacidade">
                  Política de Privacidade
                </Link>
                . Se não concordar, não utilize a plataforma.
              </p>
            </Section>

            <Section title="2. O que é o AppMeuLugar">
              <p>
                O AppMeuLugar é um canal de conexão entre pessoas que procuram imóveis
                (interessados) e corretores/imobiliárias. Não somos imobiliária, não somos parte de
                nenhuma negociação e não garantimos a concretização de negócios nem a veracidade das
                informações enviadas pelos usuários.
              </p>
            </Section>

            <Section title="3. Contas e perfis">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Interessado:</strong> publica demandas de busca e recebe apresentações de
                  imóveis compatíveis.
                </li>
                <li>
                  <strong>Corretor:</strong> anuncia imóveis, recebe avisos de interesses
                  compatíveis e apresenta imóveis a interessados. Exige CRECI ativo, sujeito a
                  aprovação.
                </li>
                <li>Você é responsável pela veracidade dos seus dados e pelo uso da sua conta.</li>
              </ul>
            </Section>

            <Section title="4. Uso adequado da plataforma">
              <p>É proibido:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Publicar informações falsas, imóveis sem autorização do proprietário ou conteúdo
                  ilícito;
                </li>
                <li>
                  Usar a plataforma para spam, assédio ou captação de dados de outros usuários;
                </li>
                <li>
                  Importar contatos de origem ilícita ou sem base legal (o administrador segue a
                  LGPD ao importar listas públicas);
                </li>
                <li>Tentar burlar as regras de moderação, segurança ou limites de uso.</li>
              </ul>
            </Section>

            <Section title="5. Contato e comunicações">
              <p>
                O compartilhamento de contato entre as partes só acontece com autorização expressa
                de quem o fornece (veja a Política de Privacidade). E-mails de notificação seguem
                sempre com link de descadastro; você pode sair das notificações a qualquer momento
                na página{' '}
                <Link className="text-primary underline" to="/descadastrar">
                  /descadastrar
                </Link>
                .
              </p>
            </Section>

            <Section title="6. Moderação">
              <p>
                A administração pode revisar, editar, suspender ou remover contas, imóveis e
                interesses que violem estes termos ou a legislação, comunicando o titular quando
                aplicável.
              </p>
            </Section>

            <Section title="7. Limitação de responsabilidade">
              <p>
                O AppMeuLugar é fornecido "no estado em que se encontra". Não respondemos por danos
                decorrentes de negociações entre usuários, indisponibilidade temporária, conduta de
                terceiros ou conteúdo enviado por usuários, na medida permitida pela lei.
              </p>
            </Section>

            <Section title="8. Encerramento">
              <p>
                Você pode encerrar sua conta a qualquer momento escrevendo para{' '}
                <a className="text-primary underline" href={`mailto:${CONTACT}`}>
                  {CONTACT}
                </a>
                . Podemos suspender contas que violem estes termos.
              </p>
            </Section>

            <Section title="9. Foro e legislação">
              <p>
                Estes termos são regidos pelas leis brasileiras, especialmente a LGPD e o Marco
                Civil da Internet. Fica eleito o foro do domicílio do usuário para dirimir
                controvérsias.
              </p>
            </Section>

            <p className="text-sm">
              <Link className="text-primary underline" to="/privacidade">
                Ver também a Política de Privacidade
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
