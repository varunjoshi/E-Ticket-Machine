import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft, Eraser, Power, Printer, RotateCcw, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'

export type KeyAction =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'up' | 'down' | 'left' | 'right'
  | 'enter' | 'esc' | 'clear' | 'menu' | 'ticket' | 'print' | 'back' | 'power'

interface KeyDef {
  action: KeyAction
  label: ReactNode
  sub?: string
  area: string
  variant: 'num' | 'fn' | 'enter' | 'power' | 'esc'
  aria: string
}

const KEYS: KeyDef[] = [
  { action: 'esc', label: 'ESC', area: 'esc', variant: 'esc', aria: 'Escape, step back' },
  { action: 'menu', label: 'MENU', area: 'menu', variant: 'fn', aria: 'Open main menu' },
  { action: 'ticket', label: <Ticket size={13} strokeWidth={2.6} />, sub: 'TICKET', area: 'ticket', variant: 'fn', aria: 'Start a new ticket' },
  { action: 'power', label: <Power size={15} strokeWidth={2.8} />, area: 'pwr', variant: 'power', aria: 'Power on or off' },

  { action: '1', label: '1', area: 'k1', variant: 'num', aria: 'Digit 1' },
  { action: '2', label: '2', area: 'k2', variant: 'num', aria: 'Digit 2' },
  { action: '3', label: '3', area: 'k3', variant: 'num', aria: 'Digit 3' },
  { action: 'up', label: <ArrowUp size={16} strokeWidth={2.8} />, sub: 'UP', area: 'up', variant: 'fn', aria: 'Move selection up' },

  { action: '4', label: '4', area: 'k4', variant: 'num', aria: 'Digit 4' },
  { action: '5', label: '5', area: 'k5', variant: 'num', aria: 'Digit 5' },
  { action: '6', label: '6', area: 'k6', variant: 'num', aria: 'Digit 6' },
  { action: 'down', label: <ArrowDown size={16} strokeWidth={2.8} />, sub: 'DOWN', area: 'down', variant: 'fn', aria: 'Move selection down' },

  { action: '7', label: '7', area: 'k7', variant: 'num', aria: 'Digit 7' },
  { action: '8', label: '8', area: 'k8', variant: 'num', aria: 'Digit 8' },
  { action: '9', label: '9', area: 'k9', variant: 'num', aria: 'Digit 9' },
  { action: 'enter', label: <CornerDownLeft size={16} strokeWidth={2.6} />, sub: 'ENTER', area: 'enter', variant: 'enter', aria: 'Enter, confirm selection' },

  { action: 'clear', label: <Eraser size={14} strokeWidth={2.6} />, sub: 'CLEAR', area: 'clear', variant: 'fn', aria: 'Clear the current numeric entry' },
  { action: '0', label: '0', area: 'k0', variant: 'num', aria: 'Digit 0' },
  { action: 'back', label: <RotateCcw size={13} strokeWidth={2.6} />, sub: 'BACK', area: 'back', variant: 'fn', aria: 'Go back' },

  { action: 'left', label: <ArrowLeft size={15} strokeWidth={2.8} />, area: 'left', variant: 'fn', aria: 'Move left or back' },
  { action: 'right', label: <ArrowRight size={15} strokeWidth={2.8} />, area: 'right', variant: 'fn', aria: 'Move right or forward' },
  { action: 'print', label: <><Printer size={13} strokeWidth={2.6} /><span>PRINT</span></>, area: 'print', variant: 'fn', aria: 'Print or reprint the current ticket' },
]

interface PhysicalKeypadProps {
  onAction: (action: KeyAction) => void
  flashKey: KeyAction | null
  disabled?: boolean
  labelPrint?: string
}

/** Tactile-looking hardware keys, laid out like the reference handheld. */
export function PhysicalKeypad({ onAction, flashKey, disabled = false, labelPrint = 'PRINT' }: PhysicalKeypadProps) {
  return (
    <div className={`keypad ${disabled ? 'keypad--disabled' : ''}`}>
      {KEYS.map((key, i) => {
        const isPrint = key.action === 'print'
        return (
          <button
            key={`${key.area}-${i}`}
            type="button"
            className={`key key--${key.variant} ${flashKey === key.action ? 'key--flash' : ''}`}
            style={{ gridArea: key.area }}
            onClick={() => onAction(key.action)}
            aria-label={key.aria}
            disabled={disabled}
          >
            <span className="key__cap">
              {isPrint ? (
                <>
                  <Printer size={12} strokeWidth={2.6} />
                  <span>{labelPrint}</span>
                </>
              ) : (
                key.label
              )}
            </span>
            {key.sub && !isPrint ? <span className="key__sub">{key.sub}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
