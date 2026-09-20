import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { Subject, TaskType, TaskStatus, SubjectStatus } from '../models';

@Component({
  selector: 'app-subject-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">

        <!-- NOTION HLAVIČKA -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Předmět</span>
            <input
              [(ngModel)]="subject().name"
              (change)="onSaveSubject()"
              placeholder="Název předmětu..."
              class="w-full text-xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-800 outline-none pb-0.5 transition">
          </div>
          <button
            type="button"
            (click)="closed.emit()"
            class="text-slate-400 hover:text-slate-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer shrink-0">
            ✕
          </button>
        </div>

        <!-- NOTION PROPERTIES (ČISTÝ SEZNAM VLASTNOSTÍ) -->
        <div class="space-y-2 py-1 text-xs border-y border-slate-100">

          <!-- STAV -->
          <div class="grid grid-cols-3 items-center py-1">
            <span class="text-slate-400 font-medium">Stav</span>
            <div class="col-span-2">
              <select
                [(ngModel)]="subject().status"
                (ngModelChange)="onSaveSubject()"
                [ngClass]="{
                  'bg-sky-50 text-sky-700 border-sky-200': subject().status === 'in_progress',
                  'bg-emerald-50 text-emerald-700 border-emerald-200': subject().status === 'completed',
                  'bg-slate-100 text-slate-600 border-slate-200': subject().status === 'not_started'
                }"
                class="border rounded-xl px-3 py-1 font-semibold outline-none cursor-pointer text-xs transition">
                <option value="not_started">Nezahájeno</option>
                <option value="in_progress">Probíhá</option>
                <option value="completed">Hotovo</option>
              </select>
            </div>
          </div>

          <!-- KÓD PŘEDMĚTU -->
          <div class="grid grid-cols-3 items-center py-1">
            <span class="text-slate-400 font-medium">Kód</span>
            <div class="col-span-2">
              <input
                [(ngModel)]="subject().code"
                (change)="onSaveSubject()"
                placeholder="např. 4IZ210"
                class="font-mono text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl px-2.5 py-1 outline-none uppercase w-28 text-xs transition">
            </div>
          </div>

          <!-- KREDITY -->
          <div class="grid grid-cols-3 items-center py-1">
            <span class="text-slate-400 font-medium">Kredity</span>
            <div class="col-span-2 flex items-center space-x-1.5">
              <input
                type="number"
                [(ngModel)]="subject().credits"
                (change)="onSaveSubject()"
                min="1"
                class="font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl px-2.5 py-1 outline-none w-16 text-xs transition">
              <span class="text-slate-400 text-[11px]">ECTS</span>
            </div>
          </div>

          <!-- SEMESTR -->
          <div class="grid grid-cols-3 items-center py-1">
            <span class="text-slate-400 font-medium">Semestr</span>
            <div class="col-span-2">
              <select
                [(ngModel)]="subject().semester"
                (ngModelChange)="onSaveSubject()"
                class="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-2.5 py-1 text-slate-700 outline-none cursor-pointer text-xs transition">
                <option [ngValue]="null">Bez semestru</option>
                <option [ngValue]="1">1. semestr</option>
                <option [ngValue]="2">2. semestr</option>
                <option [ngValue]="3">3. semestr</option>
                <option [ngValue]="4">4. semestr</option>
                <option [ngValue]="5">5. semestr</option>
                <option [ngValue]="6">6. semestr</option>
              </select>
            </div>
          </div>

          <!-- PROGRES -->
          <div class="grid grid-cols-3 items-center py-1">
            <span class="text-slate-400 font-medium">Celkový progres</span>
            <div class="col-span-2">
              @let p = studyService.getSubjectProgress(subject());
              <span class="font-bold text-xs" [ngClass]="{
                'text-emerald-600': p >= 90,
                'text-lime-600': p >= 75 && p < 90,
                'text-amber-500': p >= 60 && p < 75,
                'text-rose-500': p < 60
              }">
                {{ p }} %
              </span>
            </div>
          </div>

        </div>

        <!-- SEZNAM ÚKOLŮ & HODNOCENÍ -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Úkoly a hodnocení</span>
            <span class="text-[11px] font-semibold text-slate-400">{{ (subject().tasks || []).length }} položek</span>
          </div>

          <!-- EXISTUJÍCÍ POLOŽKY -->
          <div class="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            @for (t of subject().tasks; track t.id) {
              <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 transition text-xs">

                <div class="flex items-center space-x-2.5 truncate flex-1 min-w-0 pr-2">
                  <span [title]="t.type" class="text-xs shrink-0">
                    {{ t.type === 'exam' ? '📕' : (t.type === 'extra' ? '⭐' : '📘') }}
                  </span>

                  <div class="truncate">
                    <div class="font-medium text-slate-800 truncate">{{ t.title }}</div>
                    <div class="text-[10px] text-slate-400 flex items-center space-x-1.5">
                      <span>{{ t.status === 'done' ? 'Splněno' : (t.status === 'in_progress' ? 'V řešení' : 'Nezahájeno') }}</span>
                      @if (t.dueDate) {
                        <span>•</span>
                        <span class="font-mono">{{ t.dueDate }}</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-3 shrink-0">
                  <span class="font-bold text-slate-700 text-xs">
                    {{ t.points }} <span class="text-slate-400 font-normal">/ {{ t.maxPoints }} b.</span>
                  </span>
                  <button
                    type="button"
                    (click)="onDeleteTask(t.id)"
                    class="text-slate-300 hover:text-rose-500 transition cursor-pointer p-1">
                    ✕
                  </button>
                </div>

              </div>
            } @empty {
              <div class="text-center py-5 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                Zatím žádné úkoly pro tento předmět.
              </div>
            }
          </div>

          <!-- RYCHLÉ PŘIDÁNÍ ÚKOLU (MINIMALISTICKÝ ŘÁDEK MÍSTO VELKÉHO FORMULÁŘE) -->
          <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-2 text-xs">
            <div class="flex items-center space-x-1.5">
              <input
                [(ngModel)]="taskTitle"
                (keydown.enter)="onAddTask()"
                placeholder="+ Nový úkol, test..."
                class="bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none flex-1 font-medium text-slate-800 placeholder:text-slate-400">

              <button
                type="button"
                (click)="onAddTask()"
                [disabled]="!taskTitle.trim()"
                class="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0">
                Přidat
              </button>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
              <select [(ngModel)]="taskType" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 outline-none cursor-pointer">
                <option value="homework">Úkol</option>
                <option value="exam">Test / Zkouška</option>
                <option value="extra">Extra</option>
              </select>

              <div class="flex items-center space-x-1 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                <input [(ngModel)]="taskPoints" type="number" class="w-10 text-right outline-none font-semibold text-slate-700">
                <span class="text-slate-300">/</span>
                <input [(ngModel)]="taskMaxPoints" type="number" class="w-10 outline-none text-slate-500">
                <span class="text-slate-400 text-[10px]">b.</span>
              </div>

              <input [(ngModel)]="taskDueDate" type="date" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 outline-none font-mono text-[11px]">
            </div>
          </div>

        </div>

        <!-- SPODNÍ LIŠTA: SMAZAT / ZAVŘÍT -->
        <div class="pt-2 flex justify-between items-center text-xs">
          <button
            type="button"
            (click)="onDeleteSubject()"
            class="text-rose-500 hover:text-rose-700 font-medium transition cursor-pointer hover:underline">
            Smazat předmět
          </button>
          <button
            type="button"
            (click)="closed.emit()"
            class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-xl font-semibold transition cursor-pointer">
            Hotovo
          </button>
        </div>

      </div>
    </div>
  `
})
export class SubjectDetailModalComponent {
  studyService = inject(StudyService);

  subject = input.required<Subject>();
  closed = output<void>();

  taskTitle = '';
  taskType: TaskType = 'homework';
  taskStatus: TaskStatus = 'not_started';
  taskPoints = 0;
  taskMaxPoints = 100;
  taskDueDate = '';

  async onSaveSubject() {
    const s = this.subject();
    await this.studyService.updateSubjectDetails(s.id, {
      name: s.name.trim(),
      code: (s.code || '').trim().toUpperCase(),
      status: s.status,
      credits: Number(s.credits) || 0,
      semester: s.semester ? Number(s.semester) : null
    });
  }

  async onDeleteSubject() {
    const s = this.subject();
    if (confirm(`Opravdu chceš smazat předmět "${s.name}"?`)) {
      await this.studyService.deleteSubject(s.id);
      this.closed.emit();
    }
  }

  async onAddTask() {
    const s = this.subject();
    if (!this.taskTitle.trim()) return;

    await this.studyService.addTask(s.id, {
      title: this.taskTitle.trim(),
      type: this.taskType,
      status: this.taskStatus,
      points: Number(this.taskPoints) || 0,
      maxPoints: Number(this.taskMaxPoints) || 100,
      dueDate: this.taskDueDate
    });

    this.taskTitle = '';
    this.taskPoints = 0;
    this.taskMaxPoints = 100;
    this.taskDueDate = '';
  }

  async onDeleteTask(taskId: number) {
    await this.studyService.deleteTask(taskId);
  }
}
