import {getApp,getApps,initializeApp} from "firebase/app";
import {browserLocalPersistence,getAuth,indexedDBLocalPersistence,initializeAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";

const firebaseConfig={
 apiKey:"AIzaSyDWkqBjJj2tIA7J8l_7yGjDxP0YN4zpOH4",
 authDomain:"barber-1-8b58b.firebaseapp.com",
 projectId:"barber-1-8b58b",
 storageBucket:"barber-1-8b58b.firebasestorage.app",
 messagingSenderId:"364420520794",
 appId:"1:364420520794:web:f6124428e03bfec3473163",
 measurementId:"G-1ECFPLCBS1"
};

const app=getApps().length?getApp():initializeApp(firebaseConfig);

// Inside the iOS app (Capacitor) getAuth() can hang, because it loads a web
// popup/redirect helper iframe that does not work there. Email/password login
// does not need it, so the native app uses initializeAuth without it.
// The website keeps using getAuth() exactly as before.
const isNativeApp=typeof window!=="undefined"&&Boolean((window as {Capacitor?:{isNativePlatform?:()=>boolean}}).Capacitor?.isNativePlatform?.());

export const auth=isNativeApp
 ?initializeAuth(app,{persistence:[indexedDBLocalPersistence,browserLocalPersistence]})
 :getAuth(app);
export const db=getFirestore(app);
