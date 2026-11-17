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

// URL oficial de consulta pública de corretores de cada CRECI regional.
// Para regiões sem portal de consulta próprio, aponta para o portal nacional
// (COFECI / conselho.net.br) ou para a página de consulta do CRECI-SP
// (hospedeiro da consulta em nome de várias regiões).
const UF_CONSULTA_URLS: Record<string, { url: string; fonte: string }> = {
  AC: { url: 'https://www.cofeci.gov.br', fonte: 'COFECI (portal nacional)' },
  AL: { url: 'https://www.cofeci.gov.br', fonte: 'COFECI (portal nacional)' },
  AM: { url: 'https://creciam.conselho.net.br', fonte: 'CRECI 8ª Região (AM)' },
  AP: { url: 'https://www.cofeci.gov.br', fonte: 'COFECI (portal nacional)' },
  BA: { url: 'https://creciba.conselho.net.br', fonte: 'CRECI 5ª Região (BA)' },
  CE: { url: 'https://crecice.conselho.net.br', fonte: 'CRECI 7ª Região (CE)' },
  DF: { url: 'https://crecidf.conselho.net.br', fonte: 'CRECI 17ª Região (DF)' },
  ES: { url: 'https://crecies.conselho.net.br', fonte: 'CRECI 12ª Região (ES)' },
  GO: { url: 'https://crecigo.conselho.net.br', fonte: 'CRECI 19ª Região (GO)' },
  MA: { url: 'https://crecima.conselho.net.br', fonte: 'CRECI 9ª Região (MA)' },
  MG: { url: 'https://www.crecimgead.com.br', fonte: 'CRECI-MG (6ª Região)' },
  MS: { url: 'https://crecims.conselho.net.br', fonte: 'CRECI 20ª Região (MS)' },
  MT: { url: 'https://crecimt.conselho.net.br', fonte: 'CRECI 22ª Região (MT)' },
  PA: { url: 'https://crecipa.conselho.net.br', fonte: 'CRECI 16ª Região (PA)' },
  PB: { url: 'https://crecipb.conselho.net.br', fonte: 'CRECI 13ª Região (PB)' },
  PE: { url: 'https://crecipe.conselho.net.br', fonte: 'CRECI 10ª Região (PE)' },
  PI: { url: 'https://crecipi.conselho.net.br', fonte: 'CRECI 18ª Região (PI)' },
  PR: { url: 'https://www.crecipr.com.br', fonte: 'CRECI-PR (11ª Região)' },
  RJ: { url: 'https://crecirj.conselho.net.br', fonte: 'CRECI 4ª Região (RJ)' },
  RN: { url: 'https://crecirn.conselho.net.br', fonte: 'CRECI 14ª Região (RN)' },
  RO: { url: 'https://creciro.conselho.net.br', fonte: 'CRECI 23ª Região (RO)' },
  RR: { url: 'https://www.cofeci.gov.br', fonte: 'COFECI (portal nacional)' },
  RS: { url: 'https://crecirs.com.br', fonte: 'CRECI-RS (3ª Região)' },
  SC: { url: 'https://crecisc.conselho.net.br', fonte: 'CRECI 15ª Região (SC)' },
  SE: { url: 'https://crecise.conselho.net.br', fonte: 'CRECI 21ª Região (SE)' },
  SP: { url: 'https://www.crecisp.gov.br', fonte: 'CRECI-SP (2ª Região)' },
  TO: { url: 'https://crecito.conselho.net.br', fonte: 'CRECI 24ª Região (TO)' },
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
                intermedia esses dados. Nos estados sem portal de consulta próprio, o link abre o
                portal nacional do COFECI.
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
