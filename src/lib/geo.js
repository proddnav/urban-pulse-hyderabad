/**
 * Geolocation utilities
 */

// Get current position
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Watch position changes
export function watchPosition(callback) {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    err => console.warn('Geo watch error:', err),
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
}

// Stop watching
export function clearWatch(watchId) {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
}

// Format distance for display
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Format walking time
export function formatWalkTime(meters) {
  const minutes = Math.ceil(meters / 80); // ~80m/min walking
  return `${minutes} min walk`;
}

// Get bearing between two points (for direction arrows)
export function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Get compass direction from bearing
export function getDirection(bearing) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8];
}

export default { getCurrentPosition, watchPosition, clearWatch, formatDistance, formatWalkTime, getBearing, getDirection };
