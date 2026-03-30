/**
 * Client-side transit routing engine using Dijkstra's algorithm
 * Operates on the pre-built transit graph.
 * Uses precomputed routes for 236 major hubs (instant results).
 * Falls back to Dijkstra for other stops.
 */

import transitGraph from '../data/transit-graph.json';
import metroData from '../data/metro-data.json';
import routeIndex from '../data/route-index.json';

// Lazy-load precomputed routes (9.6MB) — only fetched on first route search
let precomputedRoutes = null;
const precomputedReady = new Promise(resolve => {
  setTimeout(() => {
    import('../data/precomputed-routes.json').then(m => {
      precomputedRoutes = m.default;
      resolve();
    }).catch(() => resolve());
  }, 100);
});

// Get full route info from route-index (all stops, both directions, distance, time)
export function getRouteInfo(routeName) {
  return routeIndex[routeName] || null;
}

// Search route index by number
export function searchRouteIndex(query, limit = 20) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  return Object.entries(routeIndex)
    .filter(([name]) => name.toLowerCase().includes(q))
    .sort(([a], [b]) => {
      const aS = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bS = b.toLowerCase().startsWith(q) ? 0 : 1;
      if (aS !== bS) return aS - bS;
      return a.localeCompare(b, undefined, { numeric: true });
    })
    .slice(0, limit)
    .map(([name, data]) => ({ name, ...data }));
}

// Get all routes from the index
export function getAllRoutesFromIndex() {
  return Object.entries(routeIndex).map(([name, data]) => ({ name, ...data }));
}

const { stops, edges: rawEdges, routes, spatialIndex, config } = transitGraph;

// Build lookup maps
const stopMap = {};
stops.forEach(s => { stopMap[s.id] = s; });

// Rebuild edges as DIRECTIONAL from route directions
// This prevents the algorithm from going backwards on a route
const edges = {};

// Collect all consecutive stop pairs from route directions
// We'll exclude walk edges between these pairs (walking between bus stops you're riding past is nonsensical)
const consecutiveTransitPairs = new Set();
Object.values(routes).forEach(r => {
  Object.values(r.directions || {}).forEach(ds => {
    for (let i = 0; i < ds.length - 1; i++) {
      consecutiveTransitPairs.add(`${ds[i].id}->${ds[i + 1].id}`);
      consecutiveTransitPairs.add(`${ds[i + 1].id}->${ds[i].id}`);
    }
  });
});

// Add walk edges from the raw graph, excluding walks between consecutive transit stops
Object.keys(rawEdges).forEach(stopId => {
  rawEdges[stopId].forEach(e => {
    if (e.type === 'walk') {
      // Skip walk edges between stops that are consecutive on a bus route
      if (consecutiveTransitPairs.has(`${stopId}->${e.to}`)) return;
      if (!edges[stopId]) edges[stopId] = [];
      edges[stopId].push(e);
    } else if (!e.routes) {
      if (!edges[stopId]) edges[stopId] = [];
      edges[stopId].push(e);
    }
  });
});

// Haversine helper (used before the export is defined)
function _haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Average bus speed in Hyderabad: ~18 km/h including stops
// (Google Maps typically shows 15-22 km/h for TGSRTC buses in traffic)
const BUS_SPEED_MPS = 18 * 1000 / 3600; // 5 m/s

// Build directional transit edges from route directions
// Calculate travel time from distance + average speed (GTFS time fields are unreliable)
Object.values(routes).forEach(r => {
  Object.values(r.directions || {}).forEach(dirStops => {
    for (let i = 0; i < dirStops.length - 1; i++) {
      const fromId = dirStops[i].id;
      const toId = dirStops[i + 1].id;
      if (!edges[fromId]) edges[fromId] = [];

      // Calculate real travel time from distance
      const fromStop = stopMap[fromId];
      const toStop = stopMap[toId];
      let time = 120; // 2 min fallback
      if (fromStop?.lat && toStop?.lat) {
        const dist = _haversine(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng);
        time = Math.max(60, Math.round(dist / BUS_SPEED_MPS)); // min 1 min per stop
      }

      // Merge into existing edge for this stop-pair (regardless of route)
      const existing = edges[fromId].find(e => e.to === toId && !e.type);
      if (!existing) {
        edges[fromId].push({
          to: toId,
          routes: [r.name],
          time,
        });
      } else {
        if (!existing.routes.includes(r.name)) {
          existing.routes.push(r.name);
        }
      }
    }
  });
});

// No fallback to raw bidirectional edges — directional edges from route
// directions are the only transit edges we trust.

// Build stop → routes lookup (which bus routes serve each stop)
const stopRoutesMap = {};
Object.keys(edges).forEach(stopId => {
  const routeSet = new Set();
  (edges[stopId] || []).forEach(e => {
    if (e.routes) e.routes.forEach(r => routeSet.add(r));
  });
  if (routeSet.size > 0) stopRoutesMap[stopId] = [...routeSet];
});

// Build route → stop names + IDs lookup (both directions)
const routeStopsMap = {};       // routeName → Set of stop IDs
const routeStopNamesMap = {};   // routeName → Set of stop names (lowercase)
Object.values(routes).forEach(r => {
  const stopIds = new Set();
  const stopNames = new Set();
  Object.values(r.directions || {}).forEach(dir => {
    dir.forEach(s => {
      stopIds.add(s.id);
      stopNames.add(s.name.toLowerCase());
    });
  });
  routeStopsMap[r.name] = stopIds;
  routeStopNamesMap[r.name] = stopNames;
});

