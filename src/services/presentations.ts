import pb from '@/lib/pocketbase/client'
import type { PresentationRecord } from '@/types/database'

export async function getPresentationsByInterest(
  interestId: string,
): Promise<PresentationRecord[]> {
  try {
    const records = await pb.collection('presentations').getList<PresentationRecord>(1, 20, {
      filter: `interest_id = "${interestId}"`,
      sort: '-created',
      expand: 'property_id,broker_id',
    })
    return records.items
  } catch (err) {
    console.error('getPresentationsByInterest error:', err)
    return []
  }
}

export async function getPresentationsByBroker(brokerId: string): Promise<PresentationRecord[]> {
  try {
    const records = await pb.collection('presentations').getList<PresentationRecord>(1, 100, {
      filter: `broker_id = "${brokerId}"`,
      sort: '-created',
      expand: 'interest_id,property_id,interest_owner_id',
    })
    return records.items
  } catch (err) {
    console.error('getPresentationsByBroker error:', err)
    return []
  }
}

export async function getPresentationsForBuyer(buyerId: string): Promise<PresentationRecord[]> {
  try {
    const records = await pb.collection('presentations').getList<PresentationRecord>(1, 100, {
      filter: `interest_owner_id = "${buyerId}"`,
      sort: '-created',
      expand: 'interest_id,property_id,broker_id',
    })
    return records.items
  } catch (err) {
    console.error('getPresentationsForBuyer error:', err)
    return []
  }
}

export async function getPresentationById(id: string): Promise<PresentationRecord | null> {
  try {
    const record = await pb.collection('presentations').getOne<PresentationRecord>(id, {
      expand: 'interest_id,property_id,broker_id,interest_owner_id',
    })
    return record
  } catch {
    return null
  }
}

export async function createPresentation(data: {
  interest_id: string
  property_id: string
  message: string
}): Promise<PresentationRecord> {
  // interest_owner_id e broker_id são resolvidos no SERVIDOR (hook
  // presentation_create.pb.js): a demanda pode ser anônima (sem user_id),
  // e o corretor é sempre o usuário autenticado. As regras de negócio
  // (máx. 5 pendentes por demanda, imóvel do próprio portfólio, sem imóvel
  // duplicado) também são reforçadas no hook, de forma atômica.
  const pres = await pb.collection('presentations').create<PresentationRecord>({
    interest_id: data.interest_id,
    property_id: data.property_id,
    message: data.message,
    status: 'pendente',
  })

  // Log notification to buyer
  try {
    await pb.collection('notification_logs').create({
      recipient_email: 'contato@interessado.com',
      recipient_name: 'Interessado',
      recipient_type: 'interessado',
      subject: 'Você recebeu uma nova apresentação de imóvel',
      notification_type: 'apresentacao_recebida',
      status: 'enviado',
      details: `Apresentação #${pres.id} enviada pelo corretor`,
    })
  } catch {
    // best-effort
  }

  return pres
}

export async function updatePresentationStatus(
  id: string,
  status: 'aceita' | 'recusada' | 'expirada',
  rejectionReason?: string,
): Promise<PresentationRecord> {
  const updated = await pb.collection('presentations').update<PresentationRecord>(id, {
    status,
    rejection_reason: rejectionReason || '',
    responded_at: new Date().toISOString(),
  })

  // If accepted, automatically open a chat
  if (status === 'aceita') {
    const pres = await getPresentationById(id)
    if (pres) {
      try {
        // check if chat already exists
        const existing = await pb.collection('chats').getList(1, 1, {
          filter: `presentation_id = "${id}"`,
        })
        if (existing.items.length === 0) {
          const chat = await pb.collection('chats').create({
            presentation_id: pres.id,
            interest_id: pres.interest_id,
            property_id: pres.property_id,
            buyer_id: pres.interest_owner_id,
            broker_id: pres.broker_id,
            share_contact: false,
            last_message: 'Apresentação aceita! Conversa iniciada.',
            last_message_time: new Date().toISOString(),
            status: 'ativo',
          })

          // Add initial system message
          await pb.collection('messages').create({
            chat_id: chat.id,
            sender_id: pres.interest_owner_id,
            text: 'Olá! Aceitei sua apresentação e gostaria de saber mais detalhes sobre o imóvel.',
          })

          // Log notification
          await pb.collection('notification_logs').create({
            recipient_email: pres.expand?.broker_id?.email || 'corretor@meulugar.com.br',
            recipient_name: pres.expand?.broker_id?.name || 'Corretor',
            recipient_type: 'corretor',
            subject: 'Sua apresentação foi aceita!',
            notification_type: 'apresentacao_aceita',
            status: 'enviado',
            details: `Apresentação aceita para a demanda "${pres.expand?.interest_id?.title || ''}"`,
          })
        }
      } catch (err) {
        console.error('Error auto-creating chat upon acceptance:', err)
      }
    }
  }

  return updated
}
