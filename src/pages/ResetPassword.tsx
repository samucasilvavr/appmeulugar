import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KeyRound, CheckCircle2, XCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const { confirmPasswordReset } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error: err } = await confirmPasswordReset(token, password)
    setLoading(false)

    if (err) {
      setError(getErrorMessage(err) || 'Não foi possível redefinir a senha. Tente novamente.')
      return
    }
    setDone(true)
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="text-center space-y-1 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Redefinir senha</CardTitle>
          <CardDescription className="text-xs">
            Escolha uma nova senha para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Senha redefinida com sucesso! Faça login com a nova senha.
              </p>
              <Button asChild size="sm" className="mt-2 text-xs">
                <Link to="/login">Ir para o login</Link>
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center py-6 space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-xs text-muted-foreground">
                Link inválido: token não informado. Solicite um novo link na página de recuperação.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 text-xs">
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nova senha</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Confirmar nova senha</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Repita a nova senha"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-semibold text-xs shadow-sm"
              >
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
