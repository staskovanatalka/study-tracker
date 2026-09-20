import { Injectable, signal } from '@angular/core';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(auth, user => {
      this.currentUser.set(user);
    });
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Chyba při přihlašování přes Google:', error);
    }
  }

  async logout() {
    await signOut(auth);
  }
}
