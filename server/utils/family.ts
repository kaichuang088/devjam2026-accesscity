import type { H3Event } from 'h3'
import type { Family } from '#shared/types/accessity'
import { db } from './store'
import { pushSubscriptions } from './push'

interface StoredFamily {
  family: Family
  expiresAt: string
}

const FAMILY_KEY = 'family:active'

export async function getFamily(event: H3Event): Promise<Family> {
  const fallback = { ...db.family, members: db.members }
  try {
    const stored = await pushSubscriptions(event).get<StoredFamily>(FAMILY_KEY, 'json')
    if (!stored || Date.parse(stored.expiresAt) <= Date.now()) return fallback
    return { ...stored.family, members: db.members }
  } catch {
    return fallback
  }
}

export async function saveFamily(event: H3Event, family: Family): Promise<Family> {
  const expiresAt = new Date(Date.now() + family.codeExpiresInDays * 86400000).toISOString()
  await pushSubscriptions(event).put(FAMILY_KEY, JSON.stringify({ family, expiresAt }))
  db.family = { ...family, members: db.members }
  return db.family
}
