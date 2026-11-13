import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Mail,
  Phone,
  MapPin,
  Lock,
  Pencil,
  Save,
  X,
  ShieldCheck,
  Info,
  Building2,
} from 'lucide-react'

const ADMIN_CONTACT = 'contato@appmeulugar.com.br'

export default function ProfilePage() {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isAuthenticated || !user) {
    navigate('/login')
    return null
  }

  const startEditing = () => {
    setName(user.name || '')
    setEditingName(true)
  }

  const cancelEditing = () => {
    setEditingName(false)
    setName('')
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe seu nome completo para salvar.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // Envia APENAS o campo editável (name). Nenhum outro dado vai no payload.
      await fetchUpdateName(user.id, name.trim())
      await refreshUser()
      setEditingName(false)
      toast({
        title: 'Perfil atualizado!',
        description:
          'Somente o nome foi alterado — os demais dados só o administrador pode editar.',
      })
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      toast({
        title: 'Erro ao salvar perfil',
        description: fieldErrors.name || err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (editingName) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <ReadOnlyProfileCard
          user={user}
          mode="edit"
          name={name}
          onNameChange={setName}
          onSave={handleSave}
          onCancel={cancelEditing}
          saving={saving}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <ReadOnlyProfileCard user={user} onEdit={startEditing} />
    </div>
  )
}

async function fetchUpdateName(userId: string, name: string) {
  const pb = (await import('@/lib/pocketbase/client')).default
  // Payload restrito ao campo permitido — evita enviar e-mail, telefone, CRECI etc.
  return pb.collection('users').update(userId, { name })
}

function ReadOnlyProfileCard({
  user,
  mode = 'view',
  name,
  onNameChange,
  onSave,
  onCancel,
  onEdit,
  saving,
}: {
  user: any
  mode?: 'view' | 'edit'
  name?: string
  onNameChange?: (v: string) => void
  onSave?: () => void
  onCancel?: () => void
  onEdit?: () => void
  saving?: boolean
}) {
  const isBroker = user.profile === 'corretor'
  const isAdmin = user.profile === 'admin'

  const fields: { label: string; value?: string; icon?: React.ReactNode }[] = [
    { label: 'E-mail', value: user.email, icon: <Mail className="h-3.5 w-3.5" /> },
    { label: 'Telefone', value: user.phone, icon: <Phone className="h-3.5 w-3.5" /> },
    { label: 'Estado (UF)', value: user.state, icon: <MapPin className="h-3.5 w-3.5" /> },
    { label: 'Cidade', value: user.city, icon: <MapPin className="h-3.5 w-3.5" /> },
  ]

  if (isBroker) {
    fields.push(
      { label: 'CRECI', value: user.creci, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
      { label: 'UF do CRECI', value: user.creci_uf, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    )
    if (user.real_estate) {
      fields.push({ label: 'Imobiliária', value: user.real_estate, icon: <Building2 /> })
    }
    if (user.regions) {
      fields.push({
        label: 'Regiões de atuação',
        value: user.regions,
        icon: <MapPin className="h-3.5 w-3.5" />,
      })
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card className="shadow-md border-border">
        <CardHeader className="text-center space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight">Meu Perfil</CardTitle>
          <CardDescription className="text-xs">
            Visualize seus dados cadastrados. Apenas o nome pode ser alterado aqui.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* AVISO GERAL */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Por segurança, e-mail, telefone e dados profissionais só podem ser alterados pela
              administração. Fale com{' '}
              <a
                href={`mailto:${ADMIN_CONTACT}`}
                className="font-semibold underline hover:text-amber-900"
              >
                {ADMIN_CONTACT}
              </a>{' '}
              para atualizá-los.
            </span>
          </div>

          {/* NOME (único campo editável) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Nome completo</label>
              {mode === 'view' && (
                <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs h-7 px-2">
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar nome
                </Button>
              )}
            </div>
            {mode === 'edit' ? (
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  placeholder="Seu nome"
                  className="text-xs h-9"
                />
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={saving}
                  className="text-xs h-9 font-semibold"
                >
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCancel}
                  disabled={saving}
                  className="h-9 w-9 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="p-2.5 bg-muted/40 rounded-lg border text-sm text-foreground">
                {user.name || '—'}
              </div>
            )}
          </div>

          {/* DADOS SOMENTE LEITURA */}
          <div className="space-y-2">
            {fields.map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between gap-3 p-2.5 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  {f.icon}
                  <span className="font-medium shrink-0">{f.label}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-foreground text-right truncate max-w-[180px]">
                    {f.value || '—'}
                  </span>
                  <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              </div>
            ))}
          </div>

          {isBroker && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Status do CRECI:{' '}
                <Badge
                  variant="secondary"
                  className={`text-[10px] uppercase font-bold ${
                    user.creci_status === 'aprovado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : user.creci_status === 'reprovado'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {user.creci_status || 'pendente'}
                </Badge>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
