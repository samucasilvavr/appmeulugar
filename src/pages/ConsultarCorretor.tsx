import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, BadgeCheck, XCircle } from 'lucide-react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BRAZILIAN_STATES } from '@/lib/locations'
import { consultarCreci, type CreciConsultaResponse } from '@/services/creci'

// Estados em que a consulta automática está indisponível.
const UNAVAILABLE_STATES = ['MG', 'TO']

const UNAVAILABLE_MSG =
  'Consulta automática indisponível para este estado. Verifique diretamente no site oficial do CRECI regional.'
const INSTABILITY_MSG = 'Sistema do CRECI instável no momento, tente novamente em instantes.'

export default function ConsultarCorretorPage() {
  const [uf, setUf] = useState('')
  const [creci, setCreci] = useState('')
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CreciConsultaResponse['resultado'] | null>(null)

  function handleUfChange(value: string) {
    setUf(value)
    setUnavailable(UNAVAILABLE_STATES.includes(value))
    setError('')
  }

  async function handleConsultar() {
    setError('')
    setResult(null)
    if (!uf) {
      setError('Selecione o estado (UF) do CRECI.')
      return
    }
    if (UNAVAILABLE_STATES.includes(uf)) {
      setUnavailable(true)
      return
    }
    if (!creci.trim()) {
      setError('Digite o número do CRECI.')
      return
    }
    setLoading(true)
    try {
      const res = await consultarCreci(uf, creci.trim())
      if (res.ok && res.resultado) {
        setResult(res.resultado)
      } else if (res.instavel) {
        setError(INSTABILITY_MSG)
      } else {
        setError(res.motivo || INSTABILITY_MSG)
      }
    } catch {
      setError(INSTABILITY_MSG)
    } finally {
      setLoading(false)
    }
  }

  const ativo = result ? result.situacao.toLowerCase() === 'ativo' : false

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-12 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Consultar Corretor</h1>
            <p className="text-sm text-muted-foreground">
              Verifique se o CRECI de um corretor está ativo na base oficial do CRECI — direto do
              AppMeuLugar, sem sair da plataforma.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Consulta à base do CRECI
              </CardTitle>
              <CardDescription>
                A consulta é feita no servidor do AppMeuLugar e pode levar alguns segundos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[130px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="creci-uf">Estado (UF)</Label>
                  <Select value={uf} onValueChange={handleUfChange}>
                    <SelectTrigger id="creci-uf">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((s) => (
                        <SelectItem key={s.uf} value={s.uf}>
                          {s.name} ({s.uf})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creci-numero">Número do CRECI</Label>
                  <Input
                    id="creci-numero"
                    value={creci}
                    onChange={(ev) => setCreci(ev.target.value)}
                    placeholder="Ex.: 123456-F"
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') handleConsultar()
                    }}
                  />
                </div>
              </div>

              {unavailable && (
                <p className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  {UNAVAILABLE_MSG}
                </p>
              )}
              {error && (
                <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button onClick={handleConsultar} disabled={loading || !uf || unavailable}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consultando base do CRECI...
                  </>
                ) : (
                  'Consultar'
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Estados sem consulta automática: {UNAVAILABLE_STATES.join(' e ')} — verifique no
                site oficial do CRECI regional.
              </p>
            </CardContent>
          </Card>

          {loading && (
            <Card>
              <CardContent className="flex items-center gap-3 py-6 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando base do CRECI...
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {ativo ? (
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Resultado da consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Nome Completo
                    </p>
                    <p className="font-medium">{result.nomeCompleto || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">CRECI</p>
                    <p className="font-medium">{result.creciCompleto || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Situação
                    </p>
                    <Badge
                      className={
                        ativo ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                      }
                    >
                      {result.situacao || 'Desconhecida'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cidade</p>
                    <p className="font-medium">{result.cidade || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Estado</p>
                    <p className="font-medium">{result.estado || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground">
            É corretor?{' '}
            <Link to="/cadastro" className="underline hover:text-foreground">
              Crie sua conta no AppMeuLugar
            </Link>{' '}
            e publique seu portfólio de imóveis.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
