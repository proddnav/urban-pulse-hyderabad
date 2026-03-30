import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { findNearestStops, searchStops, getMetroData, getRoutesForStop, getRoute, getStop, getPrecomputedRoute } from '../lib/routing-engine'
import { getCurrentPosition, formatDistance, formatWalkTime } from '../lib/geo'
import { getRecentSearches, getSavedPlaces, setSavedPlace, removeSavedPlace } from '../lib/storage'

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

  useEffect(() => {
    if (searchQuery.length >= 1) {
      const results = searchStops(searchQuery)
      setSearchResults(results)
      setShowDropdown(true)
    } else {
      setSearchResults([])
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
          {showDropdown && searchResults.length > 0 && !selectedStop && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto border border-outline-variant/10">
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
                onClick={() => navigate(`/routes?to=${encodeURIComponent(r.to.name)}&toId=${r.to.id}`)}
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

      {/* Live Arrivals (Metro) */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-headline text-xl font-bold">Nearby Metro</h3>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-center">
              <span className="text-on-surface-variant text-sm">Locating nearby stations...</span>
            </div>
          ) : nearbyMetroStations.length === 0 ? (
            <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-center">
              <span className="text-on-surface-variant text-sm">No metro stations within range</span>
            </div>
          ) : (
            nearbyMetroStations.map(station => (
              <button
                key={station.id}
                className="w-full text-left bg-surface-container-lowest p-4 rounded-xl flex items-center gap-4 hover:bg-surface-container-low transition-colors"
                onClick={() => navigate(`/stops/${station.id}`)}
              >
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-2xl">train</span>
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-base leading-tight">{station.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 bg-primary-fixed text-on-primary-fixed text-[10px] font-bold rounded-full">
                      {station.lineName?.toUpperCase() || 'METRO'}
                    </span>
                    <span className="text-on-surface-variant text-xs">{formatDistance(station.distance)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold text-lg">{formatWalkTime(station.distance).replace(' walk', '')}</p>
                  <p className="text-on-surface-variant text-[10px] font-medium">WALK</p>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Nearby Buses */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="font-headline text-xl font-bold">Nearby Buses</h3>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-center">
              <span className="text-on-surface-variant text-sm">Finding nearby stops...</span>
            </div>
          ) : nearbyBusStops.length === 0 ? (
            <div className="bg-surface-container-lowest p-5 rounded-xl flex items-center justify-center">
              <span className="text-on-surface-variant text-sm">No bus stops within range</span>
            </div>
          ) : (
            nearbyBusStops.map(stop => {
              const routes = getRoutesForStop(stop.id)?.slice(0, 4) || []
              return (
                <button
                  key={stop.id}
                  className="w-full text-left bg-surface-container-lowest p-4 rounded-xl flex items-center gap-4 hover:bg-surface-container-low transition-colors"
                  onClick={() => navigate(`/stops/${stop.id}`)}
                >
                  <div className="w-12 h-12 bg-tertiary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-2xl">directions_bus</span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-base">{stop.name}</h4>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {routes.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {routes.map(r => (
                            <span key={r} className="px-1.5 py-0.5 bg-tertiary/10 text-tertiary text-[10px] font-bold rounded">
                              {r}
                            </span>
                          ))}
                          {getRoutesForStop(stop.id)?.length > 4 && (
                            <span className="text-[10px] text-on-surface-variant">+{getRoutesForStop(stop.id).length - 4}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">{formatDistance(stop.distance)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-tertiary font-bold text-lg">{formatWalkTime(stop.distance).replace(' walk', '')}</p>
                    <span className="inline-block w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </section>
    </main>

    {/* Place search bottom sheet — rendered at root level, above everything */}
    {settingPlace && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => { setSettingPlace(null); setPlaceQuery(''); setPlaceResults([]); }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '28rem', background: '#f8f9ff', borderRadius: '1.5rem 1.5rem 0 0', padding: '1.5rem', paddingBottom: '2.5rem', maxHeight: '75vh', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><div style={{ width: '2.5rem', height: '0.25rem', borderRadius: '9999px', background: '#ccc' }} /></div>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-4">
            Set {settingPlace === 'home' ? 'Home' : 'Work'} Location
          </h3>
          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">search</span>
            <input
              className="w-full bg-surface-container-low rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-outline/60 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search for a bus stop..."
              value={placeQuery}
              onChange={e => { setPlaceQuery(e.target.value); if (e.target.value.length >= 2) setPlaceResults(searchStops(e.target.value, 10)); else setPlaceResults([]); }}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            {placeResults.map(stop => (
              <button
                key={stop.id}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-xl transition-colors"
                onClick={() => {
                  setSavedPlace(settingPlace, { id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng });
                  setSavedPlacesState(getSavedPlaces());
                  setSettingPlace(null); setPlaceQuery(''); setPlaceResults([]);
                }}
              >
                <span className="material-symbols-outlined text-on-surface-variant text-lg">{stop.metro ? 'train' : 'directions_bus'}</span>
                <div>
                  <div className="font-semibold text-on-surface text-sm">{stop.name}</div>
                  {stop.zone && <div className="text-xs text-on-surface-variant">{stop.zone}</div>}
                </div>
              </button>
            ))}
            {placeQuery.length >= 2 && placeResults.length === 0 && (
              <p className="text-center text-on-surface-variant text-sm py-4">No stops found</p>
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
    `}</style>
    </>
  )
}
