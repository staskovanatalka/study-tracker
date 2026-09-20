export type TaskType = 'homework' | 'exam' | 'oral' | 'extra';
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting_for_grade' | 'done';
export type SubjectStatus = 'not_started' | 'in_progress' | 'completed';

export type FilterOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_any_of'
  | 'is_none_of';

export interface Task {
  id: number;
  title: string;
  type: TaskType;
  status: TaskStatus;
  points: number;
  maxPoints: number;
  dueDate: string;
}

export interface FlatTask extends Task {
  subjectId: string | number;
  subjectName: string;
  subjectCode?: string;
  subjectSemester?: number | null;
  subjectStatus?: SubjectStatus;
  daysRemaining: number | null;
}

export interface TimetableSlot {
  id?: string | number;
  subjectId: string | number;
  day: number;
  startTime: string;
  endTime: string;
  room: string;
  type: 'lecture' | 'seminar' | 'lab';
}

export interface Subject {
  id: string | number;
  name: string;
  code: string;
  credits: number;
  semester: number | null;
  status?: SubjectStatus; // <-- přidán otazník
  teacher?: string;
  lectureTime?: string;
  seminarTime?: string;
  room?: string;
  notes?: string;
  grade: number | null;
  tasks?: Task[];
  timetable?: TimetableSlot[];
}

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  type?: 'text' | 'number' | 'select' | 'date';
  options?: { label: string; value: any }[];
}

export interface ToolbarState {
  groupBy: string;
  sortBy: string;
  sortAsc: boolean;
  visibleCols: Record<string, boolean>;
  filterCol: string;
  filterOperator: FilterOperator;
  filterValue: string;
  filterValues: string[];
}

export interface SavedViewConfig {
  id?: string;
  tableKey: 'subjects' | 'tasks';
  name: string;
  order?: number;
  filterCol: string;
  filterOperator?: FilterOperator;
  filterValue: string;
  filterValues?: string[];
  groupBy: string;
  sortBy: string;
  sortAsc: boolean;
  visibleCols: Record<string, boolean>;
}
