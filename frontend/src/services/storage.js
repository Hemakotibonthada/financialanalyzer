import axios from 'axios';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocFromCache,
  getDocs, 
  getDocsFromCache,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { getFirebaseDb, initializeFirebase } from './firebase';
import { getCurrentFirebaseUser } from './firebaseAuth';

// Storage configuration
let storageType = 'local'; // default to local
let localApiUrl = 'http://localhost:5001/api';
let userId = 'default-user'; // For multi-user support in Firebase

// Initialize storage based on settings
export async function initializeStorage() {
  try {
    // Check if running in Electron
    if (window.electron && window.electron.getStorageSettings) {
      const settings = await window.electron.getStorageSettings();
      
      if (settings && settings.storageType) {
        storageType = settings.storageType;
        
        if (storageType === 'online') {
          // Initialize Firebase
          initializeFirebase();
          
          // Try to get current Firebase user if authenticated
          const firebaseUser = getCurrentFirebaseUser();
          if (firebaseUser) {
            userId = firebaseUser.uid;
            console.log('Storage initialized: Firebase/Firestore with user:', userId);
          } else {
            console.log('Storage initialized: Firebase/Firestore (user not yet authenticated)');
          }
        } else {
          console.log('Storage initialized: Local MongoDB');
        }
      }
    } else {
      // Web environment - check localStorage for storage preference
      // If not set, default to 'online' for web deployments
      const savedStorageType = localStorage.getItem('storageType') || sessionStorage.getItem('storageType');
      
      // Default to 'online' for Firebase Hosting deployments
      const isFirebaseHosting = typeof window !== 'undefined' && 
                                 (window.location.hostname.includes('firebaseapp.com') || 
                                  window.location.hostname.includes('web.app'));
      
      if (savedStorageType) {
        storageType = savedStorageType;
      } else if (isFirebaseHosting) {
        // Default to Firebase/Firestore for web deployments
        storageType = 'online';
        localStorage.setItem('storageType', 'online');
        console.log('Detected Firebase Hosting - using Firebase/Firestore');
      }
      
      if (storageType === 'online') {
        initializeFirebase();
        
        const firebaseUser = getCurrentFirebaseUser();
        if (firebaseUser) {
          userId = firebaseUser.uid;
        }
        console.log('Storage initialized: Firebase/Firestore (web)');
      } else {
        console.log('Storage initialized: Local MongoDB (web)');
      }
    }
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    // Default to online for web deployments
    const isFirebaseHosting = typeof window !== 'undefined' && 
                               (window.location.hostname.includes('firebaseapp.com') || 
                                window.location.hostname.includes('web.app'));
    storageType = isFirebaseHosting ? 'online' : 'local';
  }
  
  return storageType;
}

// Get current storage type
export function getStorageType() {
  return storageType;
}

// Set user ID for Firebase collections
export function setUserId(id) {
  userId = id;
  console.log('[storage] User ID set to:', id);
}

// Get current user ID
export function getUserId() {
  // If using Firebase, try to get from current user
  if (storageType === 'online') {
    const firebaseUser = getCurrentFirebaseUser();
    if (firebaseUser && firebaseUser.uid !== userId) {
      userId = firebaseUser.uid;
    }
  }
  return userId;
}

// Generic API wrapper
class StorageService {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.collectionName = endpoint.replace('/api/', '');
  }

  // GET all items
  async getAll(filters = {}) {
    if (storageType === 'local') {
      const response = await axios.get(`${localApiUrl}${this.endpoint}`, { params: filters });
      return response.data;
    } else {
      const db = getFirebaseDb();
      const currentUserId = getUserId();
      const collectionRef = collection(db, this.collectionName);
      
      let q = query(collectionRef, where('userId', '==', currentUserId));
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          q = query(q, where(key, '==', value));
        }
      });
      
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        console.warn('Firestore offline, trying cache:', err.message);
        try { querySnapshot = await getDocsFromCache(q); }
        catch { return []; }
      }
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }

  // GET by ID
  async getById(id) {
    if (storageType === 'local') {
      const response = await axios.get(`${localApiUrl}${this.endpoint}/${id}`);
      return response.data;
    } else {
      const db = getFirebaseDb();
      const docRef = doc(db, this.collectionName, id);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        console.warn('Firestore offline, trying cache:', err.message);
        try { docSnap = await getDocFromCache(docRef); }
        catch { throw new Error('Document not available offline'); }
      }
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      throw new Error('Document not found');
    }
  }

  // CREATE
  async create(data) {
    if (storageType === 'local') {
      const response = await axios.post(`${localApiUrl}${this.endpoint}`, data);
      return response.data;
    } else {
      const db = getFirebaseDb();
      const currentUserId = getUserId();
      const collectionRef = collection(db, this.collectionName);
      
      const docData = {
        ...data,
        userId: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collectionRef, docData);
      return { id: docRef.id, ...docData };
    }
  }

  // UPDATE
  async update(id, data) {
    if (storageType === 'local') {
      const response = await axios.put(`${localApiUrl}${this.endpoint}/${id}`, data);
      return response.data;
    } else {
      const db = getFirebaseDb();
      const docRef = doc(db, this.collectionName, id);
      
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    }
  }

  // DELETE
  async delete(id) {
    if (storageType === 'local') {
      const response = await axios.delete(`${localApiUrl}${this.endpoint}/${id}`);
      return response.data;
    } else {
      const db = getFirebaseDb();
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return { success: true };
    }
  }
}

// Create service instances for each entity
export const expensesService = new StorageService('/expenses');
export const incomesService = new StorageService('/incomes');
export const budgetsService = new StorageService('/budgets');
export const goalsService = new StorageService('/goals');
export const loansService = new StorageService('/loans');
export const lendersService = new StorageService('/lenders');
export const emissService = new StorageService('/emis');
export const billRemindersService = new StorageService('/bill-reminders');

export default {
  initializeStorage,
  getStorageType,
  setUserId,
  getUserId,
  expensesService,
  incomesService,
  budgetsService,
  goalsService,
  loansService,
  lendersService,
  emissService,
  billRemindersService
};
