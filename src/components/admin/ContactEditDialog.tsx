import React, { useEffect, useState } from 'react'
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
import { updateImportedContact } from '@/services/admin'
import type { ImportedContactRecord } from '@/types/database'

interface ContactEditDialogProps {
  contact: ImportedContactRecord | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

type ContactForm = {
  name: string
  email: string
  phone: string
  state: string
  city: string
  creci: string
  source: string
  authorization_status: 'autorizado' | 'pendente' | 'descadastrado'
}

const FIELDS: { key: keyof ContactForm; label: string }[] = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'state', label: 'Estado (UF)' },
  { key: 'city', label: 'Cidade' },
  { key: 'creci', label: 'CRECI' },
  { key: 'source', label: 'Origem' },
]

function toForm(contact: ImportedContactRecord): ContactForm {
  return {
    name: contact.name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    state: contact.state || '',
    city: contact.city || '',
    creci: contact.creci || '',
    source: contact.source || '',
    authorization_status: contact.authorization_status || 'pendente',
  }
}

// Edição total de um contato importado pelo admin (inclusive o e-mail, para corrigir digitação).
export function ContactEditDialog({ contact, onOpenChange, onSaved }: ContactEditDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<ContactForm | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(contact ? toForm(contact) : null)
  }, [contact])

  const handleSave = async () => {
    if (!contact || !form) return
    const email = form.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'E-mail inválido',
        description: 'Informe um e-mail válido.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      await updateImportedContact(contact.id, {
        name: form.name.trim(),
        email,
        phone: form.phone.trim(),
        state: form.state.trim().toUpperCase(),
        city: form.city.trim(),
        creci: form.creci.trim(),
        source: form.source.trim(),
        authorization_status: form.authorization_status,
      })
      toast({ title: 'Contato atualizado' })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Erro ao salvar contato',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!contact} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar contato</DialogTitle>
          <DialogDescription className="text-xs">
            Corrija os dados do contato importado, inclusive a situação de autorização de envio.
          </DialogDescription>
        </DialogHeader>
        {form && (
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <div
                key={field.key}
                className={`space-y-1.5 ${field.key === 'email' || field.key === 'name' ? 'col-span-2' : ''}`}
              >
                <label className="text-xs font-medium text-foreground">{field.label}</label>
                <Input
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            ))}
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-medium text-foreground">Situação de autorização</label>
              <select
                value={form.authorization_status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    authorization_status: e.target.value as ContactForm['authorization_status'],
                  })
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="autorizado">Autorizado</option>
                <option value="pendente">Pendente</option>
                <option value="descadastrado">Descadastrado</option>
              </select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form}>
            {saving ? 'Salvando...' : 'Salvar contato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ContactEditDialog
