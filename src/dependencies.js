import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import semver from 'semver'

const SHARED_PEER = /^@deepseek-ai\/(?:cordis(?:$|-)|dsh-)/
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) }
  catch { return null }
}

function profileDirectory(config) {
  if (config.profileDir) return resolve(config.profileDir)
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'profiles', config.profileName || 'web')
}

function packageManifestPath(base, name) {
  return join(base, 'node_modules', ...name.split('/'), 'package.json')
}

function resolvePackageManifest(name, consumerDir, profileDir) {
  const candidates = []
  for (let current = consumerDir; ; current = dirname(current)) {
    candidates.push(packageManifestPath(current, name))
    const parent = dirname(current)
    if (parent === current) break
  }
  candidates.push(packageManifestPath(profileDir, name))
  candidates.push(packageManifestPath(dirname(profileDir), name))
  return candidates.find(path => existsSync(path)) ?? null
}

function installed(manifestPath) {
  const manifest = readJson(manifestPath)
  if (!manifest?.name || !manifest?.version) return null
  let canonical = manifestPath
  try { canonical = realpathSync.native(manifestPath) } catch {}
  return { manifest, manifestPath, canonical, dir: dirname(manifestPath) }
}

function issue(type, severity, consumer, peer, expected, actual, fix) {
  return {
    id: [type, consumer || '-', peer || '-'].map(encodeURIComponent).join('|'),
    type, severity, consumer, peer, expected: expected ?? null, actual: actual ?? null, fix: fix ?? null,
  }
}

function localSpecPath(spec, profileDir) {
  const match = /^(?:link|file):(.+)$/.exec(spec)
  if (!match) return null
  return isAbsolute(match[1]) ? match[1] : resolve(profileDir, match[1])
}

function autoInstallPeers(workspacePath) {
  if (!existsSync(workspacePath)) return null
  const match = /^autoInstallPeers:\s*(true|false)\s*$/m.exec(readFileSync(workspacePath, 'utf8'))
  return match ? match[1] === 'true' : null
}

