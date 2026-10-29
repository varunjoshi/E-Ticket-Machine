import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Power, Speaker, Wifi } from 'lucide-react'
import { useApp } from '../../state/AppContext'
import { DEMO_OPERATORS } from '../../data/demoOperators'
import { destinationsFrom, servicesForPair, stopById, stopPrimaryLabel } from '../../services/routeService'
import { formatMoney } from '../../services/fareCalculator'
import { formatHistoryDate } from '../../services/ticketService'
import { machineAudio } from '../../services/audioService'
import { t } from '../../services/i18n'
import type { DeviceScreen, Ticket } from '../../types'
import { LCDDisplay } from './LCDDisplay'
import { PhysicalKeypad, type KeyAction } from './PhysicalKeypad'
import { ThermalPrinter } from './ThermalPrinter'

interface TicketMachineProps {
  onSwitchMode: (mode: 'device' | 'operator') => void
  onBrowserPrint: (ticket: Ticket) => void
}

interface PrintSession {
  ticket: Ticket
  isReprint: boolean
  nonce: number
}

const BOOT_LINES = ['BALAJI', 'ELECTRONIC TICKET MACHINE', 'MSRTC DEMO SYSTEM']

export function TicketMachine({ onSwitchMode, onBrowserPrint }: TicketMachineProps) {
  const app = useApp()
  const { settings, tariff, draft, quote, operator, stops, routes, tickets, updateSettings, notify, updateDraft, setConcession, chooseFrom, chooseTo, issueTicket, markPrinted, resetDraft } = app

  const [screen, setScreen] = useState<DeviceScreen>(() =>
    settings.skipBoot ? (operator ? 'home' : 'login') : 'boot',
  )
  const [bootStep, setBootStep] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [flashKey, setFlashKey] = useState<KeyAction | null>(null)
  const [printSession, setPrintSession] = useState<PrintSession | null>(null)
  const [lastTicket, setLastTicket] = useState<Ticket | null>(tickets[0] ?? null)
  const [historyTicket, setHistoryTicket] = useState<Ticket | null>(null)
  const [footerHint, setFooterHint] = useState('')
  const flashTimer = useRef<number | null>(null)
  const actionHandlerRef = useRef<(action: KeyAction) => void>(() => {})

  const language = settings.language

  useEffect(() => {
    if (!lastTicket && tickets[0]) setLastTicket(tickets[0])
  }, [tickets, lastTicket])

  // Boot sequence. The machine lands on login or home when finished.
  useEffect(() => {
    if (screen !== 'boot') return
    setBootStep(0)
    const timers: number[] = []
    for (let i = 1; i <= 5; i++) {
      timers.push(window.setTimeout(() => setBootStep(i), i * 560))
    }
    timers.push(
      window.setTimeout(() => {
        setScreen((s) => (s === 'boot' ? (operator ? 'home' : 'login') : s))
      }, 5 * 560 + 750),
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [screen, operator])

  useEffect(() => {
    setCursor(0)
  }, [screen])

  useEffect(() => {
    if (!operator && screen !== 'boot' && screen !== 'off' && screen !== 'login') setScreen('login')
    if (operator && screen === 'login') setScreen('home')
  }, [operator, screen])

  const originList = useMemo(
    () =>
      [...stops].sort((a, b) => {
        const ac = `${a.city} ${a.nameEn}`
        const bc = `${b.city} ${b.nameEn}`
        return ac.localeCompare(bc)
      }),
    [stops],
  )

  const destinationList = useMemo(
    () => destinationsFrom(routes, stops, draft.fromStopId),
    [routes, stops, draft.fromStopId],
  )

  const availableServices = useMemo(
    () => servicesForPair(routes, stops, draft.fromStopId, draft.toStopId),
    [routes, stops, draft.fromStopId, draft.toStopId],
  )

  const serviceList = useMemo(
    () => tariff.services.filter((s) => s.enabled && availableServices.includes(s.id)),
    [tariff.services, availableServices],
  )

  const concessionRows = useMemo(() => tariff.concessions.filter((c) => c.enabled), [tariff.concessions])

  const passengerRows = useMemo(
    () => [
      { key: 'adults', label: 'ADULTS', short: 'AD', value: draft.adults, kind: 'adult' as const },
      { key: 'children', label: 'CHILDREN', short: 'CH', value: draft.children, kind: 'child' as const },
      ...concessionRows.map((c) => ({
        key: c.id,
        label: c.nameEn.toUpperCase(),
        short: c.short,
        value: draft.concessions[c.id] ?? 0,
        kind: 'concession' as const,
        percent: c.percent,
      })),
    ],
    [draft, concessionRows],
  )

  const homeItems = useMemo(
    () => [
      { id: 'new', label: t(language, 'newTicket'), sub: 'TICKET' },
      { id: 'reprint', label: language === 'mr' ? 'शेवटचे पुन्हा छापा' : 'Reprint last', sub: lastTicket?.serial ?? '—' },
      { id: 'history', label: t(language, 'history'), sub: `${tickets.length}` },
      { id: 'settings', label: t(language, 'settings'), sub: '' },
      { id: 'logout', label: t(language, 'logout'), sub: operator?.id ?? '' },
    ],
    [language, lastTicket, tickets.length, operator],
  )

  const settingsItems = useMemo(
    () => [
      { id: 'audio', label: language === 'mr' ? 'आवाज' : 'Sound', value: settings.audio ? 'ON' : 'OFF' },
      { id: 'language', label: language === 'mr' ? 'भाषा' : 'Language', value: settings.language === 'en' ? 'ENGLISH' : 'मराठी' },
      { id: 'paper', label: 'Paper width', value: `${settings.paperWidth} mm` },
      { id: 'marathi', label: 'Marathi stop names', value: settings.showMarathiStops ? 'ON' : 'OFF' },
      { id: 'skipboot', label: 'Skip boot animation', value: settings.skipBoot ? 'ON' : 'OFF' },
      { id: 'operator', label: language === 'mr' ? 'संचालक मोड' : 'Operator mode', value: 'OPEN' },
      { id: 'close', label: t(language, 'back'), value: '' },
    ],
    [language, settings],
  )

  const windowSlice = <T,>(items: T[], size = 5): { items: T[]; start: number } => {
    const start = Math.max(0, Math.min(cursor - Math.floor(size / 2), Math.max(0, items.length - size)))
    return { items: items.slice(start, start + size), start }
  }

  const press = useCallback(
    (action: KeyAction) => {
      if (screen === 'off' && action !== 'power') return
      if (printSession) return
      setFlashKey(action)
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashKey(null), 140)
      machineAudio.click()
      actionHandlerRef.current(action)
    },
    [screen, printSession],
  )

  // Keyboard input mirrors the hardware keys.
  const pressRef = useRef(press)
  pressRef.current = press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && el.closest('input, textarea, select, [contenteditable="true"]')) return
      // Let focused buttons handle their own activation so Enter/Space does not
      // run twice (once here and once through the native button click).
      if (el && el.closest('button, a, [role="button"]') && (e.key === 'Enter' || e.key === ' ')) return
      const map: Record<string, KeyAction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        Enter: 'enter', Escape: 'esc', Backspace: 'clear', Delete: 'clear', ' ': 'enter',
      }
      let action: KeyAction | undefined
      if (/^[0-9]$/.test(e.key)) action = e.key as KeyAction
      else if (map[e.key]) action = map[e.key]
      else if (e.key.toLowerCase() === 'p') action = 'print'
      else if (e.key.toLowerCase() === 't') action = 'ticket'
      else if (e.key.toLowerCase() === 'm') action = 'menu'
      if (!action) return
      e.preventDefault()
      pressRef.current(action)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const skipBoot = () => {
    setScreen(operator ? 'home' : 'login')
  }

  const startNew = () => {
    resetDraft()
    setCursor(0)
    setScreen('origin')
  }

  const startReprint = (ticket: Ticket) => {
    if (printSession) {
      notify('error', 'The printer is already running. Wait for the current ticket.')
      return
    }
    setPrintSession({ ticket, isReprint: true, nonce: Date.now() })
  }

  const completePrint = (session: PrintSession) => {
    markPrinted(session.ticket.id, session.isReprint)
    const updated = {
      ...session.ticket,
      printStatus: 'printed' as const,
      printedAt: session.ticket.printedAt ?? new Date().toISOString(),
      reprints: session.isReprint ? session.ticket.reprints + 1 : session.ticket.reprints,
    }
    setLastTicket((prev) => (prev?.id === updated.id ? updated : prev))
    setHistoryTicket((prev) => (prev?.id === updated.id ? updated : prev))
  }

  const setPassengerValue = (rowKey: string, value: number) => {
    if (rowKey === 'adults') {
      const adults = Math.max(0, Math.min(9, value))
      const concessions = Object.fromEntries(
        Object.entries(draft.concessions).map(([id, count]) => [id, Math.min(count, adults)]),
      )
      updateDraft({ adults, concessions })
    } else if (rowKey === 'children') {
      updateDraft({ children: Math.max(0, Math.min(9, value)) })
    } else {
      setConcession(rowKey, value)
    }
  }

  const backFrom = (current: DeviceScreen): DeviceScreen => {
    switch (current) {
      case 'origin': return 'home'
      case 'destination': return 'origin'
      case 'service': return 'destination'
      case 'passengers': return 'service'
      case 'confirm': return 'passengers'
      case 'history': return 'home'
      case 'historyDetail': return 'history'
      case 'settings': return 'home'
      case 'issued': return 'home'
      default: return current
    }
  }

  function handleAction(action: KeyAction) {
    if (action === 'power') {
      if (screen === 'off') {
        setPrintSession(null)
        setBootStep(0)
        setScreen(settings.skipBoot ? (operator ? 'home' : 'login') : 'boot')
      } else {
        setPrintSession(null)
        setScreen('off')
      }
      return
    }

    if (screen === 'off' || screen === 'boot') {
      if (screen === 'boot' && action === 'esc') skipBoot()
      return
    }

    if (action === 'menu') {
      setScreen(operator ? 'home' : 'login')
      return
    }
    if (action === 'ticket') {
      if (!operator) {
        setScreen('login')
        notify('error', 'Start a demo shift first.')
        return
      }
      startNew()
      return
    }
    if (action === 'print') {
      if (screen === 'historyDetail' && historyTicket) startReprint(historyTicket)
      else if (screen === 'issued' && lastTicket) startReprint(lastTicket)
      else if (screen === 'history' && tickets[cursor]) startReprint(tickets[cursor])
      else if (lastTicket) startReprint(lastTicket)
      else notify('error', 'No ticket is available to print yet.')
      return
    }
    if (action === 'esc' || action === 'back' || action === 'left') {
      const next = backFrom(screen)
      if (next === screen) {
        if (screen === 'home') notify('info', 'Use MENU to return home, or TICKET for a new ticket.')
        return
      }
      setScreen(next)
      return
    }

    switch (screen) {
      case 'login': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => (c + (action === 'up' ? -1 : 1) + DEMO_OPERATORS.length) % DEMO_OPERATORS.length)
          return
        }
        if (action === 'enter' || action === 'right') {
          const chosen = DEMO_OPERATORS[cursor] ?? DEMO_OPERATORS[0]
          app.login({ ...chosen, startedAt: new Date().toISOString() })
          setScreen('home')
        }
        return
      }
      case 'home': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => (c + (action === 'up' ? -1 : 1) + homeItems.length) % homeItems.length)
          return
        }
        if (action === 'enter' || action === 'right') {
          const item = homeItems[cursor]
          if (!item) return
          if (item.id === 'new') startNew()
          else if (item.id === 'reprint') {
            if (lastTicket) startReprint(lastTicket)
            else notify('error', 'No ticket has been issued on this device yet.')
          } else if (item.id === 'history') {
            setCursor(0)
            setScreen('history')
          } else if (item.id === 'settings') setScreen('settings')
          else if (item.id === 'logout') {
            app.logout()
            setScreen('login')
          }
        }
        return
      }
      case 'origin': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => Math.max(0, Math.min(originList.length - 1, c + (action === 'up' ? -1 : 1))))
          return
        }
        if (action === 'enter' || action === 'right') {
          const stop = originList[cursor]
          if (!stop) return
          chooseFrom(stop.id)
          setScreen('destination')
        }
        return
      }
      case 'destination': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => Math.max(0, Math.min(destinationList.length - 1, c + (action === 'up' ? -1 : 1))))
          return
        }
        if (action === 'enter' || action === 'right') {
          const dest = destinationList[cursor]
          if (!dest) {
            notify('error', 'No destination is reachable on the current demo route data.')
            return
          }
          chooseTo(dest.stop.id)
          const services = servicesForPair(routes, stops, draft.fromStopId, dest.stop.id).filter((id) =>
            tariff.services.some((s) => s.id === id && s.enabled),
          )
          if (!services.length) {
            notify('error', 'No configured service category runs on this demo pair.')
            return
          }
          if (services.length === 1) {
            updateDraft({ serviceId: services[0] })
            setScreen('passengers')
          } else {
            setScreen('service')
          }
        }
        return
      }
      case 'service': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => Math.max(0, Math.min(serviceList.length - 1, c + (action === 'up' ? -1 : 1))))
          return
        }
        if (action === 'enter' || action === 'right') {
          const service = serviceList[cursor]
          if (!service) {
            notify('error', 'No service category is available for this pair.')
            return
          }
          updateDraft({ serviceId: service.id })
          setScreen('passengers')
        }
        return
      }
      case 'passengers': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => Math.max(0, Math.min(passengerRows.length - 1, c + (action === 'up' ? -1 : 1))))
          return
        }
        if (action === 'clear') {
          const row = passengerRows[cursor]
          if (row) setPassengerValue(row.key, 0)
          return
        }
        if (/^[0-9]$/.test(action)) {
          const row = passengerRows[cursor]
          if (!row) return
          setPassengerValue(row.key, Number(action))
          return
        }
        if (action === 'enter' || action === 'right') {
          if (!quote.ok) {
            machineAudio.error()
            notify('error', quote.errors[0] ?? 'Complete the fare details first.')
            return
          }
          setScreen('confirm')
        }
        return
      }
      case 'confirm': {
        if (action === 'enter') {
          const ticket = issueTicket()
          if (!ticket) {
            machineAudio.error()
            return
          }
          setLastTicket(ticket)
          setScreen('issued')
          setPrintSession({ ticket, isReprint: false, nonce: Date.now() })
          return
        }
        if (action === 'down' || action === 'up') {
          setCursor((c) => (c === 0 ? 1 : 0))
          return
        }
        return
      }
      case 'issued': {
        if (action === 'enter' || action === 'right') {
          startNew()
          return
        }
        if (action === 'down') {
          if (lastTicket) startReprint(lastTicket)
        }
        return
      }
      case 'history': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => Math.max(0, Math.min(tickets.length - 1, c + (action === 'up' ? -1 : 1))))
          return
        }
        if ((action === 'enter' || action === 'right') && tickets[cursor]) {
          setHistoryTicket(tickets[cursor])
          setScreen('historyDetail')
        }
        return
      }
      case 'historyDetail': {
        if (action === 'enter' || action === 'right') {
          if (historyTicket) startReprint(historyTicket)
        }
        return
      }
      case 'settings': {
        if (action === 'up' || action === 'down') {
          setCursor((c) => (c + (action === 'up' ? -1 : 1) + settingsItems.length) % settingsItems.length)
          return
        }
        if (action === 'enter' || action === 'right') {
          const item = settingsItems[cursor]
          if (!item) return
          if (item.id === 'audio') updateSettings({ audio: !settings.audio })
          else if (item.id === 'language') updateSettings({ language: settings.language === 'en' ? 'mr' : 'en' })
          else if (item.id === 'paper') updateSettings({ paperWidth: settings.paperWidth === 58 ? 80 : 58 })
          else if (item.id === 'marathi') updateSettings({ showMarathiStops: !settings.showMarathiStops })
          else if (item.id === 'skipboot') updateSettings({ skipBoot: !settings.skipBoot })
          else if (item.id === 'operator') onSwitchMode('operator')
          else if (item.id === 'close') setScreen('home')
        }
        return
      }
      default:
        return
    }
  }

  // Always dispatch to the latest render's handler (cursor and draft are
  // updated between hardware key presses).
  actionHandlerRef.current = (action: KeyAction) => handleAction(action)

  const originWindow = windowSlice(originList)
  const destinationWindow = windowSlice(destinationList)
  const serviceWindow = windowSlice(serviceList)
  const passengerWindow = windowSlice(passengerRows, 4)
  const historyWindow = windowSlice(tickets, 4)
  const settingsWindow = windowSlice(settingsItems, 5)
  const homeWindow = windowSlice(homeItems, 5)

  const listRow = (active: boolean, primary: string, secondary: string | undefined, key: string) => (
    <div key={key} className={`lcd-row ${active ? 'lcd-row--active' : ''}`}>
      <span className="lcd-row__marker">{active ? '▶' : ' '}</span>
      <span className="lcd-row__primary">{primary}</span>
      {secondary ? <span className="lcd-row__secondary">{secondary}</span> : null}
    </div>
  )

  const scrollHint = (start: number, count: number, total: number) =>
    total > count ? `${start + 1}-${Math.min(start + count, total)}/${total}` : ''

  const screenTitle = () => {
    switch (screen) {
      case 'login': return 'DEMO OPERATOR LOGIN'
      case 'home': return 'MAIN MENU'
      case 'origin': return 'SELECT ORIGIN'
      case 'destination': return 'SELECT DESTINATION'
      case 'service': return 'SELECT SERVICE'
      case 'passengers': return 'PASSENGERS / CONCESSIONS'
      case 'confirm': return 'CONFIRM TICKET'
      case 'issued': return 'TICKET ISSUED'
      case 'history': return 'TICKET HISTORY'
      case 'historyDetail': return 'TICKET DETAIL'
      case 'settings': return 'MACHINE SETTINGS'
      default: return ''
    }
  }

  const summary = `${screenTitle()}. ${screen === 'home' ? `Selected: ${homeItems[cursor]?.label ?? ''}` : ''}`

  let content: ReactNode = null
  if (screen === 'boot') {
    content = (
      <div className="lcd-boot">
        <div className="lcd-boot__logo">{BOOT_LINES[0]}</div>
        <div className="lcd-boot__sub">{BOOT_LINES[1]}</div>
        <div className="lcd-boot__sub lcd-boot__sub--dim">{BOOT_LINES[2]}</div>
        <div className="lcd-boot__init">
          {bootStep >= 2 ? 'INITIALIZING' : ''}
          {bootStep >= 2 ? '.'.repeat((bootStep % 3) + 1) : ''}
        </div>
        <div className="lcd-progress">
          <span style={{ width: `${Math.min(100, (bootStep / 5) * 100)}%` }} />
        </div>
        <div className="lcd-boot__ready">{bootStep >= 5 ? 'READY' : 'PLEASE WAIT'}</div>
      </div>
    )
  } else if (screen === 'login') {
    content = (
      <>
        <div className="lcd-label">LOCAL DEMO · NO AUTH</div>
        {DEMO_OPERATORS.map((op, i) => (
          <div key={op.id} className={`lcd-row ${cursor === i ? 'lcd-row--active' : ''}`}>
            <span className="lcd-row__marker">{cursor === i ? '▶' : ' '}</span>
            <span className="lcd-row__primary">{op.id} {op.depot.toUpperCase()}</span>
          </div>
        ))}
        <div className="lcd-note">ENTER to start shift</div>
      </>
    )
  } else if (screen === 'home') {
    content = (
      <>
        <div className="lcd-label">
          {operator?.id} · {operator?.depot.toUpperCase()} · {operator?.busNo}
        </div>
        {homeWindow.items.map((item, i) => listRow(homeWindow.start + i === cursor, item.label, item.sub, item.id))}
      </>
    )
  } else if (screen === 'origin') {
    content = (
      <>
        <div className="lcd-label">{originList.length} STOPS {scrollHint(originWindow.start, 5, originList.length)}</div>
        {originWindow.items.map((stop, i) =>
          listRow(
            originWindow.start + i === cursor,
            settings.showMarathiStops && language === 'en' ? stop.nameEn : stopPrimaryLabel(stop, language),
            stop.city.toUpperCase(),
            stop.id,
          ),
        )}
      </>
    )
  } else if (screen === 'destination') {
    content = (
      <>
        <div className="lcd-label">FROM {stopPrimaryLabel(stopById(stops, draft.fromStopId), language).toUpperCase()}</div>
        {destinationWindow.items.length ? (
          destinationWindow.items.map((d, i) =>
            listRow(
              destinationWindow.start + i === cursor,
              stopPrimaryLabel(d.stop, language),
              `${d.minKm.toFixed(1)}km`,
              d.stop.id,
            ),
          )
        ) : (
          <div className="lcd-empty">NO CONFIGURED DESTINATION</div>
        )}
      </>
    )
  } else if (screen === 'service') {
    content = (
      <>
        <div className="lcd-label">
          {stopPrimaryLabel(stopById(stops, draft.fromStopId), language)} → {stopPrimaryLabel(stopById(stops, draft.toStopId), language)}
        </div>
        {serviceWindow.items.map((s, i) =>
          listRow(serviceWindow.start + i === cursor, s.nameEn.toUpperCase(), s.short, s.id),
        )}
        <div className="lcd-note">Demo categories · {quote.distanceKm || '—'} km if supported</div>
      </>
    )
  } else if (screen === 'passengers') {
    content = (
      <>
        <div className="lcd-label">DIGITS SET COUNT · ▲▼ FIELD</div>
        {passengerWindow.items.map((row, i) => (
          <div key={row.key} className={`lcd-row lcd-row--value ${passengerWindow.start + i === cursor ? 'lcd-row--active' : ''}`}>
            <span className="lcd-row__marker">{passengerWindow.start + i === cursor ? '▶' : ' '}</span>
            <span className="lcd-row__primary">{row.label}</span>
            <span className="lcd-row__value">{row.value}</span>
          </div>
        ))}
        <div className={`lcd-total ${quote.ok ? '' : 'lcd-total--warn'}`}>
          <span>{quote.ok ? 'ESTIMATE' : 'CHECK'}</span>
          <strong>{quote.ok ? formatMoney(quote.totalPaise) : quote.errors[0]?.slice(0, 22)}</strong>
        </div>
      </>
    )
  } else if (screen === 'confirm') {
    const from = stopPrimaryLabel(stopById(stops, draft.fromStopId), language)
    const to = stopPrimaryLabel(stopById(stops, draft.toStopId), language)
    content = (
      <>
        <div className="lcd-route">
          {from} <span>→</span> {to}
        </div>
        <div className="lcd-kv"><span>DIST</span><b>{quote.distanceKm.toFixed(1)} km</b></div>
        <div className="lcd-kv"><span>SERVICE</span><b>{quote.serviceName?.replace('Semi-Luxury (Asiad)', 'ASIAD') ?? '—'}</b></div>
        <div className="lcd-kv"><span>PAX</span><b>A{draft.adults} C{draft.children} · {quote.concessions.reduce((n, c) => n + c.count, 0)} CONC</b></div>
        <div className="lcd-kv"><span>BASE</span><b>{formatMoney(quote.basePaise)}</b></div>
        <div className="lcd-kv"><span>CONCESSION</span><b>-{formatMoney(quote.concessionPaise)}</b></div>
        <div className="lcd-total"><span>TOTAL</span><strong>{formatMoney(quote.totalPaise)}</strong></div>
        <div className="lcd-note">ENTER = ISSUE · demo simulation</div>
      </>
    )
  } else if (screen === 'issued' && lastTicket) {
    content = (
      <>
        <div className="lcd-success">✓ ISSUED · PRINTING SIMULATION</div>
        <div className="lcd-kv"><span>TICKET</span><b>{lastTicket.serial}</b></div>
        <div className="lcd-kv"><span>FROM</span><b>{lastTicket.fromName.toUpperCase()}</b></div>
        <div className="lcd-kv"><span>TO</span><b>{lastTicket.toName.toUpperCase()}</b></div>
        <div className="lcd-kv"><span>TOTAL</span><b>{formatMoney(lastTicket.totalPaise)}</b></div>
        <div className="lcd-kv"><span>STATUS</span><b>{lastTicket.printStatus.toUpperCase()}</b></div>
        <div className="lcd-note">ENTER = new · PRINT = reprint</div>
      </>
    )
  } else if (screen === 'history') {
    content = tickets.length ? (
      <>
        <div className="lcd-label">{tickets.length} DEMO TICKET(S) {scrollHint(historyWindow.start, 4, tickets.length)}</div>
        {historyWindow.items.map((tk, i) => (
          <div key={tk.id} className={`lcd-row lcd-row--hist ${historyWindow.start + i === cursor ? 'lcd-row--active' : ''}`}>
            <span className="lcd-row__marker">{historyWindow.start + i === cursor ? '▶' : ' '}</span>
            <span className="lcd-row__primary">{tk.serial}</span>
            <span className="lcd-row__secondary">{formatMoney(tk.totalPaise)}</span>
          </div>
        ))}
        <div className="lcd-note">ENTER = view/reprint</div>
      </>
    ) : (
      <div className="lcd-empty">NO TICKETS YET<br />Press TICKET to issue one.</div>
    )
  } else if (screen === 'historyDetail' && historyTicket) {
    content = (
      <>
        <div className="lcd-label">{historyTicket.serial} · {formatHistoryDate(historyTicket.issuedAt)}</div>
        <div className="lcd-kv"><span>FROM</span><b>{historyTicket.fromName.toUpperCase()}</b></div>
        <div className="lcd-kv"><span>TO</span><b>{historyTicket.toName.toUpperCase()}</b></div>
        <div className="lcd-kv"><span>PAX</span><b>A{historyTicket.adults} C{historyTicket.children}</b></div>
        <div className="lcd-kv"><span>TOTAL</span><b>{formatMoney(historyTicket.totalPaise)}</b></div>
        <div className="lcd-kv"><span>PRINTS</span><b>{historyTicket.reprints + 1}</b></div>
        <div className="lcd-note">ENTER/PRINT = reprint same ticket</div>
      </>
    )
  } else if (screen === 'settings') {
    content = (
      <>
        {settingsWindow.items.map((item, i) =>
          listRow(settingsWindow.start + i === cursor, item.label, item.value || '›', item.id),
        )}
      </>
    )
  }

  // Keep footer hint in sync for a few screens (purely presentational).
  useEffect(() => {
    const hints: Partial<Record<DeviceScreen, string>> = {
      login: 'ENTER = START DEMO SHIFT',
      home: '▲▼ SELECT · ENTER OK',
      origin: 'ESC = BACK',
      destination: 'ESC = ORIGIN',
      service: 'FILTERED BY DEMO DATA',
      passengers: 'DIGITS = COUNT · ENTER = OK',
      confirm: 'ENTER = ISSUE · ESC = EDIT',
      issued: 'ENTER = NEW · PRINT = REPRINT',
      history: 'ENTER = OPEN',
      historyDetail: 'PRINT = REPRINT',
      settings: 'ENTER = CHANGE',
    }
    setFooterHint(hints[screen] ?? '')
  }, [screen])

  const printerState = printSession ? 'busy' : 'ready'
  const powered = screen !== 'off'

  return (
    <div className={`machine machine--${settings.paperWidth}`}>
      <div className="machine__grip machine__grip--left" aria-hidden="true" />
      <div className="machine__grip machine__grip--right" aria-hidden="true" />

      <div className="machine__printer-deck">
        <div className="printer-deck__brand">
          <span className="brand-mark">BALAJI</span>
          <span className="brand-sub">ELECTRONIC TICKET MACHINE</span>
          <span className="brand-model">ETM-2000 · MSRTC DEMO</span>
        </div>
        <div className="printer-deck__leds" aria-hidden="true">
          <span className={`led ${printSession ? 'led--amber' : 'led--green'}`} />
          <span className="led led--dim" />
          <span className="led led--blue" />
        </div>
        <div className="printer-deck__slot" aria-label="Thermal paper slot">
          <span className="printer-deck__bar" />
          <span className="printer-deck__mouth" />
          <span className="printer-deck__lip" />
        </div>
        <span className="printer-deck__screw printer-deck__screw--left" aria-hidden="true" />
        <span className="printer-deck__screw printer-deck__screw--right" aria-hidden="true" />
      </div>

      <div className="machine__shoulder">
        <span className="machine__shoulder-line" />
        <span className="machine__label">HANDHELD · 58mm</span>
      </div>

      <div className="machine__console">
        <div className="display-bezel">
          <div className="display-bezel__inner">
            <LCDDisplay
              powered={powered}
              booting={screen === 'boot'}
              summary={summary}
              printerState={printerState}
              footer={

                powered ? (
                  <div className="lcd__footer-row">
                    <span>{screen === 'boot' ? 'BALAJI BIOS 1.0' : footerHint}</span>
                    <button
                      type="button"
                      className="lcd__skip"
                      onClick={() => (screen === 'boot' ? skipBoot() : setScreen(operator ? 'home' : 'login'))}
                    >
                      {screen === 'boot' ? 'SKIP' : 'MENU'}
                    </button>
                  </div>
                ) : (
                  <span>PRESS POWER</span>
                )
              }
            >{content}</LCDDisplay>
          </div>
          <div className="display-bezel__badge">
            <span>LCD · 128×64</span>
            <span className={`display-bezel__power ${powered ? 'is-on' : ''}`} />
          </div>
        </div>

        <div className="machine__keyplate">
          <PhysicalKeypad onAction={press} flashKey={flashKey} disabled={screen === 'off' || !!printSession} />
        </div>
      </div>

      <div className="machine__foot">
        <div className="machine__speaker" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => <span key={i} />)}
        </div>
        <span className="machine__foot-label">BALAJI · DIGITAL TICKETING · DEMO</span>
        <span className="machine__foot-icons" aria-hidden="true">
          <Wifi size={12} />
          <Speaker size={12} />
          <Power size={11} />
        </span>
      </div>

      <div className="machine__screws" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      {printSession ? (
        <ThermalPrinter
          key={printSession.nonce}
          ticket={printSession.ticket}
          variant="machine"
          paperWidth={settings.paperWidth}
          isReprint={printSession.isReprint}
          onComplete={() => completePrint(printSession)}
          onTearOff={() => setPrintSession(null)}
          onBrowserPrint={onBrowserPrint}
        />
      ) : null}
    </div>
  )
}
