import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecentSearches, getFavoriteStops, getFavoriteRoutes, getSavedPlaces, setSavedPlace, removeSavedPlace, toggleFavoriteRoute } from '../lib/storage'
import { searchStops, getRoute, getRoutesForStop } from '../lib/routing-engine'
import { searchPlacesDebounced, resolvePlaceLatLng } from '../lib/places'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [recents] = useState(() => getRecentSearches(5))
  const [favRoutes, setFavRoutes] = useState(() => getFavoriteRoutes())
  const [favStops] = useState(() => getFavoriteStops())
  const [savedPlaces, setSavedPlacesState] = useState(() => getSavedPlaces())

  // Re-read from localStorage after Firestore sync completes
  useEffect(() => {
    const onSynced = () => setSavedPlacesState(getSavedPlaces())
    window.addEventListener('urbanpulse:synced', onSynced)
    return () => window.removeEventListener('urbanpulse:synced', onSynced)
  }, [])

  // Place setting modal
  const [settingPlace, setSettingPlace] = useState(null) // 'home' | 'work' | null
  const [placeQuery, setPlaceQuery] = useState('')
  const [stopResults, setStopResults] = useState([])
  const [placeResults, setPlaceResults] = useState([])
  const [resolvingPlace, setResolvingPlace] = useState(false)

  function handlePlaceSearch(q) {
    setPlaceQuery(q)
    if (q.length >= 1) setStopResults(searchStops(q, 6))
    else setStopResults([])
    if (q.length >= 3) searchPlacesDebounced(q, setPlaceResults)
    else setPlaceResults([])
  }

  function closeModal() {
    setSettingPlace(null)
    setPlaceQuery('')
    setStopResults([])
    setPlaceResults([])
  }

  function handleSelectStop(stop) {
    setSavedPlace(settingPlace, { id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng })
    setSavedPlacesState(getSavedPlaces())
    closeModal()
  }

  async function handleSelectGooglePlace(place) {
    setResolvingPlace(true)
    const resolved = await resolvePlaceLatLng(place.placeId)
    setResolvingPlace(false)
    if (!resolved) return
    setSavedPlace(settingPlace, { id: place.id, name: resolved.name || place.name, lat: resolved.lat, lng: resolved.lng, isLocation: true })
    setSavedPlacesState(getSavedPlaces())
    closeModal()
  }

  function handleRemovePlace(key) {
    removeSavedPlace(key)
    setSavedPlacesState(getSavedPlaces())
  }

  function handleRemoveFavRoute(routeId) {
    toggleFavoriteRoute(routeId)
    setFavRoutes(getFavoriteRoutes())
  }

  return (
    <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Profile Header */}
      <section className="mt-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img alt="Profile" className="w-full h-full object-cover" src={user.photoURL} />
            ) : (
              <span className="material-symbols-outlined text-primary text-3xl">person</span>
            )}
          </div>
          <div>
            <h2 className="font-headline text-xl font-extrabold text-on-surface">{user?.displayName || 'Commuter'}</h2>
            <p className="text-on-surface-variant text-sm">{user?.email || ''}</p>
          </div>
        </div>
      </section>

      {/* Saved Places — Home & Work */}
      <section className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Saved Places</h3>
        <div className="flex flex-col gap-3">
          {[
            { key: 'home', label: 'Home', icon: 'home', color: 'text-primary', bg: 'bg-primary/10' },
            { key: 'work', label: 'Work', icon: 'work', color: 'text-tertiary', bg: 'bg-tertiary/10' },
          ].map(({ key, label, icon, color, bg }) => {
            const saved = savedPlaces[key]
            return (
              <div key={key} className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <span className={`material-symbols-outlined text-xl ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5">{label}</div>
                  {saved ? (
                    <p className="text-sm font-semibold text-on-surface truncate">{saved.name}</p>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Not set</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {saved && (
                    <>
                      <button
                        onClick={() => {
                          if (saved.isLocation) navigate(`/routes?from=${encodeURIComponent(saved.name)}`)
                          else navigate(`/routes?fromId=${saved.id}&from=${encodeURIComponent(saved.name)}`)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                      >Route</button>
                      <button onClick={() => handleRemovePlace(key)} className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error/10 transition-colors">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSettingPlace(key)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">{saved ? 'edit' : 'add'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Place search modal */}
      {settingPlace && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-10 max-h-[80vh] flex flex-col">
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-outline/30" /></div>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settingPlace === 'home' ? 'bg-primary/10' : 'bg-tertiary/10'}`}>
                <span className={`material-symbols-outlined text-lg ${settingPlace === 'home' ? 'text-primary' : 'text-tertiary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {settingPlace === 'home' ? 'home' : 'work'}
                </span>
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Set {settingPlace === 'home' ? 'Home' : 'Work'} Location
              </h3>
            </div>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">search</span>
              <input
                className="w-full bg-surface-container-low rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-outline/60 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search any place, stop or area..."
                value={placeQuery}
                onChange={e => handlePlaceSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 space-y-0.5">
              {resolvingPlace && (
                <div className="flex items-center justify-center py-6 gap-2 text-on-surface-variant text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Locating...
                </div>
              )}
              {!resolvingPlace && stopResults.length > 0 && (
                <>
                  <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Bus Stops</div>
                  {stopResults.map(stop => (
                    <button key={stop.id} className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-xl transition-colors" onClick={() => handleSelectStop(stop)}>
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
              {!resolvingPlace && placeResults.length > 0 && (
                <>
                  <div className={`px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ${stopResults.length > 0 ? 'pt-3 border-t border-outline-variant/10 mt-2' : ''}`}>Places</div>
                  {placeResults.map(place => (
                    <button key={place.id} className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-xl transition-colors" onClick={() => handleSelectGooglePlace(place)}>
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
              {!resolvingPlace && placeQuery.length >= 2 && stopResults.length === 0 && placeResults.length === 0 && (
                <p className="text-center text-on-surface-variant text-sm py-6">No results found</p>
              )}
              {!resolvingPlace && placeQuery.length === 0 && (
                <p className="text-center text-on-surface-variant text-sm py-6 opacity-60">Start typing to search</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Favorite Routes */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Favorite Routes</h3>
          <button
            onClick={() => navigate('/routes')}
            className="text-xs font-semibold text-primary"
          >Browse Routes</button>
        </div>
        {favRoutes.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-5 text-center">
            <span className="material-symbols-outlined text-outline/30 text-3xl mb-2 block">star</span>
            <p className="text-sm text-on-surface-variant">No favorite routes yet</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Browse routes and tap the star to save them here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {favRoutes.map(routeId => {
              const r = getRoute(routeId)
              const dir0 = r?.directions?.['0'] || []
              const first = dir0[0]?.name || '—'
              const last = dir0[dir0.length - 1]?.name || '—'
              return (
                <div key={routeId} className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-tertiary/10 flex items-center justify-center flex-shrink-0 overflow-hidden px-1">
                    <span className="text-tertiary font-headline font-extrabold text-xs text-center break-all">{r?.name || routeId}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-on-surface truncate">{first} → {last}</div>
                    <div className="text-xs text-on-surface-variant">{dir0.length} stops</div>
                  </div>
                  <button onClick={() => handleRemoveFavRoute(routeId)} className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </button>
                  <button onClick={() => navigate(`/routes/detail?id=${encodeURIComponent(routeId)}`)} className="text-outline">
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Searches */}
      {recents.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">Recent Searches</h3>
          <div className="space-y-2">
            {recents.map((r, i) => (
              <button
                key={i}
                className="w-full text-left bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
                onClick={() => navigate(`/routes?fromId=${r.from.id}&from=${encodeURIComponent(r.from.name)}&toId=${r.to.id}&to=${encodeURIComponent(r.to.name)}`)}
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

      {/* About + Actions */}
      <section className="space-y-2 mb-8">
        <div className="bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>directions_transit</span>
          </div>
          <div className="flex-1">
            <span className="font-bold text-on-surface text-sm">The Urban Pulse</span>
            <p className="text-[10px] text-on-surface-variant">1,031 routes · 5,028 stops · 3 metro lines</p>
          </div>
        </div>
        <a
          href="https://urbantransit.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-left bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">language</span>
          <span className="text-sm font-semibold text-on-surface flex-1">urbantransit.vercel.app</span>
          <span className="material-symbols-outlined text-outline text-lg">open_in_new</span>
        </a>
        <button
          onClick={() => navigate('/terms')}
          className="w-full text-left bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">description</span>
          <span className="text-sm font-semibold text-on-surface flex-1">Terms of Service</span>
          <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
        </button>
        <button
          onClick={() => navigate('/privacy')}
          className="w-full text-left bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">shield</span>
          <span className="text-sm font-semibold text-on-surface flex-1">Privacy Policy</span>
          <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
        </button>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full text-left bg-surface-container-lowest rounded-xl p-4 flex items-center gap-3 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-secondary">logout</span>
          <span className="text-sm font-semibold text-secondary flex-1">Sign Out</span>
        </button>
      </section>
    </main>
  )
}
