import { Component, input, output, signal, ElementRef, HostListener, inject, computed, OnInit, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../services/study.service';
import { ColumnDef, ToolbarState, SavedViewConfig, FilterOperator } from '../models';

@Component({
  selector: 'app-table-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2.5">

      <!-- HORNÍ LIŠTA ZÁLOŽEK POHLEDŮ -->
      <div class="flex items-center justify-between gap-2 text-xs select-none min-h-[34px]">
        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1">

          <!-- Zobrazí se až ve chvíli, kdy máme data z DB – žádné blikání ani poskakování -->
          @if (studyService.viewsLoaded()) {
            @for (view of orderedViews(); track view.id; let i = $index) {
              <div
                draggable="true"
                (dragstart)="onDragStart(i, $event)"
                (dragenter)="onDragEnter(i, $event)"
                (dragover)="onDragOver($event)"
                (drop)="onDrop(i, $event)"
                (contextmenu)="onContextMenu($event, view)"
                (click)="selectView(view)"
                [title]="view.id === 'default' ? 'Čistý výchozí pohled' : 'Klikni pro výběr, přetáhni pro přesun, pravým klikem otevři možnosti'"
                [ngClass]="[
                  activeViewId() === view.id
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80',
                  draggedIndex() === i ? 'opacity-30 scale-95' : '',
                  dragOverIndex() === i && draggedIndex() !== i ? 'border-sky-500 ring-2 ring-sky-300' : ''
                ]"
                class="px-3.5 py-1.5 rounded-xl transition whitespace-nowrap cursor-grab active:cursor-grabbing flex items-center space-x-1.5">
                <span class="text-slate-300 text-[10px] pointer-events-none">⋮⋮</span>
                <span>{{ view.name }}</span>
              </div>
            }

            <button
              type="button"
              (click)="isNamingView.set(true)"
              class="text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-dashed border-slate-300 px-2.5 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer">
              + Uložit pohled
            </button>
          } @else {
            <div class="h-8 w-44 bg-slate-100 animate-pulse rounded-xl"></div>
          }

        </div>

        <!-- PRAVÁ STRANA: NOVÝ + FILTRY & ŘAZENÍ + MENU SLOUPCŮ -->
        <div class="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            (click)="addRequested.emit()"
            title="Přidat nový řádek"
            class="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1 shadow-2xs text-[11px] active:scale-95 font-semibold cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span class="hidden sm:inline">Nový</span>
          </button>

          <button
            type="button"
            (click)="toggleFilterBar()"
            [ngClass]="showFilterBar() || filterCol() || groupBy()
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'"
            class="px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1.5 shadow-2xs text-[11px] cursor-pointer">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filtry &amp; Řazení</span>
            @if (filterCol() || groupBy()) {
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            }
          </button>

          <!-- TLAČÍTKO SLOUPCŮ -->
          <button
            #colsBtn
            type="button"
            (click)="toggleVisibilityMenu($event)"
            [ngClass]="showVisibilityMenu() ? 'bg-slate-200 text-slate-900 font-semibold' : 'bg-white text-slate-600 hover:bg-slate-50 font-medium'"
            class="border border-slate-200/90 px-2.5 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-2xs transition text-[11px] cursor-pointer">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Sloupce</span>
          </button>
        </div>
      </div>

      <!-- VYSKAKOVACÍ MENU SLOUPCŮ -->
      @if (showVisibilityMenu()) {
        <div
          (click)="$event.stopPropagation()"
          [style.top.px]="menuPos().top"
          [style.left.px]="menuPos().left"
          class="fixed z-[9999] w-52 bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xl space-y-1.5 text-xs">
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">Viditelné sloupce</div>
          <div class="max-h-60 overflow-y-auto space-y-0.5">
            @for (c of columns(); track c.key) {
              <label class="flex items-center space-x-2.5 px-2 py-1.5 hover:bg-slate-100/70 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  [checked]="isColumnVisible(c.key)"
                  (change)="toggleColumn(c.key)"
                  class="rounded text-slate-900 cursor-pointer w-4 h-4">
                <span class="text-slate-700 font-medium">{{ c.label }}</span>
              </label>
            }
          </div>
        </div>
      }

      <!-- KONTEXTOVÉ MENU (PRAVÝ KLIK) -->
      @if (contextMenuVisible()) {
        <div
          class="fixed inset-0 z-[9998] cursor-default bg-transparent"
          (click)="closeContextMenu($event)"
          (contextmenu)="closeContextMenu($event)">
        </div>

        <div
          #contextMenuEl
          (click)="$event.stopPropagation()"
          (contextmenu)="$event.preventDefault(); $event.stopPropagation()"
          [style.left.px]="contextMenuPos().x"
          [style.top.px]="contextMenuPos().y"
          class="fixed z-[9999] w-48 bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xl text-xs space-y-0.5">
          <div class="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate border-b border-slate-100 mb-1">
            {{ contextMenuView()?.name }}
          </div>

          <button
            type="button"
            (click)="startRenameView()"
            class="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 text-slate-700 font-medium flex items-center space-x-2 transition cursor-pointer">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Přejmenovat</span>
          </button>

          @if (contextMenuView()?.id !== 'default') {
            <button
              type="button"
              (click)="deleteContextMenuView()"
              class="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center space-x-2 transition cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Smazat pohled</span>
            </button>
          } @else {
            <div class="px-2.5 py-1 text-slate-400 italic text-[10px]">Výchozí pohled nelze smazat</div>
          }
        </div>
      }

      <!-- DIALOG PRO PŘEJMENOVÁNÍ POHLEDU -->
      @if (isRenamingView()) {
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center space-x-2 text-xs">
          <span class="text-slate-500 font-medium">Nový název:</span>
          <input
            [(ngModel)]="renameViewName"
            (keydown.enter)="confirmRenameView()"
            placeholder="Název pohledu..."
            class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none flex-1 max-w-xs focus:border-slate-400">
          <button
            type="button"
            (click)="confirmRenameView()"
            class="bg-slate-900 text-white font-semibold px-3 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer">
            Uložit
          </button>
          <button
            type="button"
            (click)="isRenamingView.set(false)"
            class="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer">
            Zrušit
          </button>
        </div>
      }

      <!-- DIALOG PRO ULOŽENÍ NOVÉHO POHLEDU -->
      @if (isNamingView()) {
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center space-x-2 text-xs">
          <span class="text-slate-500 font-medium">Název pohledu:</span>
          <input
            [(ngModel)]="newViewName"
            (keydown.enter)="confirmSaveView()"
            placeholder="např. 3. semestr..."
            class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none flex-1 max-w-xs focus:border-slate-400">
          <button
            type="button"
            (click)="confirmSaveView()"
            class="bg-slate-900 text-white font-semibold px-3 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer">
            Uložit
          </button>
          <button
            type="button"
            (click)="isNamingView.set(false)"
            class="text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer">
            Zrušit
          </button>
        </div>
      }

      <!-- LIŠTA FILTRŮ & ŘAZENÍ -->
      @if (showFilterBar()) {
        <div class="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
          <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <span class="text-slate-400 font-medium">Kde:</span>

            <select
              [ngModel]="filterCol()"
              (ngModelChange)="onFilterColChange($event)"
              class="bg-white border border-slate-200 rounded-xl px-2.5 py-1 font-medium text-slate-700 outline-none cursor-pointer">
              <option value="">(Vyber vlastnost)</option>
              @for (c of columns(); track c.key) {
                <option [value]="c.key">{{ c.label }}</option>
              }
            </select>

            @if (filterCol()) {
              <select
                [ngModel]="filterOperator()"
                (ngModelChange)="onFilterOperatorChange($event)"
                class="bg-white border border-slate-200 rounded-xl px-2.5 py-1 font-semibold text-slate-800 outline-none cursor-pointer">
                <option value="is">is</option>
                <option value="is_not">is not</option>
                <option value="is_any_of">is any of</option>
                <option value="is_none_of">is none of</option>
                <option value="contains">contains</option>
                <option value="is_not_empty">is not empty</option>
                <option value="is_empty">is empty</option>
              </select>

              @if (filterOperator() === 'is_any_of' || filterOperator() === 'is_none_of') {
                @let activeCol = getColumnDef(filterCol());
                <div class="flex items-center gap-1 flex-wrap bg-white border border-slate-200 px-2 py-1 rounded-xl">
                  @if (activeCol?.options) {
                    @for (opt of activeCol!.options; track opt.value) {
                      <button
                        type="button"
                        (click)="toggleFilterValue(opt.value)"
                        [ngClass]="filterValues().includes(opt.value)
                          ? 'bg-slate-900 text-white font-medium'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                        class="px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer">
                        {{ opt.label }}
                      </button>
                    }
                  } @else {
                    <input
                      #multiInput
                      placeholder="Napiš a Enter..."
                      (keydown.enter)="addMultiValue(multiInput.value); multiInput.value = ''"
                      class="bg-transparent text-slate-700 outline-none text-xs w-32">
                    @for (val of filterValues(); track val) {
                      <span class="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[10px] flex items-center space-x-1">
                        <span>{{ val }}</span>
                        <button type="button" (click)="removeMultiValue(val)" class="hover:text-rose-300 cursor-pointer">✕</button>
                      </span>
                    }
                  }
                </div>
              }
              @else if (filterOperator() !== 'is_empty' && filterOperator() !== 'is_not_empty') {
                @let activeCol = getColumnDef(filterCol());
                @if (activeCol?.options) {
                  <select
                    [ngModel]="filterValue()"
                    (ngModelChange)="onFilterValChange($event)"
                    class="bg-white border border-slate-200 rounded-xl px-2.5 py-1 font-medium text-slate-700 outline-none cursor-pointer">
                    <option value="">(Hodnota)</option>
                    @for (opt of activeCol!.options; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                } @else {
                  <input
                    [ngModel]="filterValue()"
                    (ngModelChange)="onFilterValChange($event)"
                    placeholder="Hodnota..."
                    class="w-28 bg-white border border-slate-200 rounded-xl px-2 py-1 outline-none focus:border-slate-400 transition text-slate-700">
                }
              }

              <button type="button" (click)="resetFilter()" class="text-slate-400 hover:text-rose-500 font-bold px-1.5 cursor-pointer" title="Smazat filtr">✕</button>
            }
          </div>

          <div class="flex items-center space-x-1 pl-2 border-l border-slate-200">
            <span class="text-slate-400 font-medium">Seskupit:</span>
            <select
              [ngModel]="groupBy()"
              (ngModelChange)="onGroupByChange($event)"
              class="bg-white border border-slate-200 rounded-xl px-2.5 py-1 font-medium text-slate-700 outline-none cursor-pointer">
              <option value="">Bez seskupení</option>
              @for (c of columns(); track c.key) {
                <option [value]="c.key">{{ c.label }}</option>
              }
            </select>
          </div>

          <div class="flex items-center space-x-1 pl-2 border-l border-slate-200">
            <span class="text-slate-400 font-medium">Řadit:</span>
            <select
              [ngModel]="sortBy()"
              (ngModelChange)="onSortByChange($event)"
              class="bg-white border border-slate-200 rounded-xl px-2.5 py-1 font-medium text-slate-700 outline-none cursor-pointer">
              @for (c of columns(); track c.key) {
                <option [value]="c.key">{{ c.label }}</option>
              }
            </select>
            <button
              type="button"
              (click)="toggleSortDirection()"
              class="p-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold transition cursor-pointer">
              {{ sortAsc() ? '↑' : '↓' }}
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class TableToolbarComponent {
  studyService = inject(StudyService);

  tableKey = input.required<'subjects' | 'tasks'>();
  columns = input.required<ColumnDef[]>();
  initialSort = input<string>('');

  changed = output<ToolbarState>();
  addRequested = output<void>();

  @ViewChild('colsBtn') colsBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('contextMenuEl') contextMenuEl?: ElementRef<HTMLDivElement>;

  activeViewId = signal<string | null>(null);
  isNamingView = signal<boolean>(false);
  isRenamingView = signal<boolean>(false);
  showFilterBar = signal<boolean>(false);
  draggedIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  contextMenuVisible = signal<boolean>(false);
  contextMenuPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  contextMenuView = signal<SavedViewConfig | null>(null);

  newViewName = '';
  renameViewName = '';

  filterCol = signal<string>('');
  filterOperator = signal<FilterOperator>('is');
  filterValue = signal<string>('');
  filterValues = signal<string[]>([]);
  groupBy = signal<string>('');
  sortBy = signal<string>('');
  sortAsc = signal<boolean>(true);
  showVisibilityMenu = signal<boolean>(false);
  menuPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  visibleCols = signal<Record<string, boolean>>({});

  private hasInitialSelected = false;
  private justOpenedContextMenu = false;

  private get activeStorageKey(): string {
    return `st_active_view_${this.tableKey()}`;
  }

  // Čistý výchozí pohled
  private defaultView = computed<SavedViewConfig>(() => {
    const allVisible: Record<string, boolean> = {};
    for (const c of this.columns()) {
      allVisible[c.key] = true;
    }

    const savedDefault = this.studyService.savedViews().find(v => v.tableKey === this.tableKey() && v.id === 'default');

    return {
      id: 'default',
      tableKey: this.tableKey(),
      name: savedDefault?.name || 'Výchozí pohled',
      filterCol: '',
      filterOperator: 'is',
      filterValue: '',
      filterValues: [],
      groupBy: '',
      sortBy: this.initialSort() || (this.columns()[0]?.key || ''),
      sortAsc: true,
      visibleCols: allVisible,
      order: savedDefault?.order !== undefined ? savedDefault.order : 9999
    };
  });

  orderedViews = computed(() => {
    const saved = this.studyService.savedViews().filter(v => v.tableKey === this.tableKey() && v.id !== 'default');
    const def = this.defaultView();

    const all: SavedViewConfig[] = [...saved, def];

    return all.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      return orderA - orderB;
    });
  });

  constructor() {
    // Spustí se přesně v okamžiku, kdy Firestore nahlásí viewsLoaded = true
    effect(() => {
      const isLoaded = this.studyService.viewsLoaded();
      if (!isLoaded || this.hasInitialSelected) return;

      const all = this.orderedViews();
      if (all.length === 0) return;

      const savedActiveId = localStorage.getItem(this.activeStorageKey);
      const matched = all.find(v => v.id === savedActiveId);

      // Pokud máme uložený aktivní pohled z minula, použijeme ho. Jinak VŽDY první zleva!
      const target = matched || all[0];
      this.selectView(target);
      this.hasInitialSelected = true;
    });
  }

  isColumnVisible(key: string): boolean {
    return this.visibleCols()[key] !== false;
  }

  selectView(view: SavedViewConfig) {
    this.activeViewId.set(view.id || 'default');

    if (view.id) {
      localStorage.setItem(this.activeStorageKey, view.id);
    }

    if (view.id === 'default') {
      this.filterCol.set('');
      this.filterOperator.set('is');
      this.filterValue.set('');
      this.filterValues.set([]);
      this.groupBy.set('');
      this.sortBy.set(this.initialSort() || (this.columns()[0]?.key || ''));
      this.sortAsc.set(true);

      const allVisible: Record<string, boolean> = {};
      this.columns().forEach(c => {
        allVisible[c.key] = true;
      });
      this.visibleCols.set(allVisible);
    } else {
      this.filterCol.set(view.filterCol || '');
      this.filterOperator.set(view.filterOperator || 'is');
      this.filterValue.set(view.filterValue || '');
      this.filterValues.set(view.filterValues || []);
      this.groupBy.set(view.groupBy || '');
      this.sortBy.set(view.sortBy || this.initialSort());
      this.sortAsc.set(view.sortAsc ?? true);

      const vis: Record<string, boolean> = { ...(view.visibleCols || {}) };
      this.columns().forEach(c => {
        if (vis[c.key] === undefined) {
          vis[c.key] = true;
        }
      });
      this.visibleCols.set(vis);
    }

    this.emitChange();
  }

  // --- DRAG & DROP POŘADÍ POHLEDŮ ---
  onDragStart(index: number, event: DragEvent) {
    this.draggedIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragEnter(index: number, event: DragEvent) {
    event.preventDefault();
    this.dragOverIndex.set(index);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const sourceIndex = this.draggedIndex();
    this.draggedIndex.set(null);
    this.dragOverIndex.set(null);

    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const views = [...this.orderedViews()];
    const [movedItem] = views.splice(sourceIndex, 1);
    views.splice(targetIndex, 0, movedItem);

    const updatedViews = views.map((view, idx) => ({
      ...view,
      order: idx
    }));

    await this.studyService.reorderViews(updatedViews);
  }

  // --- PRAVÝ KLIK ---
  onContextMenu(event: MouseEvent, view: SavedViewConfig) {
    event.preventDefault();
    event.stopPropagation();

    this.justOpenedContextMenu = true;
    this.contextMenuView.set(view);

    const menuWidth = 192;
    const clickX = event.clientX;
    const clickY = event.clientY;
    const finalX = (clickX + menuWidth > window.innerWidth) ? (window.innerWidth - menuWidth - 12) : clickX;

    this.contextMenuPos.set({ x: finalX, y: clickY + 2 });
    this.contextMenuVisible.set(true);

    setTimeout(() => {
      this.justOpenedContextMenu = false;
    }, 150);
  }

  closeContextMenu(event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.contextMenuVisible.set(false);
  }

  startRenameView() {
    const view = this.contextMenuView();
    if (!view) return;
    this.renameViewName = view.name;
    this.isRenamingView.set(true);
    this.contextMenuVisible.set(false);
  }

  async confirmRenameView() {
    const view = this.contextMenuView();
    const newName = this.renameViewName.trim();
    if (view && view.id && newName && newName !== view.name) {
      await this.studyService.renameView(view.id, newName);
    }
    this.isRenamingView.set(false);
  }

  async deleteContextMenuView() {
    const view = this.contextMenuView();
    if (view && view.id && view.id !== 'default') {
      await this.studyService.deleteView(view.id);
      if (this.activeViewId() === view.id) {
        const remaining = this.orderedViews().filter(v => v.id !== view.id);
        const next = remaining[0] || this.defaultView();
        this.selectView(next);
      }
    }
    this.contextMenuVisible.set(false);
  }

  // --- FILTRY ---
  toggleFilterValue(val: string) {
    this.filterValues.update(vals => {
      if (vals.includes(val)) return vals.filter(v => v !== val);
      return [...vals, val];
    });
    this.emitChange();
  }

  addMultiValue(val: string) {
    const trimmed = val.trim();
    if (!trimmed) return;
    this.filterValues.update(vals => vals.includes(trimmed) ? vals : [...vals, trimmed]);
    this.emitChange();
  }

  removeMultiValue(val: string) {
    this.filterValues.update(vals => vals.filter(v => v !== val));
    this.emitChange();
  }

  toggleFilterBar() {
    this.showFilterBar.update(v => !v);
  }

  toggleVisibilityMenu(event: MouseEvent) {
    event.stopPropagation();
    if (this.showVisibilityMenu()) {
      this.showVisibilityMenu.set(false);
      return;
    }

    if (this.colsBtn) {
      const rect = this.colsBtn.nativeElement.getBoundingClientRect();
      this.menuPos.set({
        top: rect.bottom + 6,
        left: Math.max(10, rect.right - 208)
      });
    }

    this.showVisibilityMenu.set(true);
  }

  toggleColumn(key: string) {
    this.visibleCols.update(map => {
      const current = map[key] !== false;
      return { ...map, [key]: !current };
    });
    this.activeViewId.set(null);
    this.emitChange();
  }

  async confirmSaveView() {
    if (!this.newViewName.trim()) return;

    await this.studyService.saveView({
      tableKey: this.tableKey(),
      name: this.newViewName.trim(),
      filterCol: this.filterCol(),
      filterOperator: this.filterOperator(),
      filterValue: this.filterValue(),
      filterValues: this.filterValues(),
      groupBy: this.groupBy(),
      sortBy: this.sortBy(),
      sortAsc: this.sortAsc(),
      visibleCols: this.visibleCols()
    });

    this.newViewName = '';
    this.isNamingView.set(false);
  }

  getColumnDef(key: string) {
    return this.columns().find(c => c.key === key);
  }

  onFilterColChange(col: string) {
    this.filterCol.set(col);
    this.filterOperator.set('is');
    this.filterValue.set('');
    this.filterValues.set([]);
    this.activeViewId.set(null);
    this.emitChange();
  }

  onFilterOperatorChange(op: FilterOperator) {
    this.filterOperator.set(op);
    this.activeViewId.set(null);
    this.emitChange();
  }

  onFilterValChange(val: string) {
    this.filterValue.set(val);
    this.activeViewId.set(null);
    this.emitChange();
  }

  resetFilter() {
    this.filterCol.set('');
    this.filterOperator.set('is');
    this.filterValue.set('');
    this.filterValues.set([]);
    this.activeViewId.set(null);
    this.emitChange();
  }

  onGroupByChange(col: string) {
    this.groupBy.set(col);
    this.activeViewId.set(null);
    this.emitChange();
  }

  onSortByChange(col: string) {
    this.sortBy.set(col);
    this.activeViewId.set(null);
    this.emitChange();
  }

  toggleSortDirection() {
    this.sortAsc.update(v => !v);
    this.activeViewId.set(null);
    this.emitChange();
  }

  private emitChange() {
    this.changed.emit({
      filterCol: this.filterCol(),
      filterOperator: this.filterOperator(),
      filterValue: this.filterValue(),
      filterValues: this.filterValues(),
      groupBy: this.groupBy(),
      sortBy: this.sortBy(),
      sortAsc: this.sortAsc(),
      visibleCols: this.visibleCols()
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (this.justOpenedContextMenu) {
      return;
    }

    const target = e.target as Node;
    if (this.colsBtn && this.colsBtn.nativeElement.contains(target)) {
      return;
    }

    if (this.contextMenuEl && !this.contextMenuEl.nativeElement.contains(target)) {
      this.contextMenuVisible.set(false);
    }

    this.showVisibilityMenu.set(false);
  }
}
