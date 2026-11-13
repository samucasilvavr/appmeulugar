import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import type { UserProfile } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Home, Mail, Lock, LogIn, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const from = (location.state as any)?.from?.pathname || '/'

  // Cada perfil cai no seu painel; "from" (rota protegida de origem) tem prioridade
  const routeForProfile = (profile?: UserProfile) => {
    if (profile === 'admin') return '/admin'
    if (profile === 'corretor') return '/painel-corretor'
    if (profile === 'interessado') return '/painel-interessado'
    return '/'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error, record } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha no login',
        description: 'E-mail ou senha incorretos. Verifique suas credenciais.',
        variant: 'destructive',
      })
      return
    }

    const activeProfile = (record as any)?.profile || user?.profile
    toast({
      title: 'Bem-vindo de volta!',
      description: 'Login realizado com sucesso.',
    })
    navigate(from !== '/' ? from : routeForProfile(activeProfile), { replace: true })
  }

  // Quick helper login buttons for testing
  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail)
    setPassword('Skip@Pass')
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Home className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acesse sua conta</CardTitle>
          <CardDescription className="text-xs">
            Entre para gerenciar suas demandas, imóveis ou apresentações
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Senha</label>
                <Link to="/esqueci-senha" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-semibold text-xs shadow-sm"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Entrando...' : 'Entrar na plataforma'}
            </Button>
          </form>

          {/* Seed demo quick links */}
          <div className="pt-2 border-t text-[11px] text-muted-foreground space-y-2">
            <span className="block font-medium text-foreground">
              Contas de teste para demonstração:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('samuca.silva.vr@gmail.com')}
                className="text-[10px] h-7 px-1.5 truncate"
                title="Administrador"
              >
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('corretor.carlos@meulugar.com.br')}
                className="text-[10px] h-7 px-1.5 truncate"
                title="Corretor com CRECI"
              >
                Corretor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillCredentials('mariana.costa@gmail.com')}
                className="text-[10px] h-7 px-1.5 truncate"
                title="Interessada em comprar/alugar"
              >
                Interessado
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t text-center text-xs text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="font-semibold text-primary hover:underline">
              Cadastre-se grátis
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
