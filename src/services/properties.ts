import pb from '@/lib/pocketbase/client'
import type { PropertyRecord } from '@/types/database'

export async function getProperties(
  filter = '',
  sort = '-created',
  limit = 50,
): Promise<PropertyRecord[]> {
  try {
    const records = await pb.collection('properties').getList<PropertyRecord>(1, limit, {
      filter,
      sort,
      expand: 'user_id',
    })
    return records.items
  } catch (err) {
    console.error('getProperties error:', err)
    return []
  }
}

export async function getPropertyById(id: string): Promise<PropertyRecord | null> {
  try {
    const record = await pb.collection('properties').getOne<PropertyRecord>(id, {
      expand: 'user_id',
    })
    return record
  } catch {
    return null
  }
}

export async function getPropertiesByUser(userId: string): Promise<PropertyRecord[]> {
  try {
    const records = await pb.collection('properties').getList<PropertyRecord>(1, 100, {
      filter: `user_id = "${userId}"`,
      sort: '-created',
      expand: 'user_id',
    })
    return records.items
  } catch (err) {
    console.error('getPropertiesByUser error:', err)
    return []
  }
}

export async function createProperty(data: Partial<PropertyRecord>): Promise<PropertyRecord> {
  return await pb.collection('properties').create<PropertyRecord>(data)
}

export async function updateProperty(
  id: string,
  data: Partial<PropertyRecord>,
): Promise<PropertyRecord> {
  return await pb.collection('properties').update<PropertyRecord>(id, data)
}

export async function deleteProperty(id: string): Promise<boolean> {
  return await pb.collection('properties').delete(id)
}
