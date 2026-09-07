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
  ctx.on('connection/reset', () => { void controller.request('list'); void controller.request('dependencies') })
  const t = ctx.locale.bind(namespace)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'cordis-guardian', order: 18, label: () => t('nav'), locale: namespace,
    inject: () => ({ controller }),
  }, GuardianSection))
}

export function GuardianSection({ t, controller }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [query, setQuery] = useState('')
  const [view, setView] = useState('runtime')
  const [expanded, setExpanded] = useState({ unhealthy: true, active: false, disabled: false })
  useEffect(() => {
    void controller.request('list')
    void controller.request('dependencies')
    const timer = setInterval(() => { void controller.request('list', {}, true) }, 2000)
    const dependencyTimer = setInterval(() => { void controller.request('dependencies', {}, true) }, 15000)
    return () => { clearInterval(timer); clearInterval(dependencyTimer) }
  }, [controller])
  const filtered = useMemo(() => state.entries.filter(entry => `${entry.id} ${entry.moduleName}`.toLowerCase().includes(query.trim().toLowerCase())), [state.entries, query])
  const groups = [
    ['unhealthy', filtered.filter(entry => entry.issue)],
    ['active', filtered.filter(entry => !entry.issue && entry.enabled)],
    ['disabled', filtered.filter(entry => !entry.enabled)],
  ]
  const dependencyIssues = useMemo(() => state.dependency.issues.filter(entry => `${entry.consumer} ${entry.peer} ${entry.type}`.toLowerCase().includes(query.trim().toLowerCase())), [state.dependency.issues, query])
  const act = async (entry, action) => {
    if (action === 'disable' && !window.confirm(t('confirmDisable'))) return
    await controller.request('act', { id: entry.id, action, confirmed: true })
  }
  const fixDependency = async entry => {
    if (!window.confirm(t('confirmDependencyFix'))) return
    await controller.request('dependency-fix', { id: entry.id, confirmed: true })
  }
  return <section className="cgw">
    <header className="cgw-hero"><div><p className="cgw-kicker">CORDIS / GUARDIAN</p><h2>{t('title')}</h2><p>{view === 'runtime' ? t('intro') : t('dependencyIntro')}</p></div>
      <div className="cgw-actions"><button disabled={state.loading || state.dependencyLoading || state.saving} onClick={() => controller.request(view === 'runtime' ? 'list' : 'dependencies')}>{t('refresh')}</button>
        {view === 'runtime' ? <button className="cgw-primary" disabled={!state.summary.unhealthy || state.saving} onClick={() => window.confirm(t('confirmFixAll')) && controller.request('fix-all', { confirmed: true })}>{t('fixAll')}</button> : null}</div></header>
    <nav className="cgw-tabs" aria-label={t('title')}><button aria-current={view === 'runtime' ? 'page' : undefined} onClick={() => { setView('runtime'); setQuery('') }}>{t('runtimeTab')}</button><button aria-current={view === 'dependencies' ? 'page' : undefined} onClick={() => { setView('dependencies'); setQuery('') }}>{t('dependencyTab')}<span>{state.dependency.summary.issues}</span></button></nav>
    {view === 'runtime' ? <div className="cgw-stats">{[['total','total'],['active','active'],['unhealthy','unhealthy'],['disabled','disabled']].map(([key,label]) => <article key={key} data-alert={key === 'unhealthy' && state.summary[key] > 0}><strong>{state.summary[key]}</strong><span>{t(label)}</span></article>)}</div> : <div className="cgw-stats">{[['scanned','depScanned'],['issues','depIssues'],['errors','depErrors'],['warnings','depWarnings']].map(([key,label]) => <article key={key} data-alert={(key === 'errors' || key === 'warnings') && state.dependency.summary[key] > 0}><strong>{state.dependency.summary[key]}</strong><span>{t(label)}</span></article>)}</div>}
    <label className="cgw-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t(view === 'runtime' ? 'search' : 'depSearch')} /></label>
    {view === 'dependencies' ? <DependencyPanel dependency={state.dependency} issues={dependencyIssues} loading={state.dependencyLoading} saving={state.saving} t={t} fix={fixDependency} /> : <>
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
    <details className="cgw-history"><summary>{t('history')} · {state.history.length}</summary>{state.history.length ? <ol>{[...state.history].reverse().map((event, index) => <li key={`${event.id}-${event.at}-${index}`}><time>{new Date(event.at).toLocaleTimeString()}</time><code>{event.id}</code><span>{t(`phase_${event.phase ?? 'none'}`)}</span></li>)}</ol> : <p>{t('noHistory')}</p>}</details></>}
  </section>
}

function DependencyPanel({ dependency, issues, loading, saving, t, fix }) {
  if (loading && !dependency.available) return <p className="cgw-empty">{t('loading')}</p>
  return <div className="cgw-dependencies">
    <div className="cgw-profile"><span>{dependency.profileName}</span><span>{t('autoPeers')}: <strong data-good={dependency.autoInstallPeers === false}>{dependency.autoInstallPeers === false ? t('autoPeersSafe') : t('autoPeersUnsafe')}</strong></span></div>
    {!issues.length ? <p className="cgw-empty">{t('depHealthy')}</p> : <ul>{issues.map(entry => <li key={entry.id} data-severity={entry.severity}><div className="cgw-dep-head"><strong>{t(`issue_${entry.type.replaceAll('-', '_')}`)}</strong><span>{entry.severity}</span></div>{entry.consumer ? <code>{entry.consumer}</code> : null}{entry.peer ? <h4>{entry.peer}</h4> : null}<dl>{entry.expected ? <div><dt>{t('expected')}</dt><dd>{entry.expected}</dd></div> : null}{entry.actual ? <div><dt>{t('actual')}</dt><dd>{entry.actual}</dd></div> : null}</dl><div className="cgw-row-actions">{entry.fix === 'host-peer' ? <span>{t('hostPeer')}</span> : entry.fix ? <button disabled={saving} onClick={() => fix(entry)}>{t(`fix_${entry.fix.replaceAll('-', '_')}`)}</button> : null}</div></li>)}</ul>}
  </div>
}

function EntryRow({ entry, t, busy, act }) {
  const short = entry.moduleName.split('/').at(-1)
  return <li><div className="cgw-rail" aria-hidden="true" /><div className="cgw-entry"><div className="cgw-entry-head"><div><strong>{short}</strong><code>{entry.id}</code></div><span className={`cgw-phase cgw-phase-${entry.issue ? 'bad' : entry.enabled ? 'good' : 'off'}`}>{entry.issue ? t(`issue_${entry.issue}`) : t(`phase_${entry.phase ?? 'none'}`)}</span></div>
    <dl><div><dt>{t('module')}</dt><dd>{entry.moduleName}</dd></div>{entry.parentId ? <div><dt>{t('parent')}</dt><dd>{entry.parentId}</dd></div> : null}</dl>
    <div className="cgw-row-actions">{entry.protected ? <span>{t('protected')}</span> : !entry.enabled ? <button disabled={busy} onClick={() => act(entry, 'enable')}>{t('enable')}</button> : entry.issue ? <><button disabled={busy} onClick={() => act(entry, 'retry')}>{t('retry')}</button><button className="cgw-danger" disabled={busy} onClick={() => act(entry, 'disable')}>{t('disable')}</button></> : null}</div></div></li>
}
