import type { PersistedData, AppSettings, TariffConfig } from '../types'
import { DEMO_TARIFF } from '../data/demoTariffs'

export const STORAGE_KEY = 'balaji-etm-demo-v1'
const CORRUPT_KEY = 'balaji-etm-demo-v1-corrupt'

export const DEFAULT_SETTINGS: AppSettings = {
  audio: true,
  language: 'en',
  paperWidth: 58,
  skipBoot: false,
  showMarathiStops: true,
  clockOverride: null,
}

export function defaultData(): PersistedData {
  return {
    version: 1,
    operator: null,
    tickets: [],
    nextSerial: 1,
    settings: { ...DEFAULT_SETTINGS },
    tariff: structuredClone(DEMO_TARIFF),
    importedStops: [],
    importedRoutes: [],
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** Defensive load: corrupt or foreign local data never crashes the machine. */
export function loadPersisted(): { data: PersistedData; recovered: boolean; message?: string } {
  if (typeof localStorage === 'undefined') return { data: defaultData(), recovered: false }
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: defaultData(), recovered: true, message: 'Browser storage is unavailable. Changes will last for this session only.' }
  }
  if (!raw) return { data: defaultData(), recovered: false }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed)) throw new Error('Root is not an object')
    const base = defaultData()
    const data: PersistedData = {
      version: 1,
      operator: isObject(parsed.operator) ? (parsed.operator as unknown as PersistedData['operator']) : null,
      tickets: Array.isArray(parsed.tickets) ? (parsed.tickets as PersistedData['tickets']).filter((t) => isObject(t) && typeof t.serial === 'string') : [],
      nextSerial: typeof parsed.nextSerial === 'number' && parsed.nextSerial > 0 ? Math.floor(parsed.nextSerial) : 1,
      settings: { ...base.settings, ...(isObject(parsed.settings) ? parsed.settings : {}) },
      tariff: isObject(parsed.tariff) && Array.isArray((parsed.tariff as unknown as TariffConfig).services)
        ? (parsed.tariff as unknown as TariffConfig)
        : base.tariff,
      importedStops: Array.isArray(parsed.importedStops) ? (parsed.importedStops as PersistedData['importedStops']) : [],
      importedRoutes: Array.isArray(parsed.importedRoutes) ? (parsed.importedRoutes as PersistedData['importedRoutes']) : [],
    }
    // Never let a corrupt counter reissue an existing serial.
    const maxSerial = data.tickets.reduce((max, t) => {
      const n = Number(String(t.serial).replace(/\D/g, ''))
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0)
    data.nextSerial = Math.max(data.nextSerial, maxSerial + 1)
    return { data, recovered: false }
  } catch (err) {
    try {
      localStorage.setItem(CORRUPT_KEY, raw)
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return {
      data: defaultData(),
      recovered: true,
      message: `Saved demo data could not be read (${err instanceof Error ? err.message : 'unknown error'}). A fresh local dataset was started; the damaged copy was kept for inspection.`,
    }
  }
}

export function savePersisted(data: PersistedData): { ok: boolean; message?: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not save to LocalStorage (quota or privacy mode). This session is in-memory only.' }
  }
}

