import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { FlatTask, TaskType } from '../models';

@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">

        <!-- HLAVIČKA -->
        <div class="flex items-start justify-between">
          <div class="min-w-0 pr-3">
            <span class="text-[11px] font-semibold text-slate-400 truncate block">
              {{ task().subjectName }} ({{ task().subjectCode || '—' }})
            </span>
            <input
              [ngModel]="task().title"
              (ngModelChange)="onUpdateField('title', $event)"
              placeholder="Název položky..."
              class="text-base font-bold text-slate-900 mt-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800 outline-none w-full">
          </div>
          <button
            type="button"
            (click)="closed.emit()"
            class="text-slate-400 hover:text-slate-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer shrink-0">
            ✕
          </button>
        </div>

        <!-- FORMULÁŘ POLÍČEK -->
        <div class="space-y-3.5 text-xs">

          <!-- TYP POLOŽKY -->
          <div>
            <label class="block text-slate-500 font-medium text-[11px] mb-1">Typ položky</label>
            <select
              [ngModel]="task().type"
              (ngModelChange)="onUpdateField('type', $event)"
              [ngClass]="getTypeBadgeClass(task().type)"
              class="w-full border rounded-xl px-3 py-2 outline-none font-semibold cursor-pointer shadow-2xs transition">
              <option value="homework">Úkol</option>
              <option value="exam">Test</option>
              <option value="oral">Ústní</option>
              <option value="extra">Extra</option>
            </select>
          </div>

          <!-- STAV ÚKOLU (S JASNÝM "ODEZVDÁNO") -->
          <div>
            <label class="block text-slate-500 font-medium text-[11px] mb-1">Stav</label>
            <select
              [ngModel]="task().status"
              (ngModelChange)="onUpdateField('status', $event)"
              [ngClass]="{
                'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold': task().status === 'done',
                'bg-amber-50 text-amber-700 border-amber-200 font-semibold': task().status === 'in_progress',
                'bg-sky-50 text-sky-700 border-sky-200 font-semibold': task().status === 'waiting_for_grade',
                'bg-slate-50 text-slate-700 border-slate-200': task().status === 'not_started'
              }"
              class="w-full border rounded-xl px-3 py-2 outline-none cursor-pointer shadow-2xs transition">
              <option value="not_started">Nezahájeno</option>
              <option value="in_progress">V řešení</option>
              <option value="waiting_for_grade">Odevzdáno</option>
              <option value="done">Hotovo</option>
            </select>
          </div>

          <!-- TERMÍN S ČESKÝM ZOBRAZENÍM -->
          <div>
            <label class="block text-slate-500 font-medium text-[11px] mb-1">Termín odevzdání</label>
            <div class="relative flex items-center group">
              <input
                type="date"
                [ngModel]="task().dueDate"
                (ngModelChange)="onUpdateField('dueDate', $event)"
                class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10">

              <div class="w-full bg-slate-50 group-hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-700 text-xs flex items-center justify-between transition shadow-2xs">
                <span>{{ formatCzechDate(task().dueDate) }}</span>
                <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
          </div>

          <!-- SKÓRE (BODY / MAXIMUM) -->
          <div>
            <label class="block text-slate-500 font-medium text-[11px] mb-1">Hodnocení (body)</label>
            <div class="flex items-center space-x-2">
              <div class="flex-1 flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  [ngModel]="task().points"
                  (ngModelChange)="onUpdateField('points', +$event)"
                  min="0"
                  class="w-full bg-transparent font-bold text-slate-800 outline-none text-right">
                <span class="text-slate-400">/</span>
                <input
                  type="number"
                  [ngModel]="task().maxPoints"
                  (ngModelChange)="onUpdateField('maxPoints', +$event)"
                  min="1"
                  class="w-full bg-transparent text-slate-500 outline-none">
              </div>
              <span class="text-slate-400 font-medium text-xs">b.</span>

              @let pct = getPercentage(task().points, task().maxPoints);
              <span
                class="font-mono font-bold text-xs px-2.5 py-1.5 rounded-xl border"
                [ngClass]="{
                  'text-emerald-700 bg-emerald-50 border-emerald-200': pct >= 90,
                  'text-lime-700 bg-lime-50 border-lime-200': pct >= 75 && pct < 90,
                  'text-amber-700 bg-amber-50 border-amber-200': pct >= 60 && pct < 75,
                  'text-rose-700 bg-rose-50 border-rose-200': pct < 60
                }">
                {{ pct }}%
              </span>
            </div>
          </div>

        </div>

        <!-- SPODNÍ LIŠTA -->
        <div class="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
          <button
            type="button"
            (click)="onDelete()"
            class="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition cursor-pointer font-medium">
            Smazat položku
          </button>

          <button
            type="button"
            (click)="closed.emit()"
            class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-semibold shadow-2xs transition cursor-pointer">
            Zavřít
          </button>
        </div>

      </div>
    </div>
  `
})
export class TaskDetailModalComponent {
  studyService = inject(StudyService);

  task = input.required<FlatTask>();
  closed = output<void>();

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

  getPercentage(points: number, maxPoints: number): number {
    if (!maxPoints || maxPoints <= 0) return 0;
    return Math.min(100, Math.round((points / maxPoints) * 100));
  }

  formatCzechDate(isoDate: string | null | undefined): string {
    if (!isoDate) return 'Vyber datum...';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parts[0];
    return `${day}. ${month}. ${year}`;
  }

  async onUpdateField(field: string, value: any) {
    await this.studyService.updateTask(this.task().id, { [field]: value });
  }

  async onDelete() {
    if (confirm('Opravdu chceš tuto položku smazat?')) {
      await this.studyService.deleteTask(this.task().id);
      this.closed.emit();
    }
  }
}
