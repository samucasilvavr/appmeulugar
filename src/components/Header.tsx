import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  Search,
  PlusCircle,
  MessageSquare,
  User,
  LogOut,
  ShieldCheck,
  Building2,
  HeartHandshake,
} from 'lucide-react'

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Home className="h-5 w-5" />
          </div>
          <span>AppMeuLugar</span>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/buscar"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            Explorar
          </Link>
          <Link
            to="/buscar?tipo=interesses"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Demandas Públicas
          </Link>
          <Link
            to="/buscar?tipo=imoveis"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Imóveis
          </Link>
          <Link
            to="/consultar-corretor"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Consultar Corretor
          </Link>
        </nav>

        {/* Action Buttons & Auth */}
        <div className="flex items-center gap-3">
          {/* Quick Publish Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="hidden sm:flex items-center gap-1.5 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                Publicar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => navigate('/publicar-interesse')}
                className="cursor-pointer"
              >
                <HeartHandshake className="mr-2 h-4 w-4 text-primary" />
                <span>Publicar o que procuro</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/publicar-imovel')}
                className="cursor-pointer"
              >
                <Building2 className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Anunciar um imóvel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/conversas')}
                className="relative text-muted-foreground hover:text-foreground"
                title="Mensagens"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-primary/20"
                  >
                    <User className="h-4 w-4 text-primary" />
                    <span className="max-w-[120px] truncate hidden sm:inline">
                      {user.name || user.email}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 uppercase">
                      {user.profile || 'usuário'}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Conectado como <strong className="text-foreground">{user.email}</strong>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Dashboard links based on role */}
                  {user.profile === 'corretor' && (
                    <DropdownMenuItem onClick={() => navigate('/painel-corretor')}>
                      <Building2 className="mr-2 h-4 w-4 text-primary" />
                      Painel do Corretor
                    </DropdownMenuItem>
                  )}

                  {user.profile === 'interessado' && (
                    <DropdownMenuItem onClick={() => navigate('/painel-interessado')}>
                      <HeartHandshake className="mr-2 h-4 w-4 text-primary" />
                      Painel do Interessado
                    </DropdownMenuItem>
                  )}

                  {user.profile === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/painel-interessado')}>
                        <HeartHandshake className="mr-2 h-4 w-4" />
                        Minhas Demandas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/painel-corretor')}>
                        <Building2 className="mr-2 h-4 w-4" />
                        Meu Portfólio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <ShieldCheck className="mr-2 h-4 w-4 text-amber-600" />
                        Painel de Administração
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuItem onClick={() => navigate('/perfil')}>
                    <User className="mr-2 h-4 w-4 text-primary" />
                    Meu Perfil
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate('/conversas')}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Conversas
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/cadastro')}
                className="bg-primary hover:bg-primary/90"
              >
                Cadastrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
