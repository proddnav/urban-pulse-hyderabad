/**
 * User data storage — localStorage for speed + Firestore for persistence.
 * Reads from localStorage (instant). Writes to localStorage + Firestore (background).
 * On login, syncs Firestore → localStorage.
 * Works without Firestore (billing not enabled) — gracefully degrades to localStorage only.
 */

const RECENT_SEARCHES_KEY = 'urbanpulse_recent_searches'
const SAVED_PLACES_KEY = 'urbanpulse_saved_places'
const FAVORITE_ROUTES_KEY = 'urbanpulse_favorite_routes'
const FAVORITE_STOPS_KEY = 'urbanpulse_favorite_stops'

let _uid = null;

export function setStorageUser(uid) {
  const prevUid = _uid;
  _uid = uid;
  if (uid && uid !== prevUid) {
    // New user logged in — clear old localStorage data from previous/guest sessions
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    localStorage.removeItem(SAVED_PLACES_KEY);
    localStorage.removeItem(FAVORITE_ROUTES_KEY);
    localStorage.removeItem(FAVORITE_STOPS_KEY);
    localStorage.removeItem('urbanpulse_guest');
    // Then sync from Firestore (if available)
    syncFromFirestore(uid);
  }
  if (!uid) {
    // Logged out — clear data
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    localStorage.removeItem(SAVED_PLACES_KEY);
    localStorage.removeItem(FAVORITE_ROUTES_KEY);
    localStorage.removeItem(FAVORITE_STOPS_KEY);
  }
}

// --- localStorage helpers ---

function readJSON(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  if (_uid) saveToFirestore(_uid);
}

// --- Firestore sync (fails silently if not available) ---

async function saveToFirestore(uid) {
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    await setDoc(doc(db, 'userData', uid), {
      recentSearches: readJSON(RECENT_SEARCHES_KEY),
      savedPlaces: readJSON(SAVED_PLACES_KEY, {}),
      favoriteRoutes: readJSON(FAVORITE_ROUTES_KEY),
      favoriteStops: readJSON(FAVORITE_STOPS_KEY),
      updatedAt: Date.now(),
    }, { merge: true });
  } catch {
    // Firestore not available or billing not enabled — silent fail
  }
}

async function syncFromFirestore(uid) {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    const snap = await getDoc(doc(db, 'userData', uid));
    if (!snap.exists()) return;
    const data = snap.data();

    if (data.recentSearches?.length) {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(data.recentSearches));
    }
    if (data.savedPlaces && Object.keys(data.savedPlaces).length) {
      localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(data.savedPlaces));
    }
    if (data.favoriteRoutes?.length) {
      localStorage.setItem(FAVORITE_ROUTES_KEY, JSON.stringify(data.favoriteRoutes));
    }
    if (data.favoriteStops?.length) {
      localStorage.setItem(FAVORITE_STOPS_KEY, JSON.stringify(data.favoriteStops));
    }
    // Notify components that data is ready
    window.dispatchEvent(new CustomEvent('urbanpulse:synced'));
  } catch {
    // Silent fail
  }
}

// --- Recent Searches ---

export function getRecentSearches(limit = 5) {
  return readJSON(RECENT_SEARCHES_KEY).slice(0, limit)
}

export function addRecentSearch(from, to) {
  const recents = readJSON(RECENT_SEARCHES_KEY)
  const filtered = recents.filter(
    r => !(r.from.id === from.id && r.to.id === to.id)
  )
  filtered.unshift({ from, to, timestamp: Date.now() })
  writeJSON(RECENT_SEARCHES_KEY, filtered.slice(0, 10))
}

// --- Saved Places ---

export function getSavedPlaces() {
  const data = readJSON(SAVED_PLACES_KEY, {})
  return Array.isArray(data) ? {} : data
}

export function setSavedPlace(key, stop) {
  const raw = readJSON(SAVED_PLACES_KEY, {})
  const places = Array.isArray(raw) ? {} : raw
  places[key] = stop
  writeJSON(SAVED_PLACES_KEY, places)
}

export function removeSavedPlace(key) {
  const raw = readJSON(SAVED_PLACES_KEY, {})
  const places = Array.isArray(raw) ? {} : raw
  delete places[key]
  writeJSON(SAVED_PLACES_KEY, places)
}

// --- Favorite Routes ---

export function getFavoriteRoutes() {
  return readJSON(FAVORITE_ROUTES_KEY)
}

export function toggleFavoriteRoute(routeId) {
  const favs = readJSON(FAVORITE_ROUTES_KEY)
  const idx = favs.indexOf(routeId)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.push(routeId)
  writeJSON(FAVORITE_ROUTES_KEY, favs)
  return idx < 0
}

// --- Favorite Stops ---

export function getFavoriteStops() {
  return readJSON(FAVORITE_STOPS_KEY)
}

export function toggleFavoriteStop(stopId) {
  const favs = readJSON(FAVORITE_STOPS_KEY)
  const idx = favs.indexOf(stopId)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.push(stopId)
  writeJSON(FAVORITE_STOPS_KEY, favs)
  return idx < 0
}
