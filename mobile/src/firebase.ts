import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuthNative from '@firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDWkqBjJj2tIA7J8l_7yGjDxP0YN4zpOH4',
  authDomain: 'barber-1-8b58b.firebaseapp.com',
  projectId: 'barber-1-8b58b',
  storageBucket: 'barber-1-8b58b.firebasestorage.app',
  messagingSenderId: '364420520794',
  appId: '1:364420520794:web:f6124428e03bfec3473163',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const getReactNativePersistence = (FirebaseAuthNative as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

let nativeAuth;
try {
  nativeAuth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  nativeAuth = getAuth(app);
}

export const auth = nativeAuth;
export const db = getFirestore(app);
