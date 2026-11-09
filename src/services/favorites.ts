import pb from '@/lib/pocketbase/client'
import type { FavoriteRecord } from '@/types/database'

export async function getFavoritesByUser(userId: string): Promise<FavoriteRecord[]> {
  try {
    const records = await pb.collection('favorites').getList<FavoriteRecord>(1, 100, {
      filter: `user_id = "${userId}"`,
      sort: '-created',
      expand: 'property_id',
    })
    return records.items
  } catch (err) {
    console.error('getFavoritesByUser error:', err)
    return []
  }
}

export async function addFavorite(userId: string, propertyId: string): Promise<FavoriteRecord> {
  return await pb.collection('favorites').create<FavoriteRecord>({
    user_id: userId,
    property_id: propertyId,
  })
}

export async function removeFavorite(favoriteId: string): Promise<boolean> {
  return await pb.collection('favorites').delete(favoriteId)
}

export async function removeFavoriteByProperty(
  userId: string,
  propertyId: string,
): Promise<boolean> {
  try {
    const existing = await pb.collection('favorites').getList(1, 1, {
      filter: `user_id = "${userId}" && property_id = "${propertyId}"`,
    })
    if (existing.items.length > 0) {
      return await pb.collection('favorites').delete(existing.items[0].id)
    }
    return true
  } catch {
    return false
  }
}
