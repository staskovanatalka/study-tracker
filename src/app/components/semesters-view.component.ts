import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { Subject, Task, FlatTask } from '../models';
import { SubjectDetailModalComponent } from './subject-detail-modal.component';
import { CreateSubjectModalComponent } from './create-subject-modal.component';
import { TaskDetailModalComponent } from './task-detail-modal.component';

interface SemesterGroup {
  number: number | 0;
  label: string;
  subjects: Subject[];
  totalCredits: number;
  earnedCredits: number;
  avgGrade: number | null;
  status: 'completed' | 'in_progress' | 'future' | 'unassigned';
}

@Component({
  selector: 'app-semesters-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SubjectDetailModalComponent,
    CreateSubjectModalComponent,
    TaskDetailModalComponent
  ],
  template: `
    <section class="space-y-4 pt-1.5">

      <!-- HORNÍ KPI PŘEHLED (4 KARTY VEDLE SEBE) -->
      <div class="grid grid-cols-4 gap-1.5 sm:gap-3 text-xs">

        <!-- ZÍSKANÉ KREDITY -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-2xs min-w-0 flex flex-col justify-between">
          <span class="text-slate-400 font-medium truncate block text-[10px] sm:text-xs">Získané kredity</span>
          <div class="flex items-baseline space-x-1 pt-1 truncate">
            <span class="text-base sm:text-2xl font-black text-slate-800">{{ studyService.earnedCredits() }}</span>
            <span class="text-slate-400 font-semibold text-[10px] sm:text-xs">/ {{ studyService.targetCredits() }}</span>
          </div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 sm:mt-3">
            <div
              class="h-full bg-sky-500 rounded-full transition-all duration-300"
              [style.width.%]="(studyService.earnedCredits() / studyService.targetCredits()) * 100">
            </div>
          </div>
        </div>

        <!-- REGISTRAČNÍ KUPONY -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-2xs min-w-0 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium truncate text-[10px] sm:text-xs">Kupony</span>
            <span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 hidden sm:inline">z {{ studyService.totalCoupons() }}</span>
          </div>
          <div class="flex items-baseline space-x-1 pt-1 truncate">
            <span class="text-base sm:text-2xl font-black" [ngClass]="studyService.remainingCoupons() < 20 ? 'text-rose-600' : 'text-slate-800'">
              {{ studyService.remainingCoupons() }}
            </span>
            <span class="text-slate-400 font-semibold text-[10px] sm:text-xs">zbývá</span>
          </div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2 sm:mt-3">
            <div
              class="h-full rounded-full transition-all duration-300"
              [ngClass]="studyService.remainingCoupons() < 20 ? 'bg-rose-500' : (studyService.remainingCoupons() < 50 ? 'bg-amber-400' : 'bg-emerald-500')"
              [style.width.%]="(studyService.remainingCoupons() / studyService.totalCoupons()) * 100">
            </div>
          </div>
        </div>

        <!-- STUDIJNÍ PRŮMĚR -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-2xs min-w-0 flex flex-col justify-between">
          <span class="text-slate-400 font-medium truncate block text-[10px] sm:text-xs">Vážený průměr</span>
          <div class="pt-1">
            <span class="text-base sm:text-2xl font-black text-slate-800">
              {{ overallAverage() !== null ? overallAverage() : '—' }}
            </span>
          </div>
          <p class="text-[9px] sm:text-[11px] text-slate-400 pt-1 sm:pt-3 truncate">Ukončené</p>
        </div>

        <!-- AKTIVNÍ PŘEDMĚTY -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-2xs min-w-0 flex flex-col justify-between">
          <span class="text-slate-400 font-medium truncate block text-[10px] sm:text-xs">Aktivní</span>
          <div class="pt-1">
            <span class="text-base sm:text-2xl font-black text-sky-600">{{ inProgressCount() }}</span>
          </div>
          <p class="text-[9px] sm:text-[11px] text-slate-400 pt-1 sm:pt-3 truncate">Probíhá</p>
        </div>

      </div>

      <!-- ZÁLOŽKY SEMESTRŮ + ŠUPLÍK NA PRAVÉM KRAJI -->
      <div class="flex items-center space-x-2 text-xs select-none w-full">

        <!-- 1. PLNÝ REŽIM -->
        <div class="hidden sm:grid grid-cols-6 gap-1.5 flex-1 min-w-0">
          @for (sem of regularSemesters(); track sem.number) {
            <button
              type="button"
              (click)="selectedSemNumber.set(sem.number)"
              [ngClass]="[
                selectedSemNumber() === sem.number
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              ]"
              class="px-2 py-1.5 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer text-xs truncate">
              <span class="truncate">{{ sem.number }}. semestr</span>

              @if (sem.status === 'completed') {
                <span class="text-[10px] opacity-75 shrink-0">✓</span>
              } @else if (sem.status === 'in_progress') {
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
              }
            </button>
          }
        </div>

        <!-- 2. KOMPAKTNÍ REŽIM SE ŠIPKAMI -->
        <div class="flex sm:hidden items-center space-x-1.5 flex-1 min-w-0">
          <button
            type="button"
            (click)="stepSemester(-1)"
            title="Předchozí semestr"
            class="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-bold text-sm shadow-2xs cursor-pointer shrink-0">
            ‹
          </button>

          @if (currentSemester(); as cur) {
            <div class="flex-1 bg-slate-900 text-white font-semibold px-3 py-1.5 rounded-xl shadow-2xs flex items-center justify-center space-x-2 text-xs truncate">
              <span class="truncate">{{ cur.label }}</span>
              @if (cur.status === 'in_progress') {
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
              } @else if (cur.status === 'completed') {
                <span class="text-[10px] opacity-75 shrink-0">✓</span>
              }
            </div>
          }

          <button
            type="button"
            (click)="stepSemester(1)"
            title="Další semestr"
            class="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 flex items-center justify-center font-bold text-sm shadow-2xs cursor-pointer shrink-0">
            ›
          </button>
        </div>

        <!-- ŠUPLÍK VŽDY V PRAVÉM KRAJI -->
        <button
          type="button"
          (click)="selectedSemNumber.set(0)"
          title="Předměty bez semestru"
          [ngClass]="[
            selectedSemNumber() === 0
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80'
          ]"
          class="w-8 h-8 rounded-xl transition flex items-center justify-center cursor-pointer shrink-0">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
          </svg>
        </button>

      </div>

      <!-- KARTA ZVOLENÉHO SEMESTRU / ZÁSOBNÍKU -->
      @if (currentSemester(); as sem) {
        <div class="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">

          <!-- ZÁHLAVÍ SEMESTRU -->
          <div class="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-50/70 border-b border-slate-100">
            <div class="flex items-center space-x-3">
              <span class="inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-2xs">
                {{ sem.number === 0 ? '—' : sem.number }}
              </span>
              <div>
                <div class="flex items-center space-x-2">
                  <h3 class="font-bold text-slate-900 text-sm leading-none">{{ sem.label }}</h3>

                  <button
                    type="button"
                    (click)="openAddSubjectModal(sem.number)"
                    [title]="sem.number === 0 ? 'Přidat předmět do zásobníku' : 'Přidat předmět do ' + sem.number + '. semestru'"
                    class="w-5 h-5 rounded-md hover:bg-slate-200/80 text-slate-400 hover:text-slate-800 font-bold flex items-center justify-center text-xs transition cursor-pointer">
                    +
                  </button>
                </div>
                <span class="text-[11px] font-medium text-slate-400">
                  @switch (sem.status) {
                    @case ('completed') { Dokončený semestr }
                    @case ('in_progress') { Právě studovaný semestr }
                    @case ('unassigned') { Předměty v plánu bez přiřazeného ročníku }
                    @default { Budoucí semestr }
                  }
                </span>
              </div>
            </div>

            <div class="flex items-center space-x-4 sm:space-x-5 text-xs">
              <div class="flex items-center space-x-1.5">
                <span class="text-slate-400 font-medium">Kredity:</span>
                <span class="font-bold text-slate-800">{{ sem.totalCredits }} ECTS</span>
              </div>
              @if (sem.number !== 0) {
                <div class="flex items-center space-x-1.5 pl-3 sm:pl-4 border-l border-slate-200">
                  <span class="text-slate-400 font-medium">Průměr:</span>
                  <span class="font-black text-slate-800 text-sm">{{ sem.avgGrade !== null ? sem.avgGrade : '—' }}</span>
                </div>
              }
            </div>
          </div>

          <!-- SEZNAM PŘEDMĚTŮ -->
          <div class="divide-y divide-slate-100">
            @for (sub of sem.subjects; track sub.id) {
              @let gradeInfo = getSubjectGradeInfo(sub);
              @let progress = getSubjectProgress(sub);
              @let hasEvaluatedProgress = hasDoneTasks(sub) || sub.status === 'completed';
              @let isExpanded = expandedSubjectIds().has(sub.id);
              @let taskList = sub.tasks || [];

              <div class="transition">

                <!-- HLAVNÍ ŘÁDEK PŘEDMĚTU (BEZ ZÁVORKY S POČTEM) -->
                <div
                  (click)="selectedSubject.set(sub)"
                  class="px-4 sm:px-5 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/80 cursor-pointer transition select-none group">

                  <!-- LEVÁ ČÁST: ŠIPKA, KÓD, NÁZEV, STAV -->
                  <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 pr-3">

                    <!-- ŠIPKA PRO ROZBALENÍ -->
                    <button
                      type="button"
                      (click)="toggleSubjectExpand(sub.id, $event)"
                      [title]="isExpanded ? 'Sbalit úkoly' : 'Rozbalit úkoly'"
                      [ngClass]="taskList.length === 0 ? 'opacity-20 cursor-default' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer'"
                      class="w-5 h-5 rounded-md flex items-center justify-center transition shrink-0 -ml-1 text-slate-400">
                      <svg
                        class="w-3.5 h-3.5 transition-transform duration-200"
                        [ngClass]="{'rotate-90 text-slate-800': isExpanded}"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>

                    <span class="font-mono text-xs text-slate-400 group-hover:text-slate-500 w-14 sm:w-16 shrink-0 transition">{{ sub.code || '—' }}</span>

                    <!-- ČISTÝ NÁZEV BEZ (1/1) NEBO (0/1) -->
                    <span class="font-semibold text-slate-800 group-hover:text-slate-950 truncate text-xs sm:text-sm transition">
                      {{ sub.name }}
                    </span>

                    <span [ngClass]="{
                      'bg-sky-50 text-sky-700 border border-sky-200': sub.status === 'in_progress',
                      'bg-emerald-50 text-emerald-700 border border-emerald-200': sub.status === 'completed',
                      'bg-slate-100 text-slate-600 border border-slate-200': sub.status === 'not_started'
                    }" class="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                      {{ sub.status === 'in_progress' ? 'Probíhá' : (sub.status === 'completed' ? 'Hotovo' : 'Nezahájeno') }}
                    </span>

                    <!-- VÝBĚR SEMESTRU U NEZAŘAZENÝCH -->
                    @if (sem.number === 0) {
                      <select
                        (click)="$event.stopPropagation()"
                        [ngModel]="sub.semester"
                        (ngModelChange)="onAssignSemester(sub.id, $event)"
                        class="bg-white border border-slate-200 rounded-xl px-2 py-0.5 text-[11px] text-slate-600 outline-none cursor-pointer shadow-2xs hover:border-slate-300">
                        <option [ngValue]="null">Přiřadit semestr...</option>
                        <option [ngValue]="1">1. semestr</option>
                        <option [ngValue]="2">2. semestr</option>
                        <option [ngValue]="3">3. semestr</option>
                        <option [ngValue]="4">4. semestr</option>
                        <option [ngValue]="5">5. semestr</option>
                        <option [ngValue]="6">6. semestr</option>
                      </select>
                    }
                  </div>

                  <!-- PRAVÁ ČÁST -->
                  <div class="flex items-center space-x-3 sm:space-x-6 shrink-0">
                    <span class="font-medium text-slate-600 text-right">{{ sub.credits }} ECTS</span>

                    @if (sem.number !== 0) {
                      <div class="w-12 sm:w-14 text-right">
                        @if (hasEvaluatedProgress) {
                          <span class="font-bold text-xs" [ngClass]="{
                            'text-emerald-600': progress >= 90,
                            'text-lime-600': progress >= 75 && progress < 90,
                            'text-amber-500': progress >= 60 && progress < 75,
                            'text-rose-500': progress < 60
                          }">
                            {{ progress }} %
                          </span>
                        } @else {
                          <span class="text-slate-300 font-normal">—</span>
                        }
                      </div>

                      <div class="w-8 sm:w-10 text-right font-black text-sm">
                        @if (gradeInfo.grade !== null) {
                          <span [ngClass]="{
                            'text-emerald-600': gradeInfo.grade === 1,
                            'text-lime-600': gradeInfo.grade === 2,
                            'text-amber-500': gradeInfo.grade === 3,
                            'text-rose-500': gradeInfo.grade === 4
                          }">
                            {{ gradeInfo.grade }}
                          </span>
                        } @else {
                          <span class="text-slate-300 font-normal">—</span>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- ROZBALENÝ SEZNAM ÚKOLŮ S PROCENTY MÍSTO DATUMU -->
                @if (isExpanded) {
                  <div class="bg-slate-50/60 border-t border-b border-slate-100/80 pl-8 sm:pl-12 pr-4 sm:pr-6 py-1.5 space-y-1 divide-y divide-slate-100/60">
                    @for (task of taskList; track task.id) {
                      @let isDone = task.status === 'done';
                      @let isWaiting = task.status === 'waiting_for_grade';
                      @let pct = getTaskPercentage(task);

                      <div
                        (click)="openTaskModal(task, sub, $event)"
                        class="pt-1.5 pb-1 flex items-center justify-between text-xs hover:bg-slate-100/60 px-2.5 rounded-xl cursor-pointer transition select-none group/task">

                        <!-- LEVÁ ČÁST: STAV, TYP, NÁZEV -->
                        <div class="flex items-center space-x-2.5 min-w-0 pr-4">
                          <span class="w-4 text-center shrink-0">
                            @if (isDone) {
                              <span class="text-emerald-600 font-bold text-xs">✓</span>
                            } @else if (isWaiting) {
                              <span class="text-sky-500 text-[10px]">⏳</span>
                            } @else {
                              <span class="w-2 h-2 rounded-full border border-slate-300 inline-block"></span>
                            }
                          </span>

                          <span
                            [ngClass]="getTypeBadgeClass(task.type)"
                            class="text-[9px] font-semibold px-1.5 py-0.2 rounded border shrink-0">
                            {{ getTypeLabel(task.type) }}
                          </span>

                          <span
                            [ngClass]="isDone ? 'text-slate-800 font-semibold' : 'text-slate-400 font-normal'"
                            class="truncate text-xs group-hover/task:text-slate-950">
                            {{ task.title }}
                          </span>
                        </div>

                        <!-- PRAVÁ ČÁST: BODY A MÍSTO DATUMU PROCENTA -->
                        <div class="flex items-center space-x-4 shrink-0 font-mono text-[11px]">

                          <!-- BODY -->
                          <div [ngClass]="isDone ? 'text-slate-700' : 'text-slate-400'">
                            <span class="font-bold">{{ task.points }}</span>
                            <span class="text-slate-300"> / </span>
                            <span>{{ task.maxPoints }} b.</span>
                          </div>

                          <!-- PROCENTA -->
                          <div class="w-12 text-right">
                            @if (isDone && pct !== null) {
                              <span class="font-bold" [ngClass]="{
                                'text-emerald-600': pct >= 90,
                                'text-lime-600': pct >= 75 && pct < 90,
                                'text-amber-500': pct >= 60 && pct < 75,
                                'text-rose-500': pct < 60
                              }">
                                {{ pct }} %
                              </span>
                            } @else {
                              <span class="text-slate-300 font-normal">—</span>
                            }
                          </div>

                        </div>
                      </div>
                    } @empty {
                      <div class="py-2 text-slate-400 text-[11px] italic pl-2">
                        Předmět nemá zadané žádné úkoly ani testy.
                      </div>
                    }
                  </div>
                }

              </div>
            } @empty {
              <div class="py-12 text-center text-slate-400 text-xs">
                {{ sem.number === 0 ? 'Všechny předměty mají přiřazený svůj semestr.' : 'V tomto semestru zatím nemáš zapsané žádné předměty.' }}
              </div>
            }
          </div>

        </div>
      }

      <!-- MODÁL PRO DETAIL PŘEDMĚTU -->
      @if (activeSubjectModal(); as activeSub) {
        <app-subject-detail-modal
          [subject]="activeSub"
          (closed)="selectedSubject.set(null)" />
      }

      <!-- MODÁL PRO VYTVOŘENÍ NOVÉHO PŘEDMĚTU -->
      @if (createSemesterTarget() !== null) {
        <app-create-subject-modal
          [semesterNumber]="createSemesterTarget()"
          (closed)="createSemesterTarget.set(null)" />
      }

      <!-- MODÁL PRO DETAIL A EDITACI ÚKOLU -->
      @if (activeTaskForModal(); as activeT) {
        <app-task-detail-modal
          [task]="activeT"
          (closed)="activeTaskForModal.set(null)" />
      }

    </section>
  `
})
export class SemestersViewComponent implements OnInit {
  studyService = inject(StudyService);

