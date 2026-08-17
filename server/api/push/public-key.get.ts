export default defineEventHandler((event) => {
  const publicKey =
    event.context.cloudflare?.env.NUXT_VAPID_PUBLIC_KEY ??
    (typeof NUXT_VAPID_PUBLIC_KEY === 'undefined' ? undefined : NUXT_VAPID_PUBLIC_KEY) ??
    useRuntimeConfig(event).vapidPublicKey
  if (!publicKey)
    throw createError({ statusCode: 503, statusMessage: 'Web Push is not configured' })
  return { publicKey }
})
