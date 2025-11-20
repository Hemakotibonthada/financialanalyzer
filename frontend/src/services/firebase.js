import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics, logEvent, setUserProperties } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCjq21hbswP3uwSkOCvGxQ6g5BY1jF1yx8",
  authDomain: "finserveassist.firebaseapp.com",
  projectId: "finserveassist",
  storageBucket: "finserveassist.firebasestorage.app",
  messagingSenderId: "639604596498",
  appId: "1:639604596498:web:83b2a7bc0969a47ccdddcb",
  measurementId: "G-9B93V0H4WC"
};

// Initialize Firebase
let app = null;
let db = null;
let auth = null;
let analytics = null;
let storage = null;

export function initializeFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    
    // Initialize Analytics (only in browser environment)
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
        console.log('Firebase Analytics initialized');
      } catch (error) {
        console.warn('Analytics not available:', error.message);
      }
    }
    
    // Enable offline persistence for Firestore
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support offline persistence.');
        }
      });
  }
  
  return { app, db, auth, analytics, storage };
}

export function getFirebaseDb() {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

export function getFirebaseAuth() {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

export function getFirebaseAnalytics() {
  if (!analytics) {
    initializeFirebase();
  }
  return analytics;
}

export function getFirebaseStorage() {
  if (!storage) {
    initializeFirebase();
  }
  return storage;
}

// Analytics helper functions
export function trackEvent(eventName, eventParams = {}) {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
}

export function setUserProperty(propertyName, value) {
  if (analytics) {
    setUserProperties(analytics, { [propertyName]: value });
  }
}

export default { 
  initializeFirebase, 
  getFirebaseDb, 
  getFirebaseAuth, 
  getFirebaseAnalytics,
  getFirebaseStorage,
  trackEvent,
  setUserProperty
};
