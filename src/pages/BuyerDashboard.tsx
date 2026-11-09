import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInterestsByUser, updateInterest } from '@/services/interests'
import { getPresentationsForBuyer } from '@/services/presentations'
import { getFavoritesByUser, removeFavorite } from '@/services/favorites'
import type { InterestRecord, PresentationRecord, FavoriteRecord } from '@/types/database'
import { PropertyCard } from '@/components/PropertyCard'
import { useToast } from '@/hooks/use-toast'
import {
  HeartHandshake,
  PlusCircle,
  Eye,
  PauseCircle,
  PlayCircle,
  XCircle,
  Clock,
  CheckCircle2,
  Inbox,
  Heart,
  MessageSquare,
  ShieldCheck,
  Building2,
  Calendar,
} from 'lucide-react'

export default function BuyerDashboard() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [interests, setInterests] = useState<InterestRecord[]>([])
  const [presentations, setPresentations] = useState<PresentationRecord[]>([])
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [interestsData, presentationsData, favoritesData] = await Promise.all([
        getInterestsByUser(user.id),
        getPresentationsForBuyer(user.id),
        getFavoritesByUser(user.id),
      ])
      setInterests(interestsData)
      setPresentations(presentationsData)
      setFavorites(favoritesData)
    } catch (err) {
      console.error('Error loading buyer dashboard data:', err)
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

  const handleToggleStatus = async (interest: InterestRecord) => {
    const newStatus = interest.status === 'ativo' ? 'pausado' : 'ativo'
    try {
      await updateInterest(interest.id, { status: newStatus })
      toast({
        title: newStatus === 'pausado' ? 'Demanda pausada' : 'Demanda reativada',
        description:
          newStatus === 'pausado'
            ? 'Corretores não enviarão novas apresentações.'
            : 'Demanda aberta para propostas.',
      })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEndDemand = async (interest: InterestRecord) => {
    if (!confirm('Deseja encerrar definitivamente esta demanda? Ela não receberá mais propostas.'))
      return
    try {
      await updateInterest(interest.id, { status: 'encerrado' })
      toast({ title: 'Demanda encerrada com sucesso' })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveFav = async (favId: string) => {
    try {
      await removeFavorite(favId)
      toast({ title: 'Favorito removido' })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Painel do Interessado
            </h1>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 text-xs"
            >
              Privacidade Ativa
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Acompanhe suas buscas, apresentações recebidas e controle de compartilhamento de contato
          </p>
        </div>

        <Button
          onClick={() => navigate('/publicar-interesse')}
          className="text-xs font-semibold shadow-sm"
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Publicar Nova Demanda
        </Button>
      </div>

      <Tabs defaultValue="demandas" className="space-y-6">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="demandas" className="text-xs font-semibold gap-1.5">
            <HeartHandshake className="h-4 w-4" />
            Minhas Demandas ({interests.length})
          </TabsTrigger>
          <TabsTrigger value="apresentacoes" className="text-xs font-semibold gap-1.5">
            <Inbox className="h-4 w-4" />
            Apresentações Recebidas ({presentations.length})
          </TabsTrigger>
          <TabsTrigger value="favoritos" className="text-xs font-semibold gap-1.5">
            <Heart className="h-4 w-4 text-red-500" />
            Imóveis Salvos ({favorites.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DEMANDAS & SLOTS */}
        <TabsContent value="demandas" className="space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando demandas...
            </div>
          ) : interests.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-3">
              <HeartHandshake className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                Você ainda não publicou nenhuma demanda
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Descreva o imóvel que você quer comprar ou alugar para receber até 5 propostas
                qualificadas de corretores com CRECI.
              </p>
              <Button size="sm" onClick={() => navigate('/publicar-interesse')} className="text-xs">
                Publicar primeira demanda
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {interests.map((interest) => {
                // Calculate pending slots for this demand
                const demandPresentations = presentations.filter(
                  (p) => p.interest_id === interest.id,
                )
                const pendingCount = demandPresentations.filter(
                  (p) => p.status === 'pendente',
                ).length
                const acceptedCount = demandPresentations.filter(
                  (p) => p.status === 'aceita',
                ).length
                const slotsUsed = pendingCount
                const slotsMax = 5
                const progressPct = (slotsUsed / slotsMax) * 100

                return (
                  <Card key={interest.id} className="overflow-hidden border-border shadow-sm">
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={
                              interest.purpose === 'comprar' ? 'bg-primary' : 'bg-emerald-600'
                            }
                          >
                            {interest.purpose === 'comprar' ? 'Compra' : 'Aluguel'}
                          </Badge>
                          <Badge variant="outline" className="capitalize text-xs">
                            {interest.property_type}
                          </Badge>
                          <Badge
                            variant={interest.status === 'ativo' ? 'default' : 'secondary'}
                            className={`text-[10px] uppercase font-bold ${
                              interest.status === 'ativo'
                                ? 'bg-emerald-600 text-white'
                                : interest.status === 'pausado'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {interest.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(interest.created).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-foreground leading-snug">
                          {interest.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            <strong>Local:</strong>{' '}
                            {interest.neighborhoods ? `${interest.neighborhoods} - ` : ''}
                            {interest.city}/{interest.state}
                          </span>
                          <span>
                            <strong>Teto:</strong> R$ {interest.max_price.toLocaleString('pt-BR')}
                          </span>
                          {interest.min_bedrooms && (
                            <span>
                              <strong>Quartos:</strong> Mín. {interest.min_bedrooms}
                            </span>
                          )}
                        </div>

                        {/* SLOTS BARRA DE 5 VAGAS */}
                        <div className="pt-2 max-w-md space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              Vagas de apresentação pendente:
                              <strong className="text-primary">
                                {slotsUsed} de {slotsMax}
                              </strong>
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {slotsMax - slotsUsed}{' '}
                              {slotsMax - slotsUsed === 1 ? 'vaga livre' : 'vagas livres'}
                            </span>
                          </div>
                          <Progress value={progressPct} className="h-2" />
                          <span className="text-[10px] text-muted-foreground block">
                            * Vaga liberada automaticamente se você recusar ou após 7 dias sem
                            resposta.
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2 shrink-0">
                        {interest.status !== 'encerrado' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(interest)}
                            className="text-xs h-8"
                          >
                            {interest.status === 'ativo' ? (
                              <>
                                <PauseCircle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                Pausar
                              </>
                            ) : (
                              <>
                                <PlayCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                Reativar
                              </>
                            )}
                          </Button>
                        )}

                        {interest.status !== 'encerrado' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEndDemand(interest)}
                            className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Encerrar
                          </Button>
                        )}

                        <span className="text-[11px] text-muted-foreground pt-1">
                          {acceptedCount} apresentação aceita
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: APRESENTAÇÕES RECEBIDAS */}
        <TabsContent value="apresentacoes" className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando apresentações...
            </div>
          ) : presentations.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-2">
              <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                Nenhuma apresentação recebida ainda
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Assim que um corretor com CRECI encontrar um imóvel que bata com sua demanda, a
                apresentação aparecerá aqui para sua análise.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {presentations.map((pres) => {
                const broker = pres.expand?.broker_id
                const prop = pres.expand?.property_id
                const interest = pres.expand?.interest_id

                return (
                  <Card
                    key={pres.id}
                    className="overflow-hidden border-border shadow-sm flex flex-col justify-between"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-semibold capitalize ${
                            pres.status === 'pendente'
                              ? 'bg-amber-100 text-amber-800'
                              : pres.status === 'aceita'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          Status: {pres.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(pres.created).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {/* Broker header */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            Corretor: {broker?.name || 'Corretor parceiro'}
                          </span>
                          {broker?.creci && (
                            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              CRECI {broker.creci}/{broker.creci_uf || 'SP'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Property summary */}
                      {prop && (
                        <div className="bg-muted/30 p-2.5 rounded-lg space-y-1">
                          <span className="text-xs font-semibold text-foreground line-clamp-1">
                            {prop.title}
                          </span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-primary">
                              R$ {prop.price.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {prop.neighborhood ? `${prop.neighborhood}, ` : ''}
                              {prop.city}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Message preview */}
                      <p className="text-xs text-muted-foreground italic line-clamp-2 bg-background p-2 rounded border">
                        "{pres.message}"
                      </p>
                    </div>

                    <div className="p-4 pt-0">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/apresentacao/${pres.id}`)}
                        className="w-full text-xs font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Ver Apresentação Completa
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: FAVORITOS */}
        <TabsContent value="favoritos" className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando favoritos...
            </div>
          ) : favorites.length === 0 ? (
            <Card className="border-dashed p-10 text-center space-y-2">
              <Heart className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-base text-foreground">
                Você ainda não favoritou nenhum imóvel
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Explore o catálogo de imóveis e clique no coração para guardar os que mais gostar.
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/buscar?tipo=imoveis')}
                className="text-xs"
              >
                Explorar imóveis
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((fav) => {
                if (!fav.expand?.property_id) return null
                return (
                  <div key={fav.id} className="relative">
                    <PropertyCard property={fav.expand.property_id} isFavoriteInitial={true} />
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
