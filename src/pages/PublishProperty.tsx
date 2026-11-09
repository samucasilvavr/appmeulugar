import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { createProperty } from '@/services/properties'
import { BRAZILIAN_STATES, getCitiesForState, COMMON_FEATURES } from '@/lib/locations'
import type { Purpose, PropertyType } from '@/types/database'
import {
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Camera,
  MapPin,
  DollarSign,
  EyeOff,
} from 'lucide-react'

export default function PublishPropertyPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Basic info
  const [purpose, setPurpose] = useState<Purpose>('comprar')
  const [propertyType, setPropertyType] = useState<PropertyType>('apartamento')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Step 2: Location & Pricing
  const [stateUf, setStateUf] = useState(user?.state || 'SP')
  const [city, setCity] = useState(user?.city || 'São Paulo')
  const [neighborhood, setNeighborhood] = useState('')
  const [address, setAddress] = useState('')
  const [hideExactAddress, setHideExactAddress] = useState(true)
  const [price, setPrice] = useState<string>('')
  const [condoFee, setCondoFee] = useState<string>('')
  const [iptu, setIptu] = useState<string>('')

  // Step 3: Features & Photos
  const [area, setArea] = useState<string>('')
  const [bedrooms, setBedrooms] = useState<string>('2')
  const [bathrooms, setBathrooms] = useState<string>('2')
  const [parkingSpaces, setParkingSpaces] = useState<string>('1')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('')
  const [photosList, setPhotosList] = useState<string[]>([
    'https://img.usecurling.com/p/800/600?q=modern%20apartment&color=blue',
    'https://img.usecurling.com/p/800/600?q=living%20room%20interior&color=gray',
  ])

  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f !== feat))
    } else {
      setSelectedFeatures([...selectedFeatures, feat])
    }
  }

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return
    setPhotosList([...photosList, photoUrlInput.trim()])
    setPhotoUrlInput('')
  }

  const handleRemovePhoto = (index: number) => {
    setPhotosList(photosList.filter((_, i) => i !== index))
  }

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim()) {
        toast({ title: 'Preencha o título do anúncio', variant: 'destructive' })
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!price || Number(price) <= 0) {
        toast({ title: 'Informe o valor do imóvel', variant: 'destructive' })
        return
      }
      setStep(3)
    }
  }

  const handleSubmit = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Você precisa estar logado',
        description: 'Faça login ou crie uma conta para publicar seu imóvel.',
      })
      navigate('/login', { state: { from: { pathname: '/publicar-imovel' } } })
      return
    }

    setLoading(true)
    try {
      await createProperty({
        user_id: user.id,
        title,
        description,
        purpose,
        property_type: propertyType,
        state: stateUf,
        city,
        neighborhood,
        address,
        hide_exact_address: hideExactAddress,
        price: Number(price),
        condo_fee: condoFee ? Number(condoFee) : undefined,
        iptu: iptu ? Number(iptu) : undefined,
        area: area ? Number(area) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        parking_spaces: parkingSpaces ? Number(parkingSpaces) : undefined,
        features: JSON.stringify(selectedFeatures),
        photos_urls: JSON.stringify(photosList),
        status: 'ativo',
      })

      toast({
        title: 'Imóvel anunciado com sucesso!',
        description: 'O imóvel está ativo e disponível para matches e apresentações.',
      })

      if (user.profile === 'corretor' || user.profile === 'admin') {
        navigate('/painel-corretor')
      } else {
        navigate('/buscar?tipo=imoveis')
      }
    } catch (err: any) {
      console.error('Error creating property:', err)
      toast({
        title: 'Erro ao anunciar imóvel',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const cities = getCitiesForState(stateUf)

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <Card className="shadow-md border-border">
        <CardHeader className="text-center pb-4 border-b">
          <div className="mx-auto h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
            <Building2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Anunciar Imóvel
          </CardTitle>
          <CardDescription className="text-xs">
            Cadastre seu imóvel em 3 etapas curtas com controle de privacidade e fotos
          </CardDescription>

          <div className="flex items-center justify-center gap-2 pt-3">
            <div
              className={`h-2 rounded-full transition-all ${step === 1 ? 'w-8 bg-emerald-600' : 'w-2 bg-muted'}`}
            />
            <div
              className={`h-2 rounded-full transition-all ${step === 2 ? 'w-8 bg-emerald-600' : 'w-2 bg-muted'}`}
            />
            <div
              className={`h-2 rounded-full transition-all ${step === 3 ? 'w-8 bg-emerald-600' : 'w-2 bg-muted'}`}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* ETAPA 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Finalidade do anúncio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPurpose('comprar')}
                    className={`p-3.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      purpose === 'comprar'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Venda do Imóvel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('alugar')}
                    className={`p-3.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      purpose === 'alugar'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Locação / Aluguel
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Tipo de imóvel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      'apartamento',
                      'casa',
                      'cobertura',
                      'terreno',
                      'comercial',
                      'rural',
                    ] as PropertyType[]
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPropertyType(t)}
                      className={`p-2.5 rounded-lg border text-center capitalize transition-all text-xs font-medium ${
                        propertyType === t
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">Título do anúncio *</label>
                <Input
                  placeholder="Ex: Apartamento reformado com varanda gourmet em Pinheiros"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Descrição detalhada</label>
                <Textarea
                  placeholder="Descreva a iluminação, estado de conservação, acabamentos, infraestrutura do condomínio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs min-h-[90px]"
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleNext}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Próxima etapa: Localização e Preço
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Estado (UF)</label>
                  <Select
                    value={stateUf}
                    onValueChange={(val) => {
                      setStateUf(val)
                      setCity(getCitiesForState(val)[0] || '')
                    }}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((s) => (
                        <SelectItem key={s.uf} value={s.uf} className="text-xs">
                          {s.name} ({s.uf})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Cidade</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Bairro</label>
                  <Input
                    placeholder="Ex: Pinheiros"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Rua e número (opcional)
                  </label>
                  <Input
                    placeholder="Ex: Rua dos Pinheiros, 850"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Hide exact address toggle */}
              <div className="p-3 bg-muted/30 rounded-xl border flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <EyeOff className="h-4 w-4 text-primary" />
                    Ocultar endereço exato no anúncio público
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Exibe apenas o bairro e a cidade. O endereço completo só é visto em visitas
                    agendadas.
                  </p>
                </div>
                <Switch checked={hideExactAddress} onCheckedChange={setHideExactAddress} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Preço {purpose === 'alugar' ? 'de Aluguel' : 'de Venda'} (R$) *
                  </label>
                  <Input
                    type="number"
                    required
                    placeholder={purpose === 'comprar' ? '890000' : '3800'}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="text-xs h-9 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Condomínio (R$ opcional)
                  </label>
                  <Input
                    type="number"
                    placeholder="850"
                    value={condoFee}
                    onChange={(e) => setCondoFee(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    IPTU anual/mensal (R$)
                  </label>
                  <Input
                    type="number"
                    placeholder="220"
                    value={iptu}
                    onChange={(e) => setIptu(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Voltar
                </Button>
                <Button
                  onClick={handleNext}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Próxima etapa: Detalhes e Fotos
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Área Útil (m²)</label>
                  <Input
                    type="number"
                    placeholder="82"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Quartos</label>
                  <Select value={bedrooms} onValueChange={setBedrooms}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">
                        1 quarto
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        2 quartos
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3 quartos
                      </SelectItem>
                      <SelectItem value="4" className="text-xs">
                        4+ quartos
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Banheiros</label>
                  <Select value={bathrooms} onValueChange={setBathrooms}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">
                        1 banheiro
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        2 banheiros
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3 banheiros
                      </SelectItem>
                      <SelectItem value="4" className="text-xs">
                        4+ banheiros
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Vagas</label>
                  <Select value={parkingSpaces} onValueChange={setParkingSpaces}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-xs">
                        0 vagas
                      </SelectItem>
                      <SelectItem value="1" className="text-xs">
                        1 vaga
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        2 vagas
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3+ vagas
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Features checklist */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-foreground">
                  Comodidades e Lazer (selecione)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_FEATURES.map((feat) => {
                    const isSelected = selectedFeatures.includes(feat)
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => toggleFeature(feat)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                            : 'bg-background text-muted-foreground hover:text-foreground border-border'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {feat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Photos manager */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-emerald-600" />
                  Fotos do Imóvel ({photosList.length})
                </label>

                <div className="flex gap-2">
                  <Input
                    placeholder="URL da foto (ex: https://img.usecurling.com/p/...)"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPhoto}
                    className="text-xs"
                  >
                    Adicionar
                  </Button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {photosList.map((url, i) => (
                    <div
                      key={i}
                      className="relative aspect-video rounded-md overflow-hidden bg-muted group border"
                    >
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover foto"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {loading ? 'Anunciando imóvel...' : 'Concluir e Publicar Imóvel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
