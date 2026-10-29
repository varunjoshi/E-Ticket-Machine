import { useMemo } from 'react'
import { ArrowLeftRight, Info, MapPin } from 'lucide-react'
import { useApp } from '../../state/AppContext'
import { findJourneys, destinationsFrom, servicesForPair, stopPrimaryLabel } from '../../services/routeService'
import { SearchSelect, type SearchOption } from './SearchSelect'

interface RouteSelectorProps {
  showServices?: boolean
}

/** Origin/destination/service pickers bound to the shared ticket draft. */
export function RouteSelector({ showServices = true }: RouteSelectorProps) {
  const { stops, routes, draft, tariff, updateDraft, chooseFrom, chooseTo, settings } = useApp()

  const servedStops = useMemo(
    () => stops.filter((s) => routes.some((r) => r.stops.some((rs) => rs.stopId === s.id))),
    [stops, routes],
  )

  const destinations = useMemo(() => destinationsFrom(routes, stops, draft.fromStopId), [routes, stops, draft.fromStopId])

  const originOptions: SearchOption[] = useMemo(
    () =>
      servedStops
        .map((s) => ({
          id: s.id,
          label: stopPrimaryLabel(s, settings.language),
          secondary: settings.language === 'mr' ? s.nameEn : s.nameMr,
          meta: s.city,
          keywords: `${s.depot} ${s.nameEn} ${s.nameMr}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [servedStops, settings.language],
  )

  const destinationOptions: SearchOption[] = useMemo(
    () =>
      destinations
        .map((d) => ({
          id: d.stop.id,
          label: stopPrimaryLabel(d.stop, settings.language),
          secondary: settings.language === 'mr' ? d.stop.nameEn : d.stop.nameMr,
          meta: `${d.stop.city} · ${d.minKm.toFixed(1)} km`,
          keywords: `${d.stop.depot} ${d.stop.nameEn} ${d.stop.nameMr}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [destinations, settings.language],
  )

  const journeys = useMemo(
    () => findJourneys(routes, stops, draft.fromStopId ?? '', draft.toStopId ?? ''),
    [routes, stops, draft.fromStopId, draft.toStopId],
  )

  const available = useMemo(
    () => servicesForPair(routes, stops, draft.fromStopId, draft.toStopId),
    [routes, stops, draft.fromStopId, draft.toStopId],
  )

  const journey = journeys.find((j) => !draft.serviceId || j.services.includes(draft.serviceId)) ?? journeys[0]
  const verification = journey?.route.verification ?? 'demo-estimate'

  const swap = () => {
    if (!draft.fromStopId || !draft.toStopId) return
    updateDraft({ fromStopId: draft.toStopId, toStopId: draft.fromStopId, serviceId: null })
  }

  return (
    <div className="route-selector">
      <div className="route-selector__grid">
        <SearchSelect
          label="Origin stop"
          value={draft.fromStopId}
          options={originOptions}
          placeholder="Search English or Marathi stop…"
          onChange={chooseFrom}
          hint="Only stops served by loaded demo routes are listed."
        />
        <button
          type="button"
          className="swap-btn"
          onClick={swap}
          disabled={!draft.fromStopId || !draft.toStopId}
          aria-label="Swap origin and destination"
          title="Swap stops"
        >
          <ArrowLeftRight size={16} />
        </button>
        <SearchSelect
          label="Destination stop"
          value={draft.toStopId}
          options={draft.fromStopId ? destinationOptions : []}
          placeholder={draft.fromStopId ? 'Search reachable stops…' : 'Choose an origin first'}
          onChange={chooseTo}
          disabled={!draft.fromStopId}
          hint={draft.fromStopId ? `${destinationOptions.length} directly connected demo stop(s).` : undefined}
        />
      </div>

      {draft.fromStopId && draft.toStopId && !journeys.length ? (
        <p className="inline-alert inline-alert--error">
          <Info size={15} /> No configured direct demo route connects these stops. Choose another pair or import route data.
        </p>
      ) : null}

      {journey ? (
        <div className="journey-card">
          <div className="journey-card__head">
            <span className="journey-card__route"><MapPin size={14} /> {journey.route.nameEn}</span>
            <span className="chip chip--warning">DEMO ESTIMATE · UNVERIFIED</span>
          </div>
          <div className="journey-card__meta">
            <span><b>{journey.distanceKm.toFixed(1)} km</b> approx. demo distance</span>
            <span>Route <b>{journey.route.id}</b></span>
            <span>Effective {journey.route.effectiveFrom ?? '—'}</span>
          </div>
          {journey.intermediate.length ? (
            <p className="journey-card__stops">
              Via: {journey.intermediate.map((x) => x.stop.nameEn).join(' · ')}
            </p>
          ) : (
            <p className="journey-card__stops">Direct demo corridor, no intermediate stop configured.</p>
          )}
          <p className="journey-card__source">
            Source: {journey.route.source} · Route data is not an official MSRTC timetable.
          </p>
          <span className={`verification verification--${verification.replace(/[^a-z]/g, '')}`}>
            {verification === 'verified' ? 'VERIFIED SOURCE' : verification === 'imported-unverified' ? 'IMPORTED · UNVERIFIED' : 'SIMULATED DATA'}
          </span>
        </div>
      ) : null}

      {showServices ? (
        <fieldset className="service-picker">
          <legend>Bus category / service</legend>
          <div className="service-picker__grid">
            {tariff.services
              .filter((s) => s.enabled)
              .map((s) => {
                const offered = available.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`service-card ${draft.serviceId === s.id ? 'is-selected' : ''} ${!offered ? 'is-unavailable' : ''}`}
                    onClick={() => updateDraft({ serviceId: s.id })}
                    disabled={!offered}
                    title={offered ? s.nameEn : `${s.nameEn} is not configured on this demo pair`}
                  >
                    <span className="service-card__short">{s.short}</span>
                    <span className="service-card__name">{settings.language === 'mr' ? s.nameMr : s.nameEn}</span>
                    <span className="service-card__rate">₹{(s.ratePerKmPaise / 100).toFixed(2)}/km · min ₹{(s.minPaise / 100).toFixed(0)}</span>
                    {!offered ? <span className="service-card__off">not on this pair</span> : null}
                  </button>
                )
              })}
          </div>
          <p className="field__hint">
            Service availability is filtered by the demo route data. Demo tariff only — not an official MSRTC fare schedule.
          </p>
        </fieldset>
      ) : null}
    </div>
  )
}
