import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { BRAZILIAN_STATES, getCitiesForState } from '@/lib/locations'
import {
  adminCreateUser,
  adminDeleteUser,
  adminSetUserBlocked,
  adminUpdateUser,
  getAllUsers,
  type AdminManagedProfile,
  type AdminUserRecord,
} from '@/services/admin'
import {
  ShieldCheck,
  UserCog,
  UserPlus,
  RefreshCw,
  Search,
  Ban,
  CheckCircle2,
  Trash2,
} from 'lucide-react'

const PROFILE_LABELS: Record<AdminManagedProfile, string> = {
  interessado: 'Interessado',
  corretor: 'Corretor',
  admin: 'Administrador',
}

const CRECI_STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
]

interface UserFormState {
  name: string
  email: string
  phone: string
  state: string
  city: string
  creci: string
  creci_uf: string
  real_estate: string
  regions: string
  profile: AdminManagedProfile
  creci_status: string
  verified: boolean
  password: string
}

function emptyForm(): UserFormState {
  return {
    name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    creci: '',
    creci_uf: '',
    real_estate: '',
    regions: '',
    profile: 'interessado',
    creci_status: 'pendente',
    verified: true,
    password: '',
  }
}

function formFromUser(u: AdminUserRecord): UserFormState {
  return {
    name: u.name,
    email: u.email,
    phone: u.phone,
    state: u.state,
    city: u.city,
    creci: u.creci,
    creci_uf: u.creci_uf,
    real_estate: u.real_estate,
    regions: u.regions,
    profile: u.profile,
    creci_status: u.creci_status || 'pendente',
    verified: u.verified,
    password: '',
  }
}

function profileBadgeClass(profile: AdminManagedProfile): string {
  if (profile === 'admin') return 'bg-amber-100 text-amber-800'
  if (profile === 'corretor') return 'bg-emerald-100 text-emerald-800'
  return 'bg-blue-100 text-blue-800'
}

