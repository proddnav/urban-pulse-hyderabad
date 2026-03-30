import { useParams, useNavigate } from 'react-router-dom'
import { getStop, getRoutesForStop, findNearestStops, getRoute } from '../lib/routing-engine'
import { formatDistance, formatWalkTime } from '../lib/geo'
import { toggleFavoriteStop, getFavoriteStops } from '../lib/storage'
import { useState } from 'react'

export default function StopDetail() {
  const { stopId } = useParams()
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(() => getFavoriteStops().includes(stopId))

  const stop = getStop(stopId)

  if (!stop) {
    return (
      <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-outline/40 mb-4 block">error</span>
          <p className="text-on-surface-variant font-medium">Stop not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold text-sm">Go Back</button>
        </div>
      </main>
    )
  }

  const routeNames = getRoutesForStop(stopId)
  const nearby = findNearestStops(stop.lat, stop.lng, 800, 8).filter(s => s.id !== stopId)

  function handleFav() {
    toggleFavoriteStop(stopId)
    setIsFav(!isFav)
  }

  // Get route details for each route serving this stop
  const routeDetails = routeNames.map(name => {
    const r = getRoute(name)
    if (!r) return { name, firstStop: '—', lastStop: '—' }
    const stops = r.directions?.['0'] || []
    return {
      name: r.name,
      id: r.id,
      firstStop: stops[0]?.name || '—',
      lastStop: stops[stops.length - 1]?.name || '—',
      stopCount: stops.length,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  return (
    <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary font-semibold text-sm mb-4 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </button>

      {/* Stop header */}
      <section className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stop.metro ? 'bg-primary' : 'bg-tertiary'}`}>
              <span className="material-symbols-outlined text-white text-3xl">
                {stop.metro ? 'train' : 'directions_bus'}
              </span>
            </div>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface">{stop.name}</h2>
              <p className="text-on-surface-variant text-sm">
                {stop.metro ? `Metro · ${stop.lineName}` : 'Bus Stop'}
                {stop.zone ? ` · ${stop.zone}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleFav}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
              isFav ? 'bg-secondary/10' : 'bg-surface-container-low'
            }`}
          >
            <span
              className={`material-symbols-outlined text-xl ${isFav ? 'text-secondary' : 'text-outline'}`}
              style={{ fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/routes?toId=${stop.id}&to=${encodeURIComponent(stop.name)}`)}
            className="flex-1 bg-primary text-on-primary rounded-xl py-3 font-bold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">directions</span>
            Navigate Here
          </button>
          <button
            onClick={() => navigate(`/routes?fromId=${stop.id}&from=${encodeURIComponent(stop.name)}`)}
            className="flex-1 bg-surface-container-low text-on-surface rounded-xl py-3 font-bold text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">near_me</span>
            Start From Here
          </button>
        </div>
      </section>

      {/* Routes serving this stop */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
          Routes · {routeDetails.length} buses
        </h3>
        {routeDetails.length === 0 ? (
          <div className="bg-surface-container-low rounded-2xl p-5 text-center">
            <p className="text-on-surface-variant text-sm">No route information available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {routeDetails.map(r => (
              <button
                key={r.name}
                className="w-full text-left bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-3 hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                onClick={() => r.id && navigate(`/routes/detail?id=${encodeURIComponent(r.id)}`)}
              >
                <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-tertiary font-headline font-extrabold text-base">{r.name}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-on-surface text-sm truncate">{r.firstStop} → {r.lastStop}</div>
                  {r.stopCount > 0 && <div className="text-xs text-on-surface-variant">{r.stopCount} stops</div>}
                </div>
                <span className="material-symbols-outlined text-outline">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Nearby stops */}
      {nearby.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
            Nearby Stops
          </h3>
          <div className="space-y-2">
            {nearby.slice(0, 5).map(ns => (
              <button
                key={ns.id}
                className="w-full text-left bg-surface-container-lowest p-4 rounded-2xl flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                onClick={() => navigate(`/stops/${ns.id}`)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ns.metro ? 'bg-primary/10' : 'bg-surface-container-high'}`}>
                  <span className={`material-symbols-outlined text-lg ${ns.metro ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {ns.metro ? 'train' : 'directions_bus'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-on-surface text-sm">{ns.name}</div>
                  <div className="text-xs text-on-surface-variant">{formatDistance(ns.distance)} · {formatWalkTime(ns.distance)}</div>
                </div>
                <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
