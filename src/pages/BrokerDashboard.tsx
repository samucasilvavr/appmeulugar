import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPropertiesByUser, updateProperty } from '@/services/properties'
import { getInterests } from '@/services/interests'
import { getPresentationsByBroker, createPresentation } from '@/services/presentations'
import { calculateMatchScore, type MatchResult } from '@/services/matching'
import type { PropertyRecord, InterestRecord, PresentationRecord } from '@/types/database'
import { PropertyCard } from '@/components/PropertyCard'
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  Sparkles,
  Send,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Eye,
  MessageSquare,
  Users,
  Target,
  FileCheck,
} from 'lucide-react'

export default function BrokerDashboard() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [properties, setProperties] = useState<PropertyRecord[]>([])
  const [interests, setInterests] = useState<InterestRecord[]>([])
  const [presentations, setPresentations] = useState<PresentationRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Presentation modal state
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [targetInterest, setTargetInterest] = useState<InterestRecord | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [presentationMessage, setPresentationMessage] = useState<string>('')
  const [sending, setSending] = useState(false)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [propsData, interestsData, presData] = await Promise.all([
        getPropertiesByUser(user.id),
        getInterests('status = "ativo"', '-created', 100),
        getPresentationsByBroker(user.id),
      ])
      setProperties(propsData)
      setInterests(interestsData)
      setPresentations(presData)

      // Check if URL has ?enviar_para=ID
      const autoTargetId = searchParams.get('enviar_para')
      if (autoTargetId) {
        const found = interestsData.find((i) => i.id === autoTargetId)
        if (found) {
          setTargetInterest(found)
          if (propsData.length > 0) setSelectedPropertyId(propsData[0].id)
          setSendModalOpen(true)
        }
      }
    } catch (err) {
      console.error('Error loading broker dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadData()
  }, [user, isAuthenticated])

  // 3 INDICADORES REAIS DO CORRETOR
  const activePropertiesCount = properties.filter((p) => p.status === 'ativo').length
  const presentationsSentCount = presentations.length
  const presentationsAcceptedCount = presentations.filter((p) => p.status === 'aceita').length

  // Calculate compatible matches: for all active interests, find properties of this broker with match score > 0
  const compatibleMatches: {
    interest: InterestRecord
    property: PropertyRecord
    match: MatchResult
  }[] = []

  properties
    .filter((p) => p.status === 'ativo')
    .forEach((p) => {
      interests.forEach((i) => {
        const match = calculateMatchScore(i, p)
        if (match.isEligible && match.score >= 50) {
          compatibleMatches.push({ interest: i, property: p, match })
        }
      })
    })

  // Sort matches by highest score first
  compatibleMatches.sort((a, b) => b.match.score - a.match.score)

  const handleOpenSendModal = (interest: InterestRecord, defaultPropId?: string) => {
    setTargetInterest(interest)
    if (defaultPropId) {
      setSelectedPropertyId(defaultPropId)
    } else if (properties.length > 0) {
      setSelectedPropertyId(properties[0].id)
    }
    setPresentationMessage(
      `Olá! Vi sua demanda e gostaria de apresentar este imóvel do meu portfólio que atende perfeitamente ao que você procura.`,
    )
    setSendModalOpen(true)
  }

  const handleSendPresentation = async () => {
    if (!user || !targetInterest || !selectedPropertyId) return

    setSending(true)
    try {
      // interest_owner_id (pode ser vazio — demanda anônima) e broker_id são
      // resolvidos no servidor pelo hook presentation_create.pb.js.
      await createPresentation({
        interest_id: targetInterest.id,
        property_id: selectedPropertyId,
        message: presentationMessage,
      })

      toast({
        title: 'Apresentação enviada com sucesso!',
        description: 'O interessado receberá a notificação para analisar seu imóvel.',
      })
      setSendModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Não foi possível enviar',
        description: err?.message || 'Verifique se o limite de 5 vagas foi atingido.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleTogglePropertyStatus = async (prop: PropertyRecord) => {
    const newStatus = prop.status === 'ativo' ? 'pausado' : 'ativo'
    try {
      await updateProperty(prop.id, { status: newStatus })
      toast({
        title: newStatus === 'pausado' ? 'Imóvel pausado' : 'Imóvel reativado',
        description:
          newStatus === 'pausado'
            ? 'O imóvel não aparecerá em buscas públicas.'
            : 'O imóvel está ativo.',
      })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner & CRECI Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Painel do Corretor
            </h1>
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                user?.creci_status === 'aprovado'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              CRECI: {user?.creci || 'Em análise'} ({user?.creci_status || 'pendente'})
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Cruze suas opções do portfólio com demandas ativas e envie apresentações qualificadas
          </p>
        </div>

        <Button
          onClick={() => navigate('/publicar-imovel')}
          className="text-xs font-semibold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Anunciar Novo Imóvel
        </Button>
      </div>

      {/* 3 INDICADORES REAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Imóveis no Portfólio
            </span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">{properties.length}</span>
            <span className="text-xs text-muted-foreground">({activePropertiesCount} ativos)</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Cadastrados com fotos e especificações completas
          </span>
        </Card>

        <Card className="border-border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Apresentações Enviadas
            </span>
            <Send className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">
              {presentationsSentCount}
            </span>
            <span className="text-xs text-muted-foreground">propostas</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Máximo 5 vagas pendentes por demanda de interessado
          </span>
        </Card>

        <Card className="border-border shadow-sm p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Conversas / Aceites
            </span>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">
              {presentationsAcceptedCount}
            </span>
            <span className="text-xs text-muted-foreground">chats liberados</span>
          </div>
          <span className="text-[11px] text-muted-foreground block mt-1">
            Interessados que aceitaram e abriram contato interno
          </span>
        </Card>
      </div>

      <Tabs defaultValue="matches" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="matches" className="text-xs font-semibold gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Demandas Compatíveis ({compatibleMatches.length})
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs font-semibold gap-1.5">
            <Building2 className="h-4 w-4 text-emerald-600" />
            Meu Portfólio ({properties.length})
          </TabsTrigger>
          <TabsTrigger value="enviadas" className="text-xs font-semibold gap-1.5">
            <Send className="h-4 w-4" />
            Minhas Apresentações ({presentations.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DEMANDAS COMPATÍVEIS COM SCORE DE MATCH */}
        <TabsContent value="matches" className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Calculando compatibilidade...
            </div>
          ) : compatibleMatches.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-2">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                Nenhuma demanda compatível no momento
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Assim que um interessado publicar uma busca na sua cidade e faixa de preço, nosso
                algoritmo de match indicará o imóvel ideal do seu portfólio.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {compatibleMatches.map(({ interest, property, match }, idx) => {
                const alreadySent = presentations.some(
                  (p) => p.interest_id === interest.id && p.property_id === property.id,
                )

                return (
                  <Card
                    key={`${interest.id}-${property.id}-${idx}`}
                    className="p-5 border-border shadow-sm"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Demanda Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-primary font-bold">
                            {match.score}% de Compatibilidade
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {interest.purpose} • {interest.property_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {interest.city}/{interest.state}{' '}
                            {interest.neighborhoods ? `(${interest.neighborhoods})` : ''}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-foreground">{interest.title}</h3>

                        <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Target className="h-3.5 w-3.5 text-emerald-600" />
                            Seu imóvel compatível: <strong>{property.title}</strong> (
                            {property.price.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                            )
                          </span>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {match.matchedCriteria.map((c, i) => (
                              <span
                                key={i}
                                className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {alreadySent ? (
                          <Badge
                            variant="secondary"
                            className="bg-muted text-muted-foreground text-xs py-1 px-2.5"
                          >
                            Apresentação já enviada
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenSendModal(interest, property.id)}
                            className="text-xs font-semibold shadow-sm"
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Enviar Apresentação
                          </Button>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          Orçamento máx:{' '}
                          {interest.max_price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PORTFÓLIO DO CORRETOR */}
        <TabsContent value="portfolio" className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando portfólio...
            </div>
          ) : properties.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-2">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                Seu portfólio ainda está vazio
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Anuncie imóveis que você administra para receber matches automáticos com
                interessados.
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/publicar-imovel')}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Cadastrar primeiro imóvel
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => (
                <div key={prop.id} className="space-y-2">
                  <PropertyCard property={prop} />
                  <div className="flex items-center justify-between px-1">
                    <Badge
                      variant={prop.status === 'ativo' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {prop.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePropertyStatus(prop)}
                      className="text-xs h-7"
                    >
                      {prop.status === 'ativo' ? 'Pausar anúncio' : 'Reativar anúncio'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: APRESENTAÇÕES ENVIADAS */}
        <TabsContent value="enviadas" className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando apresentações...
            </div>
          ) : presentations.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-2">
              <Send className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                Nenhuma apresentação enviada ainda
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Envie imóveis para as demandas compatíveis na aba ao lado para iniciar conversas com
                interessados.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presentations.map((pres) => {
                const prop = pres.expand?.property_id
                const interest = pres.expand?.interest_id

                return (
                  <Card key={pres.id} className="p-4 space-y-3 border-border shadow-sm">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize font-semibold ${
                          pres.status === 'aceita'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pres.status === 'recusada'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {pres.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(pres.created).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">
                        Demanda: <strong>{interest?.title || 'Demanda do interessado'}</strong>
                      </span>
                      <span className="text-xs font-semibold text-foreground block">
                        Imóvel apresentado: {prop?.title || 'Imóvel'} (R${' '}
                        {prop?.price?.toLocaleString('pt-BR')})
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded border">
                      "{pres.message}"
                    </p>

                    {pres.status === 'aceita' && (
                      <Button
                        size="sm"
                        onClick={() => navigate('/conversas')}
                        className="w-full text-xs font-semibold"
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                        Ir para a Conversa
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG: ENVIAR APRESENTAÇÃO */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Enviar Apresentação de Imóvel</DialogTitle>
            <DialogDescription className="text-xs">
              Vincule um imóvel do seu portfólio para a demanda:{' '}
              <strong className="text-foreground">{targetInterest?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Selecione o imóvel do seu portfólio *
              </label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Escolha um imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.title} (R$ {p.price.toLocaleString('pt-BR')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Mensagem personalizada para o interessado *
              </label>
              <Textarea
                rows={4}
                value={presentationMessage}
                onChange={(e) => setPresentationMessage(e.target.value)}
                placeholder="Diga por que este imóvel é perfeito para a busca dele..."
                className="text-xs"
              />
            </div>

            <div className="p-2.5 bg-muted/40 rounded-lg text-[11px] text-muted-foreground space-y-1">
              <p>• Máximo de 5 apresentações pendentes por demanda (regra anti-spam).</p>
              <p>• O chat interno só é aberto se o interessado aceitar sua apresentação.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendPresentation}
              disabled={sending || !selectedPropertyId}
              className="text-xs font-semibold"
            >
              {sending ? 'Enviando...' : 'Confirmar e Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
