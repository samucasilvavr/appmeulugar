import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { getPresentationById, updatePresentationStatus } from '@/services/presentations'
import type { PresentationRecord } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  MessageSquare,
  ArrowLeft,
  Building2,
  MapPin,
  Maximize,
  Bed,
  Bath,
  Car,
  Tag,
  AlertTriangle,
} from 'lucide-react'

export default function ViewPresentationPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [presentation, setPresentation] = useState<PresentationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    async function load() {
      if (!id) return
      setLoading(true)
      const data = await getPresentationById(id)
      setPresentation(data)
      setLoading(false)
    }
    load()
  }, [id, isAuthenticated])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-sm text-muted-foreground">
        Carregando apresentação...
      </div>
    )
  }

  if (!presentation) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Apresentação não encontrada</h2>
        <Button onClick={() => navigate('/painel-interessado')}>Voltar ao painel</Button>
      </div>
    )
  }

  const broker = presentation.expand?.broker_id
  const prop = presentation.expand?.property_id
  const interest = presentation.expand?.interest_id
  const isOwner = user?.id === presentation.interest_owner_id

  // parse photos
  let photos: string[] = []
  if (prop?.photos_urls) {
    if (Array.isArray(prop.photos_urls)) photos = prop.photos_urls
    else {
      try {
        photos = JSON.parse(prop.photos_urls)
      } catch {
        photos = []
      }
    }
  }

  const handleAccept = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      await updatePresentationStatus(id, 'aceita')
      toast({
        title: 'Apresentação aceita!',
        description: 'A conversa interna foi liberada com segurança no chat.',
      })
      navigate('/conversas')
    } catch (err: any) {
      toast({
        title: 'Erro ao aceitar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      await updatePresentationStatus(id, 'recusada', rejectionReason)
      toast({
        title: 'Apresentação recusada',
        description: 'A vaga de apresentação foi liberada na sua demanda.',
      })
      setRejectModalOpen(false)
      navigate('/painel-interessado')
    } catch (err: any) {
      toast({
        title: 'Erro ao recusar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1.5" />
        Voltar
      </Button>

      <Card className="shadow-md border-border overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 p-5 border-b space-y-2">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={`text-xs font-semibold capitalize ${
                presentation.status === 'pendente'
                  ? 'bg-amber-100 text-amber-800'
                  : presentation.status === 'aceita'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              Status: {presentation.status}
            </Badge>

            <span className="text-xs text-muted-foreground">
              Recebida em: {new Date(presentation.created).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
            Apresentação de Imóvel
          </h1>
          <p className="text-xs text-muted-foreground">
            Vinculada à sua demanda: <strong className="text-foreground">{interest?.title}</strong>
          </p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* 1. CORRETOR E CRECI */}
          <div className="p-4 bg-card rounded-xl border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Profissional Responsável
              </span>
              <h3 className="font-bold text-base text-foreground">{broker?.name || 'Corretor'}</h3>
              {broker?.real_estate && (
                <span className="text-xs text-muted-foreground block">{broker.real_estate}</span>
              )}
            </div>

            <div className="text-right space-y-1">
              {broker?.creci ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  CRECI {broker.creci}/{broker.creci_uf || 'SP'}
                </Badge>
              ) : null}
              <span className="text-[10px] text-muted-foreground block">Registro Ativo</span>
            </div>
          </div>

          {/* 2. MENSAGEM DO CORRETOR */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Mensagem personalizada do corretor
            </span>
            <div className="p-4 bg-muted/30 rounded-xl border text-sm text-foreground italic leading-relaxed">
              "{presentation.message}"
            </div>
          </div>

          {/* 3. RESUMO DO IMÓVEL */}
          {prop && (
            <div className="space-y-3 pt-2 border-t">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Imóvel Apresentado
              </span>

              {photos.length > 0 && (
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-muted border">
                  <img src={photos[0]} alt={prop.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-foreground">{prop.title}</h3>
                  <span className="text-xl font-extrabold text-primary">
                    R$ {prop.price.toLocaleString('pt-BR')}
                    {prop.purpose === 'alugar' && (
                      <span className="text-xs font-normal text-muted-foreground">/mês</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {prop.neighborhood ? `${prop.neighborhood}, ` : ''}
                    {prop.city} - {prop.state}
                  </span>
                </div>

                {prop.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {prop.description}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t text-xs">
                  {prop.area && (
                    <div className="p-2 bg-muted/20 rounded flex items-center gap-1.5 font-medium">
                      <Maximize className="h-4 w-4 text-primary" />
                      <span>{prop.area} m²</span>
                    </div>
                  )}
                  {prop.bedrooms && (
                    <div className="p-2 bg-muted/20 rounded flex items-center gap-1.5 font-medium">
                      <Bed className="h-4 w-4 text-primary" />
                      <span>{prop.bedrooms} quartos</span>
                    </div>
                  )}
                  {prop.bathrooms && (
                    <div className="p-2 bg-muted/20 rounded flex items-center gap-1.5 font-medium">
                      <Bath className="h-4 w-4 text-primary" />
                      <span>{prop.bathrooms} banheiros</span>
                    </div>
                  )}
                  {prop.parking_spaces && (
                    <div className="p-2 bg-muted/20 rounded flex items-center gap-1.5 font-medium">
                      <Car className="h-4 w-4 text-primary" />
                      <span>{prop.parking_spaces} vagas</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. AVISO DE PRIVACIDADE */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-900">
            <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-semibold">Sua privacidade está 100% protegida</strong>
              <p className="text-[11px] leading-relaxed text-blue-800">
                Ao aceitar esta apresentação, uma conversa interna será aberta no chat do
                AppMeuLugar. Seu telefone e e-mail permanecem ocultos até que você decida autorizar
                o compartilhamento diretamente no chat.
              </p>
            </div>
          </div>

          {/* 5. AÇÕES DO INTERESSADO */}
          {isOwner && presentation.status === 'pendente' && (
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(true)}
                disabled={actionLoading}
                className="w-full sm:w-auto text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Recusar Apresentação
              </Button>

              <Button
                onClick={handleAccept}
                disabled={actionLoading}
                className="w-full sm:w-auto text-xs font-semibold shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {actionLoading ? 'Processando...' : 'Aceitar e Abrir Conversa'}
              </Button>
            </div>
          )}

          {presentation.status === 'aceita' && (
            <div className="pt-4 border-t flex justify-end">
              <Button onClick={() => navigate('/conversas')} className="text-xs font-semibold">
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Ir para o Chat com o Corretor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL RECUSAR APRESENTAÇÃO */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Recusar Apresentação</DialogTitle>
            <DialogDescription className="text-xs">
              Ao recusar, esta vaga será liberada imediatamente para que outro corretor possa enviar
              uma nova opção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-foreground">
              Motivo da recusa (opcional, ajuda o corretor a entender):
            </label>
            <Textarea
              rows={3}
              placeholder="Ex: Valor acima do pretendido, localização fora do foco, imóvel precisa de reformas..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={actionLoading}
              className="text-xs font-semibold"
            >
              {actionLoading ? 'Recusando...' : 'Confirmar Recusa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
