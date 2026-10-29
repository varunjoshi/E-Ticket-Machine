import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Bot, Calculator, Maximize2, Minimize2, MonitorPlay, Settings, ShieldAlert, Speaker, VolumeX, Wifi, WifiOff, X,
} from 'lucide-react'
import { AppProvider, useApp } from './state/AppContext'
import { TicketMachine } from './components/machine/TicketMachine'
import { OperatorPanel } from './components/operator/OperatorPanel'
import { SettingsPanel } from './components/operator/SettingsPanel'
import { formatMoney } from './services/fareCalculator'
import { formatTicketLines, formatHistoryDate } from './services/ticketService'
import { stopPrimaryLabel } from './services/routeService'
import type { Ticket } from './types'
import './styles/base.css'
import './styles/machine.css'
import './styles/thermal-paper.css'
import './styles/operator.css'

type Mode = 'device' | 'operator'

function Shell() {
  const app = useApp()
  const appRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('device')
  const [machineFullscreen, setMachineFullscreen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [printTicket, setPrintTicket] = useState<Ticket | null>(null)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => setMachineFullscreen(document.fullscreenElement === appRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const handleBrowserPrint = (ticket: Ticket) => {
    flushSync(() => setPrintTicket(ticket))
    window.setTimeout(() => window.print(), 60)
  }

  const switchMode = (next: Mode) => {
    if (next === 'operator' && document.fullscreenElement) {
      void document.exitFullscreen()
    }
    setMode(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleMachineFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    if (!appRef.current?.requestFullscreen) {
      app.notify('error', 'Fullscreen is not supported by this browser.')
      return
    }
    try {
      await appRef.current.requestFullscreen()
    } catch {
      app.notify('error', 'Fullscreen could not be started. Please try again.')
    }
  }

  const lastTicket = app.tickets[0]
  const quote = app.quote

  return (
    <div ref={appRef} className={`app ${machineFullscreen ? 'app--machine-fullscreen' : ''}`}>
      <header className="app-bar">
        <div className="app-bar__brand">
          <span className="app-bar__logo" aria-hidden="true">
            <span>B</span>
          </span>
          <div>
            <p className="app-bar__name">BALAJI <span>ETM</span></p>
            <p className="app-bar__sub">MSRTC demo ticketing · Maharashtra</p>
          </div>
        </div>

        <nav className="mode-switch" aria-label="Presentation mode">
          <button type="button" className={mode === 'device' ? 'is-active' : ''} aria-pressed={mode === 'device'} onClick={() => switchMode('device')}>
            <MonitorPlay size={15} /> <span>Machine</span>
          </button>
          <button type="button" className={mode === 'operator' ? 'is-active' : ''} aria-pressed={mode === 'operator'} onClick={() => switchMode('operator')}>
            <Calculator size={15} /> <span>Operator</span>
          </button>
        </nav>

        <div className="app-bar__tools">
          <span className={`net-chip ${online ? 'is-online' : 'is-offline'}`} title={online ? 'Online' : 'Offline — demo data still works'}>
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{online ? 'Online' : 'Offline'}</span>
          </span>
          <button
            type="button"
            className="tool-btn"
            onClick={() => app.updateSettings({ language: app.settings.language === 'en' ? 'mr' : 'en' })}
            aria-label={app.settings.language === 'en' ? 'Switch interface to Marathi' : 'Switch interface to English'}
            title="English / मराठी"
          >
            {app.settings.language === 'en' ? 'मराठी' : 'EN'}
          </button>
          <button
            type="button"
            className="tool-btn tool-btn--icon"
            onClick={() => app.updateSettings({ audio: !app.settings.audio })}
            aria-pressed={app.settings.audio}
            aria-label={app.settings.audio ? 'Turn sound off' : 'Turn sound on'}
            title="Sound on/off"
          >
            {app.settings.audio ? <Speaker size={16} /> : <VolumeX size={16} />}
          </button>
          <button type="button" className="tool-btn tool-btn--icon" onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings">
            <Settings size={16} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {mode === 'device' ? (
          <div className="device-layout">
            <section className="machine-stage" aria-label="BALAJI electronic ticket machine">
              <div className="machine-stage__glow" aria-hidden="true" />
              <div className="machine-stage__controls">
                <span className="machine-stage__mode-label">
                  {machineFullscreen ? 'Machine only' : 'Passenger machine'}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--small machine-stage__fullscreen"
                  onClick={toggleMachineFullscreen}
                  aria-pressed={machineFullscreen}
                  aria-label={machineFullscreen ? 'Exit machine-only fullscreen' : 'Enter machine-only fullscreen'}
                >
                  {machineFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{machineFullscreen ? 'Exit fullscreen' : 'Use fullscreen'}</span>
                </button>
              </div>
              <TicketMachine onSwitchMode={switchMode} onBrowserPrint={handleBrowserPrint} />
              <div className="machine-caption">
                <span className="machine-caption__dot" />
                <span>Interactive replica · click keys or use the keyboard</span>
                <span className="machine-caption__keys">↑↓←→ · ENTER · ESC · 0–9</span>
              </div>
            </section>

            <aside className="device-aside">
              <div className="aside-card aside-card--accent">
                <div className="aside-card__head">
                  <Bot size={17} />
                  <h2>Run the machine</h2>
                </div>
                <ol className="guide-list">
                  <li><b>Power on</b><span>Boot animation plays; press POWER again to restart. SKIP is available.</span></li>
                  <li><b>Choose a demo operator</b><span>Press ENTER on the LCD list. Not a real login.</span></li>
                  <li><b>TICKET → origin → destination</b><span>Use ▲▼ to move and ENTER to select. Destinations are filtered by demo route data.</span></li>
                  <li><b>Service → passengers → confirm</b><span>ENTER issues only after the confirmation screen. Esc steps back.</span></li>
                  <li><b>Watch the thermal print</b><span>Paper feeds from the slot; the ticket is saved for reprint.</span></li>
                </ol>
              </div>

              <div className="aside-card">
                <div className="aside-card__head">
                  <span className="aside-card__eyebrow">Shared ticket state</span>
                  <h2>Current selection</h2>
                </div>
                <dl className="aside-kv">
                  <div><dt>Origin</dt><dd>{stopPrimaryLabel(app.stops.find((s) => s.id === app.draft.fromStopId), app.settings.language)}</dd></div>
                  <div><dt>Destination</dt><dd>{stopPrimaryLabel(app.stops.find((s) => s.id === app.draft.toStopId), app.settings.language)}</dd></div>
                  <div><dt>Service</dt><dd>{quote.serviceName ?? '—'}</dd></div>
                  <div><dt>Passengers</dt><dd>{app.draft.adults} adult · {app.draft.children} child</dd></div>
                  <div><dt>Estimate</dt><dd className="aside-kv__money">{quote.ok ? formatMoney(quote.totalPaise) : '—'}</dd></div>
                </dl>
                {quote.ok ? (
                  <p className="aside-note">
                    {quote.distanceKm.toFixed(1)} km demo distance · tariff {quote.tariffEffectiveFrom} · simulated.
                  </p>
                ) : (
                  <p className="aside-note aside-note--warn"><ShieldAlert size={13} /> {quote.errors[0] ?? 'Complete the selection.'}</p>
                )}
                <button type="button" className="btn btn--ghost btn--small btn--wide" onClick={() => switchMode('operator')}>
                  Fill this ticket in Operator Mode
                </button>
              </div>

              <div className="aside-card">
                <div className="aside-card__head">
                  <span className="aside-card__eyebrow">This shift · demo</span>
                  <h2>Tickets & collection</h2>
                </div>
                <div className="mini-stats">
                  <div><strong>{app.todayTickets.length}</strong><span>issued today</span></div>
                  <div><strong>{formatMoney(app.todayTotalPaise)}</strong><span>demo total</span></div>
                </div>
                <div className="last-ticket">
                  <span>Last ticket</span>
                  {lastTicket ? (
                    <>
                      <strong className="mono">{lastTicket.serial}</strong>
                      <em>{lastTicket.fromName} → {lastTicket.toName} · {inrShort(lastTicket.totalPaise)} · {formatHistoryDate(lastTicket.issuedAt)}</em>
                    </>
                  ) : (
                    <em>No demo ticket issued on this device yet.</em>
                  )}
                </div>
                <button type="button" className="btn btn--ghost btn--small btn--wide" onClick={() => switchMode('operator')}>
                  Open shift dashboard
                </button>
              </div>

              <div className="aside-card aside-card--warning">
                <div className="aside-card__head">
                  <ShieldAlert size={16} />
                  <h2>Demo data notice</h2>
                </div>
                <p>
                  Stops, distances and fares are hand-written samples, not official MSRTC data. Every ticket is marked
                  DEMO / NOT VALID. LocalStorage is not a secure production database.
                </p>
                <div className="data-pills">
                  <span className="chip chip--warning">SIMULATED FARES</span>
                  <span className="chip">UNVERIFIED ROUTES</span>
                  <span className="chip">{app.stops.length} STOPS · {app.routes.length} ROUTES</span>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <OperatorPanel onSwitchMode={switchMode} onBrowserPrint={handleBrowserPrint} onOpenSettings={() => setSettingsOpen(true)} />
        )}
      </main>

      {machineFullscreen ? (
        <button
          type="button"
          className="machine-fullscreen-exit"
          onClick={toggleMachineFullscreen}
          aria-label="Exit machine-only fullscreen"
          title="Exit fullscreen"
        >
          <Minimize2 size={16} />
        </button>
      ) : null}

      <footer className="app-footer">
        <span>BALAJI ETM — experimental MSRTC-style ticketing demo. Not affiliated with MSRTC.</span>
        <span className="app-footer__meta">
          Simulated fares & routes · No official seals/QR · {app.tickets.length} demo ticket(s) stored locally
        </span>
      </footer>

      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}

      {app.toast ? (
        <div className={`toast toast--${app.toast.kind}`} role="status">
          <span>{app.toast.text}</span>
          <button type="button" className="toast__close" onClick={app.clearToast} aria-label="Dismiss message"><X size={14} /></button>
        </div>
      ) : null}

      <div className="print-only" aria-hidden="true">
        {printTicket ? (
          <div className={`print-sheet ${app.settings.paperWidth === 80 ? 'print-sheet--80' : ''}`}>
            {formatTicketLines(printTicket).map((line, i) => (
              <div key={i} className="print-sheet__line">{line || '\u00a0'}</div>
            ))}
            <div className="print-sheet__foot">DEMO / SIMULATION — NOT A VALID MSRTC TICKET</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function inrShort(paise: number): string {
  return formatMoney(paise)
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
