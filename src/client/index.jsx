import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { GuardianController } from './controller.js'
import { zh, en } from './locales.js'
import css from './styles.css'

export const inject = ['slots', 'locale', 'connection']
const namespace = 'settings.cordis-guardian'

export function apply(ctx) {
  const controller = new GuardianController((endpoint, args) => ctx.connection.rpc.call('/cordis-guardian', endpoint, args))
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }))
  ctx.effect(() => {
    const style = document.createElement('style'); style.textContent = css; document.head.append(style)
    return () => style.remove()
  })
  ctx.on('connection/reset', () => { void controller.request('list') })
  const t = ctx.locale.bind(namespace)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'cordis-guardian', order: 18, label: () => t('nav'), locale: namespace,
    inject: () => ({ controller }),
  }, GuardianSection))
}

export function GuardianSection({ t, controller }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState({ unhealthy: true, active: false, disabled: false })
  useEffect(() => {
    void controller.request('list')
    const timer = setInterval(() => { void controller.request('list', {}, true) }, 2000)
    return () => clearInterval(timer)
  }, [controller])
  const filtered = useMemo(() => state.entries.filter(entry => `${entry.id} ${entry.moduleName}`.toLowerCase().includes(query.trim().toLowerCase())), [state.entries, query])
  const groups = [
    ['unhealthy', filtered.filter(entry => entry.issue)],
    ['active', filtered.filter(entry => !entry.issue && entry.enabled)],
    ['disabled', filtered.filter(entry => !entry.enabled)],
  ]
  const act = async (entry, action) => {
    if (action === 'disable' && !window.confirm(t('confirmDisable'))) return
    await controller.request('act', { id: entry.id, action, confirmed: true })
  }
  return <section className="cgw">
    <header className="cgw-hero"><div><p className="cgw-kicker">RUNTIME / LOADER</p><h2>{t('title')}</h2><p>{t('intro')}</p></div>
      <div className="cgw-actions"><button disabled={state.loading || state.saving} onClick={() => controller.request('list')}>{t('refresh')}</button>
        <button className="cgw-primary" disabled={!state.summary.unhealthy || state.saving} onClick={() => window.confirm(t('confirmFixAll')) && controller.request('fix-all', { confirmed: true })}>{t('fixAll')}</button></div></header>
    <div className="cgw-stats">{[['total','total'],['active','active'],['unhealthy','unhealthy'],['disabled','disabled']].map(([key,label]) => <article key={key} data-alert={key === 'unhealthy' && state.summary[key] > 0}><strong>{state.summary[key]}</strong><span>{t(label)}</span></article>)}</div>
    <label className="cgw-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('search')} /></label>
    {state.loading && !state.entries.length ? <p className="cgw-empty">{t('loading')}</p> : null}
    {state.error ? <p className="cgw-error" role="alert">{state.error === 'failed' ? t('failed') : state.error}</p> : null}
    <div className="cgw-groups">{groups.map(([name, entries]) => {
      if (!entries.length) return null
      const open = query.trim() ? true : expanded[name]
      return <section key={name} className={`cgw-group cgw-group-${name}`}>
        <header><button className="cgw-group-toggle" aria-expanded={open} onClick={() => setExpanded(current => ({ ...current, [name]: !current[name] }))}><span className="cgw-chevron" aria-hidden="true">›</span><h3>{t(`group_${name}`)}</h3><span className="cgw-count">{entries.length}</span></button></header>
        {open ? <ul>{entries.map(entry => <EntryRow key={entry.id} entry={entry} t={t} busy={state.saving} act={act} />)}</ul> : null}
      </section>
    })}</div>
    {!state.loading && !filtered.length ? <p className="cgw-empty">{t('empty')}</p> : null}
    <details className="cgw-history"><summary>{t('history')} · {state.history.length}</summary>{state.history.length ? <ol>{[...state.history].reverse().map((event, index) => <li key={`${event.id}-${event.at}-${index}`}><time>{new Date(event.at).toLocaleTimeString()}</time><code>{event.id}</code><span>{t(`phase_${event.phase ?? 'none'}`)}</span></li>)}</ol> : <p>{t('noHistory')}</p>}</details>
  </section>
}

function EntryRow({ entry, t, busy, act }) {
  const short = entry.moduleName.split('/').at(-1)
  return <li><div className="cgw-rail" aria-hidden="true" /><div className="cgw-entry"><div className="cgw-entry-head"><div><strong>{short}</strong><code>{entry.id}</code></div><span className={`cgw-phase cgw-phase-${entry.issue ? 'bad' : entry.enabled ? 'good' : 'off'}`}>{entry.issue ? t(`issue_${entry.issue}`) : t(`phase_${entry.phase ?? 'none'}`)}</span></div>
    <dl><div><dt>{t('module')}</dt><dd>{entry.moduleName}</dd></div>{entry.parentId ? <div><dt>{t('parent')}</dt><dd>{entry.parentId}</dd></div> : null}</dl>
    <div className="cgw-row-actions">{entry.protected ? <span>{t('protected')}</span> : !entry.enabled ? <button disabled={busy} onClick={() => act(entry, 'enable')}>{t('enable')}</button> : entry.issue ? <><button disabled={busy} onClick={() => act(entry, 'retry')}>{t('retry')}</button><button className="cgw-danger" disabled={busy} onClick={() => act(entry, 'disable')}>{t('disable')}</button></> : null}</div></div></li>
}
