import { Injectable, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { AuthService } from './auth.service';
import {
  Subject,
  Task,
  FlatTask,
  SavedViewConfig,
  SubjectStatus
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class StudyService {
  private authService = inject(AuthService);

  activeSemesterTab = signal<number>(0);
  targetCredits = signal<number>(180);
  studentId = signal<string>('');
  savedViews = signal<SavedViewConfig[]>([]);
  viewsLoaded = signal<boolean>(false);
// Celkový fond kuponů (např. 216 pro bakalářské studium)
  totalCoupons = signal<number>(216);

  // Kredity odečtené z kuponů: POUZE zapsané předměty (probíhající nebo již hotové)
  usedCredits = computed(() => {
    const list = this.subjects() ?? [];
    return list
      .filter(s => s.status === 'in_progress' || s.status === 'completed')
      .reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
  });

  // Zbývající počet registračních kuponů
  remainingCoupons = computed(() => {
    return Math.max(0, this.totalCoupons() - this.usedCredits());
  });

  private subjects$: Observable<Subject[]> = new Observable(subscriber => {
    let unsubscribeSnapshot: (() => void) | null = null;
    let unsubscribeViews: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (unsubscribeViews) {
        unsubscribeViews();
        unsubscribeViews = null;
      }

      if (!user) {
        subscriber.next([]);
        this.studentId.set('');
        this.savedViews.set([]);
        this.viewsLoaded.set(false);
        return;
      }

      this.loadUserProfile(user.uid);

      const viewsRef = collection(db, `users/${user.uid}/saved_views`);
      unsubscribeViews = onSnapshot(viewsRef, snap => {
        const views = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedViewConfig));
        this.savedViews.set(views);
        this.viewsLoaded.set(true);
      });

      const colRef = collection(db, `users/${user.uid}/subjects`);
      unsubscribeSnapshot = onSnapshot(colRef, snapshot => {
        const list: Subject[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();

          let status: SubjectStatus = data['status'];
          if (!status) {
            const grade = data['grade'];
            if (grade !== undefined && grade !== null && grade <= 3) {
              status = 'completed';
            } else if (data['semester'] === 3) {
              status = 'in_progress';
            } else {
              status = 'not_started';
            }
          }

          return {
            id: docSnap.id,
            name: data['name'] || '',
            code: data['code'] || '',
            credits: Number(data['credits']) || 0,
            semester: data['semester'] !== undefined ? data['semester'] : null,
            status: status,
            teacher: data['teacher'] || '',
            lectureTime: data['lectureTime'] || '',
            seminarTime: data['seminarTime'] || '',
            room: data['room'] || '',
            notes: data['notes'] || '',
            grade: data['grade'] !== undefined ? data['grade'] : null,
            tasks: data['tasks'] || [],
            timetable: data['timetable'] || []
          };
        });
        subscriber.next(list);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeViews) unsubscribeViews();
    };
  });

  subjects = toSignal(this.subjects$, { initialValue: [] });

  filteredSubjects = computed(() => {
    const list = this.subjects() ?? [];
    const tab = this.activeSemesterTab();
    if (tab === 0) return list;
    return list.filter(s => s.semester === tab);
  });

  earnedCredits = computed(() => {
    const list = this.subjects() ?? [];
    return list
      .filter(s => s.grade !== null && s.grade <= 3)
      .reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
  });

  allTasks = computed(() => {
    const list = this.subjects() ?? [];
    const flat: FlatTask[] = [];

    list.forEach(subject => {
      (subject.tasks || []).forEach(task => {
        let daysRemaining: number | null = null;
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          due.setHours(0, 0, 0, 0);
          const diffTime = due.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        flat.push({
          ...task,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          subjectSemester: subject.semester,
          subjectStatus: subject.status,
          daysRemaining
        });
      });
    });

    return flat;
  });

  async loadUserProfile(uid: string) {
    const userDocRef = doc(db, `users/${uid}`);
    const snap = await getDoc(userDocRef);
    if (snap.exists() && snap.data()['studentId']) {
      this.studentId.set(snap.data()['studentId']);
    }
  }

  async updateStudentId(newId: string) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    this.studentId.set(newId);
    const userDocRef = doc(db, `users/${uid}`);
    await setDoc(userDocRef, { studentId: newId }, { merge: true });
  }

  async saveView(view: Omit<SavedViewConfig, 'id'>) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    const colRef = collection(db, `users/${uid}/saved_views`);
    const currentCount = this.savedViews().filter(v => v.tableKey === view.tableKey).length;
    await addDoc(colRef, { ...view, order: currentCount });
  }

  async deleteView(viewId: string) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    const docRef = doc(db, `users/${uid}/saved_views/${viewId}`);
    await deleteDoc(docRef);
  }

  async addSubject(subject: Omit<Subject, 'id'>) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    const colRef = collection(db, `users/${uid}/subjects`);
    await addDoc(colRef, {
      ...subject,
      status: subject.status || 'in_progress',
      tasks: [],
      timetable: []
    });
  }

  async renameView(viewId: string, newName: string) {
    if (!viewId || viewId === 'default') return;
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;

    const viewDoc = doc(db, `users/${uid}/saved_views/${viewId}`);
    await updateDoc(viewDoc, { name: newName });
  }

  async updateSubject(id: string | number, patch: Partial<Subject>) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    const docRef = doc(db, `users/${uid}/subjects/${id}`);
    await updateDoc(docRef, patch);
  }

  async updateSubjectDetails(id: string | number, patch: Partial<Subject>) {
    return this.updateSubject(id, patch);
  }

  async deleteSubject(id: string | number) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;
    const docRef = doc(db, `users/${uid}/subjects/${id}`);
    await deleteDoc(docRef);
  }

  getSubjectProgress(subject: Subject): number {
    const tasks = subject.tasks ?? [];
    // Počítáme POUZE dokončené položky
    const completedTasks = tasks.filter(t => t.status === 'done');

    if (completedTasks.length === 0) {
      // Pokud je předmět označen jako hotový, ale nemá dílčí úkoly (např. uznáno ze SŠ/VOŠ)
      return subject.status === 'completed' ? 100 : 0;
    }

    const totalPoints = completedTasks.reduce((sum, t) => sum + (Number(t.points) || 0), 0);
    const totalMaxPoints = completedTasks.reduce((sum, t) => sum + (Number(t.maxPoints) || 0), 0);

    if (totalMaxPoints <= 0) return 0;
    return Math.min(100, Math.round((totalPoints / totalMaxPoints) * 100));
  }

  async addTask(subjectId: string | number, taskData: Omit<Task, 'id'>) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;

    const subject = this.subjects()?.find(s => s.id === subjectId);
    if (!subject) return;

    const newTask: Task = {
      id: Date.now(),
      ...taskData
    };

    const updatedTasks = [...(subject.tasks || []), newTask];
    await this.updateSubject(subjectId, { tasks: updatedTasks });
  }

  async updateTask(taskId: number, patch: Partial<Task>) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;

    const subject = this.subjects()?.find(s => s.tasks?.some(t => t.id === taskId));
    if (!subject || !subject.tasks) return;

    const updatedTasks = subject.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, ...patch };
      }
      return t;
    });

    await this.updateSubject(subject.id, { tasks: updatedTasks });
  }

  async deleteTask(taskId: number) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;

    const subject = this.subjects()?.find(s => s.tasks?.some(t => t.id === taskId));
    if (!subject || !subject.tasks) return;

    const updatedTasks = subject.tasks.filter(t => t.id !== taskId);
    await this.updateSubject(subject.id, { tasks: updatedTasks });
  }

  async reorderViews(reorderedViews: SavedViewConfig[]) {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) return;

    this.savedViews.update(current => {
      const others = current.filter(v => v.tableKey !== reorderedViews[0]?.tableKey);
      return [...others, ...reorderedViews];
    });

    const updates = reorderedViews.map((view, index) => {
      const docId = view.id || 'default';
      const docRef = doc(db, `users/${uid}/saved_views/${docId}`);
      return setDoc(docRef, {
        order: index,
        name: view.name,
        tableKey: view.tableKey
      }, { merge: true });
    });

    await Promise.all(updates);
  }
}
