export type Lang = 'en' | 'mr'
export type Verification = 'demo-estimate' | 'imported-unverified' | 'verified'

export interface Stop {
  id: string
  nameEn: string
  nameMr: string
  city: string
  depot: string
  lat?: number
  lng?: number
  routeIds: string[]
  source: string
  verification: Verification
}

export interface RouteStop {
  stopId: string
  km: number
}

export interface BusRoute {
  id: string
  nameEn: string
  nameMr: string
  stops: RouteStop[]
  services: string[]
  source: string
  verification: Verification
  effectiveFrom?: string
}

export interface ServiceType {
  id: string
  nameEn: string
  nameMr: string
  short: string
  /** paise per km */
  ratePerKmPaise: number
  basePaise: number
  minPaise: number
  rounding: 'none' | 'rupee' | 'five'
  enabled: boolean
}

export interface ConcessionRule {
  id: string
  nameEn: string
  nameMr: string
  short: string
  /** discount applied to that passenger's fare */
  percent: number
  requiresDoc: boolean
  enabled: boolean
  demo: boolean
}

export interface TariffConfig {
  effectiveFrom: string
  currency: 'INR'
  childFactor: number
  services: ServiceType[]
  concessions: ConcessionRule[]
  note: string
}

export interface Operator {
  id: string
  name: string
  depot: string
  busNo: string
  serviceNo: string
  machineNo: string
  startedAt: string
}

export interface TicketConcession {
  ruleId: string
  count: number
  percent: number
  amountPaise: number
}

export interface Ticket {
  id: string
  serial: string
  issuedAt: string
  operator: Operator
  fromStopId: string
  toStopId: string
  fromName: string
  toName: string
  routeId: string
  routeName: string
  serviceId: string
  serviceName: string
  distanceKm: number
  adults: number
  children: number
  basePaise: number
  adultBasePaise: number
  childBasePaise: number
  childFactor: number
  concessionPaise: number
  roundingPaise: number
  totalPaise: number
  concessions: TicketConcession[]
  payment: 'CASH'
  cashReceivedPaise: number
  changePaise: number
  verification: Verification
  tariffEffectiveFrom: string
  printStatus: 'pending' | 'printed'
  printedAt?: string
  reprints: number
  demo: true
}

export interface FareLine {
  label: string
  amountPaise: number
  kind: 'adult' | 'child' | 'concession'
}

export interface FareQuote {
  ok: boolean
  errors: string[]
  distanceKm: number
  perPassengerPaise: number
  adultBasePaise: number
  childBasePaise: number
  basePaise: number
  concessionPaise: number
  roundingPaise: number
  totalPaise: number
  lines: FareLine[]
  concessions: TicketConcession[]
  routeId?: string
  routeName?: string
  serviceName?: string
  verification?: Verification
  tariffEffectiveFrom?: string
}

export type DeviceScreen =
  | 'off'
  | 'boot'
  | 'login'
  | 'home'
  | 'origin'
  | 'destination'
  | 'service'
  | 'passengers'
  | 'confirm'
  | 'issued'
  | 'history'
  | 'historyDetail'
  | 'settings'

export interface AppSettings {
  audio: boolean
  language: Lang
  paperWidth: 58 | 80
  skipBoot: boolean
  showMarathiStops: boolean
}

export interface PersistedData {
  version: 1
  operator: Operator | null
  tickets: Ticket[]
  nextSerial: number
  settings: AppSettings
  tariff: TariffConfig
  importedStops: Stop[]
  importedRoutes: BusRoute[]
}

export interface Draft {
  fromStopId: string | null
  toStopId: string | null
  serviceId: string | null
  adults: number
  children: number
  concessions: Record<string, number>
  payment: 'CASH'
  cashReceivedPaise: number | null
}
