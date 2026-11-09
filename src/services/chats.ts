import pb from '@/lib/pocketbase/client'
import type { ChatRecord, MessageRecord } from '@/types/database'

export async function getChatsForUser(userId: string): Promise<ChatRecord[]> {
  try {
    const records = await pb.collection('chats').getList<ChatRecord>(1, 50, {
      filter: `buyer_id = "${userId}" || broker_id = "${userId}"`,
      sort: '-updated',
      expand: 'presentation_id,interest_id,property_id,buyer_id,broker_id',
    })
    return records.items
  } catch (err) {
    console.error('getChatsForUser error:', err)
    return []
  }
}

export async function getChatById(id: string): Promise<ChatRecord | null> {
  try {
    const record = await pb.collection('chats').getOne<ChatRecord>(id, {
      expand: 'presentation_id,interest_id,property_id,buyer_id,broker_id',
    })
    return record
  } catch {
    return null
  }
}

export async function getMessagesByChat(chatId: string): Promise<MessageRecord[]> {
  try {
    const records = await pb.collection('messages').getList<MessageRecord>(1, 100, {
      filter: `chat_id = "${chatId}"`,
      sort: 'created',
      expand: 'sender_id',
    })
    return records.items
  } catch (err) {
    console.error('getMessagesByChat error:', err)
    return []
  }
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
): Promise<MessageRecord> {
  const msg = await pb.collection('messages').create<MessageRecord>({
    chat_id: chatId,
    sender_id: senderId,
    text,
    is_read: false,
  })

  // update chat last_message
  try {
    await pb.collection('chats').update(chatId, {
      last_message: text,
      last_message_time: new Date().toISOString(),
    })
  } catch {
    // best-effort
  }

  return msg
}

export async function toggleShareContact(
  chatId: string,
  shareContact: boolean,
): Promise<ChatRecord> {
  return await pb.collection('chats').update<ChatRecord>(chatId, {
    share_contact: shareContact,
  })
}
