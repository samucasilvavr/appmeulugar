import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Link inválido: token não informado.')
      return
    }
    pb.collection('users')
      .confirmVerification(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setMessage(getErrorMessage(err))
      })
  }, [token])

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="text-center space-y-1 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">
            {status === 'success' ? 'E-mail confirmado!' : 'Confirmação de e-mail'}
          </CardTitle>
          <CardDescription className="text-xs">
            {status === 'success'
              ? 'Sua conta está ativa. Faça login para continuar.'
              : 'Estamos validando seu link de confirmação.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-12 w-12 text-muted-foreground mx-auto animate-spin" />
              <p className="text-xs text-muted-foreground">Confirmando seu e-mail...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Tudo certo! Agora você pode acessar o painel normalmente.
              </p>
              <Button asChild size="sm" className="mt-2 text-xs">
                <Link to="/login">Ir para o login</Link>
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="text-center py-6 space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-xs text-muted-foreground">{message}</p>
              <Button asChild variant="outline" size="sm" className="mt-2 text-xs">
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </div>
          )}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Voltar à página inicial
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
