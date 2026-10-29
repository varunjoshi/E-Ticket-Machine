import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, BusRoute, Draft, FareQuote, Operator, PersistedData, Stop, TariffConfig, Ticket } from '../types'
import { DEMO_STOPS } from '../data/demoStops'
import { DEMO_ROUTES } from '../data/demoRoutes'
import { DEMO_TARIFF } from '../data/demoTariffs'
import { calculateFare } from '../services/fareCalculator'
import { allRoutes, allStops, findJourneys, stopById } from '../services/routeService'
import { createTicket } from '../services/ticketService'
import { loadPersisted, resetPersisted, savePersisted } from '../services/storageService'
import { machineAudio } from '../services/audioService'
import { importRouteData, SAMPLE_IMPORT } from '../services/storageService'

const EMPTY_DRAFT: Draft = {
  fromStopId: null,
  toStopId: null,
  serviceId: null,
  adults: 1,
  children: 0,
  concessions: {},
  payment: 'CASH',
  cashReceivedPaise: null,
}

/**
 * A passenger can claim at most one concession. Cap the total concession count
 * at the adult count, reducing the newest entries first.
 */
function normalizeConcessions(concessions: Draft['concessions'], adults: number): Draft['concessions'] {
  let remaining = Math.max(0, adults)
  const next: Draft['concessions'] = {}
  for (const [id, raw] of Object.entries(concessions)) {
    const count = Math.min(Math.max(0, Math.floor(raw) || 0), remaining)
    if (count > 0) next[id] = count
    remaining -= count
  }
  return next
}

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
}

