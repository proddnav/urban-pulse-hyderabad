import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { findRoutes, searchStops, getReachableStopIds, getRoutesForStop, searchRouteIndex, getPrecomputedRoute } from '../lib/routing-engine'
import { calculateRouteFare, formatFare } from '../lib/fare'
import { getCurrentPosition } from '../lib/geo'
import { getRecentSearches, addRecentSearch, toggleFavoriteRoute, getFavoriteRoutes } from '../lib/storage'
import RouteMap from '../components/RouteMap'

export default function RoutesPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('search') // 'search' | 'browse'
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [fromStop, setFromStop] = useState(null)
  const [toStop, setToStop] = useState(null)
  const [fromResults, setFromResults] = useState([])
  const [toResults, setToResults] = useState([])
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)
  const [routes, setRoutes] = useState(null)
  const [searching, setSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [locating, setLocating] = useState(false)
  const [browseQuery, setBrowseQuery] = useState('')
  const [browseResults, setBrowseResults] = useState([])
  const toInputRef = useRef(null)
  const [favRoutes, setFavRoutes] = useState(() => getFavoriteRoutes())

  // Load recents on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
    // Check if origin/destination was passed via URL params
    const fromName = searchParams.get('from')
    const fromId = searchParams.get('fromId')
    if (fromName && fromId) {
      setFromQuery(fromName)
      setFromStop({ id: fromId, name: fromName })
    }
    const destName = searchParams.get('to')
    const destId = searchParams.get('toId')
    if (destName && destId) {
      setToQuery(destName)
      setToStop({ id: destId, name: destName })
    }
  }, [searchParams])

  useEffect(() => {
    if (fromQuery.length >= 1 && !fromStop) {
      setFromResults(searchStops(fromQuery))
      setShowFromDropdown(true)
    } else if (!fromStop && fromQuery.length === 0) {
      setFromResults([])
      setShowFromDropdown(false)
    } else {
      setFromResults([])
      setShowFromDropdown(false)
    }
  }, [fromQuery, fromStop, recentSearches])

  useEffect(() => {
    if (toQuery.length >= 1 && !toStop) {
      // Always show all stops, mark direct ones with badge
      if (fromStop && !fromStop.isLocation) {
        const allResults = searchStops(toQuery)
        const reachable = getReachableStopIds(fromStop.id)
        // Sort: direct stops first, then transfers
        const marked = allResults.map(s => ({ ...s, direct: reachable.has(s.id) }))
        marked.sort((a, b) => (a.direct === b.direct ? 0 : a.direct ? -1 : 1))
        setToResults(marked)
      } else {
        setToResults(searchStops(toQuery))
      }
      setShowToDropdown(true)
    } else {
      setToResults([])
      setShowToDropdown(false)
    }
  }, [toQuery, toStop, fromStop])

  // Browse routes — only show results when user types something
  useEffect(() => {
    if (activeTab === 'browse') {
      if (browseQuery.length >= 1) {
        setBrowseResults(searchRouteIndex(browseQuery, 30))
      } else {
        setBrowseResults([])
      }
    }
  }, [browseQuery, activeTab])

  function handleSearch() {
    if (!fromStop || !toStop) return
    setSearching(true)
    setTimeout(() => {
      try {
        const results = findRoutes(fromStop.id, toStop.id)
        setRoutes(results)
        addRecentSearch(
          { id: fromStop.id, name: fromStop.name, metro: fromStop.metro },
          { id: toStop.id, name: toStop.name, metro: toStop.metro }
        )
        setRecentSearches(getRecentSearches())
      } catch (err) {
        console.error('Route search error:', err)
        setRoutes([])
      }
      setSearching(false)
    }, 50)
  }

  function handleSwap() {
    setFromQuery(toQuery)
    setToQuery(fromQuery)
    setFromStop(toStop)
    setToStop(fromStop)
    setRoutes(null)
  }

  function selectFrom(stop) {
    setFromStop(stop)
    setFromQuery(stop.name)
    setShowFromDropdown(false)
    // Auto-focus "To" field
    setTimeout(() => toInputRef.current?.focus(), 100)
  }

  function selectTo(stop) {
    setToStop(stop)
    setToQuery(stop.name)
    setShowToDropdown(false)
  }

  function clearFrom() {
    setFromQuery('')
    setFromStop(null)
    setRoutes(null)
  }

  function clearTo() {
    setToQuery('')
    setToStop(null)
    setRoutes(null)
  }

  async function useMyLocation(field) {
    setLocating(true)
    try {
      const loc = await getCurrentPosition()
      const stop = { id: `loc_${loc.lat}_${loc.lng}`, name: 'My Location', lat: loc.lat, lng: loc.lng, isLocation: true }
      if (field === 'from') {
        setFromStop(stop)
        setFromQuery('My Location')
        setShowFromDropdown(false)
        setTimeout(() => toInputRef.current?.focus(), 100)
      } else {
        setToStop(stop)
        setToQuery('My Location')
        setShowToDropdown(false)
      }
    } catch {
      // Location not available
    }
    setLocating(false)
  }

  function loadRecent(recent) {
    setFromStop(recent.from)
    setFromQuery(recent.from.name)
    setToStop(recent.to)
    setToQuery(recent.to.name)
    setRoutes(null)
    setShowFromDropdown(false)
    setShowToDropdown(false)
    // Auto-search
    setTimeout(() => {
      const results = findRoutes(recent.from.id, recent.to.id)
      setRoutes(results)
    }, 50)
  }

  function segmentIcon(type) {
    if (type === 'metro') return 'train'
    if (type === 'walk') return 'directions_walk'
    return 'directions_bus'
  }

  function segmentColor(type) {
    if (type === 'metro') return 'bg-primary'
    if (type === 'walk') return 'bg-outline-variant'
    return 'bg-tertiary'
  }

  function segmentBarColor(type) {
    if (type === 'metro') return 'bg-primary'
    if (type === 'walk') return 'bg-outline-variant'
    return 'bg-tertiary'
  }

  function StopDropdownItem({ stop, onSelect }) {
    const routeNames = stop.routes || getRoutesForStop(stop.id)?.slice(0, 4) || []
    const isDirect = stop.direct === true
    const stopCount = stop.stopCount || 0
    return (
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low transition-colors first:rounded-t-xl last:rounded-b-xl"
        onMouseDown={() => onSelect(stop)}
      >
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          isDirect ? 'bg-tertiary/10' : 'bg-surface-container-high'
        }`}>
          <span className={`material-symbols-outlined text-lg ${isDirect ? 'text-tertiary' : 'text-on-surface-variant'}`}>
            {stop.metro ? 'train' : 'directions_bus'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface text-sm truncate">{stop.name}</span>
            {isDirect && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-tertiary/10 text-tertiary text-[10px] font-bold rounded uppercase tracking-wide">
                Direct{stopCount > 0 ? ` · ${stopCount} stops` : ''}
              </span>
            )}
            {stop.direct === false && (
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded uppercase tracking-wide">
                Transfer
              </span>
            )}
          </div>
          <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1 flex-wrap">
            {stop.metro ? (
              <span className="text-primary font-medium">{stop.lineName || 'Metro'}</span>
            ) : stop.zone ? (
              <span>{stop.zone}</span>
            ) : null}
            {routeNames.length > 0 && (
              <>
                {(stop.metro || stop.zone) && <span className="opacity-40">·</span>}
                <span className="font-medium text-tertiary">{routeNames.slice(0, 4).join(', ')}</span>
                {routeNames.length > 4 && <span className="text-outline">+{routeNames.length - 4}</span>}
              </>
            )}
          </div>
        </div>
      </button>
    )
  }

  function gmapsUrl(stop) {
    if (!stop?.lat) return null
    return `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`
  }

  function RouteCard({ route, idx, fromStop, toStop, defaultOpen }) {
    const [open, setOpen] = useState(defaultOpen)
    const fare = calculateRouteFare(route.segments)
    const transitSegments = route.segments.filter(s => s.type !== 'walk')
    const isFirst = idx === 0

    const tagColor = {
      'Direct': 'bg-tertiary/10 text-tertiary',
      'Recommended': 'bg-primary-container text-on-primary-container',
      'Fastest': 'bg-primary-container text-on-primary-container',
      'Fewer Transfers': 'bg-tertiary/10 text-tertiary',
      'Direct · Fewer Transfers': 'bg-tertiary/10 text-tertiary',
    }[route.tag] || 'bg-surface-container-high text-on-surface-variant'

    return (
      <div className={isFirst
        ? 'bg-surface-container-lowest rounded-2xl shadow-sm ring-1 ring-primary/5 relative overflow-hidden'
        : 'bg-surface-container-low rounded-2xl border border-transparent hover:border-outline-variant/20 transition-all relative overflow-hidden'
      }>
        {/* Collapsed summary — always visible, tap to expand */}
        <button
          className="w-full text-left p-5 flex items-center gap-4"
          onClick={() => setOpen(!open)}
        >
          {/* Route icons */}
          <div className="flex -space-x-1.5 flex-shrink-0">
            {transitSegments.length === 0 ? (
              <div className="w-10 h-10 rounded-xl bg-outline-variant flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-lg">directions_walk</span>
              </div>
            ) : (
              transitSegments.slice(0, 3).map((seg, si) => (
                <div key={si} className={`w-10 h-10 rounded-xl ${segmentColor(seg.type)} flex items-center justify-center text-white ring-2 ${isFirst ? 'ring-surface-container-lowest' : 'ring-surface-container-low'}`}>
                  <span className="material-symbols-outlined text-lg">{segmentIcon(seg.type)}</span>
                </div>
              ))
            )}
          </div>
          {/* Time + info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl font-headline font-extrabold text-on-surface">{route.totalTimeMin} min</span>
              {route.tag && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${tagColor}`}>{route.tag}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Bus numbers inline */}
              <div className="flex items-center gap-1 flex-wrap">
                {transitSegments.map((seg, si) => {
                  const rName = seg.routes?.slice().sort((a, b) => { const aS = a.includes('/') ? 1 : 0, bS = b.includes('/') ? 1 : 0; return aS !== bS ? aS - bS : a.length - b.length; })[0]
                  return (
                    <span key={si} className="flex items-center gap-0.5">
                      {si > 0 && <span className="text-outline text-xs">→</span>}
                      <button
                        className={`text-xs font-bold underline decoration-dotted underline-offset-2 ${seg.type === 'metro' ? 'text-primary' : 'text-tertiary'}`}
                        onClick={e => { e.stopPropagation(); navigate(`/routes/detail?id=${encodeURIComponent(rName)}`); }}
                      >{rName}</button>
                    </span>
                  )
                })}
              </div>
              <span className="text-xs text-on-surface-variant">
                · {route.transfers > 0 ? `${route.transfers} transfer${route.transfers > 1 ? 's' : ''}` : 'Direct'}
                · {formatFare(fare)}
              </span>
            </div>
          </div>
          {/* Expand icon */}
          <span className={`material-symbols-outlined text-on-surface-variant text-xl transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
        </button>

        {/* Expanded details */}
        {open && (
          <div className="px-5 pb-5 pt-0">
            {/* Segment bar */}
            <div className="flex items-center gap-1 mb-4 px-1">
              {route.segments.map((seg, si) => (
                <div key={si} className="flex items-center gap-0.5 flex-1">
                  {si === 0 && <div className={`w-2 h-2 rounded-full ${segmentBarColor(seg.type)}`}></div>}
                  <div className={`h-1 flex-1 ${segmentBarColor(seg.type)} rounded-full`}></div>
                  {si < route.segments.length - 1 && <div className="w-2.5 h-2.5 rounded-full border-2 border-outline-variant bg-white"></div>}
                  {si === route.segments.length - 1 && <div className={`w-2 h-2 rounded-full ${segmentBarColor(seg.type)}`}></div>}
                </div>
              ))}
            </div>

            {/* Map */}
            <RouteMap segments={route.segments} />

            {/* Step-by-step visual timeline */}
            <div className="mt-4">
              {route.segments.map((seg, si) => {
                const board = seg.stops[0]
                const alight = seg.stops[seg.stops.length - 1]
                // Pick the route name that's most recognizable — prefer short names without '/'
                const bestRoute = seg.routes?.slice().sort((a, b) => {
                  const aSlash = a.includes('/') ? 1 : 0
                  const bSlash = b.includes('/') ? 1 : 0
                  if (aSlash !== bSlash) return aSlash - bSlash
                  return a.length - b.length
                })[0]
                const mins = Math.ceil(seg.totalTime / 60)
                const midStops = seg.stops?.slice(1, -1) || []
                const dotColor = seg.type === 'metro' ? '#1a56db' : seg.type === 'walk' ? '#9ca3af' : '#6d28d9'
                const dotBg = seg.type === 'metro' ? 'bg-primary' : 'bg-tertiary'
                const dotRing = seg.type === 'metro' ? 'ring-primary/15' : 'ring-tertiary/15'
                const badgeCls = seg.type === 'metro' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
                const isLast = si === route.segments.length - 1

                if (seg.type === 'walk') {
                  return (
                    <div key={si} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-container-high/40 my-1">
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">directions_walk</span>
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="text-on-surface-variant">Walk to </span>
                        <a href={gmapsUrl(alight)} target="_blank" rel="noopener" className="font-semibold text-on-surface">{alight?.name}</a>
                      </div>
                      <span className="flex-shrink-0 text-xs font-bold text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded-lg">{mins} min</span>
                      {alight?.lat && <a href={gmapsUrl(alight)} target="_blank" rel="noopener" className="flex-shrink-0 text-primary opacity-50 hover:opacity-100"><span className="material-symbols-outlined text-sm">map</span></a>}
                    </div>
                  )
                }

                return (
                  <div key={si} className="flex gap-3">
                    {/* Visual track — stretches to match content height */}
                    <div className="flex flex-col items-center w-7 flex-shrink-0">
                      <div className="relative w-7 flex-1 min-h-[48px]">
                        {/* Vertical line — full height */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-[12px] bottom-[12px] w-[3px] rounded-full" style={{ background: dotColor, opacity: 0.15 }}></div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-[12px] bottom-[12px] w-[1.5px] rounded-full" style={{ background: dotColor, opacity: 0.35 }}></div>
                        {/* Board dot — top */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2">
                          <svg width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" fill={dotColor} opacity="0.12"/>
                            <circle cx="12" cy="12" r="6" fill={dotColor}/>
                            <circle cx="12" cy="12" r="2.5" fill="white"/>
                          </svg>
                        </div>
                        {/* Alight dot — bottom */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                          <svg width="24" height="24" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" fill={isLast ? '#dc2626' : dotColor} opacity="0.12"/>
                            <circle cx="12" cy="12" r="6" fill={isLast ? '#dc2626' : dotColor}/>
                            <circle cx="12" cy="12" r="2.5" fill="white"/>
                          </svg>
                        </div>
                      </div>
                      {/* Dashed connector to next segment */}
                      {!isLast && (
                        <div className="w-7 h-4 flex justify-center">
                          <svg width="2" height="16" viewBox="0 0 2 16"><line x1="1" y1="0" x2="1" y2="16" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="3 3"/></svg>
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-1 min-w-0">
                      {/* Route badge — tap to see full route */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <button
                          onClick={() => navigate(`/routes/detail?id=${encodeURIComponent(bestRoute)}`)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs ${badgeCls} hover:opacity-80 active:scale-95 transition-all`}
                        >
                          <span className="material-symbols-outlined text-xs">{segmentIcon(seg.type)}</span>
                          {bestRoute}
                          <span className="material-symbols-outlined text-[10px] opacity-50">open_in_new</span>
                        </button>
                        <span className="text-[11px] text-on-surface-variant">{seg.stops.length} stops · {mins} min</span>
                      </div>
                      {/* Board stop */}
                      <div className="flex items-center gap-1.5" style={{ height: '24px' }}>
                        <a href={gmapsUrl(board)} target="_blank" rel="noopener" className="font-bold text-on-surface text-[13px]">{board?.name}</a>
                        {board?.lat && <a href={gmapsUrl(board)} target="_blank" rel="noopener" className="text-primary opacity-40 hover:opacity-100"><span className="material-symbols-outlined text-sm">map</span></a>}
                      </div>
                      {/* Mid stops — compact flowing chain */}
                      {midStops.length > 0 && (
                        <div className="py-1 flex flex-wrap items-center gap-y-0.5">
                          {midStops.map((stop, ii) => (
                            <span key={ii} className="inline-flex items-center">
                              <a href={gmapsUrl(stop)} target="_blank" rel="noopener"
                                className="inline-flex items-center gap-0.5 text-[10px] text-on-surface-variant/60 hover:text-on-surface transition-colors px-0.5">
                                <svg width="6" height="6" viewBox="0 0 6 6" className="flex-shrink-0">
                                  <circle cx="3" cy="3" r="2" fill="white" stroke={dotColor} strokeWidth="1.2" strokeOpacity="0.5"/>
                                </svg>
                                {stop?.name}
                              </a>
                              {ii < midStops.length - 1 && (
                                <svg width="8" height="8" viewBox="0 0 8 8" className="flex-shrink-0 opacity-30">
                                  <path d="M2 4h4M4.5 2.5L6 4l-1.5 1.5" stroke={dotColor} strokeWidth="1" fill="none" strokeLinecap="round"/>
                                </svg>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Alight stop */}
                      <div className="flex items-center gap-1.5" style={{ height: '24px' }}>
                        <a href={gmapsUrl(alight)} target="_blank" rel="noopener" className="font-bold text-on-surface text-[13px]">{alight?.name}</a>
                        {alight?.lat && <a href={gmapsUrl(alight)} target="_blank" rel="noopener" className="text-primary opacity-40 hover:opacity-100"><span className="material-symbols-outlined text-sm">map</span></a>}
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* Final destination — arrival */}
              <div className="flex gap-3 items-center pt-2 pb-1">
                <div className="w-7 flex justify-center">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="12" fill="#dc2626" opacity="0.1"/>
                    <circle cx="14" cy="14" r="8" fill="#dc2626" opacity="0.2"/>
                    <circle cx="14" cy="14" r="5" fill="#dc2626"/>
                    <path d="M10 14l3 3 5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-0.5">You've arrived</div>
                  <a href={gmapsUrl(toStop)} target="_blank" rel="noopener" className="text-sm font-bold text-on-surface">{toStop?.name}</a>
                </div>
                {toStop?.lat && <a href={gmapsUrl(toStop)} target="_blank" rel="noopener" className="text-primary text-xs font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">map</span>Maps</a>}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <main className="mt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Tab Bar */}
      <section className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'search'
              ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1">search</span>
          Find Route
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'browse'
              ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-base align-middle mr-1">list</span>
          Browse Routes
        </button>
      </section>

      {activeTab === 'search' && (
        <>
          {/* Search Context Header */}
          <section className="py-4">
            <h2 className="text-3xl font-headline font-extrabold text-on-surface leading-tight mb-4">Where to, Hyderabad?</h2>
            <div className="bg-surface-container-low rounded-3xl p-5 relative overflow-visible">
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-3 h-3 rounded-full bg-primary"></span>
                    <div className="w-0.5 h-8 bg-outline-variant opacity-30 my-1"></div>
                    <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    {/* From input */}
                    <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">From</div>
                    <div className="relative">
                      <input
                        className="w-full font-semibold text-on-surface bg-transparent border-none outline-none focus:ring-0 p-0 pr-8 text-[15px]"
                        placeholder="Search origin or area..."
                        value={fromQuery}
                        onChange={e => { setFromQuery(e.target.value); setFromStop(null); setRoutes(null); }}
                        onFocus={() => {
                          if (fromResults.length > 0) setShowFromDropdown(true)
                        }}
                        onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
                      />
                      {fromQuery && (
                        <button onClick={clearFrom} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      )}
                      {showFromDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto border border-outline-variant/10">
                          {/* Near me option */}
                          {fromResults.map(stop => (
                            <StopDropdownItem key={stop.id} stop={stop} onSelect={selectFrom} />
                          ))}
                          {fromQuery.length >= 2 && fromResults.length === 0 && (
                            <div className="px-4 py-4 text-center text-on-surface-variant text-sm">
                              No stops found for "{fromQuery}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="h-px bg-outline-variant opacity-20 w-full mt-1"></div>
                    <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">To</div>
                    <div className="relative">
                      <input
                        ref={toInputRef}
                        className="w-full font-semibold text-on-surface bg-transparent border-none outline-none focus:ring-0 p-0 pr-8 text-[15px]"
                        placeholder="Search destination..."
                        value={toQuery}
                        onChange={e => { setToQuery(e.target.value); setToStop(null); setRoutes(null); }}
                        onFocus={() => {
                          if (toResults.length > 0) setShowToDropdown(true)
                        }}
                        onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
                      />
                      {toQuery && (
                        <button onClick={clearTo} className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      )}
                      {showToDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto border border-outline-variant/10">
                          {toResults.map(stop => (
                            <StopDropdownItem key={stop.id} stop={stop} onSelect={selectTo} />
                          ))}
                          {toQuery.length >= 2 && toResults.length === 0 && (
                            <div className="px-4 py-4 text-center text-on-surface-variant text-sm">
                              No stops found for "{toQuery}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-surface-container-high transition-colors active:scale-95"
                    onClick={handleSwap}
                    title="Swap origin and destination"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-xl">swap_vert</span>
                  </button>
                </div>
                {fromStop && toStop && (
                  <button
                    className="w-full bg-primary text-on-primary rounded-xl py-3.5 font-bold active:scale-[0.98] transition-transform mt-1"
                    onClick={handleSearch}
                  >
                    {searching ? 'Searching...' : 'Find Routes'}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Route Options List */}
          <section className="flex flex-col gap-5 mt-2">
            {routes === null && !searching && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-outline text-5xl mb-3 block">route</span>
                <p className="text-on-surface-variant font-medium">Select origin and destination to find routes</p>
                <p className="text-on-surface-variant text-sm mt-1 opacity-60">Try "Ameerpet" or "JNTU" or "MGBS"</p>
              </div>
            )}

            {searching && (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-on-surface-variant font-medium">Finding the best routes...</p>
              </div>
            )}

            {routes !== null && routes.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-outline text-5xl mb-3 block">wrong_location</span>
                <p className="text-on-surface-variant font-medium">No routes found between these stops</p>
                <p className="text-on-surface-variant text-sm mt-1">Try different stops or locations nearby</p>
              </div>
            )}

            {routes !== null && routes.length > 0 && (
              <>
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-lg font-headline font-bold text-on-surface">
                    {routes.length} Route{routes.length > 1 ? ' Options' : ''}
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {fromStop?.name} → {toStop?.name}
                  </span>
                </div>
                {routes.map((route, idx) => (
                  <RouteCard
                    key={idx}
                    route={route}
                    idx={idx}
                    fromStop={fromStop}
                    toStop={toStop}
                    defaultOpen={idx === 0}
                  />
                ))}
              </>
            )}
          </section>
        </>
      )}

      {/* Browse Routes Tab */}
      {activeTab === 'browse' && (
        <section>
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline text-xl">search</span>
            </div>
            <input
              className="w-full bg-surface-container-low rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-outline/60 text-sm"
              placeholder="Type a bus number (e.g. 10K, 216, 47M)..."
              value={browseQuery}
              onChange={e => setBrowseQuery(e.target.value)}
              autoFocus
            />
          </div>

          {browseResults.length === 0 && !browseQuery && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-outline/30 text-6xl mb-4 block">search</span>
              <p className="text-on-surface font-headline font-bold text-lg mb-1">Search 1,031 routes</p>
              <p className="text-on-surface-variant text-sm">Type a bus number to see its full route</p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {['10K', '216', '47M', '300', '127'].map(ex => (
                  <button
                    key={ex}
                    onClick={() => setBrowseQuery(ex)}
                    className="px-4 py-2 bg-surface-container-low rounded-full text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {browseResults.length === 0 && browseQuery && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-outline/30 text-5xl mb-3 block">search_off</span>
              <p className="text-on-surface-variant font-medium">No routes matching "{browseQuery}"</p>
            </div>
          )}

          {browseResults.length > 0 && (
            <>
              <div className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-3 px-1">
                {browseResults.length} route{browseResults.length !== 1 ? 's' : ''} found
              </div>
              <div className="space-y-2">
                {browseResults.map(route => {
                  const up = route.up || {}
                  const down = route.down
                  const hasBoth = !!down
                  const isFav = favRoutes.includes(route.name)
                  return (
                    <div key={route.name} className="bg-surface-container-lowest rounded-2xl flex items-center gap-3 hover:bg-surface-container-low transition-colors">
                      <button
                        className="flex-1 text-left p-4 flex items-center gap-3 active:scale-[0.99] min-w-0"
                        onClick={() => navigate(`/routes/detail?id=${encodeURIComponent(route.name)}`)}
                      >
                        <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center flex-shrink-0 overflow-hidden px-1">
                          <span className="text-tertiary font-headline font-extrabold text-xs leading-tight text-center break-all">{route.name}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                            <span className="truncate max-w-[38%]">{up.from || '—'}</span>
                            {hasBoth ? (
                              <svg width="16" height="10" viewBox="0 0 16 10" className="flex-shrink-0">
                                <path d="M1 5h14M12 2l3 3-3 3" stroke="#6d28d9" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M15 5H1M4 8l-3-3 3-3" stroke="#6d28d9" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
                              </svg>
                            ) : (
                              <span className="text-outline flex-shrink-0 text-xs">→</span>
                            )}
                            <span className="truncate max-w-[38%]">{up.to || '—'}</span>
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            {up.stops || 0} stops · {up.km || 0} km · ~{up.min || 0} min
                          </div>
                        </div>
                      </button>
                      <button
                        className="px-3 py-4 flex-shrink-0 active:scale-90 transition-transform"
                        onClick={() => { toggleFavoriteRoute(route.name); setFavRoutes(getFavoriteRoutes()); }}
                      >
                        <span className={`material-symbols-outlined text-xl ${isFav ? 'text-primary' : 'text-outline/40'}`}
                          style={{ fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  )
}
