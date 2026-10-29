import type { ReactNode } from 'react'
import { BatteryMedium, Signal, Printer } from 'lucide-react'

interface LCDDisplayProps {
  children: ReactNode
  footer?: ReactNode
  powered?: boolean
  booting?: boolean
  summary: string
  printerState?: 'ready' | 'busy' | 'error'
}

/**
 * The blue monochrome LCD: scanlines, backlight bloom and a fixed status bar.
 * All screen content is plain text so it stays legible without animation.
 */
export function LCDDisplay({ children, footer, powered = true, booting = false, summary, printerState = 'ready' }: LCDDisplayProps) {
  return (
    <div className={`lcd ${powered ? 'lcd--on' : 'lcd--off'} ${booting ? 'lcd--booting' : ''}`}>
      <div className="lcd__glow" aria-hidden="true" />
      <div className="lcd__scanlines" aria-hidden="true" />
      <div className="lcd__screen">
        {powered ? (
          <>
            <div className="lcd__statusbar" aria-hidden="true">
              <span className="lcd__statusbrand">MSRTC·DEMO</span>
              <span className="lcd__statusicons">
                <Signal size={11} strokeWidth={2.5} />
                <Printer size={11} strokeWidth={2.5} className={printerState === 'busy' ? 'lcd__icon-blink' : ''} />
                <BatteryMedium size={13} strokeWidth={2.5} />
              </span>
            </div>
            <div className="lcd__content" role="status" aria-live="polite" aria-label={summary}>
              {children}
            </div>
            {footer ? <div className="lcd__footer">{footer}</div> : null}
          </>
        ) : (
          <div className="lcd__dark" aria-label="Machine powered off">
            <span>POWER OFF</span>
          </div>
        )}
      </div>
      <span className="lcd__pill" aria-hidden="true" />
    </div>
  )
}