interface AppContextValue {
  ready: boolean
  data: PersistedData
  operator: Operator | null
  tickets: Ticket[]
  settings: AppSettings
  tariff: TariffConfig
  stops: Stop[]
  routes: BusRoute[]
  draft: Draft
  quote: FareQuote
  toast: Toast | null
  storageWarning: string | null
  todayTickets: Ticket[]
  todayTotalPaise: number
  login: (operator: Operator) => void
  logout: () => void
  updateDraft: (patch: Partial<Draft>) => void
  resetDraft: () => void
  setConcession: (ruleId: string, count: number) => void
  chooseFrom: (stopId: string) => void
  chooseTo: (stopId: string) => void
  issueTicket: (overrides?: { cashReceivedPaise?: number }) => Ticket | null
  markPrinted: (ticketId: string, reprint?: boolean) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  updateTariff: (tariff: TariffConfig) => void
  importData: (json: string) => { ok: boolean; message: string; warnings: string[] }
  loadSampleImport: () => void
  resetDemo: () => void
  notify: (kind: Toast['kind'], text: string) => void
  clearToast: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 1

export function AppProvider({ children }: { children: React.ReactNode }) {
  const loadedRef = useRef(loadPersisted())
  const [data, setData] = useState<PersistedData>(loadedRef.current.data)
  const dataRef = useRef(data)
  const issuingRef = useRef(false)
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT })
  const [toast, setToast] = useState<Toast | null>(
    loadedRef.current.message
      ? { id: toastSeq++, kind: 'error', text: loadedRef.current.message }
      : null,
  )
  const [storageWarning, setStorageWarning] = useState<string | null>(loadedRef.current.message ?? null)
  const [ready, setReady] = useState(false)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    setReady(true)
    machineAudio.setEnabled(loadedRef.current.data.settings.audio)
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const commit = useCallback((next: PersistedData) => {
    dataRef.current = next
    setData(next)
    const result = savePersisted(next)
    if (!result.ok) setStorageWarning(result.message ?? 'Local storage write failed.')
  }, [])

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    const item = { id: toastSeq++, kind, text }
    setToast(item)
    toastTimer.current = window.setTimeout(() => setToast(null), 5500)
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  const stops = useMemo(() => allStops(DEMO_STOPS, data.importedStops), [data.importedStops])
  const routes = useMemo(() => allRoutes(DEMO_ROUTES, data.importedRoutes), [data.importedRoutes])

  const quote = useMemo(
    () =>
      calculateFare({
        routes,
        stops,
        fromStopId: draft.fromStopId,
        toStopId: draft.toStopId,
        serviceId: draft.serviceId,
        adults: draft.adults,
        children: draft.children,
        concessions: draft.concessions,
        services: data.tariff.services,
        concessionRules: data.tariff.concessions,
        childFactor: data.tariff.childFactor,
        tariffEffectiveFrom: data.tariff.effectiveFrom,
      }),
    [routes, stops, draft, data.tariff],
  )

  const todayTickets = useMemo(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
    return data.tickets.filter((t) => {
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(t.issuedAt))
      return d === today
    })
  }, [data.tickets])

  const todayTotalPaise = useMemo(() => todayTickets.reduce((sum, t) => sum + t.totalPaise, 0), [todayTickets])

  const login = useCallback(
    (operator: Operator) => {
      commit({ ...dataRef.current, operator: { ...operator, startedAt: new Date().toISOString() } })
      setDraft({ ...EMPTY_DRAFT })
      notify('success', `Demo shift started for ${operator.id}. No MSRTC authentication was performed.`)
    },
    [commit, notify],
  )

  const logout = useCallback(() => {
    commit({ ...dataRef.current, operator: null })
    setDraft({ ...EMPTY_DRAFT })
    notify('info', 'Demo shift ended. Tickets remain saved on this device.')
  }, [commit, notify])

  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      return {
        ...next,
        adults: Math.max(0, Math.min(20, Math.floor(next.adults) || 0)),
        children: Math.max(0, Math.min(20, Math.floor(next.children) || 0)),
        concessions: normalizeConcessions(next.concessions, next.adults),
      }
    })
  }, [])

  const setConcession = useCallback((ruleId: string, count: number) => {
    setDraft((prev) => ({
      ...prev,
      concessions: normalizeConcessions(
        { ...prev.concessions, [ruleId]: Math.max(0, Math.floor(count) || 0) },
        prev.adults,
      ),
    }))
  }, [])

  const resetDraft = useCallback(() => {
    setDraft({ ...EMPTY_DRAFT })
  }, [])

  const chooseFrom = useCallback((stopId: string) => {
    setDraft((prev) => {
      if (prev.fromStopId === stopId) return prev
      const services = new Set<string>()
      findJourneys(allRoutes(DEMO_ROUTES, dataRef.current.importedRoutes), allStops(DEMO_STOPS, dataRef.current.importedStops), stopId, prev.toStopId ?? '')
        .forEach((j) => j.services.forEach((s) => services.add(s)))
      return {
        ...prev,
        fromStopId: stopId,
        toStopId: prev.toStopId === stopId ? null : prev.toStopId,
        serviceId: prev.serviceId && services.has(prev.serviceId) ? prev.serviceId : null,
        cashReceivedPaise: null,
      }
    })
  }, [])

  const chooseTo = useCallback((stopId: string) => {
    setDraft((prev) => ({ ...prev, toStopId: stopId, cashReceivedPaise: null }))
  }, [])

  const issueTicket = useCallback(
    (overrides?: { cashReceivedPaise?: number }): Ticket | null => {
      if (issuingRef.current) {
        notify('error', 'A ticket is already being issued. Duplicate submission blocked.')
        return null
      }
      const current = dataRef.current
      if (!current.operator) {
        notify('error', 'Start a demo shift before issuing tickets.')
        return null
      }
      if (!quote.ok) {
        notify('error', quote.errors[0] ?? 'Fare calculation is incomplete.')
        return null
      }
      const from = stopById(stops, draft.fromStopId)
      const to = stopById(stops, draft.toStopId)
      if (!from || !to) {
        notify('error', 'Origin or destination is missing from the dataset.')
        return null
      }
      const received = overrides?.cashReceivedPaise ?? draft.cashReceivedPaise ?? quote.totalPaise
      if (received < quote.totalPaise) {
        notify('error', 'Amount received is less than the total fare.')
        return null
      }
      issuingRef.current = true
      try {
        const ticket = createTicket({
          serialNumber: current.nextSerial,
          operator: current.operator,
          quote,
          fromName: from.nameEn,
          toName: to.nameEn,
          serviceId: draft.serviceId!,
          adults: draft.adults,
          children: draft.children,
          cashReceivedPaise: received,
          fromStopId: from.id,
          toStopId: to.id,
          childFactor: current.tariff.childFactor,
        })
        commit({
          ...current,
          tickets: [ticket, ...current.tickets],
          nextSerial: Math.max(current.nextSerial + 1, Number(ticket.serial.replace(/\D/g, '')) + 1),
        })
        return ticket
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Ticket creation failed.')
        return null
      } finally {
        issuingRef.current = false
      }
    },
    [commit, draft, notify, quote, stops],
  )

  const markPrinted = useCallback(
    (ticketId: string, reprint = false) => {
      const current = dataRef.current
      const tickets = current.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              printStatus: 'printed' as const,
              printedAt: t.printedAt ?? new Date().toISOString(),
              reprints: reprint ? t.reprints + 1 : t.reprints,
            }
          : t,
      )
      commit({ ...current, tickets })
    },
    [commit],
  )

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const current = dataRef.current
      const settings = { ...current.settings, ...patch }
      machineAudio.setEnabled(settings.audio)
      commit({ ...current, settings })
    },
    [commit],
  )

  const updateTariff = useCallback(
    (tariff: TariffConfig) => {
      commit({ ...dataRef.current, tariff })
      notify('success', 'Demo tariff updated. Future tickets use the new rates; issued tickets keep their stored fare.')
    },
    [commit, notify],
  )

  const importData = useCallback(
    (json: string) => {
      const current = dataRef.current
      const result = importRouteData(
        json,
        current.importedStops,
        current.importedRoutes,
        new Set(DEMO_STOPS.map((s) => s.id)),
      )
      if (!result.ok) {
        notify('error', result.message)
        return { ok: false, message: result.message, warnings: result.warnings }
      }
      commit({
        ...current,
        importedStops: [...current.importedStops, ...result.stops],
        importedRoutes: [...current.importedRoutes, ...result.routes],
      })
      notify(result.warnings.length ? 'info' : 'success', `${result.message} Marked as imported/unverified.`)
      return { ok: true, message: result.message, warnings: result.warnings }
    },
    [commit, notify],
  )

  const loadSampleImport = useCallback(() => {
    importData(JSON.stringify(SAMPLE_IMPORT))
  }, [importData])

  const resetDemo = useCallback(() => {
    resetPersisted()
    const fresh: PersistedData = {
      version: 1,
      operator: null,
      tickets: [],
      nextSerial: 1,
      settings: { ...dataRef.current.settings, audio: dataRef.current.settings.audio },
      tariff: structuredClone(DEMO_TARIFF),
      importedStops: [],
      importedRoutes: [],
    }
    setDraft({ ...EMPTY_DRAFT })
    commit(fresh)
    notify('info', 'Local demo data cleared and tariff reset.')
  }, [commit, notify])

  // Remove the recovery warning once the user has seen the toast.
  useEffect(() => {
    if (!toast && loadedRef.current.message) loadedRef.current = { ...loadedRef.current, message: undefined }
  }, [toast])

  const value: AppContextValue = {
    ready,
    data,
    operator: data.operator,
    tickets: data.tickets,
    settings: data.settings,
    tariff: data.tariff,
    stops,
    routes,
    draft,
    quote,
    toast,
    storageWarning,
    todayTickets,
    todayTotalPaise,
    login,
    logout,
    updateDraft,
    resetDraft,
    setConcession,
    chooseFrom,
    chooseTo,
    issueTicket,
    markPrinted,
    updateSettings,
    updateTariff,
    importData,
    loadSampleImport,
    resetDemo,
    notify,
    clearToast,
  }

  // Data is persisted on every atomic commit above.

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