  selectedSemNumber = signal<number>(1);
  selectedSubject = signal<Subject | null>(null);
  createSemesterTarget = signal<number | null>(null);
  activeTaskForModal = signal<FlatTask | null>(null);

  expandedSubjectIds = signal<Set<string | number>>(new Set());

  activeSubjectModal = computed(() => {
    const sel = this.selectedSubject();
    if (!sel) return null;
    return this.studyService.subjects().find(s => s.id === sel.id) || sel;
  });

  toggleSubjectExpand(subjectId: string | number, event: MouseEvent) {
    event.stopPropagation();
    this.expandedSubjectIds.update(set => {
      const next = new Set(set);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  }

  getTaskPercentage(task: Task): number | null {
    const max = Number(task.maxPoints);
    if (!max || max <= 0) return null;
    return Math.min(100, Math.round(((Number(task.points) || 0) / max) * 100));
  }

  openTaskModal(task: Task, subject: Subject, event: MouseEvent) {
    event.stopPropagation();
    const flat: FlatTask = {
      daysRemaining: 0,
      ...task,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      subjectSemester: subject.semester
    };
    this.activeTaskForModal.set(flat);
  }

  hasDoneTasks(subject: Subject): boolean {
    return (subject.tasks || []).some(t => t.status === 'done');
  }

  getSubjectProgress(subject: Subject): number {
    const tasks = subject.tasks ?? [];
    const completedTasks = tasks.filter(t => t.status === 'done');

    if (completedTasks.length === 0) {
      return subject.status === 'completed' ? 100 : 0;
    }

    const totalPoints = completedTasks.reduce((sum, t) => sum + (Number(t.points) || 0), 0);
    const totalMaxPoints = completedTasks.reduce((sum, t) => sum + (Number(t.maxPoints) || 0), 0);

    if (totalMaxPoints <= 0) return 0;
    return Math.min(100, Math.round((totalPoints / totalMaxPoints) * 100));
  }

  getSubjectGradeInfo(subject: Subject): { grade: number | null; isFinal: boolean } {
    const hasCompletedTasks = this.hasDoneTasks(subject);
    const progress = this.getSubjectProgress(subject);
    const isCompleted = subject.status === 'completed';

    if (isCompleted) {
      if (hasCompletedTasks) {
        if (progress >= 90) return { grade: 1, isFinal: true };
        if (progress >= 75) return { grade: 2, isFinal: true };
        if (progress >= 60) return { grade: 3, isFinal: true };
        return { grade: 4, isFinal: true };
      }
      if (subject.grade !== null && subject.grade !== undefined) {
        return { grade: Number(subject.grade), isFinal: true };
      }
      return { grade: 1, isFinal: true };
    }

    if (hasCompletedTasks) {
      let calc = 4;
      if (progress >= 90) calc = 1;
      else if (progress >= 75) calc = 2;
      else if (progress >= 60) calc = 3;
      return { grade: calc, isFinal: false };
    }

    return { grade: null, isFinal: false };
  }

  allSemesters = computed<SemesterGroup[]>(() => {
    const all = this.studyService.subjects() || [];
    const groups: SemesterGroup[] = [];

    for (let i = 1; i <= 6; i++) {
      const semSubjects = all.filter(s => s.semester === i);
      const totalCredits = semSubjects.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
      const earnedCredits = semSubjects
        .filter(s => {
          const info = this.getSubjectGradeInfo(s);
          return info.isFinal && info.grade !== null && info.grade <= 3;
        })
        .reduce((sum, s) => sum + (Number(s.credits) || 0), 0);

      let weightedSum = 0;
      let gradedCredits = 0;

      for (const s of semSubjects) {
        const info = this.getSubjectGradeInfo(s);
        const credits = Number(s.credits) || 0;
        if (info.isFinal && info.grade !== null && credits > 0) {
          weightedSum += info.grade * credits;
          gradedCredits += credits;
        }
      }

      let avgGrade: number | null = null;
      if (gradedCredits > 0) {
        avgGrade = Math.round((weightedSum / gradedCredits) * 100) / 100;
      }

      let status: 'completed' | 'in_progress' | 'future' = 'future';
      if (semSubjects.length > 0) {
        if (semSubjects.some(s => s.status === 'in_progress')) {
          status = 'in_progress';
        } else if (semSubjects.every(s => s.status === 'completed')) {
          status = 'completed';
        }
      }

      groups.push({
        number: i,
        label: `${i}. semestr`,
        subjects: semSubjects,
        totalCredits,
        earnedCredits,
        avgGrade,
        status
      });
    }

    const unassignedSubjects = all.filter(s => !s.semester);
    const unassignedCredits = unassignedSubjects.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);

    groups.push({
      number: 0,
      label: 'Bez semestru',
      subjects: unassignedSubjects,
      totalCredits: unassignedCredits,
      earnedCredits: 0,
      avgGrade: null,
      status: 'unassigned'
    });

    return groups;
  });

  regularSemesters = computed(() => {
    return this.allSemesters().filter(s => s.number >= 1 && s.number <= 6);
  });

  currentSemester = computed(() => {
    return this.allSemesters().find(s => s.number === this.selectedSemNumber());
  });

  inProgressCount = computed(() => {
    const all = this.studyService.subjects() || [];
    return all.filter(s => s.status === 'in_progress').length;
  });

  overallAverage = computed(() => {
    const all = this.studyService.subjects() || [];
    let weightedSum = 0;
    let gradedCredits = 0;

    for (const s of all) {
      const info = this.getSubjectGradeInfo(s);
      const credits = Number(s.credits) || 0;
      if (info.isFinal && info.grade !== null && credits > 0) {
        weightedSum += info.grade * credits;
        gradedCredits += credits;
      }
    }

    if (gradedCredits === 0) return null;
    return Math.round((weightedSum / gradedCredits) * 100) / 100;
  });

  stepSemester(delta: number) {
    let cur = this.selectedSemNumber();
    if (cur === 0) {
      this.selectedSemNumber.set(delta > 0 ? 1 : 6);
      return;
    }
    let next = cur + delta;
    if (next < 1) next = 6;
    if (next > 6) next = 1;
    this.selectedSemNumber.set(next);
  }

  openAddSubjectModal(semNum: number) {
    this.createSemesterTarget.set(semNum === 0 ? null : semNum);
  }

  async onAssignSemester(subjectId: string | number, semNumber: number | null) {
    await this.studyService.updateSubjectDetails(subjectId, {
      semester: semNumber ? Number(semNumber) : null
    });
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'exam': return 'Test';
      case 'oral': return 'Ústní';
      case 'extra': return 'Extra';
      default: return 'Úkol';
    }
  }

  getTypeBadgeClass(type: string): string {
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

  ngOnInit() {
    const active = this.allSemesters().find(s => s.status === 'in_progress');
    if (active) {
      this.selectedSemNumber.set(active.number);
    } else {
      const firstIncomplete = this.allSemesters().find(s => s.status !== 'completed' && s.subjects.length > 0);
      if (firstIncomplete) {
        this.selectedSemNumber.set(firstIncomplete.number);
      }
    }
  }
}
