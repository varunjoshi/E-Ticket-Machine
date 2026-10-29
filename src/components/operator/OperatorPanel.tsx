import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, BadgeCheck, Bus, CircleDollarSign, ClipboardCheck, Database, LogOut, Plus,
  Printer, ReceiptText, Settings, ShieldAlert, Ticket as TicketIcon, UserRound, Wifi, WifiOff,
} from 'lucide-react'
import { useApp } from '../../state/AppContext'
import { DEMO_OPERATORS } from '../../data/demoOperators'
import { formatMoney } from '../../services/fareCalculator'
import { formatHistoryDate, inr } from '../../services/ticketService'
import { stopPrimaryLabel } from '../../services/routeService'
import type { Ticket } from '../../types'
import { RouteSelector } from './RouteSelector'
import { PassengerPanel } from './PassengerPanel'
import { FareCalculator } from './FareCalculator'
import { TicketHistory } from './TicketHistory'
import { TicketPreview } from './TicketPreview'
import { ThermalPrinter } from '../machine/ThermalPrinter'
import { t } from '../../services/i18n'

interface OperatorPanelProps {
  onSwitchMode: (mode: 'device' | 'operator') => void
  onBrowserPrint: (ticket: Ticket) => void
  onOpenSettings: () => void
}

type Tab = 'sell' | 'dashboard'

interface PrintSession {
  ticket: Ticket
  isReprint: boolean
  nonce: number
}

