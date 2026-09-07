import Schema from '@deepseek-ai/schemastery'
import { CordisGuardian } from './guardian.js'
import { createWebHandler } from './web.js'

export const name = 'civilization-base-ui'
export const inject = ['loader']
export const Config = Schema.object({
  pollIntervalMs: Schema.number().min(500).max(60000).step(100).default(2000),
  stalledAfterMs: Schema.number().min(1000).max(600000).step(1000).default(15000),
  actionTimeoutMs: Schema.number().min(1000).max(120000).step(1000).default(10000),
  historyLimit: Schema.number().min(20).max(1000).step(1).default(200),
})

/** Register the Cordis watchdog and its authenticated Web settings endpoint. */
export function apply(ctx, config) {
  const guardian = new CordisGuardian(ctx, config)
  ctx.effect(() => guardian.start())
  ctx.inject(['connection'], web => {
    web.connection.rpc.handle('/cordis-guardian', createWebHandler(guardian))
  })
}
