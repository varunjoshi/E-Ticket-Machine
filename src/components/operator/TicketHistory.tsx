import { useMemo, useState } from 'react'
import { Eye, Printer, Search, Ticket as TicketIcon } from 'lucide-react'
import type { Ticket } from '../../types'
import { formatHistoryDate, inr } from '../../services/ticketService'

interface TicketHistoryProps {
  tickets: Ticket[]
  onView: (ticket: Ticket) => void
  onReprint: (ticket: Ticket) => void
  limit?: number
}

export function TicketHistory({ tickets, onView, onReprint, limit }: TicketHistoryProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = limit ? tickets.slice(0, limit) : tickets
    if (!q) return base
    return base.filter((t) =>
      `${t.serial} ${t.fromName} ${t.toName} ${t.operator.id} ${t.serviceName} ${t.totalPaise}`.toLowerCase().includes(q),
    )
  }, [tickets, query, limit])

  return (
    <div className="ticket-history">
      <div className="ticket-history__head">
        <h3><TicketIcon size={16} /> Issued demo tickets</h3>
        <div className="search-input">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search serial, stop, operator…"
            aria-label="Search ticket history"
          />
        </div>
      </div>

      {!tickets.length ? (
        <div className="empty-state">
          <TicketIcon size={30} />
          <p>No demo tickets issued yet.</p>
          <span>Issue a ticket in Sell or Machine mode. It will be stored locally and appear here.</span>
        </div>
      ) : !filtered.length ? (
        <div className="empty-state">
          <Search size={26} />
          <p>No tickets match “{query}”.</p>
          <span>Search by serial, origin, destination, service or operator ID.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Issued</th>
                <th>From → To</th>
                <th>Pax</th>
                <th>Total</th>
                <th>Print</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td data-label="Serial"><span className="mono">{t.serial}</span></td>
                  <td data-label="Issued">{formatHistoryDate(t.issuedAt)}</td>
                  <td data-label="Route">
                    <span className="history-route">{t.fromName} <em>→</em> {t.toName}</span>
                    <span className="history-service">{t.serviceName} · {t.distanceKm.toFixed(1)} km</span>
                  </td>
                  <td data-label="Pax">{t.adults}A · {t.children}C</td>
                  <td data-label="Total"><strong>{inr(t.totalPaise)}</strong></td>
                  <td data-label="Print">
                    <span className={`status-pill ${t.printStatus === 'printed' ? 'is-ok' : 'is-warn'}`}>
                      {t.printStatus === 'printed' ? `PRINTED${t.reprints ? ` +${t.reprints}` : ''}` : 'PENDING'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button type="button" className="icon-btn" onClick={() => onView(t)} aria-label={`View ${t.serial}`} title="View">
                        <Eye size={15} />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => onReprint(t)} aria-label={`Reprint ${t.serial}`} title="Reprint (no new sale)">
                        <Printer size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="table-note">
        Stored in this browser's LocalStorage. Not a secure or synchronised production database; clearing site data
        removes this history. Reprints keep the same serial and do not duplicate the sale.
      </p>
    </div>
  )
}
