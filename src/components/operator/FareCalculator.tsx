import { AlertTriangle, Calculator, ReceiptText } from 'lucide-react'
import type { FareQuote } from '../../types'
import { formatMoney } from '../../services/fareCalculator'

interface FareCalculatorProps {
  quote: FareQuote
  cashPaise?: number
  compact?: boolean
}

/** Fare breakdown driven entirely by the configured demo tariff. */
export function FareCalculator({ quote, cashPaise, compact = false }: FareCalculatorProps) {
  return (
    <div className={`fare-calculator ${compact ? 'fare-calculator--compact' : ''}`}>
      <div className="fare-calculator__head">
        <h3><Calculator size={16} /> Fare calculation</h3>
        <span className="chip chip--warning">SIMULATED TARIFF</span>
      </div>

      {!quote.ok ? (
        <div className="fare-calculator__empty">
          <AlertTriangle size={16} />
          <div>
            <strong>Fare unavailable</strong>
            <ul>
              {quote.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div className="fare-calculator__route">
            <ReceiptText size={14} />
            <span>{quote.routeName}</span>
            <span className="fare-calculator__km">{quote.distanceKm.toFixed(1)} km</span>
          </div>
          <dl className="fare-lines">
            <div><dt>Fare per adult passenger</dt><dd>{formatMoney(quote.perPassengerPaise)}</dd></div>
            {quote.lines.map((line, i) => (
              <div key={i} className={line.kind === 'concession' ? 'is-discount' : ''}>
                <dt>{line.label}</dt>
                <dd>{line.amountPaise < 0 ? `-${formatMoney(Math.abs(line.amountPaise))}` : formatMoney(line.amountPaise)}</dd>
              </div>
            ))}
            <div className="fare-lines__subtotal"><dt>Base fare</dt><dd>{formatMoney(quote.basePaise)}</dd></div>
            <div className="is-discount"><dt>Total concession</dt><dd>-{formatMoney(quote.concessionPaise)}</dd></div>
            {quote.roundingPaise !== 0 ? (
              <div><dt>Fare rounding</dt><dd>{quote.roundingPaise > 0 ? '+' : '-'}{formatMoney(Math.abs(quote.roundingPaise))}</dd></div>
            ) : null}
            <div className="fare-lines__total"><dt>Total payable</dt><dd>{formatMoney(quote.totalPaise)}</dd></div>
            {typeof cashPaise === 'number' ? (
              <>
                <div><dt>Cash received</dt><dd>{formatMoney(cashPaise)}</dd></div>
                <div><dt>Change due</dt><dd>{formatMoney(Math.max(0, cashPaise - quote.totalPaise))}</dd></div>
              </>
            ) : null}
          </dl>
          <p className="fare-calculator__note">
            Rounded per the configured demo rule. Effective tariff date: {quote.tariffEffectiveFrom || 'demo'}.
            This is not a verified MSRTC fare.
          </p>
        </>
      )}
    </div>
  )
}
