import { Minus, Plus, ShieldAlert, Users } from 'lucide-react'
import { useApp } from '../../state/AppContext'
import { formatMoney } from '../../services/fareCalculator'

interface PassengerPanelProps {
  cashText: string
  onCashTextChange: (value: string) => void
  cashPaise: number
  cashError?: string
}

/** Passenger counts, demo concessions and cash tender. */
export function PassengerPanel({ cashText, onCashTextChange, cashPaise, cashError }: PassengerPanelProps) {
  const { draft, tariff, quote, updateDraft, setConcession } = useApp()

  const setAdults = (next: number) => {
    updateDraft({ adults: Math.max(0, Math.min(9, next)) })
  }

  const setChildren = (next: number) => updateDraft({ children: Math.max(0, Math.min(9, next)) })

  const change = cashPaise - quote.totalPaise
  const concessionUsed = Object.values(draft.concessions).reduce((sum, c) => sum + c, 0)

  return (
    <div className="passenger-panel">
      <div className="passenger-panel__counts">
        <div className="count-row">
          <span className="count-row__icon"><Users size={16} /></span>
          <span className="count-row__label">Adults <em>full fare</em></span>
          <div className="stepper" role="group" aria-label="Adult passenger count">
            <button type="button" onClick={() => setAdults(draft.adults - 1)} disabled={draft.adults <= 0} aria-label="Remove adult">
              <Minus size={14} />
            </button>
            <output aria-live="polite">{draft.adults}</output>
            <button type="button" onClick={() => setAdults(draft.adults + 1)} disabled={draft.adults >= 9} aria-label="Add adult">
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="count-row">
          <span className="count-row__icon"><Users size={14} /></span>
          <span className="count-row__label">Children <em>{Math.round(tariff.childFactor * 100)}% of adult fare</em></span>
          <div className="stepper" role="group" aria-label="Child passenger count">
            <button type="button" onClick={() => setChildren(draft.children - 1)} disabled={draft.children <= 0} aria-label="Remove child">
              <Minus size={14} />
            </button>
            <output aria-live="polite">{draft.children}</output>
            <button type="button" onClick={() => setChildren(draft.children + 1)} disabled={draft.children >= 9} aria-label="Add child">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="concession-box">
        <div className="concession-box__head">
          <h4>Demo concessions</h4>
          <span className="chip chip--warning"><ShieldAlert size={11} /> SIMULATED RULES</span>
        </div>
        <p className="concession-box__note">
          Percentages below are local demo configuration, not current government scheme rules. Require authoritative
          configuration and document checks before any real sale. Concessions apply to adult passengers.
        </p>
        <div className="concession-list">
          {tariff.concessions.map((rule) => {
            const count = Math.min(draft.adults, draft.concessions[rule.id] ?? 0)
            return (
              <div key={rule.id} className={`concession-row ${!rule.enabled ? 'is-disabled' : ''}`}>
                <div className="concession-row__text">
                  <span className="concession-row__name">{rule.nameEn}</span>
                  <span className="concession-row__meta">
                    {rule.percent}% off · {rule.requiresDoc ? 'document required' : 'no document demo'} · demo rule
                  </span>
                </div>
                <div className="stepper stepper--small" role="group" aria-label={`${rule.nameEn} concession count`}>
                  <button
                    type="button"
                    onClick={() => setConcession(rule.id, count - 1)}
                    disabled={count <= 0 || !rule.enabled}
                    aria-label={`Remove ${rule.nameEn} concession`}
                  >
                    <Minus size={12} />
                  </button>
                  <output aria-live="polite">{count}</output>
                  <button
                    type="button"
                    onClick={() => setConcession(rule.id, count + 1)}
                    disabled={count >= draft.adults || concessionUsed >= draft.adults || !rule.enabled}
                    aria-label={`Add ${rule.nameEn} concession`}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="cash-box">
        <label className="field">
          <span className="field__label">Amount received (₹)</span>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            placeholder={quote.ok ? (quote.totalPaise / 100).toFixed(2) : '0.00'}
            value={cashText}
            onChange={(e) => onCashTextChange(e.target.value.replace(/[^\d.]/g, ''))}
          />
          <span className="field__hint">Leave blank to assume exact cash. Demo only; no payment is processed.</span>
        </label>
        <div className="cash-box__quick">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onCashTextChange(quote.ok ? (quote.totalPaise / 100).toFixed(2) : '')}
          >
            Exact cash
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => onCashTextChange(quote.ok ? (Math.ceil(quote.totalPaise / 10000) * 100).toFixed(2) : '')}
          >
            Round up ₹100
          </button>
        </div>
        <div className={`tender-summary ${cashError ? 'tender-summary--error' : ''}`}>
          <span>Change due</span>
          <strong>{cashError ? cashError : change >= 0 ? formatMoney(change) : `Short ${formatMoney(Math.abs(change))}`}</strong>
        </div>
      </div>
    </div>
  )
}