// Build stop name → all stop IDs with that name
const nameToStopIds = {};
stops.forEach(s => {
  const key = s.name.toLowerCase();
  if (!nameToStopIds[key]) nameToStopIds[key] = [];
  nameToStopIds[key].push(s.id);
});

// Build alias map: stops <200m apart with similar names are the same place
// e.g., "G.V.K." = "Gvk Mall", "Lunger House" = "Langar House(Bapur Nagar)"
const stopNameAliases = {}; // name → canonical name
const uniqueByName = {};
stops.forEach(s => {
  if (!uniqueByName[s.name] || (stopRoutesMap[s.id]?.length || 0) > (stopRoutesMap[uniqueByName[s.name].id]?.length || 0)) {
    uniqueByName[s.name] = s;
  }
});
const uniqStops = Object.values(uniqueByName);
for (let i = 0; i < uniqStops.length; i++) {
  for (let j = i + 1; j < uniqStops.length; j++) {
    const a = uniqStops[i], b = uniqStops[j];
    if (!a.lat || !b.lat) continue;
    const d = _haversine(a.lat, a.lng, b.lat, b.lng);
    if (d < 200) {
      const an = a.name.toLowerCase().replace(/[.\s()/]/g, '');
      const bn = b.name.toLowerCase().replace(/[.\s()/]/g, '');
      if (an.includes(bn.slice(0, 4)) || bn.includes(an.slice(0, 4)) || d < 50) {
        // Pick the one with more routes as canonical
        const aRoutes = stopRoutesMap[a.id]?.length || 0;
        const bRoutes = stopRoutesMap[b.id]?.length || 0;
        const canonical = aRoutes >= bRoutes ? a.name : b.name;
        const alias = aRoutes >= bRoutes ? b.name : a.name;
        stopNameAliases[alias.toLowerCase()] = canonical.toLowerCase();
        // Also merge their stop IDs into nameToStopIds
        const canonIds = nameToStopIds[canonical.toLowerCase()] || [];
        const aliasIds = nameToStopIds[alias.toLowerCase()] || [];
        aliasIds.forEach(id => { if (!canonIds.includes(id)) canonIds.push(id); });
        nameToStopIds[canonical.toLowerCase()] = canonIds;
      }
    }
  }
}

// Resolve a stop name to its canonical form
function resolveStopName(name) {
  const key = name.toLowerCase();
  return stopNameAliases[key] || key;
}

/**
 * Get all stops reachable from a given stop via direct routes.
 * Uses both stop ID and stop name matching to handle duplicate IDs.
 * Returns a Set of stop IDs.
 */
export function getReachableStopIds(stopId) {
  const routeNames = stopRoutesMap[stopId] || [];
  const reachable = new Set();
  for (const rName of routeNames) {
    // Add by ID
    const stopIds = routeStopsMap[rName];
    if (stopIds) stopIds.forEach(id => reachable.add(id));
    // Also add all IDs for stop names on this route (handles duplicate stop IDs)
    const stopNames = routeStopNamesMap[rName];
    if (stopNames) {
      for (const name of stopNames) {
        const ids = nameToStopIds[name];
        if (ids) ids.forEach(id => reachable.add(id));
      }
    }
  }
  reachable.delete(stopId);
  return reachable;
}

/**
 * Search stops reachable from origin, with shared route info.
 * Each result includes: direct (bool), routes (shared route names), stops (count on route).
 */
export function searchReachableStops(fromStopId, query, limit = 20) {
  const reachable = getReachableStopIds(fromStopId);
  if (reachable.size === 0) return [];

  const fromRoutes = new Set(stopRoutesMap[fromStopId] || []);

  let q = (query || '').toLowerCase().trim();
  if (ALIASES[q]) q = ALIASES[q];

  const results = [];
  const seen = new Set();

  for (const id of reachable) {
    const stop = stopMap[id];
    if (!stop) continue;
    const nameKey = stop.name.toLowerCase();
    if (seen.has(nameKey)) continue; // dedupe by name

    // Filter by query if provided
    if (q.length >= 1) {
      const score = matchScore(q, stop.name);
      const zoneScore = stop.zone ? matchScore(q, stop.zone) : -1;
      if (score < 0 && zoneScore < 0) continue;
    }

    // Find shared routes between origin and this stop
    const destRoutes = stopRoutesMap[id] || [];
    const shared = destRoutes.filter(r => fromRoutes.has(r));

    // Also check by name: routes whose direction stop-names include this stop
    if (shared.length === 0) {
      for (const rName of fromRoutes) {
        const names = routeStopNamesMap[rName];
        if (names && names.has(nameKey)) {
          shared.push(rName);
        }
      }
    }

    const score = q.length >= 1 ? matchScore(q, stop.name) : 0;

    seen.add(nameKey);
    results.push({
      ...stop,
      type: stop.metro ? 'metro' : 'bus',
      routes: [...new Set(shared)].slice(0, 5),
      direct: shared.length > 0,
      stopCount: shared.length > 0 ? _getStopCountOnRoute(shared[0], fromStopId, id) : 0,
      _score: score >= 0 ? score : 5,
    });
  }

  results.sort((a, b) => {
    // Direct routes first
    if (a.direct !== b.direct) return a.direct ? -1 : 1;
    if (a._score !== b._score) return a._score - b._score;
    return a.name.length - b.name.length;
  });

  return results.slice(0, limit);
}

