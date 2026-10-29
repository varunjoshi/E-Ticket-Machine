import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface SearchOption {
  id: string
  label: string
  secondary?: string
  meta?: string
  keywords?: string
}

interface SearchSelectProps {
  label: string
  value: string | null
  options: SearchOption[]
  placeholder: string
  onChange: (id: string) => void
  disabled?: boolean
  hint?: string
  error?: string
}

/** Accessible, searchable single-select used for stop pickers. */
export function SearchSelect({ label, value, options, placeholder, onChange, disabled, hint, error }: SearchSelectProps) {
  const id = useId()
  const listId = `${id}-list`
  const selected = useMemo(() => options.find((o) => o.id === value), [options, value])
  const [query, setQuery] = useState(selected?.label ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuery(selected?.label ?? '')
  }, [selected?.label])

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(selected?.label ?? '')
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [selected?.label])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q === selected?.label.toLowerCase()) return options.slice(0, 40)
    return options
      .filter((o) => `${o.label} ${o.secondary ?? ''} ${o.meta ?? ''} ${o.keywords ?? ''}`.toLowerCase().includes(q))
      .slice(0, 40)
  }, [options, query, selected?.label])

  useEffect(() => {
    setActive((a) => Math.max(0, Math.min(a, filtered.length - 1)))
  }, [filtered.length])

  const pick = (option: SearchOption) => {
    onChange(option.id)
    setQuery(option.label)
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(filtered.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      if (open && filtered[active]) {
        e.preventDefault()
        pick(filtered[active])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery(selected?.label ?? '')
    }
  }

  return (
    <div className={`field ${error ? 'field--error' : ''}`} ref={wrapRef}>
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="searchselect">
        <Search size={15} className="searchselect__icon" aria-hidden="true" />
        <input
          id={id}
          ref={inputRef}
          className="searchselect__input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && filtered[active] ? `${id}-opt-${filtered[active].id}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('')
          }}
          onKeyDown={onKeyDown}
        />
        {selected ? (
          <button
            type="button"
            className="searchselect__clear"
            aria-label={`Clear ${label}`}
            onClick={() => {
              onChange('')
              setQuery('')
              setOpen(false)
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={15} className="searchselect__chev" aria-hidden="true" />
        )}
        {open ? (
          <ul className="searchselect__list" id={listId} role="listbox" aria-label={label}>
            {filtered.length ? (
              filtered.map((option, index) => (
                <li
                  key={option.id}
                  id={`${id}-opt-${option.id}`}
                  role="option"
                  aria-selected={option.id === value}
                  className={`searchselect__option ${index === active ? 'is-active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(option)
                  }}
                  onMouseEnter={() => setActive(index)}
                >
                  <span className="searchselect__option-main">{option.label}</span>
                  <span className="searchselect__option-meta">
                    {option.secondary ? <span>{option.secondary}</span> : null}
                    {option.meta ? <em>{option.meta}</em> : null}
                  </span>
                </li>
              ))
            ) : (
              <li className="searchselect__empty">No matching stop in the loaded demo data.</li>
            )}
          </ul>
        ) : null}
      </div>
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  )
}
