import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon (broken in bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const COLORS = {
  bus: '#6d28d9',
  metro: '#1a56db',
  walk: '#9ca3af',
}

export default function RouteMap({ segments }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !segments?.length) return

    // Collect all valid points
    const allPoints = []
    segments.forEach(seg => {
      seg.stops?.forEach(stop => {
        if (stop?.lat && stop?.lng) allPoints.push([stop.lat, stop.lng])
      })
    })
    if (allPoints.length < 2) return

    // Destroy previous map
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      tap: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map)

    const bounds = L.latLngBounds(allPoints)
    map.fitBounds(bounds, { padding: [30, 30] })

    // Draw each segment
    segments.forEach((seg, si) => {
      const pts = (seg.stops || []).filter(s => s?.lat && s?.lng).map(s => [s.lat, s.lng])
      if (pts.length < 2) return

      const color = COLORS[seg.type] || COLORS.bus

      // Polyline
      L.polyline(pts, {
        color,
        weight: seg.type === 'walk' ? 3 : 5,
        opacity: seg.type === 'walk' ? 0.5 : 0.85,
        dashArray: seg.type === 'walk' ? '6, 10' : null,
        lineCap: 'round',
      }).addTo(map)

      // Stop markers
      seg.stops?.forEach((stop, i) => {
        if (!stop?.lat || !stop?.lng) return
        const isOrigin = si === 0 && i === 0
        const isDest = si === segments.length - 1 && i === seg.stops.length - 1
        const isBoard = i === 0 && seg.type !== 'walk'
        const isAlight = i === seg.stops.length - 1 && seg.type !== 'walk'

        if (isOrigin || isDest) {
          const bg = isOrigin ? '#1a56db' : '#dc2626'
          const label = isOrigin ? 'Start' : 'Destination'
          L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:24px;height:24px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
          }).addTo(map).bindTooltip(`${label}: ${stop.name}`, {
            permanent: true, direction: isOrigin ? 'right' : 'left',
            className: 'map-tip', offset: [12, 0],
          })
        } else if ((isBoard || isAlight) && seg.type !== 'walk') {
          const routeLabel = seg.routes?.sort((a, b) => a.length - b.length)[0] || ''
          L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
          }).addTo(map).bindTooltip(
            `${isBoard ? 'Board' : 'Alight'} ${routeLabel}: ${stop.name}`,
            { direction: 'top', className: 'map-tip' }
          )
        } else if (seg.type !== 'walk') {
          L.circleMarker([stop.lat, stop.lng], {
            radius: 3, color, fillColor: '#fff', fillOpacity: 1, weight: 2,
          }).addTo(map).bindTooltip(stop.name, { direction: 'top', className: 'map-tip' })
        }
      })
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    }
  }, [segments])

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '240px', borderRadius: '16px', overflow: 'hidden', zIndex: 0 }} />
      <style>{`
        .map-tip{background:rgba(15,23,42,.88)!important;color:#fff!important;border:0!important;border-radius:6px!important;padding:3px 8px!important;font-size:11px!important;font-weight:600!important;box-shadow:0 2px 6px rgba(0,0,0,.2)!important;font-family:'Inter',system-ui,sans-serif!important;}
        .map-tip:before{border-top-color:rgba(15,23,42,.88)!important;}
        .leaflet-container{font-family:'Inter',system-ui,sans-serif!important;}
      `}</style>
    </>
  )
}
