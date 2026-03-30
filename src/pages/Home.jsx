import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { findNearestStops, searchStops, searchRouteIndex, getMetroData, getRoutesForStop, getRoute, getStop, getPrecomputedRoute } from '../lib/routing-engine'
import { getCurrentPosition, formatDistance, formatWalkTime } from '../lib/geo'
import { getRecentSearches, getSavedPlaces, setSavedPlace, removeSavedPlace } from '../lib/storage'
import { searchPlacesDebounced, resolvePlaceLatLng } from '../lib/places'

const DEFAULT_LOCATION = { lat: 17.4435, lng: 78.3772 }

export default function Home() {
  const navigate = useNavigate()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nearbyBusStops, setNearbyBusStops] = useState([])
  const [nearbyMetroStations, setNearbyMetroStations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedStop, setSelectedStop] = useState(null)
  const [stopRouteDetails, setStopRouteDetails] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [savedPlaces, setSavedPlacesState] = useState({})
  const [settingPlace, setSettingPlace] = useState(null) // 'home' | 'work' | null
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])
  const [googlePlaceResults, setGooglePlaceResults] = useState([])
  const [resolvingPlace, setResolvingPlace] = useState(false)

  useEffect(() => {
    setRecentSearches(getRecentSearches(3))
    setSavedPlacesState(getSavedPlaces())

    async function init() {
      let loc = DEFAULT_LOCATION
      try {
        loc = await getCurrentPosition()
      } catch {
        // Geolocation failed, use default
      }
      setLocation(loc)

      const nearby = findNearestStops(loc.lat, loc.lng, 2000, 20)
      setNearbyBusStops(nearby.filter(s => !s.metro).slice(0, 5))
      setNearbyMetroStations(nearby.filter(s => s.metro).slice(0, 4))
      setLoading(false)
    }
    init()
  }, [])

  const [routeResults, setRouteResults] = useState([])

  useEffect(() => {
    if (searchQuery.length >= 1) {
      setSearchResults(searchStops(searchQuery))
      setRouteResults(searchRouteIndex(searchQuery, 5))
      setShowDropdown(true)
    } else {
      setSearchResults([])
      setRouteResults([])
      setShowDropdown(false)
    }
  }, [searchQuery])

  function handleStopSelect(stop) {
    setSearchQuery(stop.name)
    setShowDropdown(false)
    setSelectedStop(stop)

    // Build route details for this stop
    const routeNames = getRoutesForStop(stop.id) || []
    const details = routeNames
      .map(name => {
        const r = getRoute(name)
        if (!r) return null
        const dir0 = r.directions?.['0'] || []
        const dir1 = r.directions?.['1'] || []
        const first = dir0[0]?.name || dir1[0]?.name || '—'
        const last = dir0[dir0.length - 1]?.name || dir1[dir1.length - 1]?.name || '—'
        const stopCount = dir0.length || dir1.length
        const hasBoth = dir0.length > 0 && dir1.length > 0
        return { name: r.name, id: r.id, first, last, stopCount, hasBoth }
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    setStopRouteDetails(details)
  }

  function clearSelection() {
    setSelectedStop(null)
    setStopRouteDetails([])
    setSearchQuery('')
  }

  return (
    <>
    <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Hero & Search Section */}
      <section className="mt-6 mb-8">
        <p className="text-on-surface-variant font-medium mb-1">Namaste, Hyderabad</p>
        <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-6 leading-tight">Where to today?</h2>
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <input
            className="w-full bg-surface-container-low border-none rounded-xl py-5 pl-14 pr-20 text-on-surface focus:ring-2 focus:ring-surface-tint transition-all placeholder:text-outline/70"
            placeholder="Search stop, area, or route..."
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (selectedStop) { setSelectedStop(null); setStopRouteDetails([]); } }}
            onFocus={() => searchResults.length > 0 && !selectedStop && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {selectedStop ? (
            <button
              className="absolute right-3 inset-y-3 bg-surface-container-high text-on-surface-variant rounded-lg px-3 flex items-center justify-center transition-transform active:scale-95"
              onClick={clearSelection}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          ) : (
            <button
              className="absolute right-3 inset-y-3 bg-primary text-on-primary rounded-lg px-4 flex items-center justify-center transition-transform active:scale-95"
              onClick={() => searchQuery && navigate(`/routes?to=${encodeURIComponent(searchQuery)}`)}
            >
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          )}
          {showDropdown && (searchResults.length > 0 || routeResults.length > 0) && !selectedStop && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto border border-outline-variant/10">
              {routeResults.length > 0 && (
                <>
                  <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Bus Routes</div>
                  {routeResults.map(route => (
                    <button
                      key={route.id}
                      className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                      onMouseDown={() => navigate(`/routes?tab=browse&q=${encodeURIComponent(route.name)}`)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-tertiary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-tertiary text-lg">directions_bus</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-on-surface text-sm">{route.name}</div>
                        <div className="text-xs text-on-surface-variant truncate">{route.up?.from || route.down?.from} → {route.up?.to || route.down?.to}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {searchResults.length > 0 && (
                <>
                  {routeResults.length > 0 && <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-t border-outline-variant/10">Bus Stops</div>}
                  {searchResults.map(stop => {
                    const routes = stop.routes || getRoutesForStop(stop.id)?.slice(0, 4) || []
                    return (
                      <button
                        key={stop.id}
                        className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onMouseDown={() => handleStopSelect(stop)}
                      >
                        <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-on-surface-variant text-lg">
                            {stop.metro ? 'train' : 'directions_bus'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-on-surface text-sm truncate">{stop.name}</div>
                          <div className="text-xs text-on-surface-variant flex items-center gap-1">
                            {stop.metro ? (
                              <span className="text-primary font-medium">{stop.lineName}</span>
                            ) : stop.zone ? (
                              <span>{stop.zone}</span>
                            ) : null}
                            {routes.length > 0 && (
                              <>
                                {(stop.metro || stop.zone) && <span className="opacity-40">·</span>}
                                <span className="font-medium text-tertiary">{routes.slice(0, 3).join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Selected Stop — Routes Detail Card */}
      {selectedStop && (
        <section className="mb-8">
          {/* Stop header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedStop.metro ? 'bg-primary' : 'bg-tertiary'}`}>
              <span className="material-symbols-outlined text-white text-2xl">{selectedStop.metro ? 'train' : 'directions_bus'}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-headline text-lg font-bold text-on-surface">{selectedStop.name}</h3>
              <p className="text-xs text-on-surface-variant">
                {selectedStop.metro ? `Metro · ${selectedStop.lineName}` : 'Bus Stop'}
                {selectedStop.zone ? ` · ${selectedStop.zone}` : ''}
                {' · '}{stopRouteDetails.length} route{stopRouteDetails.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => navigate(`/routes?fromId=${selectedStop.id}&from=${encodeURIComponent(selectedStop.name)}`)}
              className="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-transform"
            >
              Navigate
            </button>
          </div>

          {/* Google Maps link */}
          {selectedStop.lat && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selectedStop.lat},${selectedStop.lng}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 mb-4 text-sm text-primary font-medium"
            >
              <span className="material-symbols-outlined text-base">map</span>
              View on Google Maps
            </a>
          )}

          {/* Quick routes to popular destinations */}
          {(() => {
            const popularDests = ['Mehdipatnam', 'Secunderabad Railway Station', 'Ameerpet', 'Hitech City', 'Charminar', 'Lb Nagar X Road', 'Rgi Airport', 'Dilsukhnagar', 'Kukatpally', 'Jbs'];
            const quickRoutes = popularDests
              .map(dest => {
                const r = getPrecomputedRoute(selectedStop.name, dest);
                if (!r || dest === selectedStop.name) return null;
                return { dest, ...r };
              })
              .filter(Boolean)
              .sort((a, b) => a.t - b.t)
              .slice(0, 6);
            if (quickRoutes.length === 0) return null;
            return (
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Quick routes from here</h4>
                <div className="grid grid-cols-2 gap-2">
                  {quickRoutes.map(r => (
                    <button
                      key={r.dest}
                      className="text-left bg-surface-container-lowest rounded-xl p-3 hover:bg-surface-container-low transition-colors active:scale-[0.98]"
                      onClick={() => navigate(`/routes?fromId=${selectedStop.id}&from=${encodeURIComponent(selectedStop.name)}&to=${encodeURIComponent(r.dest)}&toId=`)}
                    >
                      <div className="text-sm font-semibold text-on-surface truncate">{r.dest}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                        <span>{r.t} min</span>
                        <span className="opacity-40">·</span>
                        <span>{r.x === 0 ? 'Direct' : r.x + ' transfer' + (r.x > 1 ? 's' : '')}</span>
                      </div>
                      <div className="text-[10px] text-tertiary font-semibold mt-0.5 truncate">{r.b}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Routes list */}
          {stopRouteDetails.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-5 text-center">
              <p className="text-on-surface-variant text-sm">No route data available for this stop</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stopRouteDetails.map(r => (
                <button
                  key={r.name}
                  className="w-full text-left bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3 hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                  onClick={() => navigate(`/routes/detail?id=${encodeURIComponent(r.id)}`)}
                >
                  {/* Route number */}
                  <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center flex-shrink-0 overflow-hidden px-1">
                    <span className="text-tertiary font-headline font-extrabold text-xs leading-tight text-center break-all">{r.name}</span>
                  </div>
                  {/* Route info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                      <span className="truncate max-w-[40%]">{r.first}</span>
                      {r.hasBoth ? (
                        <svg width="16" height="10" viewBox="0 0 16 10" className="flex-shrink-0">
                          <path d="M1 5h14M12 2l3 3-3 3" stroke="#6d28d9" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 5H1M4 8l-3-3 3-3" stroke="#6d28d9" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
                        </svg>
                      ) : (
                        <span className="text-outline flex-shrink-0 text-xs">→</span>
                      )}
                      <span className="truncate max-w-[40%]">{r.last}</span>
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      {r.stopCount} stops{r.hasBoth ? ' · Both directions' : ''}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-lg flex-shrink-0">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Quick Actions — Home, Work, Routes */}
      <section className="mb-8 space-y-2">
        {/* Home */}
        <div className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          </div>
          {savedPlaces.home ? (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Home</div>
                <div className="text-sm font-semibold text-on-surface truncate">{savedPlaces.home.name}</div>
              </div>
              <button onClick={() => navigate(`/routes?to=${encodeURIComponent(savedPlaces.home.name)}&toId=${savedPlaces.home.id}`)} className="text-primary text-xs font-bold px-2 py-1">Go</button>
              <button onClick={() => { removeSavedPlace('home'); setSavedPlacesState(getSavedPlaces()); }} className="text-outline text-xs px-1"><span className="material-symbols-outlined text-sm">close</span></button>
            </>
          ) : (
            <>
              <div className="flex-1"><span className="text-sm text-on-surface-variant">Set your home stop</span></div>
              <button onClick={() => setSettingPlace('home')} className="text-primary text-xs font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-sm">add</span>Set</button>
            </>
          )}
        </div>
        {/* Work */}
        <div className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-tertiary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
          </div>
          {savedPlaces.work ? (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Work</div>
                <div className="text-sm font-semibold text-on-surface truncate">{savedPlaces.work.name}</div>
              </div>
              <button onClick={() => navigate(`/routes?to=${encodeURIComponent(savedPlaces.work.name)}&toId=${savedPlaces.work.id}`)} className="text-tertiary text-xs font-bold px-2 py-1">Go</button>
              <button onClick={() => { removeSavedPlace('work'); setSavedPlacesState(getSavedPlaces()); }} className="text-outline text-xs px-1"><span className="material-symbols-outlined text-sm">close</span></button>
            </>
          ) : (
            <>
              <div className="flex-1"><span className="text-sm text-on-surface-variant">Set your work stop</span></div>
              <button onClick={() => setSettingPlace('work')} className="text-tertiary text-xs font-bold flex items-center gap-0.5"><span className="material-symbols-outlined text-sm">add</span>Set</button>
            </>
          )}
        </div>
        {/* All Routes */}
        <button onClick={() => navigate('/routes')} className="w-full bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3 hover:bg-surface-container-low transition-colors">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-on-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
          </div>
          <span className="text-sm font-semibold text-on-surface">Browse All Routes</span>
          <span className="material-symbols-outlined text-outline text-lg ml-auto">chevron_right</span>
        </button>
      </section>


      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <section className="mb-8">
          <h3 className="font-headline text-lg font-bold mb-3">Recent Trips</h3>
          <div className="space-y-2">
            {recentSearches.map((r, i) => (
              <button
                key={i}
                className="w-full text-left bg-surface-container-lowest p-4 rounded-xl flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                onClick={() => navigate(`/routes?from=${encodeURIComponent(r.from.name)}&fromId=${r.from.id}&to=${encodeURIComponent(r.to.name)}&toId=${r.to.id}`)}
              >
                <span className="material-symbols-outlined text-outline text-lg">history</span>
                <div className="flex-1 text-sm">
                  <span className="font-semibold text-on-surface">{r.from.name}</span>
                  <span className="text-outline mx-2">→</span>
                  <span className="font-semibold text-on-surface">{r.to.name}</span>
                </div>
                <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
              </button>
            ))}
          </div>
        </section>
      )}

    </main>

    {/* Place search bottom sheet — rendered at root level, above everything */}
    {settingPlace && (
      <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSettingPlace(null); setPlaceQuery(''); setPlaceResults([]); setGooglePlaceResults([]); }} />
        <div className="relative w-full max-w-2xl bg-[#f8f9ff] rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-5 max-h-[85dvh] flex flex-col animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden shadow-2xl">
          <div className="flex justify-center mb-4 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-outline-variant/30" />
          </div>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-4 flex-shrink-0">
            Set {settingPlace === 'home' ? 'Home' : 'Work'} Location
          </h3>
          <div className="relative mb-3 flex-shrink-0">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">search</span>
            <input
              className="w-full bg-surface-container-low rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-outline/60 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search any place, stop or area..."
              value={placeQuery}
              autoFocus
              onChange={e => {
                const q = e.target.value
                setPlaceQuery(q)
                if (q.length >= 1) setPlaceResults(searchStops(q, 6)); else setPlaceResults([])
                if (q.length >= 3) searchPlacesDebounced(q, setGooglePlaceResults); else setGooglePlaceResults([])
              }}
            />
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2 scrollbar-hide space-y-0.5">
            {resolvingPlace && (
              <div className="flex items-center justify-center py-6 gap-2 text-on-surface-variant text-sm">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Locating...
              </div>
            )}
            {!resolvingPlace && placeResults.length > 0 && (
              <>
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Bus Stops</div>
                {placeResults.map(stop => (
                  <button key={stop.id} className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-xl transition-colors active:scale-[0.98]"
                    onClick={() => {
                      setSavedPlace(settingPlace, { id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng })
                      setSavedPlacesState(getSavedPlaces())
                      setSettingPlace(null); setPlaceQuery(''); setPlaceResults([]); setGooglePlaceResults([])
                    }}>
                    <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-base">{stop.metro ? 'train' : 'directions_bus'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-on-surface text-sm truncate">{stop.name}</div>
                      {stop.zone && <div className="text-xs text-on-surface-variant">{stop.zone}</div>}
                    </div>
                  </button>
                ))}
              </>
            )}
            {!resolvingPlace && googlePlaceResults.length > 0 && (
              <>
                <div className={`px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ${placeResults.length > 0 ? 'pt-3 border-t border-outline-variant/10 mt-1' : 'pt-1'}`}>Places</div>
                {googlePlaceResults.map(place => (
                  <button key={place.id} className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-xl transition-colors active:scale-[0.98]"
                    onClick={async () => {
                      setResolvingPlace(true)
                      const resolved = await resolvePlaceLatLng(place.placeId)
                      setResolvingPlace(false)
                      if (!resolved) return
                      setSavedPlace(settingPlace, { id: place.id, name: resolved.name || place.name, lat: resolved.lat, lng: resolved.lng, isLocation: true })
                      setSavedPlacesState(getSavedPlaces())
                      setSettingPlace(null); setPlaceQuery(''); setPlaceResults([]); setGooglePlaceResults([])
                    }}>
                    <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-secondary text-base">location_on</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-on-surface text-sm truncate">{place.name}</div>
                      <div className="text-xs text-on-surface-variant truncate">{place.fullName}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {!resolvingPlace && placeQuery.length >= 2 && placeResults.length === 0 && googlePlaceResults.length === 0 && (
              <p className="text-center text-on-surface-variant text-sm py-8">No results found</p>
            )}
            {!resolvingPlace && placeQuery.length === 0 && (
              <p className="text-center text-outline text-sm py-8">Start typing to search</p>
            )}
          </div>
        </div>
      </div>
    )}

    <style>{`
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `}</style>
    </>
  )
}