function pnpmLauncher() {
  if (process.platform !== 'win32') return { command: 'pnpm', prefix: [] }
  const candidates = [
    process.env.npm_execpath,
    process.env.APPDATA && join(process.env.APPDATA, 'npm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    process.env.PNPM_HOME && join(process.env.PNPM_HOME, 'pnpm.cjs'),
  ].filter(Boolean)
  const cli = candidates.find(path => path.endsWith('.cjs') && existsSync(path))
  if (!cli) throw new Error('pnpm executable was not found.')
  return { command: process.execPath, prefix: [cli] }
}

function runPnpm(profileDir, args, timeoutMs) {
  const launcher = pnpmLauncher()
  return new Promise((resolvePromise, reject) => {
    const child = spawn(launcher.command, [...launcher.prefix, ...args], {
      cwd: profileDir, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true,
    })
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', chunk => { if (stderr.length < 16_384) stderr += chunk })
    const timer = setTimeout(() => { child.kill(); reject(new Error('pnpm timed out.')) }, timeoutMs)
    timer.unref?.()
    child.once('error', reject)
    child.once('exit', code => {
      clearTimeout(timer)
      if (code === 0) resolvePromise()
      else reject(new Error(`pnpm exited with code ${code ?? 'unknown'}: ${stderr.slice(-1000)}`))
    })
  })
}

function backupProfile(profileDir) {
  const backupDir = join(profileDir, '.guardian-backups', String(Date.now()))
  mkdirSync(backupDir, { recursive: true })
  for (const name of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    const source = join(profileDir, name)
    if (existsSync(source)) writeFileSync(join(backupDir, name), readFileSync(source))
  }
  return backupDir
}

/** Inspect the active profile's package graph and apply bounded user-requested repairs. */
export class DependencyGuardian {
  constructor(config) {
    this.config = config
    this.profileDir = profileDirectory(config)
  }

  snapshot() {
    const manifestPath = join(this.profileDir, 'package.json')
    const workspacePath = join(this.profileDir, 'pnpm-workspace.yaml')
    const profile = readJson(manifestPath)
    if (!profile) return { profileName: this.config.profileName, available: false, summary: { scanned: 0, issues: 1, errors: 1, warnings: 0 }, issues: [issue('profile-unavailable', 'error', '', '', null, null, null)] }

    const issues = []
    const dependencies = profile.dependencies ?? {}
    const bundles = profile.dsh?.profile?.bundles ?? []
    const roots = new Map()
    for (const [name, spec] of Object.entries(dependencies)) {
      const local = localSpecPath(spec, this.profileDir)
      if (local && !existsSync(local)) issues.push(issue('broken-link', 'error', name, '', spec, 'missing', null))
      const path = resolvePackageManifest(name, this.profileDir, this.profileDir)
      if (path) roots.set(name, path)
      else issues.push(issue('package-unresolved', 'error', name, '', spec, 'missing', null))
    }
    for (const name of bundles) {
      const path = resolvePackageManifest(name, this.profileDir, this.profileDir)
      if (path) roots.set(name, path)
      else issues.push(issue('bundle-unresolved', 'error', name, '', 'installed bundle', 'missing', 'remove-bundle'))
    }

    for (const [name, path] of roots) {
      const record = installed(path)
      if (record?.manifest.dsh?.bundle?.patch && !bundles.includes(name)) {
        issues.push(issue('bundle-inactive', 'warning', name, '', 'active profile layer', 'dependency only', 'activate-bundle'))
      }
    }

    const configuredAutoPeers = autoInstallPeers(workspacePath)
    if (configuredAutoPeers !== false) {
      issues.push(issue('auto-peers-unsafe', 'warning', '', '', 'false', configuredAutoPeers === null ? 'unset' : 'true', 'disable-auto-peers'))
    }

    const queue = [...roots.values()]
    const visited = new Set()
    const peerResolutions = new Map()
    while (queue.length && visited.size < this.config.dependencyScanLimit) {
      const path = queue.shift()
      const record = installed(path)
      if (!record || visited.has(record.canonical)) continue
      visited.add(record.canonical)
      const consumer = `${record.manifest.name}@${record.manifest.version}`
      for (const name of Object.keys({ ...record.manifest.dependencies, ...record.manifest.optionalDependencies })) {
        const child = resolvePackageManifest(name, record.dir, this.profileDir)
        if (child) queue.push(child)
      }
      for (const [peer, range] of Object.entries(record.manifest.peerDependencies ?? {})) {
        const optional = record.manifest.peerDependenciesMeta?.[peer]?.optional === true
        const peerPath = resolvePackageManifest(peer, record.dir, this.profileDir)
        const peerRecord = peerPath ? installed(peerPath) : null
        if (!peerRecord) {
          if (!optional) issues.push(issue('missing-peer', 'error', consumer, peer, range, 'missing', SHARED_PEER.test(peer) ? 'host-peer' : 'install-peer'))
          continue
        }
        const rangeValid = semver.validRange(range)
        if (rangeValid && !semver.satisfies(peerRecord.manifest.version, rangeValid, { includePrerelease: true })) {
          issues.push(issue('incompatible-peer', 'error', consumer, peer, range, peerRecord.manifest.version, SHARED_PEER.test(peer) ? 'host-peer' : 'install-peer'))
        }
        const resolutions = peerResolutions.get(peer) ?? new Map()
        const resolution = resolutions.get(peerRecord.canonical) ?? { version: peerRecord.manifest.version, consumers: new Set() }
        resolution.consumers.add(consumer)
        resolutions.set(peerRecord.canonical, resolution)
        peerResolutions.set(peer, resolutions)
      }
    }
    for (const [peer, resolutions] of peerResolutions) {
      if (resolutions.size > 1) {
        const consumers = [...new Set([...resolutions.values()].flatMap(value => [...value.consumers]))]
        const versions = [...new Set([...resolutions.values()].map(value => value.version))]
        issues.push(issue('duplicate-peer', SHARED_PEER.test(peer) ? 'error' : 'warning', consumers.slice(0, 4).join(', '), peer, 'single resolved instance', `${resolutions.size} instances · ${versions.join(', ')}`, null))
      }
    }
    issues.sort((a, b) => (a.severity === b.severity ? a.type.localeCompare(b.type) : a.severity === 'error' ? -1 : 1))
    return {
      profileName: this.config.profileName, available: true, autoInstallPeers: configuredAutoPeers,
      summary: { scanned: visited.size, issues: issues.length, errors: issues.filter(row => row.severity === 'error').length, warnings: issues.filter(row => row.severity === 'warning').length },
      issues,
    }
  }

  async fix(id) {
    const current = this.snapshot()
    const target = current.issues.find(row => row.id === id)
    if (!target?.fix) throw new Error('This issue has no automatic repair.')
    if (target.fix === 'host-peer') throw new Error('Shared host peers require a compatible DSH installation or module fallback repair.')
    if (target.fix === 'install-peer') {
      if (!PACKAGE_NAME.test(target.peer) || !semver.validRange(target.expected)) throw new Error('The peer requirement is not safe to install automatically.')
      backupProfile(this.profileDir)
      await runPnpm(this.profileDir, ['add', '--save-prod', '--save-exact', `${target.peer}@${target.expected}`], this.config.dependencyRepairTimeoutMs)
    } else {
      const manifestPath = join(this.profileDir, 'package.json')
      const manifest = readJson(manifestPath)
      if (target.fix === 'activate-bundle') manifest.dsh.profile.bundles.push(target.consumer)
      if (target.fix === 'remove-bundle') manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(name => name !== target.consumer)
      if (target.fix === 'disable-auto-peers') {
        const workspacePath = join(this.profileDir, 'pnpm-workspace.yaml')
        const source = existsSync(workspacePath) ? readFileSync(workspacePath, 'utf8') : 'packages:\n  - .\n\nnodeLinker: hoisted\n'
        const next = /^autoInstallPeers:/m.test(source) ? source.replace(/^autoInstallPeers:.*$/m, 'autoInstallPeers: false') : `${source.trimEnd()}\nautoInstallPeers: false\n`
        writeFileSync(workspacePath, next)
        return this.snapshot()
      }
      backupProfile(this.profileDir)
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    }
    return this.snapshot()
  }
}

export { autoInstallPeers, profileDirectory, resolvePackageManifest }
