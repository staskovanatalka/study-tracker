import { Component, input, output, signal, HostListener, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColumnDef } from '../models';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse table-fixed">
        <thead class="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-semibold tracking-wider uppercase text-[10px] select-none">
          <tr>
            @for (c of visibleColumns(); track c.key; let i = $index) {
              <th
                [style.width.px]="colWidths()[c.key] || c.width || 140"
                draggable="true"
                (dragstart)="onDragStart(i, $event)"
                (dragenter)="onDragEnter(i, $event)"
                (dragover)="onDragOver($event)"
                (drop)="onDrop(i, $event)"
                class="py-3 px-4 relative group hover:bg-slate-100/70 transition cursor-grab active:cursor-grabbing border-r border-slate-100 last:border-r-0">

                <div class="flex items-center justify-between pointer-events-none">
                  <span class="truncate">{{ c.label }}</span>
                  <span class="text-slate-300 group-hover:text-slate-400 text-[9px]">⋮⋮</span>
                </div>

                <div
                  (mousedown)="startResizing(c.key, $event)"
                  class="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-sky-600 transition z-10">
                </div>
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <ng-content select="[table-body]" />
        </tbody>
      </table>
    </div>
  `
})
export class DataTableComponent implements OnInit {
  tableKey = input.required<'subjects' | 'tasks'>();
  activeViewId = input<string | null>(null);
  columns = input.required<ColumnDef[]>();
  visibleCols = input<Record<string, boolean>>({});

  columnsChanged = output<ColumnDef[]>();

  orderedColumns = signal<ColumnDef[]>([]);
  colWidths = signal<Record<string, number>>({});

  draggedColIndex = signal<number | null>(null);
  dragOverColIndex = signal<number | null>(null);

  private resizingColKey: string | null = null;
  private startX = 0;
  private startWidth = 0;

  constructor() {
    // Kdykoliv se změní aktivní pohled, načteme šířky z localStorage pro toto zařízení
    effect(() => {
      this.loadWidthsFromStorage();
    });
  }

  ngOnInit() {
    this.orderedColumns.set([...this.columns()]);
    this.loadWidthsFromStorage();
  }

  private get storageKey(): string {
    const vId = this.activeViewId() || 'default';
    return `st_widths_${this.tableKey()}_${vId}`;
  }

  private loadWidthsFromStorage() {
    const initWidths: Record<string, number> = {};
    this.columns().forEach(c => {
      initWidths[c.key] = c.width || 140;
    });

    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.colWidths.set({ ...initWidths, ...parsed });
        return;
      }
    } catch (e) {
      console.warn('Nelze načíst šířky sloupců z localStorage', e);
    }

    this.colWidths.set(initWidths);
  }

  private saveWidthsToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.colWidths()));
    } catch (e) {
      console.warn('Nelze uložit šířky sloupců do localStorage', e);
    }
  }

  visibleColumns = computed(() => {
    const vis = this.visibleCols() || {};
    return this.orderedColumns().filter(c => vis[c.key] !== false);
  });

  onDragStart(index: number, event: DragEvent) {
    this.draggedColIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragEnter(index: number, event: DragEvent) {
    event.preventDefault();
    this.dragOverColIndex.set(index);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(targetVisibleIndex: number, event: DragEvent) {
    event.preventDefault();
    const sourceVisibleIndex = this.draggedColIndex();
    this.draggedColIndex.set(null);
    this.dragOverColIndex.set(null);

    if (sourceVisibleIndex === null || sourceVisibleIndex === targetVisibleIndex) return;

    const vis = this.visibleColumns();
    const sourceCol = vis[sourceVisibleIndex];
    const targetCol = vis[targetVisibleIndex];

    const all = [...this.orderedColumns()];
    const realSourceIdx = all.findIndex(c => c.key === sourceCol.key);
    const realTargetIdx = all.findIndex(c => c.key === targetCol.key);

    const [moved] = all.splice(realSourceIdx, 1);
    all.splice(realTargetIdx, 0, moved);

    this.orderedColumns.set(all);
    this.columnsChanged.emit(all);
  }

  startResizing(colKey: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.resizingColKey = colKey;
    this.startX = event.clientX;
    this.startWidth = this.colWidths()[colKey] || 140;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.resizingColKey) return;
    const delta = event.clientX - this.startX;
    const newWidth = Math.max(60, this.startWidth + delta);
    this.colWidths.update(m => ({ ...m, [this.resizingColKey!]: newWidth }));
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.resizingColKey) {
      this.saveWidthsToStorage();
    }
    this.resizingColKey = null;
  }
}
