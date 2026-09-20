import { Component, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { SubjectStatus } from '../models';

@Component({
  selector: 'app-create-subject-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">

        <!-- HLAVIČKA -->
        <div class="flex items-start justify-between">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nový předmět</span>
            <h3 class="text-base font-bold text-slate-900 mt-0.5">
              {{ semesterNumber() ? 'Zapsat předmět do ' + semesterNumber() + '. semestru' : 'Přidat předmět do zásobníku' }}
            </h3>
          </div>
          <button
            type="button"
            (click)="closed.emit()"
            class="text-slate-400 hover:text-slate-700 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition cursor-pointer">
            ✕
          </button>
        </div>

        <!-- FORMULÁŘ -->
        <div class="space-y-3.5 text-xs">

          <!-- NÁZEV PŘEDMĚTU -->
          <div>
            <label class="block text-slate-500 font-medium text-[11px] mb-1">Název předmětu</label>
            <input
              [(ngModel)]="name"
              placeholder="např. Pokročilé databázové systémy..."
              (keydown.enter)="onCreate()"
              autofocus
              class="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold text-slate-800 transition">
          </div>

          <!-- KÓD A KREDITY -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Kód předmětu</label>
              <input
                [(ngModel)]="code"
                placeholder="např. 4IT337"
                (keydown.enter)="onCreate()"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 uppercase font-mono outline-none text-slate-700">
            </div>

            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Kredity (ECTS)</label>
              <input
                type="number"
                [(ngModel)]="credits"
                min="1"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-semibold text-slate-700">
            </div>
          </div>

          <!-- SEMESTR A STAV -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Přiřadit semestr</label>
              <select
                [(ngModel)]="semester"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none text-slate-700 cursor-pointer">
                <option [ngValue]="null">Bez semestru (Zásobník)</option>
                <option [ngValue]="1">1. semestr</option>
                <option [ngValue]="2">2. semestr</option>
                <option [ngValue]="3">3. semestr</option>
                <option [ngValue]="4">4. semestr</option>
                <option [ngValue]="5">5. semestr</option>
                <option [ngValue]="6">6. semestr</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-500 font-medium text-[11px] mb-1">Stav</label>
              <select
                [(ngModel)]="status"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none text-slate-700 cursor-pointer">
                <option value="not_started">Nezahájeno</option>
                <option value="in_progress">Probíhá</option>
                <option value="completed">Hotovo</option>
              </select>
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
            [disabled]="!name.trim()"
            class="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white px-5 py-2 rounded-xl font-semibold shadow-2xs transition cursor-pointer">
            Vytvořit předmět
          </button>
        </div>

      </div>
    </div>
  `
})
export class CreateSubjectModalComponent implements OnInit {
  studyService = inject(StudyService);

  semesterNumber = input<number | null>(null);
  closed = output<void>();

  name = '';
  code = '';
  credits = 6;
  semester: number | null = null;
  status: SubjectStatus = 'not_started';

  ngOnInit() {
    const sem = this.semesterNumber();
    if (sem && sem >= 1 && sem <= 6) {
      this.semester = sem;
    } else {
      this.semester = null;
    }
  }

  async onCreate() {
    if (!this.name.trim()) return;

    await this.studyService.addSubject({
      name: this.name.trim(),
      code: this.code.trim().toUpperCase(),
      status: this.status,
      credits: Number(this.credits) || 6,
      semester: this.semester,
      grade: null
    });

    this.closed.emit();
  }
}
