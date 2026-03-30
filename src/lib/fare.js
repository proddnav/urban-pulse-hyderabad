/**
 * TGSRTC Fare Calculator
 * Based on distance-based fare structure.
 */

import { haversine } from './routing-engine';
import metroData from '../data/metro-data.json';

// TGSRTC bus fare slabs (distance in km -> fare in ₹)
const BUS_FARE_SLABS = [
  { maxKm: 2, fare: 10 },
  { maxKm: 5, fare: 15 },
  { maxKm: 10, fare: 20 },
  { maxKm: 15, fare: 25 },
  { maxKm: 20, fare: 30 },
  { maxKm: 25, fare: 35 },
  { maxKm: 30, fare: 40 },
  { maxKm: 40, fare: 50 },
  { maxKm: 50, fare: 60 },
  { maxKm: Infinity, fare: 75 },
];

// Calculate bus fare based on distance
export function calculateBusFare(distanceMeters) {
  const km = distanceMeters / 1000;
  for (const slab of BUS_FARE_SLABS) {
    if (km <= slab.maxKm) return slab.fare;
  }
  return 75;
}

// Calculate metro fare based on station count
export function calculateMetroFare(stationCount) {
  const { base, perStation, max } = metroData.fares;
  return Math.min(base + (stationCount - 1) * perStation, max);
}

// Calculate total fare for a route result
export function calculateRouteFare(segments) {
  let totalFare = 0;

  for (const segment of segments) {
    if (segment.type === 'walk') continue;

    if (segment.type === 'metro') {
      const stationCount = segment.stops.length;
      totalFare += calculateMetroFare(stationCount);
    } else {
      // Bus: calculate distance along stops
      let distance = 0;
      for (let i = 0; i < segment.stops.length - 1; i++) {
        const s1 = segment.stops[i];
        const s2 = segment.stops[i + 1];
        if (s1.lat && s2.lat) {
          distance += haversine(s1.lat, s1.lng, s2.lat, s2.lng);
        }
      }
      if (distance === 0) {
        // Fallback: use from/to
        distance = haversine(
          segment.from.lat, segment.from.lng,
          segment.stops[segment.stops.length - 1].lat,
          segment.stops[segment.stops.length - 1].lng
        );
      }
      totalFare += calculateBusFare(distance);
    }
  }

  return totalFare;
}

// Format fare for display
export function formatFare(fare) {
  return `₹${fare.toFixed(2)}`;
}

export default { calculateBusFare, calculateMetroFare, calculateRouteFare, formatFare };
