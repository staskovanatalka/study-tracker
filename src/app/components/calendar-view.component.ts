import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyService } from '../services/study.service';
import { FlatTask } from '../models';
import { TaskDetailModalComponent } from './task-detail-modal.component';
import { CreateTaskModalComponent } from './create-task-modal.component';

interface CalendarDay {
  date: Date;
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: FlatTask[];
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, TaskDetailModalComponent, CreateTaskModalComponent],
  template: `
    <section class="pt-1.5 space-y-2.5">

      <!-- LIŠTA: NÁZEV, PŘEPÍNAČ MĚSÍC/TÝDEN A NAVIGACE -->
      <div class="flex items-center justify-between px-0.5">
        <h2 class="text-lg sm:text-xl font-bold text-slate-900 capitalize leading-none">
          {{ viewTitle() }}
        </h2>

        <div class="flex items-center space-x-2">
          <!-- PŘEPÍNAČ: MĚSÍC / TÝDEN -->
          <div class="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-semibold">
            <button
              type="button"
              (click)="mode.set('month')"
              [ngClass]="mode() === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-2.5 py-1 rounded-lg transition cursor-pointer">
              Měsíc
            </button>
            <button
              type="button"
              (click)="mode.set('week')"
              [ngClass]="mode() === 'week' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              class="px-2.5 py-1 rounded-lg transition cursor-pointer">
              Týden
            </button>
          </div>

          <!-- NAVIGACE -->
          <div class="flex items-center space-x-1">
            <button
              type="button"
              (click)="navigate(-1)"
              class="bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-2xs transition cursor-pointer">
              Předchozí
            </button>
            <button
              type="button"
              (click)="setToday()"
              class="bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-2xs transition cursor-pointer">
              Dnes
            </button>
            <button
              type="button"
              (click)="navigate(1)"
              class="bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-2xs transition cursor-pointer">
              Další
            </button>
          </div>
        </div>
      </div>

      <!-- MŘÍŽKA KALENDÁŘE -->
      <div class="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">

        <!-- DNY V TÝDNU -->
        <div class="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-[11px] font-bold text-slate-400 py-2 uppercase tracking-wider">
          <div>PO</div>
          <div>ÚT</div>
          <div>ST</div>
          <div>ČT</div>
          <div>PÁ</div>
          <div>SO</div>
          <div>NE</div>
        </div>

        <!-- BUŇKY KALENDÁŘE -->
        <div class="grid grid-cols-7 divide-x divide-y divide-slate-100">
          @for (day of displayedDays(); track day.dateString) {
            <div
              class="group relative p-1.5 flex flex-col transition hover:bg-slate-50/50"
              [ngClass]="{
                'min-h-[76px] max-h-[105px]': mode() === 'month',
                'min-h-[380px]': mode() === 'week',
                'bg-slate-50/40': !day.isCurrentMonth && mode() === 'month',
                'bg-white': day.isCurrentMonth || mode() === 'week'
              }">

              <!-- HORNÍ ŘÁDEK: ČÍSLO DNE + NOTION-LIKE "+" PŘI HOVERU -->
              <div class="flex justify-between items-center mb-1">
                <span
                  [ngClass]="{
                    'text-slate-300': !day.isCurrentMonth && mode() === 'month',
                    'text-slate-700 font-medium': day.isCurrentMonth && !day.isToday,
                    'bg-slate-900 text-white font-bold rounded-full w-5 h-5 flex items-center justify-center text-[11px] shadow-2xs': day.isToday
                  }"
                  class="text-xs ml-0.5">
                  {{ day.dayNumber }}
                </span>

                <!-- TLAČÍTKO "+" PRO PŘIDÁNÍ ÚKOLU V TENTO DEN -->
                <button
                  type="button"
                  (click)="openCreateForDate(day.dateString)"
                  title="Přidat položku na {{ day.dateString }}"
                  class="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center text-xs transition cursor-pointer">
                  +
                </button>
              </div>

              <!-- SEZNAM ÚKOLŮ -->
              <div class="space-y-1 overflow-y-auto pr-0.5 flex-1" [ngClass]="mode() === 'month' ? 'max-h-16' : 'max-h-[340px]'">
                @for (t of day.tasks; track t.id) {
                  <div
                    (click)="selectedTask.set(t)"
                    [ngClass]="{
                      'bg-rose-50 border-rose-200/80 text-rose-800 hover:bg-rose-100/80': t.type === 'exam',
                      'bg-sky-50 border-sky-200/80 text-sky-800 hover:bg-sky-100/80': t.type === 'homework',
                      'bg-violet-50 border-violet-200/80 text-violet-800 hover:bg-violet-100/80': t.type === 'extra',
                      'opacity-50 line-through': t.status === 'done'
                    }"
                    class="border rounded-lg px-1.5 py-0.5 text-left cursor-pointer transition shadow-2xs select-none">

                    <div class="font-bold text-[10px] leading-tight truncate">
                      {{ t.title }}
                    </div>

                    <div class="text-[9px] opacity-75 font-medium leading-tight truncate">
                      {{ t.subjectName }}
                    </div>

                  </div>
                }
              </div>

            </div>
          }
        </div>

      </div>

      <!-- MODÁL PRO DETAIL / ÚPRAVU EXISTUJÍCÍHO ÚKOLU -->
      @if (activeTaskModal(); as activeT) {
        <app-task-detail-modal
          [task]="activeT"
          (closed)="selectedTask.set(null)" />
      }

      <!-- MODÁL PRO PŘIDÁNÍ NOVÉHO ÚKOLU NA DANÉ DATUM -->
      @if (createDate(); as cDate) {
        <app-create-task-modal
          [initialDate]="cDate"
          (closed)="createDate.set(null)" />
      }

    </section>
  `
})
export class CalendarViewComponent {
  studyService = inject(StudyService);

