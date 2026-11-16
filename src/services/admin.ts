import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  EmailTemplateRecord,
  ImportedContactRecord,
  NotificationLogRecord,
} from '@/types/database'

// ---------- Gestão de usuários (somente admin) ----------
// Passa pelas rotas /backend/v1/appmeulugar/admin/users (pb_hooks/admin_users.pb.js),
// pois o admin do app NÃO é superusuário do PocketBase: só essas rotas conseguem
// ler/alterar o e-mail de outros usuários e criar novas contas (inclusive admin).

export type AdminManagedProfile = 'interessado' | 'corretor' | 'admin'

export interface AdminUserRecord {
  id: string
  email: string
  name: string
  profile: AdminManagedProfile
  phone: string
  state: string
  city: string
  creci: string
  creci_uf: string
  real_estate: string
  regions: string
  creci_status: '' | 'pendente' | 'aprovado' | 'rejeitado'
  blocked: boolean
  verified: boolean
  created: string
  updated: string
}

export interface AdminUserUpdatePayload {
  name?: string
  email?: string
  phone?: string
  state?: string
  city?: string
  creci?: string
  creci_uf?: string
  real_estate?: string
  regions?: string
  profile?: AdminManagedProfile
  creci_status?: '' | 'pendente' | 'aprovado' | 'rejeitado'
  verified?: boolean
  password?: string
}

export async function getAllUsers(): Promise<AdminUserRecord[]> {
  try {
    const res = await pb.send<{ items: AdminUserRecord[] }>('/backend/v1/appmeulugar/admin/users', {
      method: 'GET',
    })
    return res.items || []
  } catch (err) {
    console.error('getAllUsers error:', err)
    throw new Error(getErrorMessage(err))
  }
}

export async function adminUpdateUser(
  id: string,
  payload: AdminUserUpdatePayload,
): Promise<AdminUserRecord> {
  try {
    const res = await pb.send<{ item: AdminUserRecord }>(
      `/backend/v1/appmeulugar/admin/users/${id}`,
      { method: 'PATCH', body: payload },
    )
    return res.item
  } catch (err) {
    console.error('adminUpdateUser error:', err)
    throw new Error(getErrorMessage(err))
  }
}

export interface AdminCreateUserPayload {
  name: string
  email: string
  password: string
  profile: AdminManagedProfile
  phone?: string
  state?: string
  city?: string
  creci?: string
  creci_uf?: string
  real_estate?: string
  regions?: string
}

export async function adminCreateUser(payload: AdminCreateUserPayload): Promise<AdminUserRecord> {
  try {
    const res = await pb.send<{ item: AdminUserRecord }>('/backend/v1/appmeulugar/admin/users', {
      method: 'POST',
      body: payload,
    })
    return res.item
  } catch (err) {
    console.error('adminCreateUser error:', err)
    throw new Error(getErrorMessage(err))
  }
}

export async function adminSetUserBlocked(id: string, blocked: boolean): Promise<AdminUserRecord> {
  try {
    const res = await pb.send<{ item: AdminUserRecord }>(
      `/backend/v1/appmeulugar/admin/users/${id}/block`,
      { method: 'PATCH', body: { blocked } },
    )
    return res.item
  } catch (err) {
    console.error('adminSetUserBlocked error:', err)
    throw new Error(getErrorMessage(err))
  }
}

export interface AdminDeleteResult {
  deleted: boolean
  removed: {
    interests: number
    properties: number
    presentations: number
    chats: number
    favorites: number
  }
}

export async function adminDeleteUser(id: string): Promise<AdminDeleteResult> {
  try {
    return await pb.send<AdminDeleteResult>(`/backend/v1/appmeulugar/admin/users/${id}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.error('adminDeleteUser error:', err)
    throw new Error(getErrorMessage(err))
  }
}

// ---------- Templates de e-mail editáveis (coleção email_templates) ----------

export async function getEmailTemplates(): Promise<EmailTemplateRecord[]> {
  try {
    const records = await pb.collection('email_templates').getList<EmailTemplateRecord>(1, 50, {
      sort: 'slug',
    })
    return records.items
  } catch (err) {
    console.error('getEmailTemplates error:', err)
    throw new Error(getErrorMessage(err))
  }
}

export async function updateEmailTemplate(
  id: string,
  payload: { subject?: string; body_html?: string },
): Promise<EmailTemplateRecord> {
  try {
    return await pb.collection('email_templates').update<EmailTemplateRecord>(id, payload)
  } catch (err) {
    console.error('updateEmailTemplate error:', err)
    throw new Error(getErrorMessage(err))
  }
}

// ---------- Importação de contatos por ARQUIVO (CSV / HTML da Caixa / XLSX) ----------
// Usa a rota customizada /backend/v1/appmeulugar/admin/import-contacts
// (pb_hooks/import_contacts.pb.js): dedupe por e-mail, origem "Caixa Econômica
// Federal — credenciados". Retorna quantos entraram e quantos duplicados.

export interface ImportContactsResult {
  imported: number
  duplicates: number
  invalid: number
  total: number
}

export async function importContactsFile(file: File): Promise<ImportContactsResult> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    return await pb.send<ImportContactsResult>('/backend/v1/appmeulugar/admin/import-contacts', {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    console.error('importContactsFile error:', err)
    throw new Error(getErrorMessage(err))
  }
}

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
