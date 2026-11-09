import pb from '@/lib/pocketbase/client'
import type { ImportedContactRecord, NotificationLogRecord } from '@/types/database'

export async function getImportedContacts(): Promise<ImportedContactRecord[]> {
  try {
    const records = await pb
      .collection('imported_contacts')
      .getList<ImportedContactRecord>(1, 200, {
        sort: '-created',
      })
    return records.items
  } catch (err) {
    console.error('getImportedContacts error:', err)
    return []
  }
}

export async function createImportedContact(
  data: Partial<ImportedContactRecord>,
): Promise<ImportedContactRecord> {
  return await pb.collection('imported_contacts').create<ImportedContactRecord>(data)
}

export async function updateContactStatus(
  id: string,
  status: 'autorizado' | 'pendente' | 'descadastrado',
): Promise<ImportedContactRecord> {
  return await pb.collection('imported_contacts').update<ImportedContactRecord>(id, {
    authorization_status: status,
  })
}

export async function deleteImportedContact(id: string): Promise<boolean> {
  return await pb.collection('imported_contacts').delete(id)
}

export async function getNotificationLogs(): Promise<NotificationLogRecord[]> {
  try {
    const records = await pb
      .collection('notification_logs')
      .getList<NotificationLogRecord>(1, 100, {
        sort: '-created',
      })
    return records.items
  } catch (err) {
    console.error('getNotificationLogs error:', err)
    return []
  }
}

export async function createNotificationLog(
  data: Partial<NotificationLogRecord>,
): Promise<NotificationLogRecord> {
  return await pb.collection('notification_logs').create<NotificationLogRecord>(data)
}
