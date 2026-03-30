/**
 * Firebase configuration and helpers
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// Firebase config — replace with your project's config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000:web:000",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Disable reCAPTCHA in development for easier testing
if (import.meta.env.DEV) {
  auth.settings.appVerificationDisabledForTesting = true;
}

export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Auth Helpers ---

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    // Try popup first (works on desktop)
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/popup-blocked') {
      // Fallback to redirect (works on mobile + when popups blocked)
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

// Handle redirect result on page load
getRedirectResult(auth).catch(() => {});

export function logout() {
  return signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// --- Phone Auth ---

export async function sendOtp(phoneNumber) {
  let appVerifier;
  
  if (import.meta.env.DEV) {
    // In dev, use a dummy verifier to bypass reCAPTCHA and billing checks
    appVerifier = {
      type: 'recaptcha',
      verify: async () => 'test-token',
      render: async () => 'test-widget-id',
      reset: () => {},
      _reset: () => {},
      _verify: async () => 'test-token'
    };
  } else {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch {}
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
    });
    appVerifier = window.recaptchaVerifier;
  }
  
  const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  window.confirmationResult = confirmation;
  return confirmation;
}

export async function verifyOtp(otp) {
  if (!window.confirmationResult) throw new Error('No OTP sent');
  const result = await window.confirmationResult.confirm(otp);
  return result.user;
}

// --- User Profile ---

async function ensureUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      phone: user.phoneNumber || '',
      savedPlaces: [],
      createdAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  return updateDoc(doc(db, 'users', uid), data);
}

// --- Events ---

export async function createEvent(eventData, userId) {
  return addDoc(collection(db, 'events'), {
    ...eventData,
    userId,
    createdAt: serverTimestamp(),
    likes: 0,
    attendees: [],
    status: 'active',
  });
}

export async function getEvents(limitCount = 20) {
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeToEvents(callback, limitCount = 20) {
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function deleteEvent(eventId) {
  return updateDoc(doc(db, 'events', eventId), { status: 'deleted' });
}

// --- Image Upload ---

export async function uploadEventImage(file, eventId) {
  const storageRef = ref(storage, `event-images/${eventId}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// --- Passes ---

export async function getUserPasses(uid) {
  const q = query(collection(db, 'passes'), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPass(passData, uid) {
  return addDoc(collection(db, 'passes'), {
    ...passData,
    userId: uid,
    createdAt: serverTimestamp(),
    status: 'active',
  });
}

export default {
  auth, db, storage,
  signInWithGoogle, logout, onAuth,
  getUserProfile, updateUserProfile,
  createEvent, getEvents, subscribeToEvents, deleteEvent, uploadEventImage,
  getUserPasses, createPass,
};
