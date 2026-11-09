export type UserProfile = 'interessado' | 'corretor' | 'admin'
export type CreciStatus = 'pendente' | 'aprovado' | 'rejeitado'
export type Purpose = 'comprar' | 'alugar'
export type PropertyType = 'apartamento' | 'casa' | 'cobertura' | 'terreno' | 'comercial' | 'rural'
export type Status = 'ativo' | 'pausado' | 'encerrado'
export type PresentationStatus = 'pendente' | 'aceita' | 'recusada' | 'expirada'

export interface UserRecord {
  id: string
  email: string
  name: string
  avatar?: string
  profile?: UserProfile
  phone?: string
  state?: string
  city?: string
  creci?: string
  creci_uf?: string
  real_estate?: string
  regions?: string
  creci_status?: CreciStatus
  created: string
  updated: string
}

export interface PropertyRecord {
  id: string
  user_id: string
  title: string
  description?: string
  purpose: Purpose
  property_type: PropertyType
  state: string
  city: string
  neighborhood?: string
  address?: string
  hide_exact_address?: boolean
  price: number
  condo_fee?: number
  iptu?: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  features?: string | string[]
  images?: string[]
  photos_urls?: string | string[]
  status: Status
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export interface InterestRecord {
  id: string
  user_id: string
  title: string
  purpose: Purpose
  property_type: PropertyType
  state: string
  city: string
  neighborhoods?: string
  min_price?: number
  max_price: number
  min_bedrooms?: number
  min_bathrooms?: number
  min_parking_spaces?: number
  min_area?: number
  preferences?: string | string[]
  notes?: string
  status: Status
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export interface PresentationRecord {
  id: string
  interest_id: string
  interest_owner_id: string
  property_id: string
  broker_id: string
  message: string
  status: PresentationStatus
  rejection_reason?: string
  responded_at?: string
  created: string
  updated: string
  expand?: {
    interest_id?: InterestRecord
    property_id?: PropertyRecord
    broker_id?: UserRecord
    interest_owner_id?: UserRecord
  }
}

export interface ChatRecord {
  id: string
  presentation_id: string
  interest_id: string
  property_id: string
  buyer_id: string
  broker_id: string
  share_contact?: boolean
  last_message?: string
  last_message_time?: string
  status: 'ativo' | 'arquivado'
  created: string
  updated: string
  expand?: {
    presentation_id?: PresentationRecord
    interest_id?: InterestRecord
    property_id?: PropertyRecord
    buyer_id?: UserRecord
    broker_id?: UserRecord
  }
}

export interface MessageRecord {
  id: string
  chat_id: string
  sender_id: string
  text: string
  is_read?: boolean
  created: string
  updated: string
  expand?: {
    sender_id?: UserRecord
  }
}

export interface FavoriteRecord {
  id: string
  user_id: string
  property_id: string
  created: string
  updated: string
  expand?: {
    property_id?: PropertyRecord
  }
}

export interface ImportedContactRecord {
  id: string
  name: string
  email: string
  phone?: string
  state?: string
  city?: string
  creci?: string
  source?: string
  authorization_status: 'autorizado' | 'pendente' | 'descadastrado'
  created: string
  updated: string
}

export interface NotificationLogRecord {
  id: string
  recipient_email: string
  recipient_name?: string
  recipient_type: 'corretor' | 'interessado' | 'contato_importado'
  subject: string
  notification_type:
    | 'match_demanda'
    | 'apresentacao_recebida'
    | 'apresentacao_aceita'
    | 'mensagem_chat'
    | 'geral'
  status: 'enviado' | 'falha' | 'descadastrado'
  details?: string
  created: string
  updated: string
}