  currentDate = signal<Date>(new Date());
  mode = signal<'month' | 'week'>('month');
  selectedTask = signal<FlatTask | null>(null);
  createDate = signal<string | null>(null);

  monthNames = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];

  activeTaskModal = computed(() => {
    const sel = this.selectedTask();
    if (!sel) return null;
    return this.studyService.allTasks().find(t => t.id === sel.id) || sel;
  });

  viewTitle = computed(() => {
    const d = this.currentDate();
    if (this.mode() === 'month') {
      return `${this.monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
    const start = this.getMonday(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}. – ${end.getDate()}. ${this.monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()}. ${this.monthNames[start.getMonth()]} – ${end.getDate()}. ${this.monthNames[end.getMonth()]} ${end.getFullYear()}`;
  });

  openCreateForDate(dateString: string) {
    this.createDate.set(dateString);
  }

  navigate(direction: number) {
    const d = new Date(this.currentDate());
    if (this.mode() === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else {
      d.setDate(d.getDate() + direction * 7);
    }
    this.currentDate.set(d);
  }

  setToday() {
    this.currentDate.set(new Date());
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  displayedDays = computed<CalendarDay[]>(() => {
    const date = this.currentDate();
    const tasks = this.studyService.allTasks();
    const today = new Date();
    const todayString = this.formatDateString(today);

    if (this.mode() === 'week') {
      const days: CalendarDay[] = [];
      const monday = this.getMonday(date);

      for (let i = 0; i < 7; i++) {
        const curr = new Date(monday);
        curr.setDate(monday.getDate() + i);
        const dStr = this.formatDateString(curr);
        days.push({
          date: curr,
          dateString: dStr,
          dayNumber: curr.getDate(),
          isCurrentMonth: true,
          isToday: dStr === todayString,
          tasks: tasks.filter(t => t.dueDate === dStr)
        });
      }
      return days;
    }

    // Měsíční zobrazení
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: CalendarDay[] = [];

    // Dny z předchozího měsíce
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      const dStr = this.formatDateString(prevDate);
      days.push({
        date: prevDate,
        dateString: dStr,
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: dStr === todayString,
        tasks: tasks.filter(t => t.dueDate === dStr)
      });
    }

    // Dny aktuálního měsíce
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const currDate = new Date(year, month, i);
      const dStr = this.formatDateString(currDate);
      days.push({
        date: currDate,
        dateString: dStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dStr === todayString,
        tasks: tasks.filter(t => t.dueDate === dStr)
      });
    }

    // Dny dalšího měsíce do konce týdne
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(year, month + 1, i);
        const dStr = this.formatDateString(nextDate);
        days.push({
          date: nextDate,
          dateString: dStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: dStr === todayString,
          tasks: tasks.filter(t => t.dueDate === dStr)
        });
      }
    }

    return days;
  });

  private formatDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
