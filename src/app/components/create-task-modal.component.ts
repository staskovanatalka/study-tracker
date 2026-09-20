import { Component, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { TaskType } from '../models';

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">

        <!-- HLAVIČKA -->
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nový termín</span>
            <h3 class="text-base font-bold text-slate-900 mt-0.5">Přidat položku do kalendáře</h3>
          </div>
          <button
            type="button"
            (click)="closed.emit()"
            class="text-slate-400 hover:text-slate-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer">
            ✕
          </button>
        </div>

        <!-- FORMULÁŘ -->
        <div class="space-y-3 text-xs">

          <!-- NÁZEV -->
          <div>
            <label class="block text-slate-500 font-medium text-[11px] mb-1">Název položky</label>
            <input
              [(ngModel)]="title"
              placeholder="např. Zápočtový test, Zkouška..."
              (keydown.enter)="onCreate()"
              autofocus
              class="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold text-slate-800 transition">
          </div>

          <!-- PŘEDMĚT -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-slate-500 font-medium text-[11px]">Předmět</label>
              <button
                type="button"
                (click)="showAllSubjects.set(!showAllSubjects())"
                class="text-[11px] text-sky-600 hover:text-sky-800 font-medium hover:underline cursor-pointer transition">
                {{ showAllSubjects() ? 'Zobrazit jen studované' : '+ Další (všechny předměty)' }}
              </button>
            </div>

            <select
              [(ngModel)]="subjectId"
              class="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-700 cursor-pointer transition">
              <option value="" disabled selected>Vyber předmět...</option>

              @if (!showAllSubjects()) {
                <optgroup label="Aktuálně studované">
                  @for (s of activeSubjects(); track s.id) {
                    <option [value]="s.id">{{ s.name }} ({{ s.code || 'bez kódu' }})</option>
                  }
                </optgroup>
              } @else {
                <optgroup label="Aktivní předměty">
                  @for (s of activeSubjects(); track s.id) {
                    <option [value]="s.id">{{ s.name }} ({{ s.code || 'bez kódu' }})</option>
                  }
                </optgroup>
                <optgroup label="Ostatní a budoucí předměty">
                  @for (s of otherSubjects(); track s.id) {
                    <option [value]="s.id">
                      {{ s.name }} ({{ s.code || 'bez kódu' }}) — {{ s.status === 'completed' ? 'Hotovo' : 'Nezahájeno' }}
                    </option>
                  }
                </optgroup>
              }
            </select>
          </div>

          <!-- TYP A TERMÍN -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Typ položky</label>
              <select
                [(ngModel)]="type"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer text-slate-700">
                <option value="homework">Úkol</option>
                <option value="exam">Test</option>
                <option value="oral">Ústní</option>
                <option value="extra">Extra</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Termín</label>
              <div class="relative flex items-center group">
                <input
                  type="date"
                  [(ngModel)]="dueDate"
                  class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10">

                <div class="w-full bg-slate-50 group-hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-700 text-xs flex items-center justify-between transition shadow-2xs">
                  <span>{{ formatCzechDate(dueDate) }}</span>
                  <span class="text-slate-400 text-[11px]">📅</span>
                </div>
              </div>
            </div>
          </div>

          <!-- BODY / SKÓRE -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Získané body</label>
              <input
                type="number"
                [(ngModel)]="points"
                min="0"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none text-slate-700">
            </div>
            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Maximum bodů</label>
              <input
                type="number"
                [(ngModel)]="maxPoints"
                min="1"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none text-slate-700">
            </div>
          </div>

        </div>

        <!-- TLAČÍTKA -->
        <div class="pt-2 flex justify-end space-x-2 text-xs">
          <button
            type="button"
            (click)="closed.emit()"
            class="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold transition cursor-pointer">
            Zrušit
          </button>
          <button
            type="button"
            (click)="onCreate()"
            [disabled]="!title.trim() || !subjectId"
            class="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white px-5 py-2 rounded-xl font-semibold shadow-2xs transition cursor-pointer">
            Vytvořit termín
          </button>
        </div>

      </div>
    </div>
  `
})
export class CreateTaskModalComponent implements OnInit {
  studyService = inject(StudyService);

  initialDate = input.required<string>();
  closed = output<void>();

  title = '';
  subjectId: string | number = '';
  type: TaskType = 'homework';
  points = 0;
  maxPoints = 100;
  dueDate = '';

  showAllSubjects = signal<boolean>(false);

  activeSubjects = computed(() => {
    return (this.studyService.subjects() || []).filter(s => s.status === 'in_progress');
  });

  otherSubjects = computed(() => {
    return (this.studyService.subjects() || []).filter(s => s.status !== 'in_progress');
  });

  formatCzechDate(isoDate: string | null | undefined): string {
    if (!isoDate) return 'Vyber datum...';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parts[0];
    return `${day}. ${month}. ${year}`;
  }

  ngOnInit() {
    this.dueDate = this.initialDate();

    const firstActive = this.activeSubjects()[0];
    if (firstActive) {
      this.subjectId = firstActive.id;
    } else {
      this.showAllSubjects.set(true);
      const firstAny = (this.studyService.subjects() || [])[0];
      if (firstAny) {
        this.subjectId = firstAny.id;
      }
    }
  }

  async onCreate() {
    if (!this.title.trim() || !this.subjectId) return;

    await this.studyService.addTask(this.subjectId, {
      title: this.title.trim(),
      type: this.type,
      status: 'not_started',
      points: Number(this.points) || 0,
      maxPoints: Number(this.maxPoints) || 100,
      dueDate: this.dueDate
    });

    this.closed.emit();
  }
}
