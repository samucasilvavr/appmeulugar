import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { InterestRecord } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Bed, Tag, Calendar, Send, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface InterestCardProps {
  interest: InterestRecord
  onSendPresentation?: (interest: InterestRecord) => void
}

export const InterestCard: React.FC<InterestCardProps> = ({ interest, onSendPresentation }) => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // parse preferences
  let preferences: string[] = []
  if (Array.isArray(interest.preferences)) {
    preferences = interest.preferences
  } else if (typeof interest.preferences === 'string') {
    try {
      preferences = JSON.parse(interest.preferences)
    } catch {
      preferences = []
    }
  }

  const handleAction = () => {
    if (onSendPresentation) {
      onSendPresentation(interest)
      return
    }

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.profile === 'corretor' || user?.profile === 'admin') {
      navigate(`/painel-corretor?enviar_para=${interest.id}`)
    } else {
      navigate('/painel-interessado')
    }
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-border/80 flex flex-col h-full bg-card overflow-hidden">
      <div className="bg-primary/5 p-3.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            className={
              interest.purpose === 'comprar'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-emerald-600 text-white font-semibold'
            }
          >
            Busca para {interest.purpose === 'comprar' ? 'Comprar' : 'Alugar'}
          </Badge>
          <Badge variant="outline" className="capitalize bg-background text-foreground text-xs">
            {interest.property_type}
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(interest.created).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Orçamento máx:
            </span>
            <span className="text-lg font-bold text-foreground">
              R$ {interest.max_price.toLocaleString('pt-BR')}
              {interest.purpose === 'alugar' && (
                <span className="text-xs font-normal text-muted-foreground">/mês</span>
              )}
            </span>
          </div>

          <h3 className="font-semibold text-base line-clamp-2 leading-snug mb-2 text-foreground">
            {interest.title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">
              {interest.neighborhoods ? `${interest.neighborhoods} - ` : ''}
              {interest.city}, {interest.state}
            </span>
          </div>

          {interest.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded-md mb-3">
              "{interest.notes}"
            </p>
          )}

          {/* Preferences tags */}
          {preferences.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {preferences.slice(0, 3).map((pref, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1"
                >
                  <Tag className="h-2.5 w-2.5 text-primary" />
                  {pref}
                </span>
              ))}
              {preferences.length > 3 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  +{preferences.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer with min specs and CTA */}
        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {interest.min_bedrooms ? (
              <span className="flex items-center gap-1 font-medium">
                <Bed className="h-3.5 w-3.5 text-primary" />
                Mín. {interest.min_bedrooms} {interest.min_bedrooms === 1 ? 'quarto' : 'quartos'}
              </span>
            ) : null}
            {interest.min_area ? (
              <span className="font-medium">Mín. {interest.min_area} m²</span>
            ) : null}
          </div>

          <Button
            size="sm"
            onClick={handleAction}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold shadow-sm"
          >
            <Send className="h-3.5 w-3.5" />
            {user?.profile === 'corretor' || user?.profile === 'admin'
              ? 'Apresentar Imóvel do Portfólio'
              : 'Ver Detalhes da Demanda'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
