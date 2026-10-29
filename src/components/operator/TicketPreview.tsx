import { Download, Printer, RotateCcw, X } from 'lucide-react'
import type { Ticket } from '../../types'
import { formatTicketLines, inr } from '../../services/ticketService'
import { downloadTicketText } from '../../services/printerService'

interface TicketPreviewProps {
  ticket: Ticket
  onClose: () => void
  onBrowserPrint: (ticket: Ticket) => void
  onReprint: (ticket: Ticket) => void
}

/** Static 58 mm receipt view used by history and post-issue review. */
export function TicketPreview({ ticket, onClose, onBrowserPrint, onReprint }: TicketPreviewProps) {
  const lines = formatTicketLines(ticket)
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Ticket preview ${ticket.serial}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ticket-preview-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Ticket preview</p>
            <h2>{ticket.serial}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close ticket preview"><X size={18} /></button>
        </div>
        <div className="ticket-preview-modal__body">
          <div className="ticket-preview">
            <div className="ticket-preview__paper">
              {lines.map((line, i) => (
                <div key={i} className="ticket-preview__line">{line || '\u00a0'}</div>
              ))}
            </div>
            <div className="ticket-preview__meta">
              <span className={`chip ${ticket.printStatus === 'printed' ? 'chip--success' : 'chip--warning'}`}>
                {ticket.printStatus === 'printed' ? `PRINTED${ticket.reprints ? ` · ${ticket.reprints} REPRINT(S)` : ''}` : 'NOT PRINTED'}
              </span>
              <span className="chip chip--warning">DEMO / NOT VALID</span>
              <span className="chip">₹{inr(ticket.totalPaise).replace('Rs ', '')}</span>
            </div>
          </div>
          <div className="ticket-preview__aside">
            <h3>Trip</h3>
            <dl>
              <div><dt>From</dt><dd>{ticket.fromName}</dd></div>
              <div><dt>To</dt><dd>{ticket.toName}</dd></div>
              <div><dt>Service</dt><dd>{ticket.serviceName}</dd></div>
              <div><dt>Distance</dt><dd>{ticket.distanceKm.toFixed(1)} km (demo)</dd></div>
              <div><dt>Passengers</dt><dd>{ticket.adults} adult · {ticket.children} child</dd></div>
              <div><dt>Total</dt><dd>{inr(ticket.totalPaise)}</dd></div>
              <div><dt>Issued</dt><dd>{new Date(ticket.issuedAt).toLocaleString('en-IN')}</dd></div>
              <div><dt>Operator</dt><dd>{ticket.operator.id} · {ticket.operator.depot}</dd></div>
            </dl>
            <p className="aside-note">
              Retention copy. Reprinting this serial does not create a new sale. Browser printing opens the device
              print dialog; choose “Save as PDF” for a PDF copy.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={() => downloadTicketText(lines.join('\n'), ticket.serial)}>
            <Download size={15} /> Download .txt
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => onReprint(ticket)}>
            <RotateCcw size={15} /> Replay print animation
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onBrowserPrint(ticket)}>
            <Printer size={15} /> Browser print / PDF
          </button>
        </div>
      </div>
    </div>
  )
}
