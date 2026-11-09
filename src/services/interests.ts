import pb from '@/lib/pocketbase/client'
import type { InterestRecord } from '@/types/database'

export async function getInterests(
  filter = '',
  sort = '-created',
  limit = 50,
): Promise<InterestRecord[]> {
  try {
    const records = await pb.collection('interests').getList<InterestRecord>(1, limit, {
      filter,
      sort,
      expand: 'user_id',
    })
    return records.items
  } catch (err) {
    console.error('getInterests error:', err)
    return []
  }
}

export async function getInterestById(id: string): Promise<InterestRecord | null> {
  try {
    const record = await pb.collection('interests').getOne<InterestRecord>(id, {
      expand: 'user_id',
    })
    return record
  } catch {
    return null
  }
}

export async function getInterestsByUser(userId: string): Promise<InterestRecord[]> {
  try {
    const records = await pb.collection('interests').getList<InterestRecord>(1, 20, {
      filter: `user_id = "${userId}"`,
      sort: '-created',
      expand: 'user_id',
    })
    return records.items
  } catch (err) {
    console.error('getInterestsByUser error:', err)
    return []
  }
}

export async function createInterest(data: Partial<InterestRecord>): Promise<InterestRecord> {
  return await pb.collection('interests').create<InterestRecord>(data)
}

export async function updateInterest(
  id: string,
  data: Partial<InterestRecord>,
): Promise<InterestRecord> {
  return await pb.collection('interests').update<InterestRecord>(id, data)
}

export async function deleteInterest(id: string): Promise<boolean> {
  return await pb.collection('interests').delete(id)
}
