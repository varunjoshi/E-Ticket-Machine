import type { BusRoute, ConcessionRule, FareLine, FareQuote, ServiceType, Stop, TicketConcession } from '../types'
import { findJourneys, stopById } from './routeService'

export interface FareInput {
  routes: BusRoute[]
  stops: Stop[]
  fromStopId: string | null
  toStopId: string | null
  serviceId: string | null
  adults: number
  children: number
  concessions: Record<string, number>
  services: ServiceType[]
  concessionRules: ConcessionRule[]
  childFactor: number
  tariffEffectiveFrom: string
  routeId?: string | null
}

/** Round integer paise to the configured fare step. */
function applyRounding(paise: number, rounding: ServiceType['rounding']): number {
  if (rounding === 'rupee') return Math.round(paise / 100) * 100
  if (rounding === 'five') return Math.round(paise / 500) * 500
  return Math.round(paise)
}

export function formatMoney(paise: number, withSymbol = true): string {
  const sign = paise < 0 ? '-' : ''
  const v = Math.abs(paise) / 100
  return `${sign}${withSymbol ? '₹' : ''}${v.toFixed(2)}`
}

export function calculateFare(input: FareInput): FareQuote {
  const errors: string[] = []
  const empty: FareQuote = {
    ok: false,
    errors,
    distanceKm: 0,
    perPassengerPaise: 0,
    adultBasePaise: 0,
    childBasePaise: 0,
    basePaise: 0,
    concessionPaise: 0,
    roundingPaise: 0,
    totalPaise: 0,
    lines: [],
    concessions: [],
  }

  if (!input.fromStopId) errors.push('Select an origin stop.')
  if (!input.toStopId) errors.push('Select a destination stop.')
  if (input.fromStopId && input.fromStopId === input.toStopId) errors.push('Origin and destination must be different stops.')
  if (!Number.isInteger(input.adults) || input.adults < 0 || input.adults > 20) errors.push('Adult count must be a whole number between 0 and 20.')
  if (!Number.isInteger(input.children) || input.children < 0 || input.children > 20) errors.push('Child count must be a whole number between 0 and 20.')
  if (input.adults + input.children < 1) errors.push('Add at least one passenger.')
  if (input.adults + input.children > 20) errors.push('This demo ticket supports up to 20 passengers.')

  if (errors.length) return empty

  const from = stopById(input.stops, input.fromStopId)
  const to = stopById(input.stops, input.toStopId)
  if (!from || !to) {
    errors.push('That stop is not in the loaded demo dataset.')
    return empty
  }

  const journeys = findJourneys(input.routes, input.stops, input.fromStopId!, input.toStopId!)
  if (!journeys.length) {
    errors.push('No direct demo route connects these stops. Add/import route data in Operator Mode or choose another pair.')
    return empty
  }
  if (!input.serviceId) {
    errors.push('Select a bus service category.')
    return empty
  }
  const service = input.services.find((s) => s.id === input.serviceId)
  if (!service) {
    errors.push('That service category is not configured.')
    return empty
  }
  if (!service.enabled) {
    errors.push(`${service.nameEn} is disabled in the current tariff configuration.`)
    return empty
  }

  const journey = input.routeId
    ? journeys.find((j) => j.route.id === input.routeId && j.services.includes(service.id))
    : journeys.find((j) => j.services.includes(service.id))
  if (!journey) {
    const anyService = journeys.some((j) => j.services.includes(service.id))
    errors.push(
      anyService
        ? 'The selected route does not offer that service category.'
        : `${service.nameEn} is not configured on the direct route(s) between these stops.`,
    )
    return empty
  }

  const distanceKm = Math.round(journey.distanceKm * 10) / 10
  const perPassengerPaise = Math.max(service.minPaise, service.basePaise + Math.round(distanceKm * service.ratePerKmPaise))
  const adultBasePaise = perPassengerPaise * input.adults
  const childFarePaise = Math.round(perPassengerPaise * input.childFactor)
  const childBasePaise = childFarePaise * input.children
  const basePaise = adultBasePaise + childBasePaise

  const concessions: TicketConcession[] = []
  const lines: FareLine[] = [
    { label: `Adult × ${input.adults}`, amountPaise: adultBasePaise, kind: 'adult' },
    { label: `Child × ${input.children}`, amountPaise: childBasePaise, kind: 'child' },
  ]

  for (const rule of input.concessionRules) {
    const count = Math.max(0, Math.min(input.adults, Math.floor(input.concessions[rule.id] ?? 0)))
    if (!count) continue
    if (!rule.enabled) {
      errors.push(`${rule.nameEn} is disabled in the current concession configuration.`)
      continue
    }
    const amountPaise = Math.round((perPassengerPaise * rule.percent) / 100) * count
    concessions.push({ ruleId: rule.id, count, percent: rule.percent, amountPaise })
    lines.push({ label: `${rule.nameEn} × ${count} @ ${rule.percent}%`, amountPaise: -amountPaise, kind: 'concession' })
  }

  if (errors.length) return { ...empty, errors }

  const unroundedConcession = concessions.reduce((sum, c) => sum + c.amountPaise, 0)
  const unroundedTotal = Math.max(0, basePaise - unroundedConcession)
  const totalPaise = Math.max(0, applyRounding(unroundedTotal, service.rounding))
  // Keep the actual concession and show any final rounding as its own line.
  const concessionPaise = unroundedConcession
  const roundingPaise = totalPaise - unroundedTotal

  return {
    ok: true,
    errors: [],
    distanceKm,
    perPassengerPaise,
    adultBasePaise,
    childBasePaise,
    basePaise,
    concessionPaise,
    roundingPaise,
    totalPaise,
    lines,
    concessions,
    routeId: journey.route.id,
    routeName: journey.route.nameEn,
    serviceName: service.nameEn,
    verification: journey.route.verification,
    tariffEffectiveFrom: input.tariffEffectiveFrom,
  }
}
