import { buildPushHTTPRequest, type PushSubscription } from '@pushforge/builder'
import type { H3Event } from 'h3'

export function pushSubscriptions(event: H3Event): KVNamespace {
  const namespace = event.context.cloudflare?.env.PUSH_SUBSCRIPTIONS
  if (!namespace)
    throw createError({ statusCode: 503, statusMessage: 'Push storage is not configured' })
  return namespace
}

export async function sendPushToAll(
  event: H3Event,
  notification: { title: string; body: string; url: string },
) {
  const config = useRuntimeConfig(event)
  if (!config.vapidPrivateJwk || !config.vapidSubject) {
    throw new Error('VAPID secrets are not configured')
  }

  const namespace = pushSubscriptions(event)
  const keys = await namespace.list({ prefix: 'subscription:' })
  await Promise.all(
    keys.keys.map(async ({ name }) => {
      const subscription = await namespace.get<PushSubscription>(name, 'json')
      if (!subscription) return

      const request = await buildPushHTTPRequest({
        privateJWK: config.vapidPrivateJwk,
        subscription,
        message: {
          payload: notification,
          adminContact: config.vapidSubject,
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
