import { pb } from '@/lib/pocketbase/client'

export type OptOutStatus = {
  email: string
  found: boolean
  status: string
  type: string
}

export async function getOptOutStatus(email: string): Promise<OptOutStatus | null> {
  try {
    return await pb.send('/backend/v1/appmeulugar/optout', {
      method: 'GET',
      query: { email },
    })
  } catch {
    return null
  }
}

export async function requestOptOut(email: string): Promise<OptOutStatus | null> {
  try {
    return await pb.send('/backend/v1/appmeulugar/optout', {
      method: 'POST',
      body: { email },
    })
  } catch {
    return null
  }
}
