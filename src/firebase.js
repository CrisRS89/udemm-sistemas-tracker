import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfig = ["apiKey", "authDomain", "projectId", "appId"];
const hasFirebaseConfig = requiredConfig.every((key) => Boolean(firebaseConfig[key]));

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let isConfigured = false;

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    isConfigured = true;
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
  }
}

export {
  app,
  auth,
  db,
  googleProvider,
  isConfigured,
  doc,
  onAuthStateChanged,
  onSnapshot,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  signOut,
};
