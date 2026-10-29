import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, Printer, Scissors, SkipForward, X } from 'lucide-react'
import type { Ticket } from '../../types'
import { formatTicketLines } from '../../services/ticketService'
import { machineAudio } from '../../services/audioService'
import { downloadTicketText } from '../../services/printerService'

interface ThermalPrinterProps {
  ticket: Ticket
  variant: 'machine' | 'modal'
  paperWidth: 58 | 80
  isReprint?: boolean
  onComplete: () => void
  onTearOff?: () => void
  onBrowserPrint: (ticket: Ticket) => void
}

/**
 * Simulated thermal printer. The receipt strip grows out of the paper slot
 * while lines are revealed at printer speed. Always finishes even when the
 * visitor skips the animation.
 */
export function ThermalPrinter({
  ticket,
  variant,
  paperWidth,
  isReprint = false,
  onComplete,
  onTearOff,
  onBrowserPrint,
}: ThermalPrinterProps) {
  const lines = useMemo(() => formatTicketLines(ticket), [ticket])
  const lineHeight = variant === 'machine' ? 12.35 : 14.6

  const [revealed, setRevealed] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const stopMotorRef = useRef<() => void>(() => {})
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    stopMotorRef.current()
    setRevealed(lines.length)
    setDone(true)
    machineAudio.success()
    completeRef.current()
  }, [lines.length])

  useEffect(() => {
    stopMotorRef.current = machineAudio.startMotor(Math.min(7000, lines.length * 110 + 700))
    let line = 0
    const step = () => {
      line += 1
      setRevealed(line)
      if (line < lines.length) {
        timerRef.current = window.setTimeout(step, 92)
      } else {
        timerRef.current = window.setTimeout(finish, 720)
      }
    }
    timerRef.current = window.setTimeout(step, 460)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      stopMotorRef.current()
      // Do not call onComplete from cleanup: an unmounted animation must not
      // mark a ticket as printed.
    }
    // Remount with a new key for each print session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id])

  const height = Math.max(0, Math.round(revealed * lineHeight + 20))

  const body = (
    <>
      <div className={`printer-stage printer-stage--${variant}`}>
        <div className="printer-slot" aria-hidden="true">
          <span className="printer-slot__label">THERMAL {paperWidth}mm</span>
          <span className="printer-slot__mouth" />
        </div>
        <div
          className={`paper-feed ${done ? 'paper-feed--done' : 'paper-feed--feeding'}`}
          aria-hidden="true"
        >
          <div className="paper__window" style={{ height: `${height}px` }}>
            <div className="thermal-paper">
              <div className="thermal-paper__texture" />
              <div className="thermal-paper__content">
                {lines.map((line, i) => (
                  <div key={i} className={`paper-line ${i < revealed ? 'paper-line--shown' : ''} ${i === revealed - 1 && !done ? 'paper-line--active' : ''}`}>
                    {line || '\u00a0'}
                  </div>
                ))}
              </div>
              <div className="thermal-paper__edge" />
            </div>
          </div>
        </div>
        <div className="printer-tear" aria-hidden="true" />
      </div>
      <div className="printer-status">
        {done ? (
          <span className="printer-status__done"><Check size={13} /> {isReprint ? 'REPRINT COMPLETE' : 'PRINT COMPLETE'}</span>
        ) : (
          <span className="printer-status__busy"><span className="printer-status__dot" /> PRINTING · {Math.min(revealed, lines.length)}/{lines.length} LINES</span>
        )}
        <span className="printer-status__badge">SIMULATED</span>
      </div>
      <div className="printer-actions">
        {!done ? (
          <button type="button" className="printer-btn" onClick={finish}>
            <SkipForward size={14} /> Skip animation
          </button>
        ) : (
          <>
            {variant === 'machine' && onTearOff ? (
              <button type="button" className="printer-btn printer-btn--primary" onClick={onTearOff}>
                <Scissors size={14} /> Tear off
              </button>
            ) : null}
            <button type="button" className="printer-btn" onClick={() => onBrowserPrint(ticket)}>
              <Printer size={14} /> Browser print
            </button>
            <button type="button" className="printer-btn" onClick={() => downloadTicketText(formatTicketLines(ticket).join('\n'), ticket.serial)}>
              <Download size={14} /> .txt
            </button>
            {variant === 'modal' && onTearOff ? (
              <button type="button" className="printer-btn" onClick={onTearOff} aria-label="Close print view">
                <X size={14} /> Close
              </button>
            ) : null}
          </>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {done ? 'Simulated print complete.' : `Simulated printing, line ${revealed} of ${lines.length}.`}
      </p>
    </>
  )

  if (variant === 'modal') {
    return (
      <div className="printer-modal-backdrop" role="dialog" aria-modal="true" aria-label="Simulated thermal printer">
        <div className={`printer-modal paper-${paperWidth}`}>
          <div className="printer-modal__head">
            <div>
              <p className="eyebrow">Thermal printer simulation</p>
              <h2>{ticket.serial}</h2>
            </div>
            <span className="chip chip--warning">Not a real print</span>
          </div>
          {body}
        </div>
      </div>
    )
  }

  return (
    <div className={`machine-printer-overlay paper-${paperWidth}`} aria-label="Simulated thermal printer">
      {body}
    </div>
  )
}
