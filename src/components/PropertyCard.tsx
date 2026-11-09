import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { PropertyRecord } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bed, Bath, Car, Maximize, MapPin, Heart } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { addFavorite, removeFavoriteByProperty } from '@/services/favorites'
import { useToast } from '@/hooks/use-toast'

interface PropertyCardProps {
  property: PropertyRecord
  isFavoriteInitial?: boolean
  onFavoriteChange?: (isFav: boolean) => void
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isFavoriteInitial = false,
  onFavoriteChange,
}) => {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(isFavoriteInitial)
  const [loadingFav, setLoadingFav] = useState(false)

  // parse images/photos
  let photos: string[] = []
  if (Array.isArray(property.photos_urls)) {
    photos = property.photos_urls
  } else if (typeof property.photos_urls === 'string') {
    try {
      photos = JSON.parse(property.photos_urls)
    } catch {
      photos = []
    }
  }

  const mainPhoto =
    photos.length > 0
      ? photos[0]
      : 'https://img.usecurling.com/p/800/600?q=modern%20house&color=blue'

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated || !user) {
      toast({
        title: 'Faça login para salvar favoritos',
        description: 'Você precisa entrar na sua conta para guardar este imóvel.',
        variant: 'default',
      })
      navigate('/login')
      return
    }

    setLoadingFav(true)
    try {
      if (isFav) {
        await removeFavoriteByProperty(user.id, property.id)
        setIsFav(false)
        onFavoriteChange?.(false)
        toast({ title: 'Removido dos favoritos' })
      } else {
        await addFavorite(user.id, property.id)
        setIsFav(true)
        onFavoriteChange?.(true)
        toast({ title: 'Salvo nos favoritos!' })
      }
    } catch (err) {
      console.error('Favorite error:', err)
    } finally {
      setLoadingFav(false)
    }
  }

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-all duration-200 border-border/80 flex flex-col h-full bg-card">
      {/* Image container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={mainPhoto}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <Badge
            className={
              property.purpose === 'comprar'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-emerald-600 text-white font-semibold'
            }
          >
            {property.purpose === 'comprar' ? 'Venda' : 'Aluguel'}
          </Badge>
          <Badge
            variant="secondary"
            className="capitalize backdrop-blur bg-background/80 text-foreground"
          >
            {property.property_type}
          </Badge>
        </div>

        <button
          onClick={handleToggleFavorite}
          disabled={loadingFav}
          className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:text-red-500 hover:bg-background transition-colors shadow-sm"
          title={isFav ? 'Remover favorito' : 'Salvar favorito'}
        >
          <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white drop-shadow-md">
          <span className="flex items-center gap-1 font-medium bg-black/40 backdrop-blur px-2 py-0.5 rounded">
            <MapPin className="h-3 w-3" />
            {property.neighborhood
              ? `${property.neighborhood}, ${property.city}`
              : property.city} -{' '}
            {property.state}
          </span>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xl font-bold text-foreground">
              R$ {property.price.toLocaleString('pt-BR')}
              {property.purpose === 'alugar' && (
                <span className="text-xs font-normal text-muted-foreground">/mês</span>
              )}
            </span>
            {property.condo_fee && property.condo_fee > 0 ? (
              <span className="text-xs text-muted-foreground">Cond: R$ {property.condo_fee}</span>
            ) : null}
          </div>

          <h3 className="font-semibold text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {property.title}
          </h3>

          {property.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {property.description}
            </p>
          )}
        </div>

        {/* Specs bar */}
        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          {property.area ? (
            <span className="flex items-center gap-1" title="Área útil">
              <Maximize className="h-3.5 w-3.5 text-primary" />
              {property.area} m²
            </span>
          ) : null}

          {property.bedrooms ? (
            <span className="flex items-center gap-1" title="Quartos">
              <Bed className="h-3.5 w-3.5 text-primary" />
              {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
            </span>
          ) : null}

          {property.bathrooms ? (
            <span className="flex items-center gap-1" title="Banheiros">
              <Bath className="h-3.5 w-3.5 text-primary" />
              {property.bathrooms} {property.bathrooms === 1 ? 'banheiro' : 'banheiros'}
            </span>
          ) : null}

          {property.parking_spaces ? (
            <span className="flex items-center gap-1" title="Vagas">
              <Car className="h-3.5 w-3.5 text-primary" />
              {property.parking_spaces} {property.parking_spaces === 1 ? 'vaga' : 'vagas'}
            </span>
          ) : null}
        </div>

        {/* Footer Broker info */}
        {property.expand?.user_id && (
          <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-dashed">
            <span className="truncate font-medium text-foreground">
              Anunciado por: {property.expand.user_id.name || 'Corretor parceiro'}
            </span>
            {property.expand.user_id.creci && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                CRECI {property.expand.user_id.creci}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