// Get approximate stop count between two stops on a given route
function _getStopCountOnRoute(routeName, fromId, toId) {
  const r = routes[routeName];
  if (!r) return 0;
  const fromStop = stopMap[fromId];
  const toStop = stopMap[toId];
  if (!fromStop || !toStop) return 0;
  const fromName = fromStop.name.toLowerCase();
  const toName = toStop.name.toLowerCase();

  for (const dir of Object.values(r.directions || {})) {
    const fromIdx = dir.findIndex(s => s.id === fromId || s.name.toLowerCase() === fromName);
    const toIdx = dir.findIndex(s => s.id === toId || s.name.toLowerCase() === toName);
    if (fromIdx >= 0 && toIdx >= 0) {
      return Math.abs(toIdx - fromIdx);
    }
  }
  return 0;
}

// Common abbreviations / aliases for Hyderabad stops
const ALIASES = {
  'mgbs': 'mahatma gandhi bus station',
  'mg bus station': 'mahatma gandhi bus station',
  'jbs': 'jubilee bus station',
  'jntu': 'jntu',
  'secbad': 'secunderabad',
  'sec\'bad': 'secunderabad',
  'kphb': 'kphb',
  'hitech': 'hitec city',
  'hitec': 'hitec city',
  'lb nagar': 'lb nagar',
  'lbnagar': 'lb nagar',
  'sr nagar': 'sr nagar',
  'srnagar': 'sr nagar',
  'cbs': 'cbs',
  'rgi': 'rajiv gandhi',
  'rgia': 'rajiv gandhi',
};

// Build metro edges into the graph
const metroStopMap = {};
metroData.lines.forEach(line => {
  line.stations.forEach((station, i) => {
    const id = `metro_${line.id}_${i}`;
    metroStopMap[id] = {
      id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      metro: true,
      line: line.id,
      lineName: line.name,
      color: line.color,
    };
    stopMap[id] = metroStopMap[id];

    // Edge to next station
    if (i < line.stations.length - 1) {
      const nextId = `metro_${line.id}_${i + 1}`;
      if (!edges[id]) edges[id] = [];
      if (!edges[nextId]) edges[nextId] = [];
      edges[id].push({ to: nextId, time: 180, routes: [line.name], type: 'metro', line: line.id });
      edges[nextId].push({ to: id, time: 180, routes: [line.name], type: 'metro', line: line.id });
    }
  });
});

// Add interchange edges (Ameerpet, MG Bus Station)
metroData.interchange.forEach(ic => {
  const matchingStops = Object.values(metroStopMap).filter(s => s.name === ic.station);
  for (let i = 0; i < matchingStops.length; i++) {
    for (let j = i + 1; j < matchingStops.length; j++) {
      const a = matchingStops[i].id;
      const b = matchingStops[j].id;
      if (!edges[a]) edges[a] = [];
      if (!edges[b]) edges[b] = [];
      edges[a].push({ to: b, time: 120, type: 'interchange' });
      edges[b].push({ to: a, time: 120, type: 'interchange' });
    }
  }
});

// Add walking edges between metro stations and nearby bus stops
Object.values(metroStopMap).forEach(ms => {
  const nearbyBus = findNearestStops(ms.lat, ms.lng, 500);
  nearbyBus.forEach(bs => {
    const dist = haversine(ms.lat, ms.lng, bs.lat, bs.lng);
    const walkTime = Math.round(dist / config.walkSpeedMps);
    if (!edges[ms.id]) edges[ms.id] = [];
    if (!edges[bs.id]) edges[bs.id] = [];
    edges[ms.id].push({ to: bs.id, time: walkTime, type: 'walk', dist: Math.round(dist) });
    edges[bs.id].push({ to: ms.id, time: walkTime, type: 'walk', dist: Math.round(dist) });
  });
});

// Haversine distance
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Find nearest stops to a lat/lng
export function findNearestStops(lat, lng, maxDist = 800, limit = 10) {
  const GRID_SIZE = 0.005;
  const METERS_PER_DEGREE = 111320;
  const gridLat = Math.floor(lat / GRID_SIZE);
  const gridLng = Math.floor(lng / GRID_SIZE);
  const gridRadius = Math.ceil(maxDist / (GRID_SIZE * METERS_PER_DEGREE)) + 1;
  const results = [];

  for (let dl = -gridRadius; dl <= gridRadius; dl++) {
    for (let dc = -gridRadius; dc <= gridRadius; dc++) {
      const key = `${gridLat + dl}_${gridLng + dc}`;
      const cellStops = spatialIndex[key];
      if (!cellStops) continue;
      cellStops.forEach(id => {
        const stop = stopMap[id];
        if (!stop) return;
        const dist = haversine(lat, lng, stop.lat, stop.lng);
        if (dist <= maxDist) {
          results.push({ ...stop, distance: Math.round(dist) });
        }
      });
    }
  }

  // Also check metro stations
  Object.values(metroStopMap).forEach(ms => {
    const dist = haversine(lat, lng, ms.lat, ms.lng);
    if (dist <= maxDist) {
      results.push({ ...ms, distance: Math.round(dist) });
    }
  });

  return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

// Simple fuzzy match: checks if all characters of query appear in order in target
function fuzzyMatch(query, target) {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++;
  }
  return qi === query.length;
}

