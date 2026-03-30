import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getRoute, getStop, getRouteInfo } from '../lib/routing-engine'
import { calculateBusFare, formatFare } from '../lib/fare'
import { haversine } from '../lib/routing-engine'
import { toggleFavoriteRoute, getFavoriteRoutes } from '../lib/storage'

export default function RouteDetail() {
  const [searchParams] = useSearchParams()
  const routeId = searchParams.get('id')
  const navigate = useNavigate()
  const [isFav, setIsFav] = useState(() => getFavoriteRoutes().includes(routeId))
  const [direction, setDirection] = useState('0')

  const route = getRoute(routeId)

  if (!route) {
    return (
      <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-outline/40 mb-4 block">error</span>
          <p className="text-on-surface-variant font-medium">Route not found</p>
          <button onClick={() => navigate('/routes')} className="mt-4 text-primary font-bold text-sm">Back to Routes</button>
        </div>
      </main>
    )
  }

  const stops = route.directions?.[direction] || []
  const otherDirection = direction === '0' ? '1' : '0'
  const hasOtherDirection = route.directions?.[otherDirection]?.length > 0

  // Calculate total distance
  let totalDist = 0
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = getStop(stops[i].id)
    const s2 = getStop(stops[i + 1].id)
    if (s1?.lat && s2?.lat) {
      totalDist += haversine(s1.lat, s1.lng, s2.lat, s2.lng)
    }
  }
  const totalDistKm = Math.round(totalDist / 100) / 10
  const estimatedFare = calculateBusFare(totalDist)

  const firstStop = stops[0]?.name || '—'
  const lastStop = stops[stops.length - 1]?.name || '—'

  return (
    <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary font-semibold text-sm mb-4 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back
      </button>

      {/* Route header */}
      <section className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-tertiary flex items-center justify-center overflow-hidden px-1">
            <span className="text-white font-headline font-extrabold text-sm leading-tight text-center break-all">{route.name}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">Route {route.name}</h2>
            <p className="text-on-surface-variant text-sm font-medium">{firstStop} → {lastStop}</p>
          </div>
          <button
            onClick={() => { toggleFavoriteRoute(routeId); setIsFav(!isFav); }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isFav ? 'bg-primary/10' : 'bg-surface-container-low'}`}
          >
            <span className={`material-symbols-outlined text-xl ${isFav ? 'text-primary' : 'text-outline'}`}
              style={{ fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}>star</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-low rounded-2xl p-4 text-center">
            <div className="text-2xl font-headline font-bold text-on-surface">{stops.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">Stops</div>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-4 text-center">
            <div className="text-2xl font-headline font-bold text-on-surface">{totalDistKm}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">KM</div>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-4 text-center">
            <div className="text-2xl font-headline font-bold text-tertiary">{formatFare(estimatedFare)}</div>
            <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">Full Fare</div>
          </div>
        </div>
      </section>

      {/* Direction toggle */}
      {hasOtherDirection && (
        <section className="mb-6">
          <div className="bg-surface-container-low rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setDirection('0')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                direction === '0' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              {route.directions?.['0']?.[0]?.name} →
            </button>
            <button
              onClick={() => setDirection('1')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                direction === '1' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              {route.directions?.['1']?.[0]?.name} →
            </button>
          </div>
        </section>
      )}

      {/* Stop list timeline */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4 px-1">
          All Stops · {direction === '0' ? 'Outbound' : 'Inbound'}
        </h3>
        <div className="space-y-0">
          {stops.map((stop, idx) => {
            const isFirst = idx === 0
            const isLast = idx === stops.length - 1
            return (
              <div key={`${stop.id}-${idx}`} className="flex items-stretch gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center w-6">
                  {!isFirst && <div className="w-0.5 flex-1 bg-tertiary/30"></div>}
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                    isFirst || isLast ? 'bg-tertiary ring-4 ring-tertiary/20' : 'bg-surface-container-highest border-2 border-tertiary/40'
                  }`}></div>
                  {!isLast && <div className="w-0.5 flex-1 bg-tertiary/30"></div>}
                </div>
                {/* Stop info */}
                <button
                  className="flex-1 text-left py-3 flex items-center justify-between hover:bg-surface-container-low rounded-xl px-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/stops/${stop.id}`)}
                >
                  <div>
                    <div className={`font-semibold text-sm ${isFirst || isLast ? 'text-on-surface font-bold' : 'text-on-surface'}`}>
                      {stop.name}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      Stop {idx + 1} of {stops.length}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
