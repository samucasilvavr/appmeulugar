import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getImportedContacts,
  createImportedContact,
  updateContactStatus,
  getNotificationLogs,
} from '@/services/admin'
import { getProperties, updateProperty } from '@/services/properties'
import { getInterests, updateInterest } from '@/services/interests'
import type {
  UserRecord,
  PropertyRecord,
  InterestRecord,
  ImportedContactRecord,
  NotificationLogRecord,
} from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Bell,
  Building2,
  HeartHandshake,
  Users,
  Search,
  Upload,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [brokers, setBrokers] = useState<UserRecord[]>([])
  const [properties, setProperties] = useState<PropertyRecord[]>([])
  const [interests, setInterests] = useState<InterestRecord[]>([])
  const [contacts, setContacts] = useState<ImportedContactRecord[]>([])
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogRecord[]>([])
  const [loading, setLoading] = useState(true)

  // CSV Import state
  const [csvText, setCsvText] = useState('')
  const [csvSource, setCsvSource] = useState('Importação Feirão 2025')
  const [importing, setImporting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Get brokers
      const brokersRes = await pb.collection('users').getList<UserRecord>(1, 100, {
        filter: 'profile = "corretor"',
        sort: '-created',
      })
      setBrokers(brokersRes.items)

      // 2. Properties
      const propsRes = await getProperties('', '-created', 100)
      setProperties(propsRes)

      // 3. Interests
      const interestsRes = await getInterests('', '-created', 100)
      setInterests(interestsRes)

      // 4. Contacts
      const contactsRes = await getImportedContacts()
      setContacts(contactsRes)

      // 5. Notification Logs
      const logsRes = await getNotificationLogs()
      setNotificationLogs(logsRes)
    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    // Check if user is admin
    if (user?.profile !== 'admin' && user?.email !== 'samuca.silva.vr@gmail.com') {
      toast({
        title: 'Acesso restrito',
        description: 'Você precisa de privilégios de administrador para acessar este painel.',
        variant: 'destructive',
      })
      navigate('/')
      return
    }
    loadData()
  }, [user, isAuthenticated])

  const handleUpdateCreci = async (brokerId: string, newStatus: 'aprovado' | 'rejeitado') => {
    try {
      await pb.collection('users').update(brokerId, { creci_status: newStatus })
      toast({
        title: newStatus === 'aprovado' ? 'CRECI Aprovado!' : 'CRECI Rejeitado',
        description: `O corretor agora está com status ${newStatus}.`,
      })
      loadData()
    } catch (err) {
      console.error('Error updating CRECI:', err)
      toast({ title: 'Erro ao atualizar CRECI', variant: 'destructive' })
    }
  }

  const handleToggleProperty = async (propId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ativo' ? 'pausado' : 'ativo'
    try {
      await updateProperty(propId, { status: nextStatus as any })
      toast({ title: `Imóvel alterado para ${nextStatus}` })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleInterest = async (interestId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ativo' ? 'pausado' : 'ativo'
    try {
      await updateInterest(interestId, { status: nextStatus as any })
      toast({ title: `Demanda alterada para ${nextStatus}` })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  // Parse and import CSV contacts
  const handleImportCsv = async () => {
    if (!csvText.trim()) return

    setImporting(true)
    try {
      // Lines: nome, email, telefone, estado, cidade, creci
      const lines = csvText.trim().split('\n')
      let count = 0

      for (const line of lines) {
        if (!line.trim() || line.toLowerCase().startsWith('nome')) continue
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        if (cols.length >= 2) {
          const [cName, cEmail, cPhone, cState, cCity, cCreci] = cols
          if (cEmail && cEmail.includes('@')) {
            await createImportedContact({
              name: cName || 'Contato',
              email: cEmail,
              phone: cPhone || '',
              state: cState || 'SP',
              city: cCity || 'São Paulo',
              creci: cCreci || '',
              source: csvSource,
              authorization_status: 'autorizado',
            })
            count++
          }
        }
      }

      toast({
        title: 'Importação concluída!',
        description: `${count} contatos foram adicionados à base institucional.`,
      })
      setCsvText('')
      loadData()
    } catch (err: any) {
      console.error('CSV import error:', err)
      toast({
        title: 'Erro na importação',
        description: err?.message || 'Verifique o formato das linhas.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Painel de Administração
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-300 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Super Admin
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Validação de CRECI, moderação de publicações, importação de contatos e logs de e-mails
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Atualizar Dados
        </Button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-card shadow-sm border-border">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Corretores
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{brokers.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {brokers.filter((b) => b.creci_status === 'aprovado').length} verificados
          </span>
        </Card>

        <Card className="p-4 bg-card shadow-sm border-border">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Imóveis Ativos
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">
            {properties.filter((p) => p.status === 'ativo').length}
          </p>
          <span className="text-[11px] text-muted-foreground">{properties.length} no total</span>
        </Card>

        <Card className="p-4 bg-card shadow-sm border-border">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Demandas Ativas
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">
            {interests.filter((i) => i.status === 'ativo').length}
          </p>
          <span className="text-[11px] text-muted-foreground">{interests.length} no total</span>
        </Card>

        <Card className="p-4 bg-card shadow-sm border-border">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            E-mails Disparados
          </span>
          <p className="text-2xl font-bold text-foreground mt-1">{notificationLogs.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {notificationLogs.filter((l) => l.status === 'enviado').length} enviados com sucesso
          </span>
        </Card>
      </div>

      <Tabs defaultValue="creci" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="creci" className="text-xs font-semibold gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Verificação de CRECI ({brokers.length})
          </TabsTrigger>
          <TabsTrigger value="moderacao" className="text-xs font-semibold gap-1.5">
            <Building2 className="h-4 w-4" />
            Moderação de Anúncios e Demandas
          </TabsTrigger>
          <TabsTrigger value="importacao" className="text-xs font-semibold gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Importar Contatos CSV/XLSX ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="text-xs font-semibold gap-1.5">
            <Bell className="h-4 w-4 text-amber-600" />
            Logs de Notificações ({notificationLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CRECI VERIFICATION */}
        <TabsContent value="creci" className="space-y-4">
          <Card className="shadow-sm border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold">Corretores Cadastrados</CardTitle>
              <CardDescription className="text-xs">
                Aprovação manual de registros para garantir que somente corretores éticos façam
                apresentações.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Corretor</TableHead>
                    <TableHead>E-mail / Telefone</TableHead>
                    <TableHead>CRECI / UF</TableHead>
                    <TableHead>Imobiliária</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {brokers.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold">{b.name}</TableCell>
                      <TableCell>
                        <div>{b.email}</div>
                        <div className="text-muted-foreground">{b.phone || '-'}</div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {b.creci || 'Não informado'} / {b.creci_uf || 'SP'}
                      </TableCell>
                      <TableCell>{b.real_estate || 'Autônomo'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase font-bold ${
                            b.creci_status === 'aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.creci_status === 'rejeitado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.creci_status || 'pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1.5">
                        {b.creci_status !== 'aprovado' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCreci(b.id, 'aprovado')}
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                        )}
                        {b.creci_status !== 'rejeitado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateCreci(b.id, 'rejeitado')}
                            className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejeitar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MODERATION */}
        <TabsContent value="moderacao" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Properties List */}
            <Card className="p-4 space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
                <span>Imóveis Anunciados ({properties.length})</span>
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto divide-y">
                {properties.map((p) => (
                  <div key={p.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 truncate">
                      <span className="font-semibold block truncate">{p.title}</span>
                      <span className="text-muted-foreground text-[11px]">
                        R$ {p.price.toLocaleString('pt-BR')} • {p.city}/{p.state} • Status:{' '}
                        {p.status}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleProperty(p.id, p.status)}
                      className="text-[11px] h-7 shrink-0"
                    >
                      {p.status === 'ativo' ? 'Pausar' : 'Ativar'}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Interests List */}
            <Card className="p-4 space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
                <span>Demandas Publicadas ({interests.length})</span>
              </h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto divide-y">
                {interests.map((i) => (
                  <div key={i.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 truncate">
                      <span className="font-semibold block truncate">{i.title}</span>
                      <span className="text-muted-foreground text-[11px]">
                        Teto: R$ {i.max_price.toLocaleString('pt-BR')} • {i.city}/{i.state} •
                        Status: {i.status}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleInterest(i.id, i.status)}
                      className="text-[11px] h-7 shrink-0"
                    >
                      {i.status === 'ativo' ? 'Pausar' : 'Ativar'}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: CONTACT IMPORT */}
        <TabsContent value="importacao" className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">
                Importar Lista de Contatos (CSV)
              </h3>
              <p className="text-xs text-muted-foreground">
                Importe corretores ou parceiros de feirões e listas de CRECI para disparos
                institucionais. Formato por linha:{' '}
                <code>Nome, Email, Telefone, Estado, Cidade, CRECI</code>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Origem da lista / Evento
                </label>
                <Input
                  value={csvSource}
                  onChange={(e) => setCsvSource(e.target.value)}
                  placeholder="Ex: Feirão CRECI SP 2025"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5 flex items-end">
                <Button
                  onClick={handleImportCsv}
                  disabled={importing || !csvText.trim()}
                  className="text-xs font-semibold h-9 shadow-sm"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  {importing ? 'Importando...' : 'Processar e Salvar Contatos'}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Cole o conteúdo CSV abaixo:
              </label>
              <Textarea
                rows={5}
                placeholder="Carlos Alberto, carlos@imoveis.com.br, (11) 98888-7777, SP, São Paulo, 123456-F&#10;Marina Silva, marina@brokers.com, (21) 97777-6666, RJ, Rio de Janeiro, 065432-F"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </Card>

          {/* Imported Contacts Table */}
          <Card className="shadow-sm border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold">
                Contatos Importados ({contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Local / CRECI</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Autorização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {contacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{c.name}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>
                        {c.city}/{c.state} {c.creci ? `• CRECI ${c.creci}` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.source || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            c.authorization_status === 'autorizado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {c.authorization_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: NOTIFICATION LOGS */}
        <TabsContent value="notificacoes" className="space-y-4">
          <Card className="shadow-sm border-border">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-bold">
                Registro de Envios e Notificações
              </CardTitle>
              <CardDescription className="text-xs">
                Auditoria de e-mails transacionais enviados para corretores e interessados.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {notificationLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-semibold">
                          {log.recipient_name || log.recipient_email}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {log.recipient_email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {log.notification_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">{log.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase font-bold ${
                            log.status === 'enviado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'falha'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {new Date(log.created).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
