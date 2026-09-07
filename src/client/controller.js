export class GuardianController {
  state = { summary: { total: 0, active: 0, unhealthy: 0, disabled: 0 }, entries: [], history: [], dependency: { available: false, summary: { scanned: 0, issues: 0, errors: 0, warnings: 0 }, issues: [] }, loading: true, dependencyLoading: true, saving: false, error: '' }
  listeners = new Set()
  generations = new Map()
  constructor(call) { this.call = call }
  subscribe = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  getSnapshot = () => this.state
  publish(next) { this.state = { ...this.state, ...next }; for (const listener of this.listeners) listener() }
  async request(endpoint, args = {}, silent = false) {
    const generation = (this.generations.get(endpoint) ?? 0) + 1
    this.generations.set(endpoint, generation)
    const runtimeRead = endpoint === 'list'
    const dependencyRead = endpoint === 'dependencies'
    if (!silent) this.publish({ loading: runtimeRead, dependencyLoading: dependencyRead, saving: !runtimeRead && !dependencyRead, error: '' })
    try {
      const result = await this.call(endpoint, args)
      if (generation !== this.generations.get(endpoint) && (endpoint === 'list' || endpoint === 'dependencies')) return false
      if (!result.ok) { if (!silent) this.publish({ loading: false, dependencyLoading: false, saving: false, error: result.error.message || 'failed' }); return false }
      this.publish({ ...result.value, loading: false, dependencyLoading: false, saving: false, error: '' })
      return true
    } catch {
      if (!silent) this.publish({ loading: false, dependencyLoading: false, saving: false, error: 'failed' })
      return false
    }
  }
}
