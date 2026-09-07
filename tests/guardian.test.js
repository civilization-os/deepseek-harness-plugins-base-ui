import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { CordisGuardian, describeIssue, parentOf } from '../src/guardian.js'
import { createWebHandler } from '../src/web.js'

function fixture() {
  let now = 1000
  const rows = [
    { id: 'guardian', disabled: false, options: { name: '@civilization/deepseek-harness-base-ui' }, fiber: { state: 2 } },
    { id: 'healthy', disabled: false, options: { name: 'healthy' }, fiber: { state: 2 } },
    { id: 'failed', disabled: false, options: { name: 'failed' }, fiber: { state: 3, _config: {}, update() { this.state = 2 }, async await() {} } },
    { id: 'off', disabled: true, options: { name: 'off' } },
  ]
  for (const row of rows) { row.options.id = row.id; Object.defineProperty(row, 'id', { value: row.id }); Object.defineProperty(row, 'disabled', { get() { return Boolean(this.options.disabled ?? this._disabled) }, set(value) { this._disabled = value } }); row._disabled = row.id === 'off' }
  const loader = {
    locate: () => 'guardian', entries: function* () { yield* rows },
    resolve: id => rows.find(row => row.id === id) ?? (() => { throw new Error('missing') })(),
    update: async (id, options) => { const row = rows.find(value => value.id === id); row.options = { ...row.options, ...options }; row._disabled = Boolean(options.disabled) },
  }
  const ctx = { loader, fiber: {}, on: () => () => {} }
  const guardian = new CordisGuardian(ctx, { pollIntervalMs: 1000, stalledAfterMs: 5000, actionTimeoutMs: 1000, historyLimit: 20 }, () => now)
  return { guardian, rows, advance: value => { now += value } }
}

test('snapshot classifies active, failed and disabled entries', () => {
  const { guardian } = fixture()
  const snapshot = guardian.snapshot()
  assert.deepEqual(snapshot.summary, { total: 4, active: 2, unhealthy: 1, disabled: 1 })
  assert.equal(snapshot.entries.find(row => row.id === 'failed').issue, 'failed')
  assert.equal(snapshot.entries.find(row => row.id === 'guardian').protected, true)
})

test('stalled transitions depend on continuous phase age', () => {
  assert.equal(describeIssue(true, 'loading', 4999, 5000), null)
  assert.equal(describeIssue(true, 'loading', 5000, 5000), 'stalled')
  assert.equal(parentOf('profile:group:plugin'), 'profile:group')
})

test('recovery actions protect the guardian and change loader state', async () => {
  const { guardian } = fixture()
  await assert.rejects(guardian.act('guardian', 'disable'), /protected/)
  await guardian.act('failed', 'retry')
  assert.equal(guardian.snapshot().entries.find(row => row.id === 'failed').phase, 'active')
  await guardian.act('healthy', 'disable')
  assert.equal(guardian.snapshot().entries.find(row => row.id === 'healthy').enabled, false)
  await guardian.act('healthy', 'enable')
  assert.equal(guardian.snapshot().entries.find(row => row.id === 'healthy').enabled, true)
})

test('retry recovers a failed real Cordis Loader entry', async t => {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(Loader)
  let fail = false
  ctx.loader.builtins.fixture = () => { if (fail) throw new Error('fixture failed') }
  const id = await ctx.loader.create({ name: 'cordis:fixture' })
  const entry = ctx.loader.resolve(id)
  fail = true
  await assert.rejects(entry.fiber.restart(), /fixture failed/)
  assert.equal(entry.fiber.state, 3)
  fail = false
  const guardian = new CordisGuardian(ctx, { pollIntervalMs: 1000, stalledAfterMs: 5000, actionTimeoutMs: 1000, historyLimit: 20 })
  await guardian.act(id, 'retry')
  assert.equal(entry.fiber.state, 2)
})

test('web actions require confirmation and redact recovery failures', async () => {
  const guardian = { snapshot: () => ({ entries: [] }), act: async () => { throw new Error('secret=value') }, fixAll: async () => ({}) }
  const call = createWebHandler(guardian)
  const signal = new AbortController().signal
  assert.equal((await call('act', { id: 'demo', action: 'retry', confirmed: false }, signal)).ok, false)
  const failed = await call('act', { id: 'demo', action: 'retry', confirmed: true }, signal)
  assert.equal(failed.ok, false)
  assert.equal(JSON.stringify(failed).includes('secret=value'), false)
})
