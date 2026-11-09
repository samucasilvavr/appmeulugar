import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await requestPasswordReset(email)
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível solicitar a recuperação. Verifique o e-mail digitado.',
        variant: 'destructive',
      })
      return
    }

    setSent(true)
    toast({
      title: 'E-mail enviado!',
      description: 'Verifique sua caixa de entrada para redefinir sua senha.',
    })
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-md shadow-md border-border">
        <CardHeader className="text-center space-y-1 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Recuperar senha</CardTitle>
          <CardDescription className="text-xs">
            Informe seu e-mail cadastrado para receber o link de redefinição
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {sent ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
              <h3 className="font-semibold text-sm text-foreground">
                Solicitação enviada com sucesso!
              </h3>
              <p className="text-xs text-muted-foreground">
                Se o e-mail <strong>{email}</strong> estiver cadastrado em nossa base, você receberá
                as instruções em instantes.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 text-xs">
                <Link to="/login">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">E-mail cadastrado</label>
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-semibold text-xs shadow-sm"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Lembrei da senha, voltar ao login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
