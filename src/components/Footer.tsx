import { Link } from 'react-router-dom'
import { Home, ShieldCheck, Heart, Mail, Phone, Lock } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 mt-auto text-sm text-muted-foreground">
      <div className="container mx-auto px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand info */}
          <div className="space-y-3">
            <Link
              to="/"
              className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Home className="h-4 w-4" />
              </div>
              <span>AppMeuLugar</span>
            </Link>
            <p className="text-xs leading-relaxed">
              A plataforma imobiliária que inverte a lógica tradicional: você publica o que procura,
              corretores com CRECI verificado encontram o imóvel ideal e seus dados de contato ficam
              100% protegidos.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Corretores verificados pelo CRECI</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/buscar" className="hover:text-foreground transition-colors">
                  Buscar imóveis e demandas
                </Link>
              </li>
              <li>
                <Link to="/publicar-interesse" className="hover:text-foreground transition-colors">
                  Publicar o que procuro
                </Link>
              </li>
              <li>
                <Link to="/publicar-imovel" className="hover:text-foreground transition-colors">
                  Anunciar imóvel (Corretor)
                </Link>
              </li>
              <li>
                <Link to="/cadastro" className="hover:text-foreground transition-colors">
                  Criar conta grátis
                </Link>
              </li>
            </ul>
          </div>

          {/* Profiles */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">
              Para Você
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/painel-interessado" className="hover:text-foreground transition-colors">
                  Painel do Interessado (Até 5 vagas)
                </Link>
              </li>
              <li>
                <Link to="/painel-corretor" className="hover:text-foreground transition-colors">
                  Painel do Corretor & Portfólio
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-1 text-muted-foreground/80">
                  <Lock className="h-3 w-3" />
                  Privacidade total no chat
                </span>
              </li>
            </ul>
          </div>

          {/* Institutional & Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-xs uppercase tracking-wider">
              Suporte & Segurança
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>contato@appmeulugar.com.br</span>
              </li>
              <li>
                <Link to="/privacidade" className="hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/termos" className="hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/consultar-corretor" className="hover:text-foreground transition-colors">
                  Consultar Corretor (CRECI)
                </Link>
              </li>
              <li>
                <Link to="/descadastrar" className="hover:text-foreground transition-colors">
                  Descadastrar de e-mails
                </Link>
              </li>
              <li className="text-[11px] text-muted-foreground/70 pt-2">
                Conectando corretores éticos e pessoas em busca do seu novo lugar.
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
          <p>© {new Date().getFullYear()} AppMeuLugar. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Feito com</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>para o mercado imobiliário brasileiro</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