// Score a match (lower = better)
function matchScore(query, name) {
  const lower = name.toLowerCase();
  if (lower === query) return 0; // exact
  if (lower.startsWith(query)) return 1; // prefix
  if (lower.includes(query)) return 2; // substring
  // Check word starts (e.g., "amer" matches "Ameerpet")
  const words = lower.split(/[\s\-\/,]+/);
  if (words.some(w => w.startsWith(query))) return 3;
  if (fuzzyMatch(query, lower)) return 4; // fuzzy
  return -1; // no match
}

// Get routes serving a stop (for display)
export function getRoutesForStop(stopId) {
  return stopRoutesMap[stopId] || [];
}

// Search stops by name with fuzzy matching and alias support
export function searchStops(query, limit = 15) {
  if (!query || query.length < 1) return [];
  let q = query.toLowerCase().trim();

  // Check aliases
  if (ALIASES[q]) q = ALIASES[q];

  // Also search by route number (e.g., typing "10K" shows stops on route 10K)
  const routeMatch = routes[q.toUpperCase()] || Object.values(routes).find(r => r.name.toLowerCase() === q);

  const results = [];
  const seen = new Set();

  // Search bus stops
  stops.forEach(s => {
    const score = matchScore(q, s.name);
    if (score >= 0) {
      seen.add(s.id);
      results.push({ ...s, type: 'bus', _score: score, routes: stopRoutesMap[s.id]?.slice(0, 5) || [] });
    }
  });

  // Search metro stations
  Object.values(metroStopMap).forEach(s => {
    if (seen.has(s.id)) return;
    const score = matchScore(q, s.name);
    if (score >= 0) {
      seen.add(s.id);
      results.push({ ...s, type: 'metro', _score: score, routes: [] });
    }
  });

  // Also search by zone name
  if (results.length < 5) {
    stops.forEach(s => {
      if (seen.has(s.id)) return;
      if (s.zone && matchScore(q, s.zone) >= 0) {
        seen.add(s.id);
        results.push({ ...s, type: 'bus', _score: 5, routes: stopRoutesMap[s.id]?.slice(0, 5) || [] });
      }
    });
  }

  // Sort by score, then name length
  results.sort((a, b) => {
    if (a._score !== b._score) return a._score - b._score;
    return a.name.length - b.name.length;
  });

  // Deduplicate by name (keep first occurrence which has best score)
  const deduped = [];
  const namesSeen = new Set();
  for (const r of results) {
    const key = r.name.toLowerCase();
    if (!namesSeen.has(key)) {
      namesSeen.add(key);
      deduped.push(r);
    }
    if (deduped.length >= limit) break;
  }

  return deduped;
}

// Search routes by number/name
export function searchRoutesByNumber(query, limit = 20) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  return Object.values(routes)
    .filter(r => r.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    })
    .slice(0, limit);
}

// Priority queue (min-heap)
class MinHeap {
  constructor() { this.data = []; }
  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  get size() { return this.data.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent].cost <= this.data[i].cost) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].cost < this.data[smallest].cost) smallest = l;
      if (r < n && this.data[r].cost < this.data[smallest].cost) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

// Internal single-path Dijkstra
// Heavier transfer penalty to avoid fragmented routes
const TRANSFER_PENALTY = 420; // 7 min penalty per transfer (wait + walk + confusion)
const WALK_TRANSFER_PENALTY = 300; // 5 min extra for walk-to-different-stop transfers
const MAX_TRANSFERS = 3; // Hard cap on transfers
const MAX_WALK_TIME = 900; // 15 min max walking — reject longer walks

// Check if two route sets share any EXACT route name.
// 505 and 156/505 are DIFFERENT buses (505 ends at Mehdipatnam,
// 156/505 continues to Hayathnagar). Only exact matches mean "same bus".
function routeFamiliesOverlap(routesA, routesB) {
  if (!routesA || !routesB) return false;
  const setA = new Set(routesA);
  for (const r of routesB) { if (setA.has(r)) return true; }
  return false;
}

