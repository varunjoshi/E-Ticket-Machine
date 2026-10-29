import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Database, Download, RotateCcw, Save, SlidersHorizontal, Upload, WifiOff, X } from 'lucide-react'
import { useApp } from '../../state/AppContext'
import { DEMO_TARIFF } from '../../data/demoTariffs'
import { downloadSampleImport } from '../../services/storageService'
import type { TariffConfig } from '../../types'

type Tab = 'display' | 'tariff' | 'data'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const app = useApp()
  const [tab, setTab] = useState<Tab>('display')
  const [tariffDraft, setTariffDraft] = useState<TariffConfig>(() => structuredClone(app.tariff))
  const [importText, setImportText] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [tariffError, setTariffError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stopCounts = useMemo(
    () => ({ total: app.stops.length, demo: app.stops.length - app.data.importedStops.length, imported: app.data.importedStops.length }),
    [app.stops.length, app.data.importedStops.length],
  )

  const setService = (id: string, patch: Partial<TariffConfig['services'][number]>) => {
    setTariffDraft((t) => ({ ...t, services: t.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  }

  const setConcession = (id: string, patch: Partial<TariffConfig['concessions'][number]>) => {
    setTariffDraft((t) => ({ ...t, concessions: t.concessions.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  }

  const saveTariff = () => {
    if (!tariffDraft.effectiveFrom) {
      setTariffError('Effective date is required.')
      return
    }
    if (!(tariffDraft.childFactor >= 0 && tariffDraft.childFactor <= 1)) {
      setTariffError('Child fare factor must be between 0 and 100%.')
      return
    }
    const bad = tariffDraft.services.find((s) => s.ratePerKmPaise < 0 || s.basePaise < 0 || s.minPaise < 0)
    if (bad) {
      setTariffError(`Negative rate in ${bad.nameEn}.`)
      return
    }
    const badConcession = tariffDraft.concessions.find((c) => c.percent < 0 || c.percent > 100)
    if (badConcession) {
      setTariffError(`${badConcession.nameEn} must be between 0% and 100%.`)
      return
    }
    setTariffError(null)
    app.updateTariff({ ...tariffDraft, note: 'Operator-edited demo tariff — not an official MSRTC schedule.' })
  }

  const runImport = () => {
    setImportError(null)
    setImportWarnings([])
    if (!importText.trim()) {
      setImportError('Paste JSON or choose a file first.')
      return
    }
    const result = app.importData(importText)
    if (!result.ok) {
      setImportError(result.message)
      return
    }
    setImportMessage(result.message)
    setImportWarnings(result.warnings)
    setImportText('')
  }

  const exportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      warning: 'Demo backup. Contains simulated tickets and tariff data only. Not an official MSRTC record.',
      operator: app.operator,
      tickets: app.tickets,
      tariff: app.tariff,
      importedStops: app.data.importedStops,
      importedRoutes: app.data.importedRoutes,
      settings: app.settings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `balaji-etm-demo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="settings-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Machine configuration</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings"><X size={18} /></button>
        </div>

        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          <button type="button" role="tab" aria-selected={tab === 'display'} className={tab === 'display' ? 'is-active' : ''} onClick={() => setTab('display')}>
            <SlidersHorizontal size={14} /> Display
          </button>
          <button type="button" role="tab" aria-selected={tab === 'tariff'} className={tab === 'tariff' ? 'is-active' : ''} onClick={() => setTab('tariff')}>
            <Save size={14} /> Demo tariff
          </button>
          <button type="button" role="tab" aria-selected={tab === 'data'} className={tab === 'data' ? 'is-active' : ''} onClick={() => setTab('data')}>
            <Database size={14} /> Route data
          </button>
        </div>

        <div className="settings-body">
          {tab === 'display' ? (
            <div className="settings-section">
              <h3>Interface & machine</h3>
              <div className="toggle-grid">
                <label className="toggle-row">
                  <span><strong>Sound effects</strong><em>Key clicks, printer motor, completion beep</em></span>
                  <input type="checkbox" checked={app.settings.audio} onChange={(e) => app.updateSettings({ audio: e.target.checked })} />
                </label>
                <label className="toggle-row">
                  <span><strong>Skip boot animation</strong><em>Power straight to READY on this device</em></span>
                  <input type="checkbox" checked={app.settings.skipBoot} onChange={(e) => app.updateSettings({ skipBoot: e.target.checked })} />
                </label>
                <label className="toggle-row">
                  <span><strong>Marathi stop names</strong><em>Show bilingual stop labels where available</em></span>
                  <input type="checkbox" checked={app.settings.showMarathiStops} onChange={(e) => app.updateSettings({ showMarathiStops: e.target.checked })} />
                </label>
                <div className="toggle-row">
                  <span><strong>Interface language</strong><em>English / मराठी labels where translated</em></span>
                  <div className="segmented segmented--small">
                    <button type="button" className={app.settings.language === 'en' ? 'is-active' : ''} onClick={() => app.updateSettings({ language: 'en' })}>EN</button>
                    <button type="button" className={app.settings.language === 'mr' ? 'is-active' : ''} onClick={() => app.updateSettings({ language: 'mr' })}>मराठी</button>
                  </div>
                </div>
                <div className="toggle-row">
                  <span><strong>Simulated paper width</strong><em>Affects the on-screen receipt and print layout</em></span>
                  <div className="segmented segmented--small">
                    <button type="button" className={app.settings.paperWidth === 58 ? 'is-active' : ''} onClick={() => app.updateSettings({ paperWidth: 58 })}>58 mm</button>
                    <button type="button" className={app.settings.paperWidth === 80 ? 'is-active' : ''} onClick={() => app.updateSettings({ paperWidth: 80 })}>80 mm</button>
                  </div>
                </div>
              </div>
              <p className="aside-note">
                Animations and sound never block the core flow: ticket details remain readable in the LCD, history and
                print actions. Audio starts only after a user interaction.
              </p>
              <p className="aside-note">
                Estimated installed size is small; the app can be installed as a PWA in production builds and caches
                its shell for offline demo use. Route/ticket data stays in this browser.
              </p>
            </div>
          ) : null}

          {tab === 'tariff' ? (
            <div className="settings-section">
              <div className="settings-section__head">
                <div>
                  <h3>Simulated tariff configuration</h3>
                  <p>Edit local demo rates. Existing tickets keep their stored fare. Nothing here is official.</p>
                </div>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => setTariffDraft(structuredClone(DEMO_TARIFF))}>
                  <RotateCcw size={13} /> Reset to demo defaults
                </button>
              </div>
              <div className="tariff-grid">
                <label className="field">
                  <span className="field__label">Effective from</span>
                  <input type="date" className="input" value={tariffDraft.effectiveFrom} onChange={(e) => setTariffDraft({ ...tariffDraft, effectiveFrom: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field__label">Child fare factor (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="input"
                    value={Math.round(tariffDraft.childFactor * 100)}
                    onChange={(e) => setTariffDraft({ ...tariffDraft, childFactor: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 })}
                  />
                </label>
              </div>

              <div className="tariff-table-wrap">
                <table className="tariff-table">
                  <thead>
                    <tr><th>Service</th><th>₹ / km</th><th>Base ₹</th><th>Min ₹</th><th>Rounding</th><th>On</th></tr>
                  </thead>
                  <tbody>
                    {tariffDraft.services.map((s) => (
                      <tr key={s.id}>
                        <td><strong>{s.nameEn}</strong><span className="tariff-id">{s.id}</span></td>
                        <td>
                          <input type="number" step="0.05" min={0} className="input input--mini" aria-label={`${s.nameEn} rupees per km`} value={s.ratePerKmPaise / 100}
                            onChange={(e) => setService(s.id, { ratePerKmPaise: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })} />
                        </td>
                        <td>
                          <input type="number" step="0.5" min={0} className="input input--mini" aria-label={`${s.nameEn} base fare`} value={s.basePaise / 100}
                            onChange={(e) => setService(s.id, { basePaise: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })} />
                        </td>
                        <td>
                          <input type="number" step="0.5" min={0} className="input input--mini" aria-label={`${s.nameEn} minimum fare`} value={s.minPaise / 100}
                            onChange={(e) => setService(s.id, { minPaise: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })} />
                        </td>
                        <td>
                          <select className="input input--mini" aria-label={`${s.nameEn} rounding`} value={s.rounding} onChange={(e) => setService(s.id, { rounding: e.target.value as TariffConfig['services'][number]['rounding'] })}>
                            <option value="rupee">₹1</option>
                            <option value="five">₹5</option>
                            <option value="none">paise</option>
                          </select>
                        </td>
                        <td><input type="checkbox" checked={s.enabled} aria-label={`Enable ${s.nameEn}`} onChange={(e) => setService(s.id, { enabled: e.target.checked })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4 className="settings-subhead">Concession rules (demo)</h4>
              <div className="concession-edit-grid">
                {tariffDraft.concessions.map((c) => (
                  <div key={c.id} className="concession-edit">
                    <div>
                      <strong>{c.nameEn}</strong>
                      <em>{c.requiresDoc ? 'document required' : 'no document'}{c.demo ? ' · demo rule' : ''}</em>
                    </div>
                    <label className="inline-field">
                      <input type="number" min={0} max={100} className="input input--mini" aria-label={`${c.nameEn} percent`} value={c.percent}
                        onChange={(e) => setConcession(c.id, { percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
                      <span>%</span>
                    </label>
                    <label className="inline-field">
                      <input type="checkbox" checked={c.enabled} aria-label={`Enable ${c.nameEn}`} onChange={(e) => setConcession(c.id, { enabled: e.target.checked })} />
                      <span>on</span>
                    </label>
                  </div>
                ))}
              </div>
              {tariffError ? <p className="inline-alert inline-alert--error"><AlertTriangle size={14} /> {tariffError}</p> : null}
              <div className="settings-actions">
                <button type="button" className="btn btn--primary" onClick={saveTariff}><Save size={15} /> Save demo tariff</button>
              </div>
              <p className="aside-note">
                Rates are integer paise internally, then rounded by the selected rule. This demo must not be used to
                charge real passengers without an authoritative tariff configuration.
              </p>
            </div>
          ) : null}

          {tab === 'data' ? (
            <div className="settings-section">
              <h3>Route data & local storage</h3>
              <div className="data-stats">
                <div><span>Stops loaded</span><strong>{stopCounts.total}</strong><em>{stopCounts.demo} demo · {stopCounts.imported} imported</em></div>
                <div><span>Routes loaded</span><strong>{app.routes.length}</strong><em>{app.data.importedRoutes.length} imported</em></div>
                <div><span>Tickets stored</span><strong>{app.tickets.length}</strong><em>LocalStorage</em></div>
                <div><span>Data status</span><strong className="warn">UNVERIFIED</strong><em>Demo + imported data</em></div>
              </div>

              {app.storageWarning ? (
                <p className="inline-alert inline-alert--error"><AlertTriangle size={14} /> {app.storageWarning}</p>
              ) : null}

              <div className="import-box">
                <div className="settings-section__head">
                  <div>
                    <h4>Import extra demo routes (JSON)</h4>
                    <p>Stops and routes are added locally and permanently marked “imported · unverified”.</p>
                  </div>
                  <div className="button-row">
                    <button type="button" className="btn btn--ghost btn--small" onClick={downloadSampleImport}><Download size={13} /> Sample JSON</button>
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => fileRef.current?.click()}><Upload size={13} /> Choose file</button>
                    <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose route JSON file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          setImportText(await file.text())
                          setImportError(null)
                        } catch {
                          setImportError('Could not read that file.')
                        }
                      }} />
                  </div>
                </div>
                <textarea
                  className="textarea mono"
                  rows={7}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={'{\n  "stops": [ ... ],\n  "routes": [ ... ]\n}'}
                  aria-label="Route data JSON"
                />
                <div className="button-row">
                  <button type="button" className="btn btn--primary btn--small" onClick={runImport}><Upload size={13} /> Import JSON</button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={app.loadSampleImport}>Load sample import</button>
                  <button type="button" className="btn btn--ghost btn--small" onClick={exportBackup}><Download size={13} /> Export backup</button>
                </div>
                {importError ? <p className="inline-alert inline-alert--error"><AlertTriangle size={14} /> {importError}</p> : null}
                {importMessage ? <p className="inline-alert inline-alert--success">{importMessage}</p> : null}
                {importWarnings.length ? (
                  <ul className="warning-list">
                    {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : null}
              </div>

              <div className="offline-box">
                <h4><WifiOff size={15} /> Offline & data-source notes</h4>
                <ul>
                  <li>This demo ships with hand-written sample stops, approximate corridor distances and a simulated tariff.</li>
                  <li>No official MSRTC route, timetable, depot mapping or fare data has been verified or bundled.</li>
                  <li>Official source investigated: npublic.msrtcors.com public reservation portal. No reusable public bulk route/fare dataset was confirmed, so none is claimed here.</li>
                  <li>LocalStorage is per-browser and not a secure, multi-device production store. Export backups manually.</li>
                  <li>The service worker caches the app shell for offline demo use in production builds; there is no server sync.</li>
                </ul>
              </div>

              <div className="danger-box">
                <h4>Reset local demo</h4>
                <p>Deletes demo tickets, shift, imported route data and custom tariff on this browser. This cannot be undone.</p>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => {
                    if (window.confirm('Delete all local demo tickets, imported routes and custom tariff? This cannot be undone.')) {
                      app.resetDemo()
                      setTariffDraft(structuredClone(DEMO_TARIFF))
                    }
                  }}
                >
                  <RotateCcw size={15} /> Reset all demo data
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
