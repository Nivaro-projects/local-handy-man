import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase Client Configuration
 * 
 * NOTE: These are public web client credentials for Firebase Authentication and Firestore,
 * NOT privileged service account secrets.
 * Real credentials should be populated via environment variables in .env.local
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyLocalHandymanChirala2026PublicApiKey",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "local-handyman-chirala.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "local-handyman-chirala",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "local-handyman-chirala.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "949124278100",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:949124278100:web:localhandymanchirala"
};

export const isFirebaseConfigured = (): boolean => {
  const key = import.meta.env.VITE_FIREBASE_API_KEY;
  return Boolean(key && key !== "AIzaSyLocalHandymanChirala2026PublicApiKey" && key.length > 20);
};

export const app: FirebaseApp | null = isFirebaseConfigured()
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : null;
export const auth: Auth | null = app ? getAuth(app) : null;
