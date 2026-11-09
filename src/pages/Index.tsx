import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropertyCard } from '@/components/PropertyCard'
import { InterestCard } from '@/components/InterestCard'
import { getProperties } from '@/services/properties'
import { getInterests } from '@/services/interests'
import type { PropertyRecord, InterestRecord } from '@/types/database'
import { BRAZILIAN_STATES, getCitiesForState } from '@/lib/locations'
import {
  Search,
  HeartHandshake,
  Building2,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Send,
} from 'lucide-react'

export default function Index() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'interesses' | 'imoveis'>('interesses')
  const [properties, setProperties] = useState<PropertyRecord[]>([])
  const [interests, setInterests] = useState<InterestRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Search hero state
  const [selectedState, setSelectedState] = useState<string>('SP')
  const [selectedCity, setSelectedCity] = useState<string>('São Paulo')
  const [selectedPurpose, setSelectedPurpose] = useState<string>('todos')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [propsData, interestsData] = await Promise.all([
          getProperties('status = "ativo"', '-created', 6),
          getInterests('status = "ativo"', '-created', 6),
        ])
        setProperties(propsData)
        setInterests(interestsData)
      } catch (err) {
        console.error('Error loading home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (selectedState) params.set('uf', selectedState)
    if (selectedCity) params.set('cidade', selectedCity)
    if (selectedPurpose && selectedPurpose !== 'todos') params.set('finalidade', selectedPurpose)
    params.set('tipo', activeTab)
    navigate(`/buscar?${params.toString()}`)
  }

  const cities = getCitiesForState(selectedState)

  return (
    <div className="flex flex-col min-h-screen">
      {/* HERO SECTION with two clear paths */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-16 md:py-24 border-b">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
            <Badge
              variant="outline"
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-background/80 text-primary border-primary/30 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              O jeito inteligente de conectar imóveis no Brasil
            </Badge>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Você publica o que procura. <br className="hidden sm:inline" />
              <span className="text-primary">Corretores verificados</span> encontram para você.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Diga adeus a centenas de anúncios desatualizados e dezenas de ligações indesejadas.
              Aqui você recebe até 5 apresentações qualificadas e só abre contato se gostar.
            </p>
          </div>

          {/* TWO MAIN CALL TO ACTIONS (Dois Caminhos) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            <div
              onClick={() => navigate('/publicar-interesse')}
              className="group cursor-pointer rounded-2xl p-6 bg-card border-2 border-primary/20 hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <HeartHandshake className="h-4 w-4" />
                  Quero Comprar ou Alugar
                </span>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  Publicar o que procuro
                </h3>
                <p className="text-xs text-muted-foreground">
                  Descreva seu imóvel dos sonhos e receba propostas no sigilo
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

            <div
              onClick={() => navigate('/publicar-imovel')}
              className="group cursor-pointer rounded-2xl p-6 bg-card border-2 border-emerald-500/20 hover:border-emerald-500 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-between"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Sou Corretor ou Proprietário
                </span>
                <h3 className="text-lg font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                  Oferecer um Imóvel
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre seu imóvel e faça match automático com interessados reais
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="max-w-3xl mx-auto bg-card rounded-2xl border p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 mb-3 border-b text-xs font-semibold">
              <span className="text-muted-foreground uppercase tracking-wider">Busca Rápida</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('interesses')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === 'interesses' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  Demandas de Interessados
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('imoveis')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === 'imoveis' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  Imóveis Anunciados
                </button>
              </div>
            </div>

            <form onSubmit={handleHeroSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Estado (UF)
                </label>
                <Select
                  value={selectedState}
                  onValueChange={(val) => {
                    setSelectedState(val)
                    setSelectedCity(getCitiesForState(val)[0] || '')
                  }}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione o estado" />
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

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Cidade
                </label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione a cidade" />
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

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Finalidade
                </label>
                <Select value={selectedPurpose} onValueChange={setSelectedPurpose}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">
                      Comprar ou Alugar
                    </SelectItem>
                    <SelectItem value="comprar" className="text-xs">
                      Apenas Compra
                    </SelectItem>
                    <SelectItem value="alugar" className="text-xs">
                      Apenas Aluguel
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full h-10 font-semibold shadow-sm text-xs">
                  <Search className="h-4 w-4 mr-1.5" />
                  Buscar {activeTab === 'interesses' ? 'Demandas' : 'Imóveis'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION (3 pillars) */}
      <section className="py-14 bg-muted/20 border-b">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Como o AppMeuLugar protege você
            </h2>
            <p className="text-sm text-muted-foreground">
              Inovamos a experiência imobiliária com foco em ética, respeito e transparência
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-card p-6 rounded-xl border space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                Corretores com CRECI Verificado
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Todas as apresentações vêm de profissionais registrados e com atuação ativa na sua
                região, garantindo segurança jurídica.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Zero Spam & Contato Protegido</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seu telefone e e-mail não ficam públicos. A conversa ocorre primeiro em nosso chat
                interno e você decide se quer compartilhar seus dados.
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border space-y-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-foreground">Regra das 5 Apresentações</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cada demanda tem no máximo 5 vagas simultâneas. Você analisa com calma, sem ser
                soterrado por centenas de mensagens genéricas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PUBLIC SHOWCASE CARDS (Interesses & Imóveis) */}
      <section className="py-14">
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          {/* Section: Demands */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <HeartHandshake className="h-6 w-6 text-primary" />
                  O que as pessoas estão procurando agora
                </h2>
                <p className="text-xs text-muted-foreground">
                  Demandas reais de compradores e inquilinos esperando propostas de corretores
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/buscar?tipo=interesses')}
              >
                Ver todas as demandas
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Carregando demandas...
              </div>
            ) : interests.length === 0 ? (
              <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground">Nenhuma demanda ativa no momento.</p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/publicar-interesse')}>
                  Seja o primeiro a publicar
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {interests.map((item) => (
                  <InterestCard key={item.id} interest={item} />
                ))}
              </div>
            )}
          </div>

          {/* Section: Properties */}
          <div className="space-y-6 pt-6 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-emerald-600" />
                  Imóveis disponíveis no portfólio
                </h2>
                <p className="text-xs text-muted-foreground">
                  Imóveis com fotos, características e corretores prontos para apresentar
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/buscar?tipo=imoveis')}>
                Ver todos os imóveis
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Carregando imóveis...
              </div>
            ) : properties.length === 0 ? (
              <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground">Nenhum imóvel anunciado no momento.</p>
                <Button size="sm" className="mt-3" onClick={() => navigate('/publicar-imovel')}>
                  Anunciar primeiro imóvel
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((item) => (
                  <PropertyCard key={item.id} property={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="bg-primary text-primary-foreground py-14">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-5 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pronto para encontrar seu lugar sem estresse?
          </h2>
          <p className="text-sm sm:text-base opacity-90 leading-relaxed">
            Cadastre-se gratuitamente em menos de 1 minuto. Escolha se você quer encontrar um imóvel
            ou conectar clientes como corretor.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/cadastro')}
              className="font-bold shadow-md"
            >
              Criar Minha Conta Grátis
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/buscar')}
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary font-semibold"
            >
              Explorar sem cadastro
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
