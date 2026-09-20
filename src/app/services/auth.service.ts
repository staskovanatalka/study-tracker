import { Injectable, signal } from '@angular/core';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = getAuth();
  private provider = new GoogleAuthProvider();

  currentUser = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
    });
  }

  async loginWithGoogle() {
    try {
      // Zajišťuje prompt k výběru účtu
      this.provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(this.auth, this.provider);
      return result.user;
    } catch (error) {
      console.error('Chyba při přihlašování přes Google:', error);
      throw error;
    }
  }

  async logout() {
    await signOut(this.auth);
  }
}
