import type { FareQuote, Operator, Ticket, Verification } from '../types'

export const TICKET_WIDTH = 32

export const SERIAL_PREFIX = 'DEMO-'

export function padSerial(nextSerial: number): string {
  return `${SERIAL_PREFIX}${String(Math.max(1, Math.floor(nextSerial))).padStart(6, '0')}`
}

export function inr(paise: number): string {
  return `Rs ${(paise / 100).toFixed(2)}`
}

export const center = (s: string, width = TICKET_WIDTH) => {
  if (s.length >= width) return s.slice(0, width)
  const left = Math.floor((width - s.length) / 2)
  return ' '.repeat(left) + s
}

export const twoCol = (left: string, right: string, width = TICKET_WIDTH) => {
  const space = Math.max(1, width - left.length - right.length)
  if (left.length + right.length + 1 > width) {
    return `${left.slice(0, Math.max(1, width - right.length - 1))} ${right}`
  }
  return left + ' '.repeat(space) + right
}

export const rule = (char = '-', width = TICKET_WIDTH) => char.repeat(width)

export function formatTicketDate(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d)
  return { date, time }
}

export interface IssueArgs {
  serialNumber: number
  operator: Operator
  quote: FareQuote
  fromName: string
  toName: string
  serviceId: string
  adults: number
  children: number
  cashReceivedPaise: number
  fromStopId: string
  toStopId: string
  childFactor: number
  issuedAt?: string
}

/**
 * Creates an immutable demo ticket record. Serial allocation is owned by the
 * caller so it can be persisted together with the ticket in one commit.
 */
export function createTicket(args: IssueArgs): Ticket {
  const now = args.issuedAt ?? new Date().toISOString()
  const { quote } = args
  if (!quote.ok || !quote.routeId || !quote.serviceName) {
    throw new Error('Cannot issue a ticket without a valid calculated fare.')
  }
  const total = quote.totalPaise
  const received = Math.max(total, Math.round(args.cashReceivedPaise) || total)
  const verification: Verification = quote.verification ?? 'demo-estimate'

  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    serial: padSerial(args.serialNumber),
    issuedAt: now,
    operator: args.operator,
    fromStopId: args.fromStopId,
    toStopId: args.toStopId,
    fromName: args.fromName,
    toName: args.toName,
    routeId: quote.routeId,
    routeName: quote.routeName ?? '',
    serviceId: args.serviceId,
    serviceName: quote.serviceName,
    distanceKm: quote.distanceKm,
    adults: args.adults,
    children: args.children,
    basePaise: quote.basePaise,
    adultBasePaise: quote.adultBasePaise,
    childBasePaise: quote.childBasePaise,
    childFactor: args.childFactor,
    concessionPaise: quote.concessionPaise,
    roundingPaise: quote.roundingPaise,
    totalPaise: total,
    concessions: quote.concessions,
    payment: 'CASH',
    verification,
    tariffEffectiveFrom: quote.tariffEffectiveFrom ?? '',
    printStatus: 'pending',
    cashReceivedPaise: received,
    changePaise: Math.max(0, received - total),
    reprints: 0,
    demo: true,
  }
}

/** Narrow thermal-receipt rendering, ~32 columns for 58 mm paper. */
export function formatTicketLines(ticket: Ticket): string[] {
  const { date, time } = formatTicketDate(ticket.issuedAt)
  const lines: string[] = [
    center('MSRTC DEMO'),
    center('ELECTRONIC BUS TICKET'),
    rule('='),
    twoCol('TICKET', ticket.serial),
    twoCol('DATE', `${date} ${time}`),
    twoCol('DEPOT', ticket.operator.depot.toUpperCase()),
    twoCol('BUS', ticket.operator.busNo.toUpperCase()),
    twoCol('SERVICE', ticket.serviceName.toUpperCase()),
    twoCol('MACHINE', ticket.operator.machineNo.toUpperCase()),
    rule('-'),
    twoCol('FROM', ticket.fromName.toUpperCase()),
    twoCol('TO', ticket.toName.toUpperCase()),
    twoCol('DISTANCE', `${ticket.distanceKm.toFixed(1)} km`),
    twoCol('ROUTE', ticket.routeName.toUpperCase()),
    rule('-'),
    twoCol(`ADULT x${ticket.adults}`, inr(ticket.adultBasePaise)),
  ]

  if (ticket.children > 0) {
    lines.push(twoCol(`CHILD x${ticket.children} (${Math.round(ticket.childFactor * 100)}%)`, inr(ticket.childBasePaise)))
  }
  for (const c of ticket.concessions) {
    if (c.count > 0) lines.push(twoCol(`CONC ${c.ruleId.toUpperCase()} x${c.count}`, `-${inr(c.amountPaise)}`))
  }
  lines.push(
    rule('-'),
    twoCol('BASE FARE', inr(ticket.basePaise)),
    twoCol('CONCESSION', `-${inr(ticket.concessionPaise)}`),
    ...(ticket.roundingPaise ? [twoCol('ROUNDING', `${ticket.roundingPaise > 0 ? '+' : '-'}${inr(Math.abs(ticket.roundingPaise))}`)] : []),
    twoCol('TOTAL', inr(ticket.totalPaise)),
    twoCol('PAID CASH', inr(ticket.cashReceivedPaise)),
    twoCol('CHANGE', inr(ticket.changePaise)),
    rule('-'),
    `OPERATOR ${ticket.operator.id}`,
    `CONDUCTOR ${ticket.operator.name.toUpperCase()}`,
    twoCol('TARIFF', ticket.tariffEffectiveFrom || 'DEMO'),
    rule('-'),
    center('DEMO / SIMULATION'),
    center('NOT A VALID MSRTC TICKET'),
    center('फक्त प्रात्यक्षिक तिकीट'),
    rule('='),
    center('THANK YOU'),
    '',
  )
  return lines
}

export function ticketText(ticket: Ticket): string {
  return formatTicketLines(ticket).join('\n')
}

export function formatHistoryDate(iso: string): string {
  const { date, time } = formatTicketDate(iso)
  return `${date} ${time}`
}