export default function UsersAdminPanel() {
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?.id || ''
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUserRecord | null>(null)
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm())

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<UserFormState>(emptyForm())

  // Block / delete dialogs
  const [blockTarget, setBlockTarget] = useState<AdminUserRecord | null>(null)
  const [blockBusy, setBlockBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAllUsers()
      setUsers(list)
    } catch (err) {
      toast({
        title: 'Erro ao carregar usuários',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const filtered = users.filter((u) => {
    if (!filterText.trim()) return true
    const t = filterText.toLowerCase()
    return (
      u.name.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t) ||
      u.profile.toLowerCase().includes(t) ||
      (u.creci || '').toLowerCase().includes(t) ||
      (u.city || '').toLowerCase().includes(t)
    )
  })

  const openEdit = (u: AdminUserRecord) => {
    setEditing(u)
    setEditForm(formFromUser(u))
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        state: editForm.state,
        city: editForm.city,
        creci: editForm.creci,
        creci_uf: editForm.creci_uf,
        real_estate: editForm.real_estate,
        regions: editForm.regions,
        profile: editForm.profile,
        creci_status: editForm.creci_status,
        verified: editForm.verified,
      }
      if (editForm.password.trim() !== '') {
        payload.password = editForm.password
      }
      const updated = await adminUpdateUser(editing.id, payload)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setEditOpen(false)
      setEditing(null)
      toast({
        title: 'Usuário atualizado!',
        description: `Os dados de ${updated.name} foram salvos com sucesso.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 8) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha nome, e-mail e uma senha com no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }
    setCreating(true)
    try {
      const created = await adminCreateUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        profile: createForm.profile,
        phone: createForm.phone,
        state: createForm.state,
        city: createForm.city,
        creci: createForm.creci,
        creci_uf: createForm.creci_uf,
        real_estate: createForm.real_estate,
        regions: createForm.regions,
      })
      setUsers((prev) => [created, ...prev])
      setCreateOpen(false)
      setCreateForm(emptyForm())
      toast({
        title: 'Usuário criado!',
        description:
          created.profile === 'admin'
            ? `${created.name} já pode acessar o /admin com o e-mail e senha cadastrados.`
            : `${created.name} foi cadastrado com o perfil ${PROFILE_LABELS[created.profile]}.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao criar usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleToggleBlock = async () => {
    if (!blockTarget) return
    setBlockBusy(true)
    try {
      const updated = await adminSetUserBlocked(blockTarget.id, !blockTarget.blocked)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      toast({
        title: updated.blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        description: updated.blocked
          ? `${updated.name} não pode mais entrar ou usar a plataforma.`
          : `${updated.name} voltou a ter acesso à plataforma.`,
      })
      setBlockTarget(null)
    } catch (err) {
      toast({
        title: 'Erro ao atualizar bloqueio',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBlockBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      const result = await adminDeleteUser(deleteTarget.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      const removed = result.removed
      const parts: string[] = []
      if (removed.interests) parts.push(`${removed.interests} interesse(s)`)
      if (removed.properties) parts.push(`${removed.properties} imóvel(is)`)
      if (removed.presentations) parts.push(`${removed.presentations} apresentação(ões)`)
      if (removed.chats) parts.push(`${removed.chats} conversa(s)`)
      toast({
        title: 'Usuário excluído',
        description:
          `${deleteTarget.name} foi removido definitivamente.` +
          (parts.length ? ` Registros vinculados removidos: ${parts.join(', ')}.` : ''),
      })
      setDeleteTarget(null)
      setDeleteConfirmText('')
    } catch (err) {
      toast({
        title: 'Erro ao excluir usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleteBusy(false)
    }
  }

  const formFields = (
    form: UserFormState,
    setForm: (f: UserFormState) => void,
    mode: 'create' | 'edit',
  ) => (
    <div className="space-y-4">
      {/* Identidade e acesso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nome *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-9 text-xs"
            placeholder="Nome completo"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">E-mail *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-9 text-xs"
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Perfil *</Label>
          <Select
            value={form.profile}
            onValueChange={(v) => setForm({ ...form, profile: v as AdminManagedProfile })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROFILE_LABELS) as AdminManagedProfile[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PROFILE_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === 'edit' && (
            <p className="text-[11px] text-muted-foreground">
              Ao alterar para "Administrador", o usuário passa a acessar o /admin.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {mode === 'create' ? 'Senha * (mín. 8 caracteres)' : 'Nova senha (opcional)'}
          </Label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="h-9 text-xs"
            placeholder={mode === 'create' ? '••••••••' : 'Deixe vazio para manter'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Telefone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-9 text-xs"
            placeholder="(11) 90000-0000"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Checkbox
            id={`verified-${mode}`}
            checked={form.verified}
            onCheckedChange={(v) => setForm({ ...form, verified: v === true })}
          />
          <Label htmlFor={`verified-${mode}`} className="text-xs font-medium cursor-pointer">
            E-mail verificado (conta ativa)
          </Label>
        </div>
      </div>

      {/* Localização */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Estado</Label>
          <Select
            value={form.state || undefined}
            onValueChange={(v) => setForm({ ...form, state: v, city: '' })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecione" />
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
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Cidade</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="h-9 text-xs"
            placeholder="Cidade"
            list={`cities-${mode}`}
          />
          <datalist id={`cities-${mode}`}>
            {getCitiesForState(form.state).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      {/* CRECI (corretor) */}
      {form.profile === 'corretor' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">CRECI</Label>
            <Input
              value={form.creci}
              onChange={(e) => setForm({ ...form, creci: e.target.value })}
              className="h-9 text-xs"
              placeholder="123456-F"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">UF do CRECI</Label>
            <Select
              value={form.creci_uf || undefined}
              onValueChange={(v) => setForm({ ...form, creci_uf: v })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione" />
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status do CRECI</Label>
            <Select
              value={form.creci_status}
              onValueChange={(v) => setForm({ ...form, creci_status: v })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CRECI_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {form.profile === 'corretor' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Imobiliária</Label>
            <Input
              value={form.real_estate}
              onChange={(e) => setForm({ ...form, real_estate: e.target.value })}
              className="h-9 text-xs"
              placeholder="Nome da imobiliária (ou vazio = autônomo)"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Regiões de atuação</Label>
            <Input
              value={form.regions}
              onChange={(e) => setForm({ ...form, regions: e.target.value })}
              className="h-9 text-xs"
              placeholder="Ex: Zona Sul, ABC, Centro"
            />
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-border">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCog className="h-4 w-4 text-primary" />
                Gestão de Usuários ({users.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Edite todos os dados de qualquer perfil — nome, e-mail, telefone, endereço, CRECI,
                imobiliária, status da conta e perfil de acesso.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Buscar nome, e-mail, CRECI..."
                  className="h-8 w-[180px] pl-8 text-xs"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadUsers} className="h-8 text-xs">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCreateForm(emptyForm())
                  setCreateOpen(true)
                }}
                className="h-8 text-xs font-semibold"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Novo usuário
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>CRECI</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    {filterText
                      ? 'Nenhum usuário encontrado para a busca.'
                      : 'Nenhum usuário cadastrado.'}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    <div className="text-[11px] text-muted-foreground">{u.phone || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${profileBadgeClass(u.profile)}`}
                    >
                      {PROFILE_LABELS[u.profile] || u.profile}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.city || u.state ? `${u.city || '-'} / ${u.state || '-'}` : '-'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {u.profile === 'corretor' ? `${u.creci || '-'} / ${u.creci_uf || '-'}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {u.blocked && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-bold w-fit bg-zinc-800 text-white"
                        >
                          bloqueado
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold w-fit ${
                          u.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.verified ? 'verificado' : 'não verificado'}
                      </Badge>
                      {u.profile === 'corretor' && u.creci_status && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase font-bold w-fit ${
                            u.creci_status === 'aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.creci_status === 'rejeitado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          CRECI {u.creci_status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(u)}
                        className="h-7 text-[11px]"
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBlockTarget(u)}
                        disabled={u.profile === 'admin' && u.id === currentUserId}
                        title={
                          u.blocked
                            ? 'Desbloquear acesso do usuário'
                            : 'Impedir o acesso (login/uso) deste usuário'
                        }
                        className="h-7 text-[11px] w-fit px-2"
                      >
                        {u.blocked ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Desbloquear
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5 text-amber-600" />
                            Bloquear
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDeleteTarget(u)
                          setDeleteConfirmText('')
                        }}
                        title="Excluir usuário definitivamente"
                        className="h-7 text-[11px] w-fit px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCog className="h-4 w-4 text-primary" />
              Editar usuário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere qualquer campo de {editing?.name}. As mudanças são aplicadas imediatamente ao
              salvar.
            </DialogDescription>
          </DialogHeader>
          {formFields(editForm, setEditForm, 'edit')}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="font-semibold">
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/unblock confirm dialog */}
      <Dialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {blockTarget?.blocked ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Desbloquear usuário
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 text-amber-600" />
                  Bloquear usuário
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {blockTarget?.blocked
                ? `${blockTarget?.name} voltará a poder entrar e usar a plataforma normalmente.`
                : `${blockTarget?.name} ficará impedido de entrar (login) e de usar a plataforma. O bloqueio é reversível e os dados do usuário são mantidos.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockTarget(null)}
              disabled={blockBusy}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleToggleBlock}
              disabled={blockBusy}
              className={
                blockTarget?.blocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 font-semibold'
                  : 'bg-amber-600 hover:bg-amber-700 font-semibold'
              }
            >
              {blockBusy
                ? 'Aplicando...'
                : blockTarget?.blocked
                  ? 'Desbloquear'
                  : 'Bloquear usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-700">
              <Trash2 className="h-4 w-4" />
              Excluir usuário definitivamente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Esta ação é PERMANENTE: {deleteTarget?.name} ({deleteTarget?.email}) e os registros
              vinculados (interesses, imóveis, apresentações, conversas) serão removidos. Para
              confirmar, digite EXCLUIR no campo abaixo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR para confirmar"
            className="h-9 text-xs"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteTarget(null)
                setDeleteConfirmText('')
              }}
              disabled={deleteBusy}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteBusy || deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR'}
              className="font-semibold"
            >
              {deleteBusy ? 'Excluindo...' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Novo usuário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crie uma conta com o perfil desejado. Escolha "Administrador" para que a pessoa tenha
              acesso a este painel.
            </DialogDescription>
          </DialogHeader>
          {formFields(createForm, setCreateForm, 'create')}
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 p-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800">
              Novos administradores acessam o painel com o e-mail e a senha definidos aqui. A conta
              já nasce com e-mail verificado.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating} className="font-semibold">
              {creating ? 'Criando...' : 'Criar conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
