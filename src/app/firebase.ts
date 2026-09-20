import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDXgcFJi2eVqt0brPLx312drQRd_JG8iv4",
  authDomain: "uni-study-tracker.firebaseapp.com",
  projectId: "uni-study-tracker",
  storageBucket: "uni-study-tracker.firebasestorage.app",
  messagingSenderId: "1011440074893",
  appId: "1:1011440074893:web:12f9568f7aa6139ea1a2c4"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
