import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { StudyService } from './services/study.service';
import { Subject } from './models';
import { HeaderComponent } from './components/header.component';
import { SubjectsViewComponent } from './components/subjects-view.component';
import { CalendarViewComponent } from './components/calendar-view.component';
import { SemestersViewComponent } from './components/semesters-view.component';
import { SubjectDetailModalComponent } from './components/subject-detail-modal.component';
import {TasksViewComponent} from './components/tasks-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TasksViewComponent,
    CalendarViewComponent,
    SubjectDetailModalComponent,
    SemestersViewComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {
  authService = inject(AuthService);
  studyService = inject(StudyService);


  mainView: 'tasks' | 'semesters' | 'calendar' = 'tasks';
  selectedSubject: Subject | null = null;

  allPendingCount = computed(() => {
    return this.studyService.allTasks().filter(t => t.status !== 'done').length;
  });

  get totalEarnedCredits(): number {
    return this.studyService.earnedCredits();
  }

  get totalRegisteredCredits(): number {
    const list = this.studyService.subjects() ?? [];
    return list.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
  }

  openSubjectDetail(subject: any) {
    this.selectedSubject = subject;
  }
}