export function OperatorPanel({ onSwitchMode, onBrowserPrint, onOpenSettings }: OperatorPanelProps) {
  const app = useApp()
  const [tab, setTab] = useState<Tab>('sell')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cashText, setCashText] = useState('')
  const [successTicket, setSuccessTicket] = useState<Ticket | null>(null)
  const [printSession, setPrintSession] = useState<PrintSession | null>(null)
  const [previewTicket, setPreviewTicket] = useState<Ticket | null>(null)
  const confirmLock = useRef(false)

  const quote = app.quote
  const parsedCash = cashText.trim() ? Math.round(Number(cashText) * 100) : quote.totalPaise
  const cashPaise = Number.isFinite(parsedCash) ? parsedCash : 0
  const cashError = cashText.trim() && quote.ok && cashPaise < quote.totalPaise ? `Short by ${formatMoney(quote.totalPaise - cashPaise)}` : undefined
  const canConfirm = quote.ok && !cashError && quote.totalPaise > 0 && !!app.operator

  useEffect(() => {
    if (!confirmOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOpen])

  const openConfirm = () => {
    if (!canConfirm) return
    confirmLock.current = false
    setConfirmOpen(true)
  }

  const issue = () => {
    if (confirmLock.current) return
    if (!quote.ok) return
    confirmLock.current = true
    const ticket = app.issueTicket({ cashReceivedPaise: cashPaise })
    if (!ticket) {
      confirmLock.current = false
      return
    }
    setConfirmOpen(false)
    setSuccessTicket(ticket)
    setCashText('')
    setPrintSession({ ticket, isReprint: false, nonce: Date.now() })
    setTab('sell')
  }

  const openReprint = (ticket: Ticket) => {
    if (printSession) return
    setPreviewTicket(null)
    setPrintSession({ ticket, isReprint: true, nonce: Date.now() })
  }

  const completePrint = (session: PrintSession) => {
    app.markPrinted(session.ticket.id, session.isReprint)
    setSuccessTicket((prev) =>
      prev?.id === session.ticket.id
        ? {
            ...prev,
            printStatus: 'printed',
            printedAt: prev.printedAt ?? new Date().toISOString(),
            reprints: session.isReprint ? prev.reprints + 1 : prev.reprints,
          }
        : prev,
    )
  }

  if (!app.operator) {
    return <OperatorLogin onSwitchMode={onSwitchMode} onOpenSettings={onOpenSettings} />
  }

  const lastTicket = app.tickets[0]
  const latestJourney = app.draft.fromStopId && app.draft.toStopId

  return (
    <div className="operator-panel">
      <div className="operator-head">
        <div>
          <p className="eyebrow">Operator console</p>
          <h1>Sell & manage demo tickets</h1>
          <p className="operator-head__sub">
            Same fare engine and ticket store as the machine. All fares are simulated and clearly marked DEMO.
          </p>
        </div>
        <div className="operator-head__shift">
          <span className="shift-dot" />
          <div>
            <strong>{app.operator.id} · {app.operator.name}</strong>
            <em>{app.operator.depot} depot · {app.operator.busNo} · Machine {app.operator.machineNo}</em>
          </div>
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Open settings"><Settings size={16} /></button>
        </div>
      </div>

      <div className="operator-toolbar">
        <div className="segmented" role="tablist" aria-label="Operator sections">
          <button type="button" role="tab" aria-selected={tab === 'sell'} className={tab === 'sell' ? 'is-active' : ''} onClick={() => setTab('sell')}>
            <ReceiptText size={15} /> Sell ticket
          </button>
          <button type="button" role="tab" aria-selected={tab === 'dashboard'} className={tab === 'dashboard' ? 'is-active' : ''} onClick={() => setTab('dashboard')}>
            <ClipboardCheck size={15} /> Shift dashboard
          </button>
        </div>
        <div className="operator-toolbar__right">
          <span className="chip chip--warning"><ShieldAlert size={11} /> DEMO ONLY</span>
          <button type="button" className="btn btn--ghost btn--small" onClick={onSwitchMode.bind(null, 'device')}>
            Machine mode
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => app.logout()}>
            <LogOut size={13} /> End shift
          </button>
        </div>
      </div>

      {tab === 'sell' ? (
        <div className="sell-layout">
          <div className="sell-main">
            {successTicket ? (
              <div className="success-banner">
                <BadgeCheck size={20} />
                <div>
                  <strong>{successTicket.serial} issued.</strong>
                  <span>{inr(successTicket.totalPaise)} · {successTicket.fromName} → {successTicket.toName} · simulation only</span>
                </div>
                <div className="success-banner__actions">
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => onBrowserPrint(successTicket)}><Printer size={13} /> Print</button>
                  <button type="button" className="btn btn--primary btn--small" onClick={() => { app.resetDraft(); setSuccessTicket(null); setCashText('') }}>
                    <Plus size={13} /> New ticket
                  </button>
                </div>
              </div>
            ) : null}

            <section className="panel-card">
              <div className="panel-card__head">
                <div>
                  <p className="eyebrow">Step 1–2</p>
                  <h2>Route & service</h2>
                </div>
                <span className="panel-card__hint">Searchable stop pickers</span>
              </div>
              <RouteSelector />
            </section>

            <section className="panel-card">
              <div className="panel-card__head">
                <div>
                  <p className="eyebrow">Step 3</p>
                  <h2>Passengers & payment</h2>
                </div>
                <span className="panel-card__hint">{app.draft.adults + app.draft.children} passenger(s)</span>
              </div>
              <PassengerPanel cashText={cashText} onCashTextChange={setCashText} cashPaise={cashPaise} cashError={cashError} />
            </section>
          </div>

          <aside className="sell-aside">
            <FareCalculator quote={quote} cashPaise={cashText.trim() ? cashPaise : undefined} />
            <div className="issue-card">
              <div className="issue-card__total">
                <span>Total payable</span>
                <strong>{quote.ok ? formatMoney(quote.totalPaise) : '—'}</strong>
              </div>
              <div className="issue-card__rows">
                <div><span>Origin</span><b>{stopPrimaryLabel(app.stops.find((s) => s.id === app.draft.fromStopId), app.settings.language)}</b></div>
                <div><span>Destination</span><b>{stopPrimaryLabel(app.stops.find((s) => s.id === app.draft.toStopId), app.settings.language)}</b></div>
                <div><span>Service</span><b>{quote.serviceName ?? '—'}</b></div>
                <div><span>Passengers</span><b>{app.draft.adults} adult · {app.draft.children} child</b></div>
              </div>
              {!quote.ok ? (
                <p className="issue-card__blocker"><ShieldAlert size={13} /> {quote.errors[0]}</p>
              ) : cashError ? (
                <p className="issue-card__blocker"><ShieldAlert size={13} /> {cashError}</p>
              ) : null}
              <button type="button" className="btn btn--primary btn--wide" onClick={openConfirm} disabled={!canConfirm}>
                <TicketIcon size={16} /> Review & confirm
              </button>
              <p className="issue-card__note">
                No ticket or serial is created until you confirm. Fares are demo estimates and the printed ticket is
                marked not valid.
              </p>
            </div>
            {!latestJourney ? (
              <p className="aside-note">Tip: start with an origin stop, then choose from directly connected demo destinations.</p>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className="dashboard">
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__label"><TicketIcon size={14} /> Tickets today</span>
              <strong>{app.todayTickets.length}</strong>
              <em>Demo shift · {app.operator.id}</em>
            </div>
            <div className="stat-card">
              <span className="stat-card__label"><CircleDollarSign size={14} /> Demo collection</span>
              <strong>{formatMoney(app.todayTotalPaise)}</strong>
              <em>Not real revenue</em>
            </div>
            <div className="stat-card">
              <span className="stat-card__label"><Bus size={14} /> Current trip</span>
              <strong className="stat-card__small">{app.operator.serviceNo} · {app.operator.busNo}</strong>
              <em>{app.operator.depot} depot · {app.operator.machineNo}</em>
            </div>
            <div className="stat-card">
              <span className="stat-card__label"><Printer size={14} /> Printer</span>
              <strong className="stat-card__small">{printSession ? 'Busy (simulated)' : 'Ready (simulated)'}</strong>
              <em>No physical printer required</em>
            </div>
            <div className="stat-card">
              <span className="stat-card__label"><Database size={14} /> Route data</span>
              <strong className="stat-card__small">DEMO · UNVERIFIED</strong>
              <em>{app.stops.length} stops · {app.routes.length} routes · {app.data.importedRoutes.length} imported</em>
            </div>
            <div className="stat-card">
              <span className="stat-card__label">{lastTicket ? <ReceiptText size={14} /> : <UserRound size={14} />} Last ticket</span>
              <strong className="stat-card__small">{lastTicket ? lastTicket.serial : 'None yet'}</strong>
              <em>{lastTicket ? `${formatHistoryDate(lastTicket.issuedAt)} · ${inr(lastTicket.totalPaise)}` : 'Issue one from Sell'}</em>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="panel-card">
              <div className="panel-card__head">
                <div>
                  <p className="eyebrow">Shift</p>
                  <h2>Current demo operator</h2>
                </div>
                <button type="button" className="btn btn--ghost btn--small" onClick={onOpenSettings}><Settings size={13} /> Settings</button>
              </div>
              <dl className="operator-details">
                <div><dt>Operator ID</dt><dd>{app.operator.id}</dd></div>
                <div><dt>Name</dt><dd>{app.operator.name}</dd></div>
                <div><dt>Depot</dt><dd>{app.operator.depot}</dd></div>
                <div><dt>Bus</dt><dd>{app.operator.busNo}</dd></div>
                <div><dt>Service no.</dt><dd>{app.operator.serviceNo}</dd></div>
                <div><dt>Machine no.</dt><dd>{app.operator.machineNo}</dd></div>
                <div><dt>Shift started</dt><dd>{formatHistoryDate(app.operator.startedAt)}</dd></div>
                <div><dt>Storage</dt><dd>LocalStorage · this browser only</dd></div>
              </dl>
              <p className="aside-note">
                Sample operator identity. No MSRTC authentication, payroll or depot integration is performed.
              </p>
              <div className="button-row">
                <button type="button" className="btn btn--ghost btn--small" onClick={() => onSwitchMode('device')}>Open machine</button>
                <button type="button" className="btn btn--danger btn--small" onClick={() => app.logout()}><LogOut size={13} /> End demo shift</button>
              </div>
            </section>

            <section className="panel-card">
              <div className="panel-card__head">
                <div>
                  <p className="eyebrow">Status</p>
                  <h2>Data & device</h2>
                </div>
              </div>
              <div className="status-list">
                <div><span><Wifi size={14} /> Network</span><b>{typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'}</b></div>
                <div><span><Printer size={14} /> Simulated printer</span><b className="ok">Ready</b></div>
                <div><span><Database size={14} /> Route verification</span><b className="warn">Unverified demo</b></div>
                <div><span><ShieldAlert size={14} /> Ticket validity</span><b className="warn">Simulation only</b></div>
                <div><span><WifiOff size={14} /> Physical ESC/POS</span><b>Optional · Web Serial</b></div>
              </div>
              <p className="aside-note">
                Physical printing is optional and experimental. The animated thermal simulation always works in the
                browser, even without hardware.
              </p>
              <div className="button-row">
                <button type="button" className="btn btn--ghost btn--small" onClick={onOpenSettings}>Data settings</button>
              </div>
            </section>
          </div>

          <section className="panel-card">
            <TicketHistory
              tickets={app.tickets}
              onView={setPreviewTicket}
              onReprint={openReprint}
            />
          </section>
        </div>
      )}

      {confirmOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm ticket" onMouseDown={(e) => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="confirm-modal">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Explicit confirmation</p>
                <h2>Issue this demo ticket?</h2>
              </div>
            </div>
            <div className="confirm-summary">
              <div className="confirm-summary__route">
                <span>{stopPrimaryLabel(app.stops.find((s) => s.id === app.draft.fromStopId), app.settings.language)}</span>
                <ArrowRight size={18} />
                <span>{stopPrimaryLabel(app.stops.find((s) => s.id === app.draft.toStopId), app.settings.language)}</span>
              </div>
              <dl>
                <div><dt>Service</dt><dd>{quote.serviceName}</dd></div>
                <div><dt>Distance</dt><dd>{quote.distanceKm.toFixed(1)} km (demo)</dd></div>
                <div><dt>Passengers</dt><dd>{app.draft.adults} adult(s), {app.draft.children} child(ren)</dd></div>
                <div><dt>Concessions</dt><dd>{quote.concessions.length ? quote.concessions.map((c) => `${c.ruleId} ×${c.count}`).join(', ') : 'None'}</dd></div>
                <div><dt>Base fare</dt><dd>{formatMoney(quote.basePaise)}</dd></div>
                <div><dt>Concession</dt><dd>-{formatMoney(quote.concessionPaise)}</dd></div>
                {quote.roundingPaise !== 0 ? (
                  <div><dt>Fare rounding</dt><dd>{quote.roundingPaise > 0 ? '+' : '-'}{formatMoney(Math.abs(quote.roundingPaise))}</dd></div>
                ) : null}
                <div><dt>Cash received</dt><dd>{formatMoney(cashPaise)}</dd></div>
                <div><dt>Change due</dt><dd>{formatMoney(Math.max(0, cashPaise - quote.totalPaise))}</dd></div>
                <div className="confirm-summary__total"><dt>Total</dt><dd>{formatMoney(quote.totalPaise)}</dd></div>
              </dl>
              <p className="confirm-summary__warn">
                This creates a uniquely numbered DEMO ticket and starts the simulated thermal print. It is not a valid
                MSRTC ticket and cannot be used for travel.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmOpen(false)}>Edit details</button>
              <button type="button" className="btn btn--ghost" onClick={() => { setConfirmOpen(false); app.resetDraft(); setCashText('') }}>Cancel ticket</button>
              <button type="button" className="btn btn--primary" onClick={issue} disabled={!canConfirm}>
                <Printer size={15} /> Confirm & issue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewTicket ? (
        <TicketPreview
          ticket={previewTicket}
          onClose={() => setPreviewTicket(null)}
          onBrowserPrint={onBrowserPrint}
          onReprint={openReprint}
        />
      ) : null}

      {printSession ? (
        <ThermalPrinter
          key={`op-${printSession.nonce}`}
          ticket={printSession.ticket}
          variant="modal"
          paperWidth={app.settings.paperWidth}
          isReprint={printSession.isReprint}
          onComplete={() => completePrint(printSession)}
          onTearOff={() => setPrintSession(null)}
          onBrowserPrint={onBrowserPrint}
        />
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------------------- */

function OperatorLogin({ onSwitchMode, onOpenSettings }: { onSwitchMode: (m: 'device' | 'operator') => void; onOpenSettings: () => void }) {
  const app = useApp()
  const [form, setForm] = useState({ ...DEMO_OPERATORS[0] })
  const [error, setError] = useState<string | null>(null)

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.id.trim() || !form.name.trim() || !form.depot.trim() || !form.busNo.trim()) {
      setError('Operator ID, name, depot and bus number are required for the demo shift.')
      return
    }
    setError(null)
    app.login({ ...form, id: form.id.trim(), startedAt: new Date().toISOString() })
  }

  return (
    <div className="login-layout">
      <section className="login-card">
        <div className="login-card__head">
          <span className="eyebrow">Operator mode · local demo</span>
          <h1>Start a demo shift</h1>
          <p>
            This is a clearly labelled sample login. It does not authenticate against MSRTC, verify a conductor, or
            enable real ticket sales. All data stays in this browser.
          </p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span className="field__label">Sample identity preset</span>
            <select
              className="input"
              value={form.id}
              onChange={(e) => {
                const preset = DEMO_OPERATORS.find((o) => o.id === e.target.value)
                if (preset) setForm({ ...preset })
              }}
            >
              {DEMO_OPERATORS.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.depot} · {o.name}</option>)}
            </select>
          </label>
          <div className="login-form__grid">
            <label className="field">
              <span className="field__label">Conductor / operator ID *</span>
              <input className="input" value={form.id} onChange={(e) => update('id', e.target.value)} placeholder="DEMO-001" />
            </label>
            <label className="field">
              <span className="field__label">Name *</span>
              <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Demo Conductor" />
            </label>
            <label className="field">
              <span className="field__label">Depot *</span>
              <input className="input" value={form.depot} onChange={(e) => update('depot', e.target.value)} placeholder="Kopargaon" />
            </label>
            <label className="field">
              <span className="field__label">Bus number *</span>
              <input className="input" value={form.busNo} onChange={(e) => update('busNo', e.target.value)} placeholder="MH-17-DEMO" />
            </label>
            <label className="field">
              <span className="field__label">Route / service number</span>
              <input className="input" value={form.serviceNo} onChange={(e) => update('serviceNo', e.target.value)} placeholder="ORD-101" />
            </label>
            <label className="field">
              <span className="field__label">Machine number</span>
              <input className="input" value={form.machineNo} onChange={(e) => update('machineNo', e.target.value)} placeholder="ETM-0001" />
            </label>
          </div>
          {error ? <p className="inline-alert inline-alert--error"><ShieldAlert size={14} /> {error}</p> : null}
          <div className="login-form__actions">
            <button type="submit" className="btn btn--primary"><BadgeCheck size={16} /> Start demo shift</button>
            <button type="button" className="btn btn--ghost" onClick={() => onSwitchMode('device')}>Back to machine</button>
            <button type="button" className="btn btn--ghost" onClick={onOpenSettings}><Settings size={15} /> Settings</button>
          </div>
        </form>
        <p className="aside-note">
          No password is requested because there is no real account. For any production deployment, replace this with
          an authorised authentication and audit trail.
        </p>
      </section>

      <aside className="login-aside">
        <h2>What this demo does</h2>
        <ul>
          <li>Calculates fares from an editable local tariff using integer paise.</li>
          <li>Issues uniquely numbered DEMO tickets with a thermal print animation.</li>
          <li>Stores history in LocalStorage and supports reprints without duplicates.</li>
          <li>Labels simulated route data and fares instead of claiming official MSRTC values.</li>
        </ul>
        <p className="aside-note">
          {t(app.settings.language, 'demoDisclaimer')} {t(app.settings.language, 'dataDisclaimer')}
        </p>
      </aside>
    </div>
  )
}