function _dijkstra(fromStops, toStops, blockedEdges = null) {
  const dist = {};
  const transfers = {};
  const prev = {};
  const prevEdge = {};
  const ridingRoutes = {}; // which specific route(s) user is on at each node
  const visited = new Set();
  const heap = new MinHeap();

  fromStops.forEach(({ id, walkTime }) => {
    dist[id] = walkTime;
    transfers[id] = 0;
    ridingRoutes[id] = null;
    heap.push({ id, cost: walkTime });
    if (walkTime > 0) {
      prevEdge[id] = { type: 'walk', time: walkTime };
    }
  });

  while (heap.size > 0) {
    const { id, cost } = heap.pop();
    if (visited.has(id)) continue;
    visited.add(id);

    if (toStops.has(id)) break;

    const myTransfers = transfers[id] || 0;
    const myPrevEdge = prevEdge[id];
    const myRiding = ridingRoutes[id]; // routes user is currently on (null = walking/not on bus)

    for (const edge of (edges[id] || [])) {
      if (visited.has(edge.to)) continue;
      if (blockedEdges && blockedEdges.has(`${id}->${edge.to}:${edge.routes?.[0]}`)) continue;

      let edgeCost = edge.time;
      let newTransfers = myTransfers;
      let newRiding = null;

      if (edge.type === 'walk') {
        if (myRiding) edgeCost += 300;
        if (myPrevEdge?.type === 'walk') edgeCost += WALK_TRANSFER_PENALTY;
        // Check cumulative walk time — reject if >15 min continuous walk
        let cumWalk = edge.time;
        let cursor = id;
        while (prev[cursor] && prevEdge[cursor]?.type === 'walk') { cumWalk += prevEdge[cursor].time; cursor = prev[cursor]; }
        if (cumWalk > MAX_WALK_TIME) continue; // skip this edge
        newRiding = null;
      } else if (edge.routes) {
        if (myRiding) {
          // On a bus — check if same route continues on this edge
          const continuing = myRiding.filter(r =>
            edge.routes.includes(r) || edge.routes.some(er => routeFamiliesOverlap([r], [er]))
          );
          if (continuing.length > 0) {
            newRiding = continuing; // stay on same bus
          } else {
            edgeCost += TRANSFER_PENALTY;
            newTransfers++;
            newRiding = edge.routes;
          }
        } else {
          // Boarding from walk — check if transfer from previous bus
          let prevRiding = null;
          let cursor = id;
          let wd = 0;
          while (prev[cursor] && prevEdge[cursor]?.type === 'walk' && wd < 10) { cursor = prev[cursor]; wd++; }
          prevRiding = ridingRoutes[cursor];
          if (prevRiding) {
            const continuing = prevRiding.filter(r =>
              edge.routes.includes(r) || edge.routes.some(er => routeFamiliesOverlap([r], [er]))
            );
            if (continuing.length === 0) {
              edgeCost += TRANSFER_PENALTY;
              newTransfers++;
            }
          }
          newRiding = edge.routes;
        }
      }

      if (newTransfers > MAX_TRANSFERS) continue;

      const newDist = cost + edgeCost;
      if (newDist < (dist[edge.to] || Infinity)) {
        dist[edge.to] = newDist;
        transfers[edge.to] = newTransfers;
        prev[edge.to] = id;
        prevEdge[edge.to] = edge;
        ridingRoutes[edge.to] = newRiding;
        heap.push({ id: edge.to, cost: newDist });
      }
    }
  }

  let bestDest = null;
  let bestCost = Infinity;
  for (const destId of toStops) {
    if (dist[destId] !== undefined && dist[destId] < bestCost) {
      bestCost = dist[destId];
      bestDest = destId;
    }
  }

  if (!bestDest) return null;

  // Reconstruct actual travel time (without inflated penalties) for display
  const path = [];
  let current = bestDest;
  let realTime = 0;
  while (prev[current]) {
    const edge = prevEdge[current];
    const fromStop = stopMap[prev[current]];
    const toStop = stopMap[current];
    path.unshift({ from: fromStop, to: toStop, routes: edge.routes, type: edge.type, time: edge.time, dist: edge.dist, line: edge.line });
    realTime += edge.time;
    current = prev[current];
  }
  // Add initial walk time if any
  const startId = fromStops.find(f => f.id === current);
  if (startId?.walkTime) realTime += startId.walkTime;

  return { path, totalTime: realTime };
}

