import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { PropertyCard } from '@/components/PropertyCard'
import { InterestCard } from '@/components/InterestCard'
import { getProperties } from '@/services/properties'
import { getInterests } from '@/services/interests'
import type { PropertyRecord, InterestRecord } from '@/types/database'
import { BRAZILIAN_STATES, getCitiesForState } from '@/lib/locations'
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  HeartHandshake,
} from 'lucide-react'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = searchParams.get('tipo') === 'imoveis' ? 'imoveis' : 'interesses'
  const [tab, setTab] = useState<'interesses' | 'imoveis'>(initialTab)

  // Filters
  const [stateUf, setStateUf] = useState<string>(searchParams.get('uf') || 'todos')
  const [city, setCity] = useState<string>(searchParams.get('cidade') || 'todas')
  const [purpose, setPurpose] = useState<string>(searchParams.get('finalidade') || 'todos')
  const [propertyType, setPropertyType] = useState<string>(
    searchParams.get('tipo_imovel') || 'todos',
  )
  const [bedrooms, setBedrooms] = useState<string>(searchParams.get('quartos') || 'todos')
  const [maxPrice, setMaxPrice] = useState<number>(Number(searchParams.get('preco_max')) || 2000000)
  const [textSearch, setTextSearch] = useState<string>(searchParams.get('q') || '')

  const [properties, setProperties] = useState<PropertyRecord[]>([])
  const [interests, setInterests] = useState<InterestRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [propsData, interestsData] = await Promise.all([
          getProperties('status = "ativo"', '-created', 100),
          getInterests('status = "ativo"', '-created', 100),
        ])
        setProperties(propsData)
        setInterests(interestsData)
      } catch (err) {
        console.error('Error fetching search records:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleResetFilters = () => {
    setStateUf('todos')
    setCity('todas')
    setPurpose('todos')
    setPropertyType('todos')
    setBedrooms('todos')
    setMaxPrice(2000000)
    setTextSearch('')
  }

  // Filter properties client-side based on loaded active properties
  const filteredProperties = properties.filter((p) => {
    if (stateUf !== 'todos' && p.state.toUpperCase() !== stateUf.toUpperCase()) return false
    if (city !== 'todas' && p.city.toLowerCase() !== city.toLowerCase()) return false
    if (purpose !== 'todos' && p.purpose !== purpose) return false
    if (propertyType !== 'todos' && p.property_type !== propertyType) return false
    if (bedrooms !== 'todos') {
      const minBeds = Number(bedrooms)
      if ((p.bedrooms || 0) < minBeds) return false
    }
    if (p.price > maxPrice) return false
    if (textSearch.trim()) {
      const q = textSearch.toLowerCase()
      const inTitle = p.title.toLowerCase().includes(q)
      const inDesc = (p.description || '').toLowerCase().includes(q)
      const inNeigh = (p.neighborhood || '').toLowerCase().includes(q)
      if (!inTitle && !inDesc && !inNeigh) return false
    }
    return true
  })

  // Filter interests client-side
  const filteredInterests = interests.filter((i) => {
    if (stateUf !== 'todos' && i.state.toUpperCase() !== stateUf.toUpperCase()) return false
    if (city !== 'todas' && i.city.toLowerCase() !== city.toLowerCase()) return false
    if (purpose !== 'todos' && i.purpose !== purpose) return false
    if (propertyType !== 'todos' && i.property_type !== propertyType) return false
    if (bedrooms !== 'todos') {
      const minBeds = Number(bedrooms)
      if ((i.min_bedrooms || 0) < minBeds) return false
    }
    if (i.max_price > maxPrice && maxPrice < 2000000) return false
    if (textSearch.trim()) {
      const q = textSearch.toLowerCase()
      const inTitle = i.title.toLowerCase().includes(q)
      const inNotes = (i.notes || '').toLowerCase().includes(q)
      const inNeigh = (i.neighborhoods || '').toLowerCase().includes(q)
      if (!inTitle && !inNotes && !inNeigh) return false
    }
    return true
  })

  const availableCities = stateUf !== 'todos' ? getCitiesForState(stateUf) : []

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      {/* Header and Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Resultados da Busca
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Encontre o que os compradores buscam ou explore o catálogo de imóveis anunciados
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            size="sm"
            variant={tab === 'interesses' ? 'default' : 'ghost'}
            onClick={() => setTab('interesses')}
            className="text-xs font-semibold gap-1.5"
          >
            <HeartHandshake className="h-4 w-4" />
            Demandas ({filteredInterests.length})
          </Button>
          <Button
            size="sm"
            variant={tab === 'imoveis' ? 'default' : 'ghost'}
            onClick={() => setTab('imoveis')}
            className="text-xs font-semibold gap-1.5"
          >
            <Building2 className="h-4 w-4" />
            Imóveis ({filteredProperties.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* FILTERS SIDEBAR */}
        <aside className="lg:col-span-1 space-y-6 bg-card p-5 rounded-xl border h-fit sticky top-20 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Filtros
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </div>

          {/* Text keyword */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Palavra-chave ou bairro</label>
            <Input
              placeholder="Ex: Pinheiros, varanda, suite..."
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Estado (UF)</label>
            <Select
              value={stateUf}
              onValueChange={(val) => {
                setStateUf(val)
                setCity('todas')
              }}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todos os estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os estados
                </SelectItem>
                {BRAZILIAN_STATES.map((s) => (
                  <SelectItem key={s.uf} value={s.uf} className="text-xs">
                    {s.name} ({s.uf})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          {stateUf !== 'todos' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Cidade</label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as cidades
                  </SelectItem>
                  {availableCities.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Finalidade</label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todas (Comprar ou Alugar)
                </SelectItem>
                <SelectItem value="comprar" className="text-xs">
                  Comprar
                </SelectItem>
                <SelectItem value="alugar" className="text-xs">
                  Alugar
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Tipo de Imóvel</label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os tipos
                </SelectItem>
                <SelectItem value="apartamento" className="text-xs">
                  Apartamento
                </SelectItem>
                <SelectItem value="casa" className="text-xs">
                  Casa
                </SelectItem>
                <SelectItem value="cobertura" className="text-xs">
                  Cobertura
                </SelectItem>
                <SelectItem value="terreno" className="text-xs">
                  Terreno
                </SelectItem>
                <SelectItem value="comercial" className="text-xs">
                  Comercial
                </SelectItem>
                <SelectItem value="rural" className="text-xs">
                  Rural
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bedrooms */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Mínimo de Quartos</label>
            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Indiferente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Indiferente
                </SelectItem>
                <SelectItem value="1" className="text-xs">
                  1+ quarto
                </SelectItem>
                <SelectItem value="2" className="text-xs">
                  2+ quartos
                </SelectItem>
                <SelectItem value="3" className="text-xs">
                  3+ quartos
                </SelectItem>
                <SelectItem value="4" className="text-xs">
                  4+ quartos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Slider */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">Valor máximo:</span>
              <span className="font-bold text-primary">R$ {maxPrice.toLocaleString('pt-BR')}</span>
            </div>
            <Slider
              min={1000}
              max={3000000}
              step={10000}
              value={[maxPrice]}
              onValueChange={(val) => setMaxPrice(val[0])}
            />
          </div>
        </aside>

        {/* RESULTS GRID */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              Carregando resultados...
            </div>
          ) : tab === 'interesses' ? (
            filteredInterests.length === 0 ? (
              <div className="py-16 text-center bg-card rounded-xl border border-dashed p-8 space-y-3">
                <HeartHandshake className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
                <h3 className="font-semibold text-base text-foreground">
                  Nenhuma demanda encontrada com estes filtros
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Tente ajustar a cidade, finalidade ou valor máximo para ver mais opções.
                </p>
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredInterests.map((interest) => (
                  <InterestCard key={interest.id} interest={interest} />
                ))}
              </div>
            )
          ) : filteredProperties.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-xl border border-dashed p-8 space-y-3">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
              <h3 className="font-semibold text-base text-foreground">
                Nenhum imóvel encontrado com estes filtros
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Tente ajustar os critérios de busca ou remover alguns filtros.
              </p>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
