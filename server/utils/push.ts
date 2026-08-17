import { buildPushHTTPRequest, type PushSubscription } from '@pushforge/builder'
import type { H3Event } from 'h3'

export function pushSubscriptions(event: H3Event): KVNamespace {
  const namespace =
    event.context.cloudflare?.env.PUSH_SUBSCRIPTIONS ??
    (typeof PUSH_SUBSCRIPTIONS === 'undefined' ? undefined : PUSH_SUBSCRIPTIONS)
  if (!namespace)
    throw createError({ statusCode: 503, statusMessage: 'Push storage is not configured' })
  return namespace
}

export async function sendPushToAll(
  event: H3Event,
  notification: { title: string; body: string; url: string },
) {
  const config = useRuntimeConfig(event)
  const privateJWK =
    event.context.cloudflare?.env.NUXT_VAPID_PRIVATE_JWK ??
    (typeof NUXT_VAPID_PRIVATE_JWK === 'undefined' ? undefined : NUXT_VAPID_PRIVATE_JWK) ??
    config.vapidPrivateJwk
  const adminContact =
    event.context.cloudflare?.env.NUXT_VAPID_SUBJECT ??
    (typeof NUXT_VAPID_SUBJECT === 'undefined' ? undefined : NUXT_VAPID_SUBJECT) ??
    config.vapidSubject
  if (!privateJWK || !adminContact) {
    throw new Error('VAPID secrets are not configured')
  }

  const namespace = pushSubscriptions(event)
  const keys = await namespace.list({ prefix: 'subscription:' })
  await Promise.all(
    keys.keys.map(async ({ name }) => {
      const stored = await namespace.get<
        PushSubscription | { subscription: PushSubscription; role?: string; familyCode?: string }
      >(name, 'json')
      const subscription = stored && 'subscription' in stored ? stored.subscription : stored
      if (!subscription) return

      const request = await buildPushHTTPRequest({
        privateJWK,
        subscription,
        message: {
          payload: notification,
          adminContact,
          options: { ttl: 300, urgency: 'high' },
        },
      })
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      })
      if (response.status === 404 || response.status === 410) await namespace.delete(name)
      else if (!response.ok) throw new Error(`Push service returned ${response.status}`)
    }),
  )
}

export async function sendPushToFamilyCaregivers(
  event: H3Event,
  familyCode: string | null | undefined,
  notification: { title: string; body: string; url: string },
) {
  const namespace = pushSubscriptions(event)
  const keys = await namespace.list({ prefix: 'subscription:' })
  const selected: string[] = []

  for (const { name } of keys.keys) {
    const stored = await namespace.get<{
      subscription: PushSubscription
      role?: string
      familyCode?: string
    }>(name, 'json')
    if (
      stored?.subscription &&
      stored.role === 'caregiver' &&
      (!familyCode || stored.familyCode === familyCode)
    )
      selected.push(name)
  }

  // Keep existing demo subscriptions working until each device subscribes again with role metadata.
  if (!selected.length) return sendPushToAll(event, notification)

  const config = useRuntimeConfig(event)
  const privateJWK = event.context.cloudflare?.env.NUXT_VAPID_PRIVATE_JWK ?? config.vapidPrivateJwk
  const adminContact = event.context.cloudflare?.env.NUXT_VAPID_SUBJECT ?? config.vapidSubject
  if (!privateJWK || !adminContact) throw new Error('VAPID secrets are not configured')

  await Promise.all(
    selected.map(async (name) => {
      const stored = await namespace.get<{ subscription: PushSubscription }>(name, 'json')
      if (!stored?.subscription) return
      const request = await buildPushHTTPRequest({
        privateJWK,
        subscription: stored.subscription,
        message: {
          payload: notification,
          adminContact,
          options: { ttl: 300, urgency: 'high' },
        },
      })
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      })
      if (response.status === 404 || response.status === 410) await namespace.delete(name)
      else if (!response.ok) throw new Error(`Push service returned ${response.status}`)
    }),
  )
}
