/// <reference types="@cloudflare/workers-types" />

declare var PUSH_SUBSCRIPTIONS: KVNamespace
declare var NUXT_VAPID_PUBLIC_KEY: string
declare var NUXT_VAPID_PRIVATE_JWK: string
declare var NUXT_VAPID_SUBJECT: string

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
