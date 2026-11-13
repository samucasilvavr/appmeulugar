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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { createInterest } from '@/services/interests'
import { BRAZILIAN_STATES, getCitiesForState, COMMON_FEATURES } from '@/lib/locations'
import type { Purpose, PropertyType } from '@/types/database'
import {
  HeartHandshake,
  Check,
  ArrowRight,
  ArrowLeft,
  MapPin,
  DollarSign,
  Home,
  Sparkles,
  ShieldCheck,
  Lock,
  User,
  Phone,
  Mail,
} from 'lucide-react'

export default function PublishInterestPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)

  // Contato anônimo (apenas quando não autenticado)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Step 1: Purpose, Type, Title
  const [purpose, setPurpose] = useState<Purpose>('comprar')
  const [propertyType, setPropertyType] = useState<PropertyType>('apartamento')
  const [title, setTitle] = useState('')

  // Step 2: Location & Price range
  const [stateUf, setStateUf] = useState(user?.state || 'SP')
  const [city, setCity] = useState(user?.city || 'São Paulo')
  const [neighborhoods, setNeighborhoods] = useState('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  // Step 3: Specs & Preferences
  const [minBedrooms, setMinBedrooms] = useState<string>('2')
  const [minBathrooms, setMinBathrooms] = useState<string>('1')
  const [minParking, setMinParking] = useState<string>('1')
  const [minArea, setMinArea] = useState<string>('')
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const togglePreference = (feat: string) => {
    if (selectedPreferences.includes(feat)) {
      setSelectedPreferences(selectedPreferences.filter((f) => f !== feat))
    } else {
      setSelectedPreferences([...selectedPreferences, feat])
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim()) {
        toast({ title: 'Preencha o título da sua busca', variant: 'destructive' })
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!maxPrice || Number(maxPrice) <= 0) {
        toast({ title: 'Informe o valor máximo do seu orçamento', variant: 'destructive' })
        return
      }
      setStep(3)
    }
  }

  const handleSubmit = async () => {
    // Visitante anônimo: exige nome + (telefone OU e-mail)
    if (!isAuthenticated || !user) {
      if (!contactName.trim()) {
        toast({
          title: 'Informe seu nome',
          description: 'É preciso informar um nome de contato para publicar sem cadastro.',
          variant: 'destructive',
        })
        setStep(3)
        return
      }
      if (!contactEmail.trim() && !contactPhone.trim()) {
        toast({
          title: 'Informe um contato',
          description: 'Informe telefone e/ou e-mail para os corretores poderem responder.',
          variant: 'destructive',
        })
        setStep(3)
        return
      }
      if (contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
        toast({
          title: 'E-mail inválido',
          description: 'Verifique o e-mail de contato informado.',
          variant: 'destructive',
        })
        setStep(3)
        return
      }
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        title,
        purpose,
        property_type: propertyType,
        state: stateUf,
        city,
        neighborhoods,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: Number(maxPrice),
        min_bedrooms: minBedrooms ? Number(minBedrooms) : undefined,
        min_bathrooms: minBathrooms ? Number(minBathrooms) : undefined,
        min_parking_spaces: minParking ? Number(minParking) : undefined,
        min_area: minArea ? Number(minArea) : undefined,
        preferences: JSON.stringify(selectedPreferences),
        notes,
        status: 'ativo',
      }

      if (isAuthenticated && user) {
        payload.user_id = user.id
      } else {
        payload.contact_name = contactName.trim()
        payload.contact_email = contactEmail.trim() || undefined
        payload.contact_phone = contactPhone.trim() || undefined
      }

      await createInterest(payload as any)

      toast({
        title: 'Demanda publicada com sucesso!',
        description: isAuthenticated
          ? 'Corretores da sua região poderão enviar até 5 apresentações qualificadas.'
          : 'Sua demanda está ativa! Crie uma conta com o mesmo e-mail para gerenciá-la e conversar nos chats.',
      })
      navigate(isAuthenticated ? '/painel-interessado' : '/')
    } catch (err: any) {
      console.error('Error creating interest:', err)
      toast({
        title: 'Erro ao publicar demanda',
        description: err?.response?.message || err?.message || 'Tente novamente.',
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
          <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Publicar o que procuro
          </CardTitle>
          <CardDescription className="text-xs">
            Descreva suas preferências em 3 etapas curtas. Seus dados de contato ficam totalmente
            protegidos.
          </CardDescription>

          {!isAuthenticated && (
            <Badge className="mx-auto mt-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              <Sparkles className="h-3 w-3 mr-1" />
              Sem cadastro: basta informar nome e contato
            </Badge>
          )}

          {/* Stepper indicators */}
          <div className="flex items-center justify-center gap-2 pt-3">
            <div
              className={`h-2 rounded-full transition-all ${step === 1 ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
            />
            <div
              className={`h-2 rounded-full transition-all ${step === 2 ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
            />
            <div
              className={`h-2 rounded-full transition-all ${step === 3 ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* ETAPA 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Qual é a sua finalidade?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPurpose('comprar')}
                    className={`p-3.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      purpose === 'comprar'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Quero Comprar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('alugar')}
                    className={`p-3.5 rounded-xl border text-center transition-all text-xs font-bold ${
                      purpose === 'alugar'
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Quero Alugar
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
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">
                  Título resumido da sua busca *
                </label>
                <Input
                  placeholder="Ex: Procuro apartamento de 2 ou 3 quartos em Pinheiros ou Perdizes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs h-10"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Dê um título direto para que os corretores entendam de imediato sua intenção.
                </span>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleNext} className="text-xs font-semibold">
                  Próxima etapa: Localização e Valor
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Bairros de preferência (opcional, separados por vírgula)
                </label>
                <Input
                  placeholder="Ex: Pinheiros, Vila Madalena, Perdizes"
                  value={neighborhoods}
                  onChange={(e) => setNeighborhoods(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Valor Mínimo (R$ opcional)
                  </label>
                  <Input
                    type="number"
                    placeholder="Ex: 500000"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Valor Máximo / Teto do Orçamento (R$) *
                  </label>
                  <Input
                    type="number"
                    required
                    placeholder={purpose === 'comprar' ? 'Ex: 950000' : 'Ex: 4000'}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="text-xs h-9 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Voltar
                </Button>
                <Button onClick={handleNext} className="text-xs font-semibold">
                  Próxima etapa: Características
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ETAPA 3 */}
          {step === 3 && (
            <div className="space-y-5">
              {/* CONTATO ANÔNIMO */}
              {!isAuthenticated && (
                <div className="space-y-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-800">
                      Seus dados de contato (nunca aparecem no card público)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Seu nome *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Como podemos te chamar?"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="pl-9 text-xs h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Telefone (WhatsApp)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="(11) 98765-4321"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="pl-9 text-xs h-9"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      E-mail (recomendado: permite vincular este interesse a uma conta futura)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="pl-9 text-xs h-9"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800/80">
                    Informe telefone OU e-mail (ou os dois). Seus dados ficam ocultos: os cards
                    públicos mostram apenas cidade, tipo, quartos e faixa de valor. Cadastre-se
                    depois com o mesmo e-mail para gerenciar a demanda e abrir chats.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Mín. Quartos</label>
                  <Select value={minBedrooms} onValueChange={setMinBedrooms}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">
                        1+
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        2+
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3+
                      </SelectItem>
                      <SelectItem value="4" className="text-xs">
                        4+
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Mín. Banheiros</label>
                  <Select value={minBathrooms} onValueChange={setMinBathrooms}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">
                        1+
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        2+
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3+
                      </SelectItem>
                      <SelectItem value="4" className="text-xs">
                        4+
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Mín. Vagas</label>
                  <Select value={minParking} onValueChange={setMinParking}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" className="text-xs">
                        Não exige
                      </SelectItem>
                      <SelectItem value="1" className="text-xs">
                        1+
                      </SelectItem>
                      <SelectItem value="2" className="text-xs">
                        2+
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Área mín. (m²)</label>
                  <Input
                    type="number"
                    placeholder="Ex: 65"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {/* Preferences checklist */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-foreground">
                  Diferenciais desejados (clique para selecionar)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_FEATURES.map((feat) => {
                    const isSelected = selectedPreferences.includes(feat)
                    return (
                      <button
                        key={feat}
                        type="button"
                        onClick={() => togglePreference(feat)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
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

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-foreground">
                  Observações adicionais ou exigências específicas
                </label>
                <Textarea
                  placeholder="Ex: Tenho carta de crédito contemplada, busco condomínio com lazer ou andar alto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="text-xs font-semibold shadow-sm"
                >
                  {loading ? 'Publicando demanda...' : 'Concluir e Ativar Demanda'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
