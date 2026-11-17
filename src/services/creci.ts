import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

// Consulta de CRECI via API pública do BuscaCRECI.
// As 3 etapas (solicitação → polling de status → dados completos) rodam no
// BACKEND, em /backend/v1/appmeulugar/creci/consultar (pb_hooks/creci_consulta.pb.js),
// com timeout total de 25s — o browser só faz UMA chamada.

export interface CreciConsultaResultado {
  nomeCompleto: string
  creciCompleto: string
  situacao: string
  cidade: string
  estado: string
}

export interface CreciConsultaResponse {
  ok: boolean
  status?: 'ativo' | 'inativo'
  resultado?: CreciConsultaResultado
  instavel?: boolean
  motivo?: string
}

export async function consultarCreci(uf: string, creci: string): Promise<CreciConsultaResponse> {
  try {
    return await pb.send<CreciConsultaResponse>('/backend/v1/appmeulugar/creci/consultar', {
      method: 'GET',
      query: { uf, creci },
    })
  } catch (err) {
    console.error('consultarCreci error:', err)
    throw new Error(getErrorMessage(err))
  }
}
