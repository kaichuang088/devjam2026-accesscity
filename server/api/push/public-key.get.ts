export default defineEventHandler((event) => {
  const publicKey = useRuntimeConfig(event).vapidPublicKey
  if (!publicKey)
    throw createError({ statusCode: 503, statusMessage: 'Web Push is not configured' })
  return { publicKey }
})
