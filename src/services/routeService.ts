import type { BusRoute, Stop } from '../types'

export interface Journey {
  route: BusRoute
  from: Stop
  to: Stop
  distanceKm: number
  reversed: boolean
  services: string[]
  intermediate: { stop: Stop; km: number }[]
}

export function allStops(demo: Stop[], imported: Stop[]): Stop[] {
  const seen = new Set<string>()
  return [...demo, ...imported].filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

export function allRoutes(demo: BusRoute[], imported: BusRoute[]): BusRoute[] {
  return [...demo, ...imported]
}

export function stopById(stops: Stop[], id: string | null | undefined): Stop | undefined {
  if (!id) return undefined
  return stops.find((s) => s.id === id)
}

export function stopLabel(stop: Stop | undefined, lang: 'en' | 'mr', showMarathi = true): string {
  if (!stop) return '—'
  if (lang === 'mr' || showMarathi) return `${stop.nameEn} / ${stop.nameMr}`
  return stop.nameEn
}

export function stopPrimaryLabel(stop: Stop | undefined, lang: 'en' | 'mr'): string {
  if (!stop) return '—'
  return lang === 'mr' ? stop.nameMr : stop.nameEn
}

/** Every direct route that contains both stops, ordered by distance. */
export function findJourneys(routes: BusRoute[], stops: Stop[], fromId: string, toId: string): Journey[] {
  if (!fromId || !toId || fromId === toId) return []
  const from = stopById(stops, fromId)
  const to = stopById(stops, toId)
  if (!from || !to) return []

  const out: Journey[] = []
  for (const route of routes) {
    const fi = route.stops.findIndex((s) => s.stopId === fromId)
    const ti = route.stops.findIndex((s) => s.stopId === toId)
    if (fi === -1 || ti === -1 || fi === ti) continue
    const start = Math.min(fi, ti)
    const end = Math.max(fi, ti)
    const distanceKm = Math.abs(route.stops[ti].km - route.stops[fi].km)
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) continue
    const intermediate = route.stops
      .slice(start + 1, end)
      .map((rs) => ({ stop: stopById(stops, rs.stopId)!, km: Math.abs(rs.km - route.stops[fi].km) }))
      .filter((x) => x.stop)
    out.push({
      route,
      from,
      to,
      distanceKm,
      reversed: fi > ti,
      services: route.services,
      intermediate,
    })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm)
}

export interface DestinationOption {
  stop: Stop
  minKm: number
  routeIds: string[]
  serviceIds: string[]
}

export function destinationsFrom(routes: BusRoute[], stops: Stop[], fromId: string | null): DestinationOption[] {
  if (!fromId) return []
  const map = new Map<string, DestinationOption>()
  for (const route of routes) {
    const fi = route.stops.findIndex((s) => s.stopId === fromId)
    if (fi === -1) continue
    for (const rs of route.stops) {
      if (rs.stopId === fromId) continue
      const stop = stopById(stops, rs.stopId)
      if (!stop) continue
      const km = Math.abs(rs.km - route.stops[fi].km)
      if (!Number.isFinite(km) || km <= 0) continue
      const existing = map.get(stop.id)
      if (existing) {
        existing.minKm = Math.min(existing.minKm, km)
        if (!existing.routeIds.includes(route.id)) existing.routeIds.push(route.id)
        route.services.forEach((s) => !existing.serviceIds.includes(s) && existing.serviceIds.push(s))
      } else {
        map.set(stop.id, { stop, minKm: km, routeIds: [route.id], serviceIds: [...route.services] })
      }
    }
  }
  return [...map.values()].sort((a, b) => a.stop.nameEn.localeCompare(b.stop.nameEn))
}

/** Service ids available for a stop pair. Empty when no direct configured route exists. */
export function servicesForPair(routes: BusRoute[], stops: Stop[], fromId: string | null, toId: string | null): string[] {
  if (!fromId || !toId) return []
  const ids = new Set<string>()
  findJourneys(routes, stops, fromId, toId).forEach((j) => j.services.forEach((s) => ids.add(s)))
  return [...ids]
}

/** Routes touching a stop, for the route-data coverage panel. */
export function routesForStop(routes: BusRoute[], stopId: string): BusRoute[] {
  return routes.filter((r) => r.stops.some((s) => s.stopId === stopId))
}
