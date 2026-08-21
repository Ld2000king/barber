import {getApp,getApps,initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";

const firebaseConfig={
 apiKey:"AIzaSyDWkqBjjj2tIAZJ8l_ZyGjDxP0YN4zpOH4",
 authDomain:"barber-1-8b58b.firebaseapp.com",
 projectId:"barber-1-8b58b",
 storageBucket:"barber-1-8b58b.firebasestorage.app",
 messagingSenderId:"364420520794",
 appId:"1:364420520794:web:f6124428e03bfec3473163",
 measurementId:"G-1ECFPLCBS1"
};

const app=getApps().length?getApp():initializeApp(firebaseConfig);

export const auth=getAuth(app);
export const db=getFirestore(app);
