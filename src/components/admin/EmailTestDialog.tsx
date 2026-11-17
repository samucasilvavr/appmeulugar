import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { sendEmailTest } from '@/services/admin'

interface EmailTestDialogProps {
  slug: string
}

// Endereço de conferência dos textos (pode ser trocado no diálogo).
const DEFAULT_TEST_RECIPIENT = 'samuca.silva.vr@gmail.com'

// Botão "Enviar e-mail de teste" ao lado de cada template. Envia o template salvo com
// dados de exemplo para o endereço digitado; não salva nem altera nada.
export function EmailTestDialog({ slug }: EmailTestDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(DEFAULT_TEST_RECIPIENT)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    const address = to.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      toast({
        title: 'E-mail inválido',
        description: 'Informe um endereço válido.',
        variant: 'destructive',
      })
      return
    }
    setSending(true)
    try {
      await sendEmailTest(slug, address)
      toast({ title: 'E-mail de teste enviado', description: `Enviado para ${address}.` })
      setOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao enviar teste',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 text-[11px] font-semibold"
      >
        Enviar e-mail de teste
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar e-mail de teste</DialogTitle>
            <DialogDescription className="text-xs">
              O template salvo será enviado com dados de exemplo para o endereço informado. Nada é
              salvo nem alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">E-mail de destino</label>
            <Input
              type="email"
              placeholder="nome@exemplo.com"
              aria-label="E-mail de destino do teste"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending}>
              {sending ? 'Enviando...' : 'Enviar teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default EmailTestDialog