// Dijkstra variant that heavily penalizes transfers to find direct/fewer-transfer routes
function _dijkstraMinTransfers(fromStops, toStops) {
  // State key = (stopId, transferCount) to allow exploring same stop with fewer transfers
  const HUGE_PENALTY = 3600;
  const best = {}; // best[stopId] = { cost, transfers, prev, prevEdge, riding } per transfer level
  const visited = new Set();
  const heap = new MinHeap();

  fromStops.forEach(({ id, walkTime }) => {
    const key = `${id}:0`;
    best[key] = { cost: walkTime, xf: 0, prev: null, prevEdge: walkTime > 0 ? { type: 'walk', time: walkTime } : null, riding: null };
    heap.push({ id, cost: walkTime, xf: 0 });
  });

  while (heap.size > 0) {
    const { id, cost, xf } = heap.pop();
    const key = `${id}:${xf}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const state = best[key];
    if (!state) continue;
    const myRiding = state.riding;

    for (const edge of (edges[id] || [])) {
      let ec = edge.time;
      let nt = xf;
      let newRiding = null;

      if (edge.type === 'walk') {
        if (myRiding) ec += 300;
        if (state.prevEdge?.type === 'walk') ec += WALK_TRANSFER_PENALTY;
        // Reject >15 min continuous walking
        let cumWalk = edge.time;
        let cur = key;
        while (best[cur]?.prev && best[cur]?.prevEdge?.type === 'walk') { cumWalk += best[cur].prevEdge.time; cur = best[cur].prev; }
        if (cumWalk > MAX_WALK_TIME) continue;
      } else if (edge.routes) {
        if (myRiding) {
          const cont = myRiding.filter(r => edge.routes.includes(r) || edge.routes.some(er => routeFamiliesOverlap([r], [er])));
          if (cont.length > 0) { newRiding = cont; }
          else { ec += HUGE_PENALTY; nt++; newRiding = edge.routes; }
        } else {
          // Boarding — check if transfer from previous bus
          if (state.prevEdge?.type === 'walk') {
            let cursor = key;
            let wd = 0;
            while (best[cursor]?.prev && best[cursor]?.prevEdge?.type === 'walk' && wd < 10) {
              cursor = best[cursor].prev;
              wd++;
            }
            const prevRiding = best[cursor]?.riding;
            if (prevRiding) {
              const cont = prevRiding.filter(r => edge.routes.includes(r) || edge.routes.some(er => routeFamiliesOverlap([r], [er])));
              if (cont.length === 0) { ec += HUGE_PENALTY; nt++; }
            }
          }
          newRiding = edge.routes;
        }
      }
      if (nt > MAX_TRANSFERS) continue;

      const nd = cost + ec;
      const nkey = `${edge.to}:${nt}`;
      const existing = best[nkey];
      if (!existing || nd < existing.cost) {
        best[nkey] = { cost: nd, xf: nt, prev: key, prevEdge: edge, riding: newRiding };
        heap.push({ id: edge.to, cost: nd, xf: nt });
      }
    }
  }

  // Find destination with fewest transfers
  let bestDest = null, bestXf = Infinity, bestCost = Infinity;
  for (const destId of toStops) {
    for (let xf = 0; xf <= MAX_TRANSFERS; xf++) {
      const state = best[`${destId}:${xf}`];
      if (!state) continue;
      if (xf < bestXf || (xf === bestXf && state.cost < bestCost)) {
        bestXf = xf;
        bestCost = state.cost;
        bestDest = `${destId}:${xf}`;
      }
    }
  }
  if (!bestDest) return null;

  // Reconstruct path
  const path = [];
  let current = bestDest;
  let realTime = 0;
  while (best[current]?.prev) {
    const state = best[current];
    const stopId = current.split(':')[0];
    const prevKey = state.prev;
    const prevStopId = prevKey.split(':')[0];
    path.unshift({
      from: stopMap[prevStopId],
      to: stopMap[stopId],
      routes: state.prevEdge.routes,
      type: state.prevEdge.type,
      time: state.prevEdge.time,
      dist: state.prevEdge.dist,
      line: state.prevEdge.line,
    });
    realTime += state.prevEdge.time;
    current = prevKey;
  }

  return { path, totalTime: realTime };
}

function _buildResult(path, totalTime) {
  // Phase 1: Group consecutive same-route edges into segments
  const rawSegments = [];
  let currentSegment = null;

  for (const step of path) {
    // A segment continues ONLY if at least one COMMON route runs through ALL edges
    // We track continuingRoutes = intersection of routes across consecutive edges
    const canContinue = currentSegment
      && step.type !== 'walk'
      && currentSegment.type !== 'walk'
      && step.routes
      && currentSegment._continuingRoutes?.length > 0
      && routeFamiliesOverlap(currentSegment._continuingRoutes, step.routes);

    if (canContinue) {
      currentSegment.stops.push(step.to);
      currentSegment.totalTime += step.time;
      // Narrow down: only keep routes that appear on this edge too
      currentSegment._continuingRoutes = currentSegment._continuingRoutes.filter(
        r => step.routes.includes(r) || step.routes.some(sr => routeFamiliesOverlap([r], [sr]))
      );
    } else {
      if (currentSegment) {
        // For display, keep the continuing routes but also include original routes
        // Prefer showing the routes that ran through the ENTIRE segment
        const contRoutes = currentSegment._continuingRoutes || [];
        // If continuing routes exist, use them (they ran the full segment)
        // Otherwise fall back to original routes
        currentSegment.routes = contRoutes.length > 0 ? contRoutes : currentSegment.routes;
        delete currentSegment._continuingRoutes;
        rawSegments.push(currentSegment);
      }
      currentSegment = {
        routeKey: step.routes?.[0] || step.type,
        type: step.type || 'bus',
        routes: step.routes || [],
        _continuingRoutes: step.routes ? [...step.routes] : [],
        line: step.line,
        from: step.from,
        stops: [step.from, step.to],
        totalTime: step.time,
        dist: step.dist,
      };
    }
  }
  if (currentSegment) {
    currentSegment.routes = currentSegment._continuingRoutes || currentSegment.routes;
    delete currentSegment._continuingRoutes;
    rawSegments.push(currentSegment);
  }

  // Phase 2: Merge consecutive walk segments
  const segments = [];
  for (const seg of rawSegments) {
    const prev = segments[segments.length - 1];
    if (prev && prev.type === 'walk' && seg.type === 'walk') {
      // Merge walks
      prev.stops.push(...seg.stops.slice(1));
      prev.totalTime += seg.time || seg.totalTime;
      prev.dist = (prev.dist || 0) + (seg.dist || 0);
    } else {
      segments.push({ ...seg });
    }
  }

  // Phase 3: Convert tiny bus segments (<1km total distance) to walk segments
  // Taking a bus for 100-500m is nonsensical — user should just walk
  const phase3 = [];
  for (const seg of segments) {
    if (seg.type !== 'walk' && seg.type !== 'metro' && seg.stops.length >= 2) {
      let segDist = 0;
      for (let i = 0; i < seg.stops.length - 1; i++) {
        const a = seg.stops[i], b = seg.stops[i + 1];
        if (a?.lat && b?.lat) segDist += _haversine(a.lat, a.lng, b.lat, b.lng);
      }
      if (segDist < 1000) {
        // Convert to walk — use walking speed for time
        const walkTime = Math.round(segDist / 1.2); // 1.2 m/s walk speed
        phase3.push({ ...seg, type: 'walk', totalTime: walkTime, dist: Math.round(segDist) });
        continue;
      }
    }
    phase3.push(seg);
  }

  // Phase 4: Re-merge consecutive walks (from phase 3 conversions + original walks)
  const merged2 = [];
  for (const seg of phase3) {
    const prev = merged2[merged2.length - 1];
    if (prev && prev.type === 'walk' && seg.type === 'walk') {
      prev.stops.push(...seg.stops.slice(1));
      prev.totalTime += seg.totalTime;
      prev.dist = (prev.dist || 0) + (seg.dist || 0);
    } else {
      merged2.push({ ...seg });
    }
  }

  // Phase 5: Remove trivially short walks (<1 min) between transit, and cap walks at 15 min
  const cleaned = [];
  for (let i = 0; i < merged2.length; i++) {
    const seg = merged2[i];
    if (seg.type === 'walk' && seg.totalTime < 60 && i > 0 && i < merged2.length - 1) {
      continue;
    }
    // Cap walk display at 15 min — if longer, it's likely a data issue
    if (seg.type === 'walk' && seg.totalTime > MAX_WALK_TIME) {
      seg.totalTime = MAX_WALK_TIME;
    }
    cleaned.push(seg);
  }

  const transfers = cleaned.filter(s => s.type !== 'walk').length - 1;

  // Calculate total distance
  let totalDist = 0;
  for (const seg of cleaned) {
    if (seg.stops.length >= 2) {
      for (let i = 0; i < seg.stops.length - 1; i++) {
        const a = seg.stops[i], b = seg.stops[i + 1];
        if (a.lat && b.lat) totalDist += haversine(a.lat, a.lng, b.lat, b.lng);
      }
    }
  }

  return {
    totalTime,
    totalTimeMin: Math.ceil(totalTime / 60),
    totalDistKm: Math.round(totalDist / 100) / 10,
    transfers: Math.max(0, transfers),
    segments: cleaned,
    arrivalTime: formatArrivalTime(totalTime),
  };
}

/**
 * Find routes from origin to destination.
 * Accepts stop IDs or {lat, lng} objects.
 * Returns up to 3 diverse route options.
 */
// Look up precomputed route summary (bus names, transfers, time)
export function getPrecomputedRoute(fromName, toName) {
  if (!precomputedRoutes) return null;
  return precomputedRoutes[fromName]?.[toName] || null;
}

export function findRoutes(from, to) {
  let fromStops, toStops;

  if (typeof from === 'string') {
    const stop = stopMap[from];
    const resolvedName = stop ? resolveStopName(stop.name) : null;
    const sameNameIds = resolvedName ? (nameToStopIds[resolvedName] || [from]) : [from];
    fromStops = sameNameIds.map(id => ({ id, walkTime: 0 }));
  } else {
    let nearby = findNearestStops(from.lat, from.lng, 1000, 5);
    if (nearby.length === 0) nearby = findNearestStops(from.lat, from.lng, 2500, 5);
    if (nearby.length === 0) nearby = findNearestStops(from.lat, from.lng, 5000, 3);
    if (nearby.length === 0) return [];
    fromStops = nearby.map(s => ({
      id: s.id,
      walkTime: Math.round(s.distance / config.walkSpeedMps),
    }));
  }

  if (typeof to === 'string') {
    const stop = stopMap[to];
    const resolvedName = stop ? resolveStopName(stop.name) : null;
    const sameNameIds = resolvedName ? (nameToStopIds[resolvedName] || [to]) : [to];
    toStops = new Set(sameNameIds);
  } else {
    let nearby = findNearestStops(to.lat, to.lng, 1000, 5);
    if (nearby.length === 0) nearby = findNearestStops(to.lat, to.lng, 2500, 5);
    if (nearby.length === 0) nearby = findNearestStops(to.lat, to.lng, 5000, 3);
    if (nearby.length === 0) return [];
    toStops = new Set(nearby.map(s => s.id));
  }

  const results = [];
  const seenRouteKeys = new Set();

  function getRouteKey(result) {
    return result.segments.filter(s => s.type !== 'walk').map(s => s.routes.sort().join('+')).join('|');
  }

  function addResult(result, tag) {
    const key = getRouteKey(result);
    if (seenRouteKeys.has(key)) return false;
    seenRouteKeys.add(key);
    result.tag = tag;
    results.push(result);
    return true;
  }

  // 0. Check for DIRECT routes — scan route directions for shared origin+destination
  if (typeof from === 'string' && typeof to === 'string') {
    const fromStop = stopMap[from];
    const toStop = stopMap[to];
    if (fromStop && toStop) {
      const fromName = resolveStopName(fromStop.name);
      const toName = resolveStopName(toStop.name);
      // Also collect all alias names for matching in route directions
      const fromNames = new Set([fromName, fromStop.name.toLowerCase()]);
      const toNames = new Set([toName, toStop.name.toLowerCase()]);
      Object.entries(stopNameAliases).forEach(([alias, canon]) => {
        if (canon === fromName) fromNames.add(alias);
        if (canon === toName) toNames.add(alias);
      });
      let bestDirect = null;

      for (const r of Object.values(routes)) {
        for (const ds of Object.values(r.directions || {})) {
          const fIdx = ds.findIndex(s => fromNames.has(s.name.toLowerCase()));
          const tIdx = ds.findIndex(s => toNames.has(s.name.toLowerCase()));
          if (fIdx >= 0 && tIdx > fIdx) {
            // Direct route found — build segment from direction data
            const segStops = ds.slice(fIdx, tIdx + 1).map(s => stopMap[s.id] || s);
            let dist = 0;
            let time = 0;
            for (let i = 0; i < segStops.length - 1; i++) {
              const a = segStops[i], b = segStops[i + 1];
              if (a.lat && b.lat) {
                const d = _haversine(a.lat, a.lng, b.lat, b.lng);
                dist += d;
                time += Math.max(60, Math.round(d / BUS_SPEED_MPS));
              }
            }
            if (!bestDirect || time < bestDirect.time) {
              bestDirect = { route: r.name, stops: segStops, time, dist };
            }
          }
        }
      }

      if (bestDirect) {
        addResult({
          totalTime: bestDirect.time,
          totalTimeMin: Math.ceil(bestDirect.time / 60),
          totalDistKm: Math.round(bestDirect.dist / 100) / 10,
          transfers: 0,
          segments: [{
            type: 'bus',
            routes: [bestDirect.route],
            from: bestDirect.stops[0],
            stops: bestDirect.stops,
            totalTime: bestDirect.time,
          }],
          arrivalTime: formatArrivalTime(bestDirect.time),
        }, 'Direct');
      }
    }
  }

  // 1. Find FEWEST TRANSFERS route
  const minXfer = _dijkstraMinTransfers(fromStops, toStops);
  if (!minXfer) {
    // Fallback to fastest
    const fastest = _dijkstra(fromStops, toStops);
    if (!fastest) return [];
    return [{ ..._buildResult(fastest.path, fastest.totalTime), tag: 'Best Route' }];
  }
  const minXferResult = _buildResult(minXfer.path, minXfer.totalTime);
  const minXferTag = minXferResult.transfers === 0 ? 'Direct' : 'Recommended';
  addResult(minXferResult, minXferTag);

  // 2. Find FASTEST route — show if faster (any improvement when same transfers, 15% when more transfers)
  const fastest = _dijkstra(fromStops, toStops);
  if (fastest) {
    const fastestResult = _buildResult(fastest.path, fastest.totalTime);
    const sameTransfers = fastestResult.transfers === minXferResult.transfers;
    const threshold = sameTransfers ? 0.999 : 0.85;
    if (fastestResult.totalTime < minXferResult.totalTime * threshold) {
      addResult(fastestResult, 'Faster');
    }
  }

  // 3. Find alternative by blocking the first result's key edge
  if (results.length < 3) {
    const base = results[0];
    const transitSegs = base.segments.filter(s => s.type !== 'walk');
    if (transitSegs.length > 0) {
      const seg = transitSegs[0];
      const blocked = new Set();
      if (seg.stops.length >= 2) {
        seg.routes.forEach(r => blocked.add(`${seg.stops[0].id}->${seg.stops[1].id}:${r}`));
      }
      if (blocked.size > 0) {
        const alt = _dijkstra(fromStops, toStops, blocked);
        if (alt) addResult(_buildResult(alt.path, alt.totalTime), 'Alternative');
      }
    }
  }

  // Sort: if faster route saves >15% time, show it first
  if (results.length >= 2 && results[1].tag === 'Faster') {
    const [rec, fast] = results;
    results[0] = fast;
    results[0].tag = 'Fastest';
    results[1] = rec;
    results[1].tag = rec.transfers === 0 ? 'Direct · Fewer Transfers' : 'Fewer Transfers';
  }

  return results.slice(0, 3);
}

function formatArrivalTime(seconds) {
  const now = new Date();
  now.setSeconds(now.getSeconds() + seconds);
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Get route details
export function getRoute(routeId) {
  return routes[routeId] || null;
}

// Get all routes
export function getAllRoutes() {
  return Object.values(routes);
}

// Get stop details
export function getStop(stopId) {
  return stopMap[stopId] || null;
}

// Get all stops
export function getAllStops() {
  return stops;
}

// Get metro data
export function getMetroData() {
  return metroData;
}

// Get departures for a stop
export function getDepartures(stopId) {
  return transitGraph.departures?.[stopId] || {};
}

export default {
  findRoutes,
  findNearestStops,
  searchStops,
  searchReachableStops,
  getReachableStopIds,
  searchRoutesByNumber,
  searchRouteIndex,
  getAllRoutesFromIndex,
  getRouteInfo,
  getPrecomputedRoute,
  getRoutesForStop,
  getRoute,
  getAllRoutes,
  getStop,
  getAllStops,
  getMetroData,
  getDepartures,
  haversine,
};
