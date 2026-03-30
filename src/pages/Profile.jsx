import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRecentSearches, getFavoriteStops, getFavoriteRoutes, getSavedPlaces, setSavedPlace, removeSavedPlace, toggleFavoriteRoute } from '../lib/storage'
import { searchStops, getRoute, getRoutesForStop } from '../lib/routing-engine'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [recents] = useState(() => getRecentSearches(5))
  const [favRoutes, setFavRoutes] = useState(() => getFavoriteRoutes())
  const [favStops] = useState(() => getFavoriteStops())
  const [savedPlaces, setSavedPlacesState] = useState(() => getSavedPlaces())

  // Place setting modal
  const [settingPlace, setSettingPlace] = useState(null) // 'home' | 'work' | null
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState([])

  function handlePlaceSearch(q) {
    setPlaceQuery(q)
    if (q.length >= 2) setPlaceResults(searchStops(q, 10))
    else setPlaceResults([])
  }

  function handleSelectPlace(stop) {
    setSavedPlace(settingPlace, { id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng })
    setSavedPlacesState(getSavedPlaces())
    setSettingPlace(null)
    setPlaceQuery('')
    setPlaceResults([])
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
        <div className="grid grid-cols-2 gap-3">
          {/* Home */}
          <div className="bg-surface-container-lowest rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
              <span className="font-semibold text-on-surface text-sm">Home</span>
            </div>
            {savedPlaces.home ? (
              <div>
                <p className="text-sm text-on-surface font-medium truncate">{savedPlaces.home.name}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate(`/routes?fromId=${savedPlaces.home.id}&from=${encodeURIComponent(savedPlaces.home.name)}`)}
                    className="text-[10px] font-bold text-primary uppercase tracking-wide"
                  >Navigate</button>
                  <button onClick={() => handleRemovePlace('home')} className="text-[10px] font-bold text-outline uppercase tracking-wide">Remove</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSettingPlace('home')}
                className="text-sm text-primary font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Set Home
              </button>
            )}
          </div>

          {/* Work */}
          <div className="bg-surface-container-lowest rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>work</span>
              <span className="font-semibold text-on-surface text-sm">Work</span>
            </div>
            {savedPlaces.work ? (
              <div>
                <p className="text-sm text-on-surface font-medium truncate">{savedPlaces.work.name}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => navigate(`/routes?fromId=${savedPlaces.work.id}&from=${encodeURIComponent(savedPlaces.work.name)}`)}
                    className="text-[10px] font-bold text-primary uppercase tracking-wide"
                  >Navigate</button>
                  <button onClick={() => handleRemovePlace('work')} className="text-[10px] font-bold text-outline uppercase tracking-wide">Remove</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setSettingPlace('work')}
                className="text-sm text-tertiary font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Set Work
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Place search modal */}
      {settingPlace && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => { setSettingPlace(null); setPlaceQuery(''); setPlaceResults([]); }} />
          <div className="relative w-full max-w-md bg-surface rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-outline/30" /></div>
            <h3 className="font-headline text-lg font-bold text-on-surface mb-4">
              Set {settingPlace === 'home' ? 'Home' : 'Work'} Location
            </h3>
            <div className="relative mb-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-lg">search</span>
              <input
                className="w-full bg-surface-container-low rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-outline/60 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search for a stop..."
                value={placeQuery}
                onChange={e => handlePlaceSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              {placeResults.map(stop => (
                <button
                  key={stop.id}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low rounded-xl transition-colors"
                  onClick={() => handleSelectPlace(stop)}
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
