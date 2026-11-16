import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getOptOutStatus, requestOptOut } from '@/services/privacy'
import { useToast } from '@/hooks/use-toast'
import Layout from '@/components/Layout'

export default function OptOutPage() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const e = (searchParams.get('email') || '').trim()
    if (!e) return
    setEmail(e)
    getOptOutStatus(e).then((s) => {
      if (s) setStatus(s.status)
      setChecked(true)
    })
  }, [searchParams])

  async function handleOptOut() {
    const target = email.trim()
    if (!target || !target.includes('@')) {
      toast({ title: 'Informe um e-mail válido.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const res = await requestOptOut(target)
    setLoading(false)
    if (res && res.updated) {
      setDone(true)
      toast({ title: 'Descadastro confirmado. Você não receberá mais nossas notificações.' })
    } else {
      toast({
        title: 'Não foi possível concluir o descadastro.',
        description: 'Tente novamente ou fale com contato@appmeulugar.com.br.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Descadastrar de notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {done ? (
              <p>
                O e-mail <strong>{email}</strong> foi descadastrado e não receberá mais notificações
                de novos interessados do AppMeuLugar. Se mudar de ideia, fale com{' '}
                <a className="text-primary underline" href="mailto:contato@appmeulugar.com.br">
                  contato@appmeulugar.com.br
                </a>
                .
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Não quer mais receber nossos e-mails de notificação? Informe o e-mail que recebe
                  as mensagens e confirme o descadastro. Isso não exclui sua conta nem seus dados —
                  apenas interrompe os avisos por e-mail.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="optout-email">E-mail</Label>
                  <Input
                    id="optout-email"
                    type="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
                {checked && status === 'descadastrado' && (
                  <p className="text-sm text-green-700">
                    Este e-mail já está descadastrado — nada a fazer.
                  </p>
                )}
                <Button onClick={handleOptOut} disabled={loading}>
                  {loading ? 'Confirmando…' : 'Confirmar descadastro'}
                </Button>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Consulte também nossa{' '}
              <Link to="/privacidade" className="underline">
                Política de Privacidade
              </Link>{' '}
              e os{' '}
              <Link to="/termos" className="underline">
                Termos de Uso
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
