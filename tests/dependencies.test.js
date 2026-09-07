import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DependencyGuardian } from '../src/dependencies.js'

function writePackage(root, name, manifest) {
  const dir = join(root, 'node_modules', ...name.split('/'))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0', ...manifest }))
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cordis-guardian-'))
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name: 'profile', private: true,
    dependencies: { plugin: '1.0.0', inactive: '1.0.0', broken: 'link:./missing' },
    dsh: { profile: { bundles: ['plugin'] } },
  }))
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nautoInstallPeers: true\n')
  writePackage(root, 'plugin', { peerDependencies: { missing: '^2.0.0', incompatible: '^2.0.0', '@deepseek-ai/cordis': '^5.0.0' } })
  writePackage(root, 'inactive', { dsh: { bundle: { patch: './cordis.patch.yml' } } })
  writePackage(root, 'broken', {})
  writePackage(root, 'incompatible', { version: '1.0.0' })
  writePackage(root, '@deepseek-ai/cordis', { version: '4.0.2' })
  return { root, guardian: new DependencyGuardian({ profileName: 'test', profileDir: root, dependencyScanLimit: 100, dependencyRepairTimeoutMs: 1000 }) }
}

test('dependency snapshot reports peers, local links, inactive bundles, and unsafe peer installation', () => {
  const { guardian } = fixture()
  const snapshot = guardian.snapshot()
  const types = snapshot.issues.map(row => row.type)
  assert.ok(types.includes('missing-peer'))
  assert.ok(types.includes('incompatible-peer'))
  assert.ok(types.includes('broken-link'))
  assert.ok(types.includes('bundle-inactive'))
  assert.ok(types.includes('auto-peers-unsafe'))
  assert.equal(snapshot.issues.find(row => row.peer === '@deepseek-ai/cordis').fix, 'host-peer')
  assert.equal(snapshot.issues.find(row => row.peer === 'missing').fix, 'install-peer')
})

test('dependency fixes activate bundles and force autoInstallPeers off', async () => {
  const { root, guardian } = fixture()
  const inactive = guardian.snapshot().issues.find(row => row.type === 'bundle-inactive')
  await guardian.fix(inactive.id)
  assert.ok(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dsh.profile.bundles.includes('inactive'))
  const autoPeers = guardian.snapshot().issues.find(row => row.type === 'auto-peers-unsafe')
  await guardian.fix(autoPeers.id)
  assert.match(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'), /autoInstallPeers: false/)
})
