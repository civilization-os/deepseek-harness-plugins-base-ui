import test from 'node:test'
import assert from 'node:assert/strict'
import { GuardianController } from '../src/client/controller.js'

test('runtime and dependency reads can settle concurrently', async () => {
  const pending = new Map()
  const controller = new GuardianController(endpoint => new Promise(resolve => pending.set(endpoint, resolve)))
  const runtime = controller.request('list')
  const dependencies = controller.request('dependencies')
  pending.get('dependencies')({ ok: true, value: { dependency: { available: true, summary: { issues: 2 }, issues: [] } } })
  pending.get('list')({ ok: true, value: { summary: { total: 3 }, entries: [], history: [] } })
  assert.equal(await runtime, true)
  assert.equal(await dependencies, true)
  assert.equal(controller.state.summary.total, 3)
  assert.equal(controller.state.dependency.summary.issues, 2)
})
