/// <reference types="@cloudflare/workers-types" />

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env: {
        PUSH_SUBSCRIPTIONS: KVNamespace
        NUXT_VAPID_PUBLIC_KEY: string
        NUXT_VAPID_PRIVATE_JWK: string
        NUXT_VAPID_SUBJECT: string
      }
      context: ExecutionContext
    }
  }
}

export {}
