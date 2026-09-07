import Schema from '@deepseek-ai/schemastery'

const schemas = {
  list: Schema.object({}),
  act: Schema.object({
    id: Schema.string().required(),
    action: Schema.union(['retry', 'disable', 'enable']).required(),
    confirmed: Schema.const(true).required(),
  }),
  'fix-all': Schema.object({ confirmed: Schema.const(true).required() }),
}

/** Create the authenticated settings RPC handler. */
export function createWebHandler(guardian) {
  return async (endpoint, payload, signal) => {
    try {
      if (!Object.hasOwn(schemas, endpoint)) throw new Error('Unknown operation.')
      const args = schemas[endpoint](payload)
      signal.throwIfAborted()
      const value = endpoint === 'list' ? guardian.snapshot()
        : endpoint === 'act' ? await guardian.act(args.id, args.action)
          : await guardian.fixAll()
      signal.throwIfAborted()
      return { ok: true, value }
    } catch (error) {
      return { ok: false, error: {
        code: 'cordis-guardian/rejected',
        // Plugin failures can include configuration values; keep them off the client wire.
        message: 'Cordis recovery failed.',
        details: {},
      } }
    }
  }
}
