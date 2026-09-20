import { Component, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { TaskType, FlatTask } from '../models';
import { TaskDetailModalComponent } from './task-detail-modal.component';

type TaskTab = 'pending' | 'completed' | 'archive';

@Component({
  selector: 'app-tasks-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskDetailModalComponent],
  template: `
    <section class="space-y-4 pt-1.5">

      <!-- PŘEPÍNACÍ ZÁLOŽKY + INDIKÁTOR SEMESTRU -->
      <div class="flex items-center justify-between text-xs select-none">
        <div class="flex items-center space-x-1.5">
          <!-- K VYŘEŠENÍ -->
          <button
            type="button"
            (click)="activeTab.set('pending')"
            [ngClass]="[
              activeTab() === 'pending'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            ]"
            class="px-3.5 py-1.5 rounded-xl transition flex items-center space-x-2 cursor-pointer">
            <span>K vyřešení</span>
            @if (pendingCount() > 0) {
              <span
                [ngClass]="activeTab() === 'pending' ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'"
                class="text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none">
                {{ pendingCount() }}
              </span>
            }
          </button>

          <!-- DOKONČENÉ -->
          <button
            type="button"
            (click)="activeTab.set('completed')"
            [ngClass]="[
              activeTab() === 'completed'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            ]"
            class="px-3.5 py-1.5 rounded-xl transition flex items-center space-x-2 cursor-pointer">
            <span>Dokončené</span>
            @if (completedCount() > 0) {
              <span
                [ngClass]="activeTab() === 'completed' ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'"
                class="text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none">
                {{ completedCount() }}
              </span>
            }
          </button>

          <!-- ARCHIV -->
          <button
            type="button"
            (click)="activeTab.set('archive')"
            [ngClass]="[
              activeTab() === 'archive'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            ]"
            class="px-3.5 py-1.5 rounded-xl transition flex items-center space-x-2 cursor-pointer">
            <span>Archiv</span>
          </button>
        </div>

        <span class="text-[11px] font-semibold text-slate-400 pr-1 hidden sm:inline">
          {{ activeSemesterLabel() }}
        </span>
      </div>

      <!-- ================= 1. POHLED: K VYŘEŠENÍ ================= -->
      @if (activeTab() === 'pending') {
        <div class="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th class="py-2.5 px-3.5 w-24 shrink-0">Zbývá</th>
                <th class="py-2.5 px-3 min-w-[120px] w-32 sm:w-44 shrink-0">Název</th>
                <th class="py-2.5 px-3 min-w-[140px]">Předmět</th>
                <th class="py-2.5 px-1.5 w-16 text-center shrink-0">Typ</th>
                <th class="py-2.5 px-2 w-16 sm:w-20 text-right shrink-0">Skóre</th>
                <th class="py-2.5 px-3 w-24 text-right shrink-0">Stav</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              @for (t of displayedTasks(); track t.id) {
                @let days = getDaysRemaining(t.dueDate);
                @let isOverdue = days !== null && days < 0 && t.status !== 'waiting_for_grade';
                @let isWaiting = t.status === 'waiting_for_grade';

                <tr
                  (click)="selectedTask.set(t)"
                  [ngClass]="[
                    isWaiting ? 'bg-slate-50/70 opacity-70 hover:opacity-100 hover:bg-slate-100/70' : (isOverdue ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/70')
                  ]"
                  class="transition group cursor-pointer">

                  <!-- 1. ZBÝVÁ -->
                  <td class="py-2.5 px-3.5 whitespace-nowrap text-xs font-normal">
                    @if (isWaiting) {
                      <span class="text-slate-400 font-normal">
                        {{ t.dueDate ? formatShortDate(t.dueDate) : '—' }}
                      </span>
                    } @else if (days !== null) {
                      @if (days < 0) {
                        <span [title]="formatCzechDate(t.dueDate)" class="text-rose-600 font-normal">
                          Po termínu
                        </span>
                      } @else if (days === 0) {
                        <span [title]="formatCzechDate(t.dueDate)" class="text-rose-600 font-normal">
                          Dnes
                        </span>
                      } @else if (days === 1) {
                        <span [title]="formatCzechDate(t.dueDate)" class="text-rose-500 font-normal">
                          Zítra
                        </span>
                      } @else {
                        <span [title]="formatCzechDate(t.dueDate)" class="text-slate-500 font-normal">
                          {{ days }}d
                        </span>
                      }
                    } @else {
                      <span class="text-slate-300 font-normal">—</span>
                    }
                  </td>

                  <!-- 2. NÁZEV -->
                  <td class="py-2.5 px-3 font-semibold text-slate-800 group-hover:text-slate-950">
                    <span
                      [ngClass]="{
                        'text-slate-600 font-medium': isWaiting,
                        'text-rose-950 font-bold': isOverdue
                      }"
                      class="line-clamp-2 block"
                      [title]="t.title">
                      {{ t.title }}
                    </span>
                  </td>

                  <!-- 3. PŘEDMĚT -->
                  <td class="py-2.5 px-3 font-medium" [ngClass]="isWaiting ? 'text-slate-500' : 'text-slate-700'">
                    <span class="line-clamp-2 block leading-snug" [title]="t.subjectName">
                      {{ t.subjectName }}
                    </span>
                  </td>

                  <!-- 4. TYP -->
                  <td class="py-2.5 px-1.5 text-center whitespace-nowrap">
                    <span
                      [ngClass]="getTypeBadgeClass(t.type)"
                      class="text-[9px] font-semibold px-2 py-0.5 rounded-lg border inline-block">
                      {{ getTypeLabel(t.type) }}
                    </span>
                  </td>

                  <!-- 5. SKÓRE -->
                  <td class="py-2.5 px-2 text-right whitespace-nowrap font-mono text-[11px]">
                    <div
                      (click)="$event.stopPropagation()"
                      class="inline-flex items-center justify-end">
                      <input
                        type="number"
                        [ngModel]="t.points"
                        (ngModelChange)="onTaskChange(t.id, 'points', +$event)"
                        min="0"
                        class="w-6 text-right font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800 outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                      <span class="text-slate-300 px-0.5">/</span>
                      <input
                        type="number"
                        [ngModel]="t.maxPoints"
                        (ngModelChange)="onTaskChange(t.id, 'maxPoints', +$event)"
                        min="1"
                        class="w-6 text-left text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800 outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                    </div>
                  </td>

                  <!-- 6. STAV -->
                  <td class="py-2.5 px-3 text-right whitespace-nowrap">
                    <select
                      (click)="$event.stopPropagation()"
                      [ngModel]="t.status"
                      (ngModelChange)="onTaskChange(t.id, 'status', $event)"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold': t.status === 'done',
                        'bg-amber-50 text-amber-700 border-amber-200 font-semibold': t.status === 'in_progress',
                        'bg-sky-50 text-sky-700 border-sky-200 font-semibold': t.status === 'waiting_for_grade',
                        'bg-slate-100 text-slate-600 border-slate-200': t.status === 'not_started'
                      }"
                      class="border rounded-lg px-2 py-0.5 text-[10px] outline-none cursor-pointer text-left truncate shadow-2xs">
                      <option value="not_started">Nezahájeno</option>
                      <option value="in_progress">V řešení</option>
                      <option value="waiting_for_grade">Odevzdáno</option>
                      <option value="done">Hotovo</option>
                    </select>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-10 text-center text-slate-400 text-xs">
                    Všechny úkoly v aktuálním semestru máš hotové!
                  </td>
                </tr>
              }

              <!-- ŘÁDEK PRO RYCHLÉ PŘIDÁNÍ -->
              <tr class="bg-slate-50/40 hover:bg-slate-50 transition border-t border-slate-200/70">
                <td class="py-2 px-3 text-center">
                  <div class="relative inline-flex items-center justify-center">
                    <input
                      type="date"
                      [(ngModel)]="newDueDate"
                      (keydown.enter)="onQuickAdd()"
                      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10">

                    <button type="button" class="w-6 h-6 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </button>
                  </div>
                </td>

                <td class="py-2 px-3">
                  <input
                    #taskTitleInput
                    [(ngModel)]="newTitle"
                    placeholder="Název..."
                    (keydown.enter)="onQuickAdd()"
                    class="bg-transparent text-slate-800 placeholder:text-slate-400 outline-none w-full font-medium text-xs">
                </td>

                <td class="py-2 px-3">
                  <select
                    [(ngModel)]="newSubjectId"
                    class="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 outline-none cursor-pointer w-full truncate text-[11px] shadow-2xs">
                    <option value="" disabled selected>Předmět...</option>
                    @for (s of currentSemesterSubjects(); track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select>
                </td>

                <td class="py-2 px-1 text-center">
                  <select
                    [(ngModel)]="newType"
                    class="bg-white border border-slate-200 rounded-lg px-1 py-0.5 text-slate-700 outline-none cursor-pointer text-[10px] shadow-2xs w-full">
                    <option value="homework">Úkol</option>
                    <option value="exam">Test</option>
                    <option value="oral">Ústní</option>
                    <option value="extra">Extra</option>
                  </select>
                </td>

                <td class="py-2 px-2 text-right">
                  <span class="text-slate-300 font-mono text-[10px]">0/100</span>
                </td>

                <td class="py-2 px-3 text-right">
                  <button
                    type="button"
                    (click)="onQuickAdd()"
                    [disabled]="!newTitle.trim() || !newSubjectId"
                    class="bg-slate-900 disabled:opacity-30 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition text-[10px] shadow-2xs cursor-pointer">
                    Přidat
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      }

      <!-- ================= 2. POHLED: DOKONČENÉ (KOMPAKTNÍ PŘEHLEDNÁ TABULKA) ================= -->
      @if (activeTab() === 'completed') {
        <div class="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th class="py-2.5 px-3.5 w-24 shrink-0">Termín</th>
                <th class="py-2.5 px-3 min-w-[120px] w-32 sm:w-44 shrink-0">Název</th>
                <th class="py-2.5 px-3 min-w-[140px]">Předmět</th>
                <th class="py-2.5 px-1.5 w-16 text-center shrink-0">Typ</th>
                <th class="py-2.5 px-2 w-16 sm:w-20 text-right shrink-0">Skóre</th>
                <th class="py-2.5 px-3 w-20 text-right shrink-0">Stav</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (t of displayedTasks(); track t.id) {
                <tr
                  (click)="selectedTask.set(t)"
                  class="hover:bg-slate-50/70 transition cursor-pointer group">

                  <!-- Termín splnění -->
                  <td class="py-2.5 px-3.5 whitespace-nowrap text-xs font-normal text-slate-400">
                    {{ t.dueDate ? formatShortDate(t.dueDate) : '—' }}
                  </td>

                  <!-- Název -->
                  <td class="py-2.5 px-3 font-semibold text-slate-800 group-hover:text-slate-950">
                    <span class="line-clamp-2 block" [title]="t.title">{{ t.title }}</span>
                  </td>

                  <!-- Předmět -->
                  <td class="py-2.5 px-3 text-slate-700 font-medium">
                    <span class="line-clamp-2 block leading-snug" [title]="t.subjectName">
                      {{ t.subjectName }}
                    </span>
                  </td>

                  <!-- Typ -->
                  <td class="py-2.5 px-1.5 text-center whitespace-nowrap">
                    <span
                      [ngClass]="getTypeBadgeClass(t.type)"
                      class="text-[9px] font-semibold px-2 py-0.5 rounded-lg border inline-block">
                      {{ getTypeLabel(t.type) }}
                    </span>
                  </td>

                  <!-- Skóre -->
                  <td class="py-2.5 px-2 text-right whitespace-nowrap font-mono text-[11px]">
                    <span class="font-bold text-slate-800">{{ t.points }}</span>
                    <span class="text-slate-300">/</span>
                    <span class="text-slate-500">{{ t.maxPoints }}</span>
                  </td>

                  <!-- Stav -->
                  <td class="py-2.5 px-3 text-right whitespace-nowrap">
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 inline-block">
                      Hotovo
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-12 text-center text-slate-400 text-xs">
                    Zatím v tomto semestru nemáš žádné dokončené úkoly.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ================= 3. POHLED: ARCHIV ================= -->
      @if (activeTab() === 'archive') {
        <div class="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/70 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th class="py-2.5 px-3 w-32 sm:w-36 shrink-0">Název</th>
                <th class="py-2.5 px-3">Předmět</th>
                <th class="py-2.5 px-1.5 w-20 text-center shrink-0">Typ</th>
                <th class="py-2.5 px-2 w-20 sm:w-24 text-right shrink-0">Skóre</th>
                <th class="py-2.5 px-2 w-14 sm:w-16 text-right shrink-0">Procenta</th>
                <th class="py-2.5 px-3 w-20 text-right shrink-0">Stav</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (t of displayedTasks(); track t.id) {
                @let pct = getPercentage(t.points, t.maxPoints);

                <tr
                  (click)="selectedTask.set(t)"
                  class="hover:bg-slate-50/70 transition cursor-pointer group">

                  <td class="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {{ t.title }}
                  </td>

                  <td class="py-2.5 px-3 text-slate-700 font-medium whitespace-normal">
                    <span class="line-clamp-2 block leading-snug">
                      {{ t.subjectName }}
                    </span>
                  </td>

                  <td class="py-2.5 px-1.5 text-center whitespace-nowrap">
                    <span
                      [ngClass]="getTypeBadgeClass(t.type)"
                      class="text-[9px] font-semibold px-2 py-0.5 rounded-lg border inline-block">
                      {{ getTypeLabel(t.type) }}
                    </span>
                  </td>

                  <td class="py-2.5 px-2 text-right font-mono text-[11px] whitespace-nowrap">
                    <span class="font-bold text-slate-800">{{ t.points }}</span>
                    <span class="text-slate-300">/</span>
                    <span class="text-slate-500">{{ t.maxPoints }}</span>
                  </td>

                  <td class="py-2.5 px-2 text-right font-mono text-[11px] whitespace-nowrap">
                    <span class="font-bold" [ngClass]="{
                      'text-emerald-600': pct >= 90,
                      'text-lime-600': pct >= 75 && pct < 90,
                      'text-amber-500': pct >= 60 && pct < 75,
                      'text-rose-500': pct < 60
                    }">
                      {{ pct }}%
                    </span>
                  </td>

                  <td class="py-2.5 px-3 text-right whitespace-nowrap">
                    <span
                      [ngClass]="t.status === 'done' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100 border-slate-200'"
                      class="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg border inline-block">
                      {{ t.status === 'done' ? 'Hotovo' : 'Probíhá' }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="py-8 text-center text-slate-400 text-xs">
                    V archivu zatím nejsou žádné položky.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- MODÁL PRO DETAIL A EDITACI ÚKOLU -->
      @if (activeTaskModal(); as activeT) {
        <app-task-detail-modal
          [task]="activeT"
          (closed)="selectedTask.set(null)" />
      }

    </section>
  `
})
export class TasksViewComponent {
  studyService = inject(StudyService);
  Math = Math;
  @ViewChild('taskTitleInput') taskTitleInputElement!: ElementRef<HTMLInputElement>;

  activeTab = signal<TaskTab>('pending');
  selectedTask = signal<FlatTask | null>(null);

  newSubjectId: string | number = '';
  newTitle = '';
  newType: TaskType = 'homework';
  newDueDate = '';

  activeTaskModal = computed(() => {
    const sel = this.selectedTask();
    if (!sel) return null;
    return this.studyService.allTasks().find(t => t.id === sel.id) || sel;
  });

  activeSemesterNumber = computed<number | null>(() => {
    const subs = this.studyService.subjects() || [];
    const inProg = subs.find(s => s.status === 'in_progress');
    if (inProg && inProg.semester) return inProg.semester;
    return 3;
  });

  activeSemesterLabel = computed(() => {
    const num = this.activeSemesterNumber();
    return num ? `${num}. semestr` : 'Semestr';
  });

  currentSemesterSubjects = computed(() => {
    const semNum = this.activeSemesterNumber();
    const subs = this.studyService.subjects() || [];
    return subs.filter(s => s.semester === semNum);
  });

  allFlatTasks = computed(() => {
    return this.studyService.allTasks() || [];
  });

  displayedTasks = computed<FlatTask[]>(() => {
    const all = this.allFlatTasks();
    const activeSem = this.activeSemesterNumber();
    const tab = this.activeTab();

    let filtered: FlatTask[] = [];

    if (tab === 'pending') {
      filtered = all.filter(t => t.subjectSemester === activeSem && t.status !== 'done');

      filtered.sort((a, b) => {
        const aWaiting = a.status === 'waiting_for_grade';
        const bWaiting = b.status === 'waiting_for_grade';

        if (aWaiting !== bWaiting) {
          return aWaiting ? 1 : -1;
        }

        const daysA = this.getDaysRemaining(a.dueDate);
        const daysB = this.getDaysRemaining(b.dueDate);

        const aOverdue = daysA !== null && daysA < 0;
        const bOverdue = daysB !== null && daysB < 0;

        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (aOverdue && bOverdue) {
          return (daysA ?? 0) - (daysB ?? 0);
        }

        if (daysA === null && daysB !== null) return 1;
        if (daysA !== null && daysB === null) return -1;
        if (daysA !== null && daysB !== null) {
          return daysA - daysB;
        }

        return a.title.localeCompare(b.title);
      });

    } else if (tab === 'completed') {
      // POUZE DOKONČENÉ ÚKOLY ZE SOUČASNÉHO SEMESTRU, SEŘAZENÉ SESTUPNĚ
      filtered = all.filter(t => t.subjectSemester === activeSem && t.status === 'done');
      filtered.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return b.dueDate.localeCompare(a.dueDate);
      });

    } else if (tab === 'archive') {
      filtered = all.filter(t => t.subjectSemester !== activeSem);
    }

    return filtered;
  });

  pendingCount = computed(() => {
    const activeSem = this.activeSemesterNumber();
    return this.allFlatTasks().filter(t => t.subjectSemester === activeSem && t.status !== 'done').length;
  });

  completedCount = computed(() => {
    const activeSem = this.activeSemesterNumber();
    return this.allFlatTasks().filter(t => t.subjectSemester === activeSem && t.status === 'done').length;
  });

  getTypeLabel(type: TaskType | string): string {
    switch (type) {
      case 'exam': return 'Test';
      case 'oral': return 'Ústní';
      case 'extra': return 'Extra';
      default: return 'Úkol';
    }
  }

  getTypeBadgeClass(type: TaskType | string): string {
    switch (type) {
      case 'exam':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'oral':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'extra':
        return 'text-violet-700 bg-violet-50 border-violet-200';
      default:
        return 'text-sky-700 bg-sky-50 border-sky-200';
    }
  }

  getDaysRemaining(isoDate: string | null | undefined): number | null {
    if (!isoDate) return null;
    const parts = isoDate.split('-');
    if (parts.length !== 3) return null;

    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  getPercentage(points: number, maxPoints: number): number {
    if (!maxPoints || maxPoints <= 0) return 0;
    return Math.min(100, Math.round((points / maxPoints) * 100));
  }

  formatShortDate(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parseInt(parts[2], 10)}. ${parseInt(parts[1], 10)}.`;
  }

  formatCzechDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '—';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parts[0];
    return `${day}. ${month}. ${year}`;
  }

  async onTaskChange(taskId: number, field: string, value: any) {
    await this.studyService.updateTask(taskId, { [field]: value });
  }

  async onQuickAdd() {
    if (!this.newSubjectId || !this.newTitle.trim()) return;

    await this.studyService.addTask(this.newSubjectId, {
      title: this.newTitle.trim(),
      type: this.newType,
      status: 'not_started',
      points: 0,
      maxPoints: 100,
      dueDate: this.newDueDate
    });

    this.newTitle = '';
    this.newDueDate = '';
  }
}