export function resetPersisted(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export interface ImportResult {
  ok: boolean
  message: string
  stops: PersistedData['importedStops']
  routes: PersistedData['importedRoutes']
  warnings: string[]
}

/**
 * Imports extra demo route data from JSON. Everything imported stays marked
 * "imported-unverified"; the importer validates structure, stop references
 * and increasing stage distances.
 */
export function importRouteData(json: string, existingStops: PersistedData['importedStops'], existingRoutes: PersistedData['importedRoutes'], demoStopIds: Set<string>): ImportResult {
  const warnings: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    return { ok: false, message: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`, stops: [], routes: [], warnings }
  }
  if (!isObject(parsed) || !Array.isArray(parsed.stops) || !Array.isArray(parsed.routes)) {
    return { ok: false, message: 'Expected an object with "stops" and "routes" arrays.', stops: [], routes: [], warnings }
  }

  const existingStopIds = new Set([...demoStopIds, ...existingStops.map((s) => s.id), ...existingRoutes.flatMap((r) => r.stops.map((x) => x.stopId))])
  const seenStopIds = new Set(existingStops.map((s) => s.id))
  const seenRouteIds = new Set(existingRoutes.map((r) => r.id))
  const stops: PersistedData['importedStops'] = []
  const routes: PersistedData['importedRoutes'] = []

  for (const raw of parsed.stops) {
    if (!isObject(raw) || typeof raw.id !== 'string' || typeof raw.nameEn !== 'string' || typeof raw.city !== 'string') {
      warnings.push('Skipped a malformed stop entry (needs id, nameEn, nameMr, city, depot).')
      continue
    }
    if (seenStopIds.has(raw.id)) {
      warnings.push(`Skipped duplicate stop id ${raw.id}.`)
      continue
    }
    seenStopIds.add(raw.id)
    existingStopIds.add(raw.id)
    stops.push({
      id: raw.id,
      nameEn: String(raw.nameEn),
      nameMr: typeof raw.nameMr === 'string' ? raw.nameMr : String(raw.nameEn),
      city: String(raw.city),
      depot: typeof raw.depot === 'string' ? raw.depot : '',
      routeIds: [],
      source: 'Imported by operator (unverified)',
      verification: 'imported-unverified',
      lat: typeof raw.lat === 'number' ? raw.lat : undefined,
      lng: typeof raw.lng === 'number' ? raw.lng : undefined,
    })
  }

  for (const raw of parsed.routes) {
    if (!isObject(raw) || typeof raw.id !== 'string' || !Array.isArray(raw.stops) || raw.stops.length < 2) {
      warnings.push('Skipped a malformed route (needs id, nameEn, and at least two stops).')
      continue
    }
    if (seenRouteIds.has(raw.id)) {
      warnings.push(`Skipped duplicate route id ${raw.id}.`)
      continue
    }
    const routeStops = raw.stops
      .filter((s): s is { stopId: string; km: number } => isObject(s) && typeof s.stopId === 'string' && typeof s.km === 'number' && s.km >= 0)
      .sort((a, b) => a.km - b.km)
    if (routeStops.length !== raw.stops.length) {
      warnings.push(`Route ${raw.id}: skipped stops with missing/invalid distance.`)
    }
    if (routeStops.length < 2) {
      warnings.push(`Route ${raw.id}: needs at least two valid stops.`)
      continue
    }
    const missingStop = routeStops.find((s) => !existingStopIds.has(s.stopId))
    if (missingStop) {
      warnings.push(`Route ${raw.id}: unknown stop "${missingStop.stopId}" — import the stop too.`)
      continue
    }
    if (new Set(routeStops.map((s) => s.stopId)).size !== routeStops.length) {
      warnings.push(`Route ${raw.id}: duplicate stops rejected.`)
      continue
    }
    seenRouteIds.add(raw.id)
    const services = Array.isArray(raw.services) ? raw.services.filter((x): x is string => typeof x === 'string') : ['ordinary']
    routes.push({
      id: raw.id,
      nameEn: String(raw.nameEn ?? raw.id),
      nameMr: typeof raw.nameMr === 'string' ? raw.nameMr : String(raw.nameEn ?? raw.id),
      stops: routeStops,
      services: services.length ? services : ['ordinary'],
      source: 'Imported by operator (unverified)',
      verification: 'imported-unverified',
      effectiveFrom: typeof raw.effectiveFrom === 'string' ? raw.effectiveFrom : undefined,
    })
  }

  return {
    ok: stops.length > 0 || routes.length > 0,
    message: stops.length || routes.length ? `Imported ${stops.length} stop(s) and ${routes.length} route(s).` : 'Nothing valid to import.',
    stops,
    routes,
    warnings,
  }
}

export const SAMPLE_IMPORT = {
  stops: [
    { id: 'sample-gaothan', nameEn: 'Sample Gaothan', nameMr: 'नमुना गावठाण', city: 'Sample City', depot: 'Sample Depot' },
    { id: 'sample-bus-stand', nameEn: 'Sample Bus Stand', nameMr: 'नमुना बस स्थानक', city: 'Sample City', depot: 'Sample Depot' },
  ],
  routes: [
    {
      id: 'R-SAMPLE-DEMO',
      nameEn: 'Sample – Demo Corridor',
      nameMr: 'नमुना – डेमो मार्ग',
      stops: [{ stopId: 'sample-gaothan', km: 0 }, { stopId: 'sample-bus-stand', km: 12 }],
      services: ['ordinary', 'express'],
      effectiveFrom: '2026-04-01',
    },
    {
      id: 'R-SAMPLE-NASHIK',
      nameEn: 'Sample – Nashik Demo',
      nameMr: 'नमुना – नाशिक डेमो',
      stops: [{ stopId: 'sample-bus-stand', km: 0 }, { stopId: 'nashik-cbs', km: 42 }],
      services: ['ordinary'],
    },
  ],
}

export function downloadSampleImport(): void {
  const blob = new Blob([JSON.stringify(SAMPLE_IMPORT, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'balaji-route-import-sample.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
