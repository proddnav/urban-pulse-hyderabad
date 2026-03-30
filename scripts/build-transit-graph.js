#!/usr/bin/env node
/**
 * GTFS → Transit Graph Builder
 * Parses TGSRTC GTFS data and produces a compact transit-graph.json
 * for client-side Dijkstra route search.
 */

import { createReadStream } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { parse } from 'csv-parse';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GTFS_DIR = join(__dirname, '..', 'Telangana_opendata_gtfs_TGSRTC_28_January_2026');
const OUTPUT = join(__dirname, '..', 'src', 'data', 'transit-graph.json');

const WALK_SPEED_MPS = 1.2; // meters per second
const MAX_WALK_DISTANCE = 400; // meters
const TRANSFER_PENALTY = 180; // seconds

// Haversine distance in meters
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Parse CSV file into array of objects
function parseCSV(filename) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(join(GTFS_DIR, filename))
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// Parse time string (HH:MM:SS) to seconds since midnight
function parseTime(timeStr) {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

// Format seconds to HH:MM
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600) % 24;
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

async function build() {
  console.log('=== GTFS Transit Graph Builder ===\n');

  // 1. Parse stops
  console.log('Parsing stops...');
  const stopsRaw = await parseCSV('stops.txt');
  const stops = {};
  const stopsList = [];
  stopsRaw.forEach(s => {
    const stop = {
      id: s.stop_id,
      name: s.stop_name.replace(/ Twd .*$/, '').trim(), // Clean "Twd XYZ" suffix
      zone: s.zone_id || '',
      lat: parseFloat(s.stop_lat),
      lng: parseFloat(s.stop_lon),
    };
    stops[s.stop_id] = stop;
    stopsList.push(stop);
  });
  console.log(`  ${stopsList.length} stops parsed`);

  // 2. Parse routes
  console.log('Parsing routes...');
  const routesRaw = await parseCSV('routes.txt');
  const routes = {};
  routesRaw.forEach(r => {
    routes[r.route_id] = {
      id: r.route_id,
      name: r.route_long_name,
      type: parseInt(r.route_type), // 3 = bus
    };
  });
  console.log(`  ${Object.keys(routes).length} routes parsed`);

  // 3. Parse trips
  console.log('Parsing trips...');
  const tripsRaw = await parseCSV('trips.txt');
  const trips = {};
  tripsRaw.forEach(t => {
    trips[t.trip_id] = {
      routeId: t.route_id,
      direction: parseInt(t.direction_id),
      name: t.trip_short_name || '',
    };
  });
  console.log(`  ${Object.keys(trips).length} trips parsed`);

  // 4. Parse stop_times (streaming, grouped by trip)
  console.log('Parsing stop_times (1.1M rows, this takes a moment)...');
  const tripStops = {}; // trip_id -> [{stop_id, departure, arrival, seq}]
  let stCount = 0;

  await new Promise((resolve, reject) => {
    createReadStream(join(GTFS_DIR, 'stop_times.txt'))
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', row => {
        stCount++;
        if (stCount % 200000 === 0) process.stdout.write(`  ${(stCount/1000).toFixed(0)}K rows...\r`);

        const tripId = row.trip_id;
        if (!tripStops[tripId]) tripStops[tripId] = [];
        tripStops[tripId].push({
          stopId: row.stop_id,
          departure: parseTime(row.departure_time),
          arrival: parseTime(row.arrival_time),
          seq: parseInt(row.stop_sequence),
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`  ${stCount} stop_times parsed across ${Object.keys(tripStops).length} trips`);

  // 5. Build edges from consecutive stops on each trip
  console.log('Building transit edges...');

  // adjacency: fromStopId -> Map<toStopId, {routes: Set, minTime, totalTime, count}>
  const adjacency = {};
  // route stop sequences for display
  const routeStopSequences = {}; // routeId -> {direction0: [stopIds], direction1: [stopIds]}

  let edgeCount = 0;
  let skippedTrips = 0;

  for (const [tripId, stopTimes] of Object.entries(tripStops)) {
    const trip = trips[tripId];
    if (!trip) { skippedTrips++; continue; }

    // Sort by sequence
    stopTimes.sort((a, b) => a.seq - b.seq);

    // Build route stop sequence (take first trip per route+direction)
    const seqKey = `${trip.routeId}_${trip.direction}`;
    if (!routeStopSequences[seqKey]) {
      routeStopSequences[seqKey] = stopTimes.map(st => st.stopId);
    }

    // Create edges between consecutive stops
    for (let i = 0; i < stopTimes.length - 1; i++) {
      const from = stopTimes[i];
      const to = stopTimes[i + 1];

      // Normalize times >24h
      let travelTime = to.arrival - from.departure;
      if (travelTime < 0) travelTime += 86400;
      if (travelTime > 7200) continue; // Skip unrealistic >2hr segments

      const fromId = from.stopId;
      const toId = to.stopId;

      if (!adjacency[fromId]) adjacency[fromId] = {};
      if (!adjacency[fromId][toId]) {
        adjacency[fromId][toId] = { routes: new Set(), minTime: Infinity, totalTime: 0, count: 0 };
      }

      const edge = adjacency[fromId][toId];
      edge.routes.add(trip.routeId);
      edge.minTime = Math.min(edge.minTime, travelTime);
      edge.totalTime += travelTime;
      edge.count++;
      edgeCount++;
    }
  }
  console.log(`  ${edgeCount} raw edges built (${skippedTrips} trips skipped)`);

  // 6. Compile edges into compact format
  console.log('Compiling edge list...');
  const edges = {};
  let uniqueEdges = 0;

  for (const [fromId, targets] of Object.entries(adjacency)) {
    edges[fromId] = [];
    for (const [toId, data] of Object.entries(targets)) {
      const avgTime = Math.round(data.totalTime / data.count);
      edges[fromId].push({
        to: toId,
        routes: [...data.routes].slice(0, 5), // Keep top 5 routes per edge
        time: Math.max(60, data.minTime), // Min 1 minute
        avgTime: Math.max(60, avgTime),
        freq: data.count, // How many trips use this edge (proxy for frequency)
      });
      uniqueEdges++;
    }
  }
  console.log(`  ${uniqueEdges} unique edges`);

  // 7. Build spatial index (grid-based) for nearest stop lookup
  console.log('Building spatial index...');
  const GRID_SIZE = 0.005; // ~500m grid cells
  const spatialIndex = {};

  for (const stop of stopsList) {
    const gridKey = `${Math.floor(stop.lat / GRID_SIZE)}_${Math.floor(stop.lng / GRID_SIZE)}`;
    if (!spatialIndex[gridKey]) spatialIndex[gridKey] = [];
    spatialIndex[gridKey].push(stop.id);
  }
  console.log(`  ${Object.keys(spatialIndex).length} grid cells`);

  // 8. Compute walking transfers (stops within 400m)
  console.log('Computing walking transfers...');
  let walkEdges = 0;

  for (let i = 0; i < stopsList.length; i++) {
    const s1 = stopsList[i];
    const gridLat = Math.floor(s1.lat / GRID_SIZE);
    const gridLng = Math.floor(s1.lng / GRID_SIZE);

    // Check neighboring grid cells
    for (let dl = -1; dl <= 1; dl++) {
      for (let dc = -1; dc <= 1; dc++) {
        const cellKey = `${gridLat + dl}_${gridLng + dc}`;
        const cellStops = spatialIndex[cellKey];
        if (!cellStops) continue;

        for (const s2Id of cellStops) {
          if (s2Id === s1.id) continue;
          const s2 = stops[s2Id];
          const dist = haversine(s1.lat, s1.lng, s2.lat, s2.lng);

          if (dist <= MAX_WALK_DISTANCE) {
            if (!edges[s1.id]) edges[s1.id] = [];
            // Check if walk edge already exists
            const exists = edges[s1.id].some(e => e.to === s2Id && e.type === 'walk');
            if (!exists) {
              edges[s1.id].push({
                to: s2Id,
                time: Math.round(dist / WALK_SPEED_MPS),
                type: 'walk',
                dist: Math.round(dist),
              });
              walkEdges++;
            }
          }
        }
      }
    }
    if (i % 1000 === 0) process.stdout.write(`  ${i}/${stopsList.length} stops processed...\r`);
  }
  console.log(`  ${walkEdges} walking transfer edges added`);

  // 9. Build departure schedules for popular stops (top 200 by frequency)
  console.log('Building departure schedules...');
  const stopFrequency = {};
  for (const [tripId, stopTimes] of Object.entries(tripStops)) {
    for (const st of stopTimes) {
      stopFrequency[st.stopId] = (stopFrequency[st.stopId] || 0) + 1;
    }
  }

  const topStops = Object.entries(stopFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200)
    .map(([id]) => id);

  const departures = {};
  for (const stopId of topStops) {
    departures[stopId] = {};
  }

  for (const [tripId, stopTimes] of Object.entries(tripStops)) {
    const trip = trips[tripId];
    if (!trip) continue;
    for (const st of stopTimes) {
      if (departures[st.stopId]) {
        const routeId = trip.routeId;
        if (!departures[st.stopId][routeId]) departures[st.stopId][routeId] = [];
        const depTime = st.departure % 86400; // Normalize to 24h
        departures[st.stopId][routeId].push(depTime);
      }
    }
  }

  // Sort and deduplicate departure times
  for (const stopId of topStops) {
    for (const routeId of Object.keys(departures[stopId])) {
      departures[stopId][routeId] = [...new Set(departures[stopId][routeId])].sort((a, b) => a - b);
    }
  }
  console.log(`  Departure schedules for ${topStops.length} high-frequency stops`);

  // 10. Compile route metadata with stop sequences
  console.log('Compiling route metadata...');
  const routeMeta = {};
  for (const [seqKey, stopIds] of Object.entries(routeStopSequences)) {
    const [routeId, dir] = seqKey.split('_');
    if (!routeMeta[routeId]) {
      routeMeta[routeId] = {
        ...routes[routeId],
        directions: {},
      };
    }
    routeMeta[routeId].directions[dir] = stopIds.map(id => {
      const s = stops[id];
      return s ? { id, name: s.name } : { id, name: id };
    });
  }

  // 11. Write output
  const graph = {
    meta: {
      generated: new Date().toISOString(),
      source: 'TGSRTC GTFS January 2026',
      stats: {
        stops: stopsList.length,
        routes: Object.keys(routes).length,
        trips: Object.keys(trips).length,
        edges: uniqueEdges,
        walkEdges,
      },
    },
    stops: stopsList.map(s => ({
      id: s.id,
      name: s.name,
      zone: s.zone,
      lat: s.lat,
      lng: s.lng,
    })),
    edges,
    routes: routeMeta,
    spatialIndex,
    departures,
    config: {
      walkSpeedMps: WALK_SPEED_MPS,
      maxWalkDistance: MAX_WALK_DISTANCE,
      transferPenalty: TRANSFER_PENALTY,
    },
  };

  const json = JSON.stringify(graph);
  await writeFile(OUTPUT, json);

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  console.log(`\n=== Done! ===`);
  console.log(`Output: ${OUTPUT}`);
  console.log(`Size: ${sizeMB} MB`);
  console.log(`Stops: ${stopsList.length}`);
  console.log(`Routes: ${Object.keys(routes).length}`);
  console.log(`Edges: ${uniqueEdges} transit + ${walkEdges} walking`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
