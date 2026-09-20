import { Component, inject, signal, computed, output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { Subject, ColumnDef, ToolbarState, SubjectStatus } from '../models';
import { TableToolbarComponent } from './table-toolbar.component';
import { DataTableComponent } from './data-table.component';

@Component({
  selector: 'app-subjects-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TableToolbarComponent, DataTableComponent],
  template: `
    <section class="space-y-4 pt-2">

      <!-- TOOLBAR -->
      <app-table-toolbar
        #toolbar
        class="block mb-3.5"
        [tableKey]="'subjects'"
        [columns]="columns"
        [initialSort]="'name'"
        (addRequested)="focusAddRow()"
        (changed)="onToolbarChange($event)" />

      <!-- TABULKA PŘEDMĚTŮ -->
      <app-data-table
        #tableRef
        [tableKey]="'subjects'"
        [activeViewId]="toolbar.activeViewId()"
        [columns]="columns"
        [visibleCols]="toolbarState()?.visibleCols || {}"
        (columnsChanged)="columns = $event">

        <ng-container table-body>
          @for (s of processedSubjects(); track s.id) {
            <tr (click)="subjectSelected.emit(s)" class="hover:bg-slate-50/80 cursor-pointer transition">
              @for (c of tableRef.visibleColumns(); track c.key) {
                <td class="py-3.5 px-4 truncate">
                  @switch (c.key) {
                    @case ('name') {
                      <span class="font-semibold text-slate-900">{{ s.name }}</span>
                    }
                    @case ('code') {
                      <span class="font-mono text-slate-400">{{ s.code || '—' }}</span>
                    }
                    @case ('status') {
                      <select
                        [ngModel]="s.status"
                        (click)="$event.stopPropagation()"
                        (ngModelChange)="onUpdateStatus(s.id, $event)"
                        [ngClass]="{
                          'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/70': s.status === 'in_progress',
                          'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70': s.status === 'completed',
                          'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70': s.status === 'not_started'
                        }"
                        class="border rounded-xl px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer min-w-[125px] transition shadow-2xs">
                        <option value="not_started">Nezahájeno</option>
                        <option value="in_progress">Probíhá</option>
                        <option value="completed">Hotovo</option>
                      </select>
                    }
                    @case ('credits') {
                      <span class="text-slate-600 font-medium">{{ s.credits }} ECTS</span>
                    }
                    @case ('semester') {
                      @if (s.semester) {
                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">
                          {{ s.semester }}
                        </span>
                      } @else {
                        <span class="text-slate-300">—</span>
                      }
                    }
                    @case ('teacher') {
                      <span class="text-slate-500">{{ s.teacher || '—' }}</span>
                    }
                    @case ('progress') {
                      @let pVal = studyService.getSubjectProgress(s);
                      <span class="font-bold text-xs" [ngClass]="{
                        'text-emerald-600': pVal >= 90,
                        'text-lime-600': pVal >= 75 && pVal < 90,
                        'text-amber-500': pVal >= 60 && pVal < 75,
                        'text-rose-500': pVal < 60
                      }">
                        {{ pVal }} %
                      </span>
                    }
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="tableRef.visibleColumns().length" class="text-center py-8 text-slate-400 text-xs">
                Žádné předměty neodpovídají zvolenému filtru.
              </td>
            </tr>
          }

          <!-- ŘÁDEK PRO PŘIDÁNÍ NOVÉHO PŘEDMĚTU -->
          <tr class="bg-slate-50/40 hover:bg-slate-50 transition border-t border-slate-200/80">
            @for (c of tableRef.visibleColumns(); track c.key) {
              <td class="py-2.5 px-4">
                @switch (c.key) {
                  @case ('name') {
                    <input
                      #nameInput
                      [(ngModel)]="subName"
                      placeholder="+ Nový předmět..."
                      (keydown.enter)="onAddSubject()"
                      class="bg-transparent text-slate-800 placeholder:text-slate-400 outline-none w-full font-medium">
                  }
                  @case ('code') {
                    <input
                      [(ngModel)]="subCode"
                      placeholder="4IT..."
                      (keydown.enter)="onAddSubject()"
                      class="bg-transparent text-slate-600 placeholder:text-slate-300 outline-none w-20 font-mono">
                  }
                  @case ('status') {
                    <select [(ngModel)]="subStatus" class="bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs text-slate-700 outline-none cursor-pointer min-w-[120px] shadow-2xs">
                      <option value="in_progress">Probíhá</option>
                      <option value="not_started">Nezahájeno</option>
                      <option value="completed">Hotovo</option>
                    </select>
                  }
                  @case ('credits') {
                    <input
                      [(ngModel)]="subCredits"
                      type="number"
                      placeholder="ECTS"
                      min="1"
                      (keydown.enter)="onAddSubject()"
                      class="bg-transparent text-slate-600 placeholder:text-slate-300 outline-none w-14">
                  }
                  @case ('semester') {
                    <select [(ngModel)]="subSemester" class="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 outline-none cursor-pointer shadow-2xs">
                      <option [ngValue]="null">Semestr</option>
                      <option [ngValue]="1">1. sem</option>
                      <option [ngValue]="2">2. sem</option>
                      <option [ngValue]="3">3. sem</option>
                      <option [ngValue]="4">4. sem</option>
                      <option [ngValue]="5">5. sem</option>
                      <option [ngValue]="6">6. sem</option>
                    </select>
                  }
                  @case ('progress') {
                    @if (subName.trim()) {
                      <button
                        type="button"
                        (click)="onAddSubject()"
                        class="bg-slate-900 text-white font-semibold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition text-[11px] shadow-2xs">
                        Uložit
                      </button>
                    } @else {
                      <span class="text-slate-300 text-[10px]">Enter</span>
                    }
                  }
                  @default {
                    <span class="text-slate-300">—</span>
                  }
                }
              </td>
            }
          </tr>
        </ng-container>

      </app-data-table>

    </section>
  `
})
export class SubjectsViewComponent {
  studyService = inject(StudyService);
  subjectSelected = output<Subject>();
  @ViewChild('nameInput') nameInputElement!: ElementRef<HTMLInputElement>;

  columns: ColumnDef[] = [
    { key: 'name', label: 'Předmět', width: 220 },
    { key: 'code', label: 'Kód', width: 100 },
    {
      key: 'status',
      label: 'Stav',
      width: 145,
      options: [
        { label: 'Probíhá', value: 'in_progress' },
        { label: 'Nezahájeno', value: 'not_started' },
        { label: 'Hotovo', value: 'completed' }
      ]
    },
    { key: 'credits', label: 'Kredity', width: 100, type: 'number' },
    { key: 'semester', label: 'Semestr', width: 95 },
    { key: 'teacher', label: 'Vyučující', width: 140 },
    { key: 'progress', label: 'Progres', width: 100, type: 'number' }
  ];

  toolbarState = signal<ToolbarState | null>(null);

  subName = '';
  subCode = '';
  subStatus: SubjectStatus = 'in_progress';
  subCredits: number | null = null;
  subSemester: number | null = null;

  focusAddRow() {
    if (this.nameInputElement) {
      this.nameInputElement.nativeElement.focus();
    }
  }

  onToolbarChange(state: ToolbarState) {
    this.toolbarState.set(state);
  }

  async onUpdateStatus(subjectId: string | number, status: SubjectStatus) {
    await this.studyService.updateSubject(subjectId, { status });
  }

  processedSubjects = computed(() => {
    let list = [...(this.studyService.filteredSubjects() || [])];
    const s = this.toolbarState();
    if (!s) return list;

    if (s.filterCol) {
      list = list.filter((item: any) => {
        const raw = s.filterCol === 'progress' ? this.studyService.getSubjectProgress(item) : item[s.filterCol];
        const val = raw !== undefined && raw !== null ? String(raw).toLowerCase() : '';
        const target = (s.filterValue || '').toLowerCase();
        const targets = (s.filterValues || []).map(v => String(v).toLowerCase());

        switch (s.filterOperator) {
          case 'is':
            return val === target;
          case 'is_not':
            return val !== target;
          case 'is_any_of':
            return targets.length === 0 ? true : targets.includes(val);
          case 'is_none_of':
            return targets.length === 0 ? true : !targets.includes(val);
          case 'contains':
            return val.includes(target);
          default:
            return true;
        }
      });
    }

    if (s.sortBy) {
      list.sort((a: any, b: any) => {
        let va = s.sortBy === 'progress' ? this.studyService.getSubjectProgress(a) : a[s.sortBy];
        let vb = s.sortBy === 'progress' ? this.studyService.getSubjectProgress(b) : b[s.sortBy];
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        let res = 0;
        if (va < vb) res = -1;
        else if (va > vb) res = 1;
        return s.sortAsc ? res : -res;
      });
    }

    return list;
  });

  async onAddSubject() {
    if (!this.subName.trim()) return;
    await this.studyService.addSubject({
      name: this.subName.trim(),
      code: this.subCode.trim().toUpperCase(),
      status: this.subStatus || 'in_progress',
      credits: Number(this.subCredits) || 3,
      semester: this.subSemester,
      grade: null
    });
    this.subName = '';
    this.subCode = '';
    this.subCredits = null;
  }
}
