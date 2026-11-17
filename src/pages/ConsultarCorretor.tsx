import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BRAZILIAN_STATES } from '@/lib/locations'
import { ExternalLink, ShieldCheck, Info, MapPin } from 'lucide-react'

// URL oficial de consulta pública de corretores de cada CRECI regional —
// endereços conferidos e fornecidos pelo usuário (um por UF, 27 estados).
const UF_CONSULTA_URLS: Record<string, { url: string; fonte: string }> = {
  // Links diretos (página exata de busca)
  DF: { url: 'https://app.crecidf.gov.br/consultacorretor', fonte: 'CRECI-DF' },
  MG: { url: 'https://crecimg.gov.br', fonte: 'CRECI-MG (consulta pelo menu do portal)' },
  PB: {
    url: 'https://creci-pb.gov.br/canal-do-cidadao/pesquisa-de-corretores-credenciados/',
    fonte: 'CRECI-PB',
  },
  PR: { url: 'https://www.crecipr.gov.br/pesquisa-credenciados', fonte: 'CRECI-PR' },
  SC: {
    url: 'https://www.crecisc.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-SC',
  },
  SP: { url: 'https://www.crecisp.gov.br/cidadao/buscaporcorretores', fonte: 'CRECI-SP' },
  // Demais estados (sistema padrão Conselho.Net, form_pesquisa_cadastro_geral_site.php)
  AC: {
    url: 'https://www.creciac.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-AC',
  },
  AL: {
    url: 'https://creci-al.gov.br/novo/area-do-corretor',
    fonte: 'CRECI-AL (área do corretor)',
  },
  AP: {
    url: 'https://www.creciap.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-AP',
  },
  AM: {
    url: 'https://www.creciam.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-AM',
  },
  BA: {
    url: 'https://www.creciba.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-BA',
  },
  CE: {
    url: 'https://www.crecice.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-CE',
  },
  ES: {
    url: 'https://www.crecies.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-ES',
  },
  GO: {
    url: 'https://www.crecigo.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-GO',
  },
  MA: {
    url: 'https://www.crecima.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-MA',
  },
  MT: {
    url: 'https://www.crecimt.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-MT',
  },
  MS: {
    url: 'https://www.crecims.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-MS',
  },
  PA: {
    url: 'https://www.crecipa.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-PA',
  },
  PE: {
    url: 'https://www.crecipe.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-PE',
  },
  PI: {
    url: 'https://www.crecipi.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-PI',
  },
  RJ: {
    url: 'https://www.crecirj.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-RJ',
  },
  RN: {
    url: 'https://www.crecirn.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-RN',
  },
  RS: {
    url: 'https://www.crecirs.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-RS',
  },
  RO: {
    url: 'https://www.creciro.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-RO',
  },
  RR: {
    url: 'https://www.crecirr.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-RR',
  },
  SE: {
    url: 'https://www.crecise.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-SE',
  },
  TO: {
    url: 'https://www.crecito.conselho.net.br/form_pesquisa_cadastro_geral_site.php',
    fonte: 'CRECI-TO',
  },
}

export default function ConsultarCorretorPage() {
  const [uf, setUf] = useState('')
  const destino = useMemo(() => (uf ? UF_CONSULTA_URLS[uf] : undefined), [uf])

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Consultar Corretor</h1>
          <p className="text-sm text-muted-foreground">
            Consulte o registro de um corretor de imóveis no CRECI do seu estado, direto no site
            oficial do conselho regional.
          </p>
        </div>

        <Card className="shadow-md border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Consulta oficial no CRECI
            </CardTitle>
            <CardDescription className="text-xs">
              Escolha o estado do registro do corretor e você será levado ao site oficial de
              consulta do CRECI respectivo, em uma nova aba.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Estado do registro (UF)</label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger className="text-xs h-10 w-full">
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

            {destino && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {destino.fonte}
                </p>
                <p className="text-[11px] text-muted-foreground break-all">{destino.url}</p>
                {uf === 'MG' && (
                  <p className="text-[11px] text-muted-foreground">
                    No CRECI-MG a consulta é feita pelo menu do portal (Procure um corretor).
                  </p>
                )}
              </div>
            )}

            <Button
              type="button"
              className="w-full h-10 font-semibold text-xs"
              disabled={!uf}
              onClick={() => {
                if (destino) window.open(destino.url, '_blank', 'noopener,noreferrer')
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Consultar no site oficial
            </Button>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                A consulta é feita no site oficial do conselho — o AppMeuLugar não armazena nem
                intermedia esses dados. Em todos os estados o link abre a página de consulta do
                CRECI respectivo.
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          É corretor e quer receber clientes?{' '}
          <Link to="/cadastro" className="font-semibold text-primary hover:underline">
            Cadastre-se gratuitamente
          </Link>
        </p>
      </div>
    </div>
  )
}
