import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import {CommonModule} from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">

        <!-- Logo / Název aplikace s VŠE brandingem -->
        <div class="flex items-center space-x-3.5">
          <img
            src="vse-logo.png"
            alt="Logo VŠE"
            class="h-8 w-auto object-contain shrink-0">

          <div class="border-l border-slate-200/80 pl-3.5">
            <div class="flex items-center space-x-1.5">
              <span class="font-bold text-slate-900 text-sm tracking-tight block">Study Tracker</span>
            </div>
            <span class="text-[10px] text-slate-400 block -mt-0.5">Tracker studia na VŠE</span>
          </div>
        </div>

        <!-- Profil tlačítko s Dropdown menu -->
        @if (authService.currentUser(); as user) {
          <div class="relative">
            <button
              (click)="toggleMenu($event)"
              class="flex items-center space-x-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200/60 outline-none">

              @if (user.photoURL) {
                <img [src]="user.photoURL" class="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-2xs"
                     alt="Avatar">
              } @else {
                <div
                  class="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs">
                  {{ (user.displayName || user.email || 'U')[0].toUpperCase() }}
                </div>
              }

              <div class="text-left hidden sm:block">
                <span class="text-xs font-semibold text-slate-800 block leading-tight">
                  {{ user.displayName || 'Můj účet' }}
                </span>
              </div>

              <svg class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                   [class.rotate-180]="isMenuOpen()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Dropdown Menu -->
            @if (isMenuOpen()) {
              <div
                class="absolute right-0 mt-2 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">

                <!-- Informace o účtu -->
                <div class="px-4 py-2.5 border-b border-slate-100">
                  <span
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Přihlášen jako</span>
                  <div
                    class="font-semibold text-xs text-slate-900 truncate mt-0.5">{{ user.displayName || 'Student' }}
                  </div>
                  <div class="text-[11px] text-slate-400 truncate">{{ user.email }}</div>
                </div>

                <!-- Možnosti menu -->
                <div class="p-1">
                  <button
                    (click)="onLogout()"
                    class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition">
                    <svg class="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    <span>Odhlásit se</span>
                  </button>
                </div>

              </div>
            }
          </div>
        }

      </div>
    </header>
  `
})
export class HeaderComponent {
  authService = inject(AuthService);
  private elementRef = inject(ElementRef);
  isMenuOpen = signal<boolean>(false);

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen.update(v => !v);
  }

  onLogout() {
    this.isMenuOpen.set(false);
    this.authService.logout();
  }

  // Kliknutí kamkoliv jinam zavře menu
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }
}
