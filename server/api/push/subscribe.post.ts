import type { PushSubscription } from '@pushforge/builder'
import { pushSubscriptions } from '../../utils/push'

export default defineEventHandler(async (event) => {
  const body = await readBody<PushSubscription & { role?: string; familyCode?: string }>(event)
  const subscription: PushSubscription = {
    endpoint: body.endpoint,
    keys: body.keys,
  }
  if (
    !subscription?.endpoint?.startsWith('https://') ||
    !subscription.keys?.auth ||
    !subscription.keys?.p256dh
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid push subscription' })
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(subscription.endpoint),
  )
  const id = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
  await pushSubscriptions(event).put(
    `subscription:${id}`,
    JSON.stringify({
      subscription,
      role: body.role === 'caregiver' ? 'caregiver' : 'care-recipient',
      familyCode: body.familyCode?.trim().toUpperCase() || null,
    }),
  )
  return { ok: true }
})
