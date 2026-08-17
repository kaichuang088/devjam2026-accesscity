/// <reference types="@cloudflare/workers-types" />

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env: { PUSH_SUBSCRIPTIONS: KVNamespace }
      context: ExecutionContext
    }
  }
}

export {}
