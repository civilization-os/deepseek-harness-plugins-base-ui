const PHASES = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

function phaseOf(entry) {
  return entry.fiber ? PHASES[entry.fiber.state] ?? 'unknown' : null
}

function parentOf(id) {
  const index = id.lastIndexOf(':')
  return index < 0 ? null : id.slice(0, index)
}

function describeIssue(enabled, phase, age, stalledAfterMs) {
  if (!enabled) return null
  if (phase === 'failed') return 'failed'
  if (phase === null || phase === 'disposed') return 'not-running'
  if ((phase === 'pending' || phase === 'loading') && age >= stalledAfterMs) return 'stalled'
  return null
}

/** Observe Loader entries and execute bounded, user-requested recovery actions. */
export class CordisGuardian {
  constructor(ctx, config, now = Date.now) {
    this.ctx = ctx
    this.loader = ctx.loader
    this.now = now
    this.config = config
    this.selfId = this.loader.locate(ctx.fiber) ?? ''
    this.states = new Map()
    this.history = []
    this.lastAction = new Map()
  }

  start() {
    const sample = () => this.sample()
    const timer = setInterval(sample, this.config.pollIntervalMs)
    timer.unref?.()
    const disposers = [
      this.ctx.on('internal/plugin', sample, { global: true }),
      this.ctx.on('internal/status', sample, { global: true }),
      this.ctx.on('loader/config-update', sample, { global: true }),
    ]
    this.sample()
    return () => {
      clearInterval(timer)
      for (const dispose of disposers) dispose()
    }
  }

  isProtected(id) {
    return Boolean(this.selfId) && (id === this.selfId || this.selfId.startsWith(`${id}:`))
  }

  sample() {
    const at = this.now()
    const seen = new Set()
    for (const entry of this.loader.entries()) {
      if (entry.options.group) continue
      const id = entry.id
      seen.add(id)
      const enabled = !entry.disabled
      const phase = phaseOf(entry)
      const signature = `${enabled}:${phase}`
      const previous = this.states.get(id)
      if (!previous || previous.signature !== signature) {
        this.states.set(id, { signature, changedAt: at })
        this.history.push({ id, moduleName: entry.options.name, enabled, phase, at })
      }
    }
    for (const id of this.states.keys()) if (!seen.has(id)) this.states.delete(id)
    if (this.history.length > this.config.historyLimit) this.history.splice(0, this.history.length - this.config.historyLimit)
  }

  snapshot() {
    this.sample()
    const at = this.now()
    const entries = [...this.loader.entries()].filter(entry => !entry.options.group).map(entry => {
      const enabled = !entry.disabled
      const phase = phaseOf(entry)
      const changedAt = this.states.get(entry.id)?.changedAt ?? at
      const issue = describeIssue(enabled, phase, at - changedAt, this.config.stalledAfterMs)
      return {
        id: entry.id,
        parentId: parentOf(entry.id),
        moduleName: entry.options.name,
        enabled,
        phase,
        issue,
        protected: this.isProtected(entry.id),
        changedAt,
        lastAction: this.lastAction.get(entry.id) ?? null,
      }
    })
    return {
      observedAt: at,
      summary: {
        total: entries.length,
        active: entries.filter(entry => entry.phase === 'active').length,
        unhealthy: entries.filter(entry => entry.issue).length,
        disabled: entries.filter(entry => !entry.enabled).length,
      },
      entries,
      history: this.history.slice(-20),
    }
  }

  async act(id, action) {
    const entry = this.loader.resolve(id)
    if (entry.options.group) throw new Error('Group entries cannot be changed.')
    if (this.isProtected(id)) throw new Error('The watchdog entry and its parents are protected.')
    if (action === 'disable') {
      if (entry.disabled) throw new Error('The entry is already disabled.')
      await this.loader.update(id, { disabled: true })
    } else if (action === 'enable') {
      if (!entry.disabled) throw new Error('The entry is already enabled.')
      await this.loader.update(id, { disabled: false })
    } else if (action === 'retry') {
      if (entry.disabled) throw new Error('Enable the entry before retrying it.')
      if (phaseOf(entry) === 'active') throw new Error('The entry is already active.')
      await this.retry(entry)
    } else {
      throw new Error('Unknown recovery action.')
    }
    this.lastAction.set(id, { action, ok: true, at: this.now() })
    this.sample()
    return this.snapshot()
  }

  async retry(entry) {
    const task = async () => {
      if (!entry.fiber) return entry.refresh()
      entry.fiber.update(entry.options.config, true)
      await entry.fiber.await()
    }
    let timer
    try {
      await Promise.race([
        task(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Recovery timed out.')), this.config.actionTimeoutMs); timer.unref?.() }),
      ])
    } catch (error) {
      this.lastAction.set(entry.id, { action: 'retry', ok: false, at: this.now() })
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async fixAll() {
    const candidates = this.snapshot().entries.filter(entry => entry.issue && !entry.protected && entry.enabled).slice(0, 20)
    const results = []
    for (const candidate of candidates) {
      try { await this.act(candidate.id, 'retry'); results.push({ id: candidate.id, ok: true }) }
      catch { results.push({ id: candidate.id, ok: false }) }
    }
    return { ...this.snapshot(), repairResults: results }
  }
}

export { describeIssue, parentOf, phaseOf }
