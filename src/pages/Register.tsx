import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { BRAZILIAN_STATES, getCitiesForState } from '@/lib/locations'
import type { UserProfile } from '@/types/database'
import { UserCheck, HeartHandshake, Building2, ShieldAlert } from 'lucide-react'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [profile, setProfile] = useState<UserProfile>('interessado')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [stateUf, setStateUf] = useState('SP')
  const [city, setCity] = useState('São Paulo')

  // Broker specific fields
  const [creci, setCreci] = useState('')
  const [creciUf, setCreciUf] = useState('SP')
  const [realEstate, setRealEstate] = useState('')
  const [regions, setRegions] = useState('')

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== passwordConfirm) {
      toast({
        title: 'Senhas não conferem',
        description: 'A confirmação de senha deve ser idêntica à senha informada.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve conter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (profile === 'corretor' && !creci.trim()) {
      toast({
        title: 'CRECI obrigatório',
        description: 'Corretores devem informar o número de registro no CRECI.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await signUp({
      name,
      email,
      password,
      passwordConfirm,
      profile,
      phone,
      state: stateUf,
      city,
      creci: profile === 'corretor' ? creci : undefined,
      creci_uf: profile === 'corretor' ? creciUf : undefined,
      real_estate: profile === 'corretor' ? realEstate : undefined,
      regions: profile === 'corretor' ? regions : undefined,
    })
    setLoading(false)

    if (error) {
      toast({
        title: 'Falha no cadastro',
        description: 'Não foi possível criar sua conta. Verifique se o e-mail já está em uso.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Conta criada com sucesso!',
      description:
        profile === 'corretor'
          ? 'Seu CRECI foi enviado para validação da administração.'
          : 'Bem-vindo ao AppMeuLugar!',
    })

    if (profile === 'corretor') {
      navigate('/painel-corretor')
    } else {
      navigate('/painel-interessado')
    }
  }

  const cities = getCitiesForState(stateUf)

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-lg shadow-md border-border">
        <CardHeader className="text-center space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Crie sua conta gratuita
          </CardTitle>
          <CardDescription className="text-xs">
            Escolha seu perfil e comece a usar a plataforma agora mesmo
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* PROFILE SELECTOR: Two clear choices */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setProfile('interessado')}
              className={`p-3 rounded-lg text-left transition-all flex flex-col items-center sm:items-start text-xs font-semibold gap-1 ${
                profile === 'interessado'
                  ? 'bg-background shadow-sm text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4" />
                <span>Interessado</span>
              </div>
              <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
                Quero comprar ou alugar imóvel
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProfile('corretor')}
              className={`p-3 rounded-lg text-left transition-all flex flex-col items-center sm:items-start text-xs font-semibold gap-1 ${
                profile === 'corretor'
                  ? 'bg-background shadow-sm text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>Corretor de Imóveis</span>
              </div>
              <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
                Tenho registro no CRECI
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common fields */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nome completo</label>
              <Input
                required
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">E-mail</label>
                <Input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Telefone celular (WhatsApp)
                </label>
                <Input
                  placeholder="(11) 98765-4321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Estado (UF)</label>
                <Select
                  value={stateUf}
                  onValueChange={(val) => {
                    setStateUf(val)
                    setCity(getCitiesForState(val)[0] || '')
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((s) => (
                      <SelectItem key={s.uf} value={s.uf} className="text-xs">
                        {s.name} ({s.uf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Cidade principal</label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* BROKER EXCLUSIVE FIELDS */}
            {profile === 'corretor' && (
              <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <UserCheck className="h-4 w-4" />
                  Dados Profissionais do Corretor
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-medium text-foreground">
                      Número do CRECI *
                    </label>
                    <Input
                      required
                      placeholder="Ex: 123456-F"
                      value={creci}
                      onChange={(e) => setCreci(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">UF do CRECI</label>
                    <Select value={creciUf} onValueChange={setCreciUf}>
                      <SelectTrigger className="text-xs h-8 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((s) => (
                          <SelectItem key={s.uf} value={s.uf} className="text-xs">
                            {s.uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Imobiliária parceira (opcional)
                  </label>
                  <Input
                    placeholder="Ex: Mendes Imóveis ou Autônomo"
                    value={realEstate}
                    onChange={(e) => setRealEstate(e.target.value)}
                    className="text-xs h-8 bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Regiões e bairros de atuação
                  </label>
                  <Input
                    placeholder="Ex: Pinheiros, Vila Madalena, Perdizes"
                    value={regions}
                    onChange={(e) => setRegions(e.target.value)}
                    className="text-xs h-8 bg-background"
                  />
                </div>

                <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-1">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Seu CRECI será verificado pela administração antes da aprovação final para
                    garantir segurança mútua.
                  </span>
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Senha (mín. 8 caracteres)
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Confirmar senha</label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-semibold text-xs shadow-sm mt-2"
            >
              {loading ? 'Criando conta...' : 'Concluir cadastro'}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            Já possui uma conta?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Fazer login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
