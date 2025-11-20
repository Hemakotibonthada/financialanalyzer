import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';

/**
 * Firebase Authentication Service
 * Used when storage type is 'online'
 */

// Sign in with email and password
export async function signInWithFirebase(email, password) {
  const auth = getFirebaseAuth();
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get additional user data from Firestore
    const db = getFirebaseDb();
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Get Firebase ID token (acts as access token)
    const token = await user.getIdToken();
    
    return {
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        name: user.displayName || userData.name || email.split('@')[0],
        ...userData
      },
      token,
      accessToken: token
    };
  } catch (error) {
    console.error('Firebase sign in error:', error);
    throw new Error(error.message || 'Failed to sign in with Firebase');
  }
}

// Register new user with Firebase
export async function registerWithFirebase(name, email, password) {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name
    await updateProfile(user, {
      displayName: name
    });
    
    // Store additional user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Get Firebase ID token
    const token = await user.getIdToken();
    
    return {
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        name: name
      },
      token,
      accessToken: token
    };
  } catch (error) {
    console.error('Firebase registration error:', error);
    throw new Error(error.message || 'Failed to register with Firebase');
  }
}

// Sign out from Firebase
export async function signOutFromFirebase() {
  const auth = getFirebaseAuth();
  
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Firebase sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
}

// Get current Firebase user
export function getCurrentFirebaseUser() {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

// Listen to auth state changes
export function onFirebaseAuthStateChanged(callback) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

// Get Firebase ID token (refreshes if expired)
export async function getFirebaseIdToken(forceRefresh = false) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No authenticated user');
  }
  
  return await user.getIdToken(forceRefresh);
}

export default {
  signInWithFirebase,
  registerWithFirebase,
  signOutFromFirebase,
  getCurrentFirebaseUser,
  onFirebaseAuthStateChanged,
  getFirebaseIdToken
};
