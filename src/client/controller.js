export class GuardianController {
  state = { summary: { total: 0, active: 0, unhealthy: 0, disabled: 0 }, entries: [], history: [], loading: true, saving: false, error: '' }
  listeners = new Set()
  generation = 0
  constructor(call) { this.call = call }
  subscribe = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  getSnapshot = () => this.state
  publish(next) { this.state = { ...this.state, ...next }; for (const listener of this.listeners) listener() }
  async request(endpoint, args = {}, silent = false) {
    const generation = ++this.generation
    if (!silent) this.publish({ loading: endpoint === 'list', saving: endpoint !== 'list', error: '' })
    try {
      const result = await this.call(endpoint, args)
      if (generation !== this.generation && endpoint === 'list') return false
      if (!result.ok) { if (!silent) this.publish({ loading: false, saving: false, error: result.error.message || 'failed' }); return false }
      this.publish({ ...result.value, loading: false, saving: false, error: '' })
      return true
    } catch {
      if (!silent) this.publish({ loading: false, saving: false, error: 'failed' })
      return false
    }
  }
}
