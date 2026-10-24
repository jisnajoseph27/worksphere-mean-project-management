import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { Project, ProjectInput, ProjectStatus } from '../../core/projects.models';
import { ProjectsService } from '../../core/projects.service';

const projectDateRangeValidator: ValidatorFn = (control): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value as string | undefined;
  const dueDate = control.get('dueDate')?.value as string | undefined;

  return startDate && dueDate && dueDate < startDate ? { dateRange: true } : null;
};

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <section class="dashboard">
      <div class="heading-row">
        <div>
          <span class="section-tag">OVERVIEW</span>
          <h1>Your projects</h1>
          <p class="subtitle">A clear view of what your team is working on.</p>
        </div>
        <div class="heading-actions">
          <span class="phase-badge">Your workspace</span>
          <button
            class="new-project-button"
            type="button"
            (click)="openCreateForm()"
            [disabled]="loading()"
          >
            New Project
          </button>
          <button class="logout-button" type="button" aria-label="Log out" (click)="logout()">Log out</button>
        </div>
      </div>

      @if (saveSuccess()) {
        <p class="save-success" role="status" aria-live="polite">{{ saveSuccess() }}</p>
      }

      <div class="summary-grid" aria-label="Project summary">
        <article class="summary-card">
          <span class="summary-icon violet" aria-hidden="true">▦</span>
          <div><p class="summary-label">Total projects</p><p class="summary-value">{{ total() }}</p></div>
          <span class="summary-note">In your workspace</span>
        </article>
        <article class="summary-card">
          <span class="summary-icon mint" aria-hidden="true">✓</span>
          <div><p class="summary-label">In progress</p><p class="summary-value">{{ activeProjectCount }}</p></div>
          <span class="summary-note">On this page</span>
        </article>
        <article class="summary-card">
          <span class="summary-icon amber" aria-hidden="true">◷</span>
          <div><p class="summary-label">Due this week</p><p class="summary-value">{{ dueThisWeekCount }}</p></div>
          <span class="summary-note">On this page</span>
        </article>
      </div>

      @if (formOpen()) {
        <section class="project-form-panel" aria-labelledby="project-form-title">
          <div class="form-heading">
            <div>
              <h2 id="project-form-title">{{ editingProject() ? 'Edit project' : 'Create project' }}</h2>
              <p>{{ editingProject() ? 'Update the details for this project.' : 'Add a project to your workspace.' }}</p>
            </div>
          </div>

          <form [formGroup]="projectForm" (ngSubmit)="saveProject()" novalidate>
            <div class="form-grid">
              <div class="form-field full-width">
                <label for="project-name">Name <span aria-hidden="true">*</span></label>
                <input
                  id="project-name"
                  type="text"
                  formControlName="name"
                  maxlength="100"
                  required
                  [attr.aria-invalid]="nameControl.invalid && nameControl.touched"
                  aria-describedby="project-name-error"
                />
                @if (nameControl.invalid && nameControl.touched) {
                  <span id="project-name-error" class="field-error">
                    @if (nameControl.hasError('required') || nameControl.hasError('pattern')) {
                      Enter a project name.
                    } @else if (nameControl.hasError('maxlength')) {
                      Name must be 100 characters or fewer.
                    }
                  </span>
                }
              </div>

              <div class="form-field full-width">
                <label for="project-description">Description</label>
                <textarea
                  id="project-description"
                  formControlName="description"
                  maxlength="2000"
                  rows="3"
                  [attr.aria-invalid]="descriptionControl.invalid && descriptionControl.touched"
                  aria-describedby="project-description-error"
                ></textarea>
                @if (descriptionControl.hasError('maxlength') && descriptionControl.touched) {
                  <span id="project-description-error" class="field-error">
                    Description must be 2,000 characters or fewer.
                  </span>
                }
              </div>

              <div class="form-field">
                <label for="project-status">Status</label>
                <select id="project-status" formControlName="status">
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div class="form-field">
                <label for="project-start-date">Start date</label>
                <input id="project-start-date" type="date" formControlName="startDate" />
              </div>

              <div class="form-field">
                <label for="project-due-date">Due date</label>
                <input
                  id="project-due-date"
                  type="date"
                  formControlName="dueDate"
                  [attr.aria-invalid]="projectForm.hasError('dateRange') && dueDateControl.touched"
                  aria-describedby="project-date-error"
                />
                @if (projectForm.hasError('dateRange') && (startDateControl.touched || dueDateControl.touched)) {
                  <span id="project-date-error" class="field-error" role="alert">
                    Due date must be on or after the start date.
                  </span>
                }
              </div>
            </div>

            @if (saveError()) {
              <p class="save-error" role="alert">{{ saveError() }}</p>
            }

            <div class="form-actions">
              <button class="cancel-button" type="button" (click)="closeForm()" [disabled]="saving()">
                Cancel
              </button>
              <button class="save-button" type="submit" [disabled]="saving()">
                {{ saving() ? 'Saving…' : editingProject() ? 'Save changes' : 'Create project' }}
              </button>
            </div>
          </form>
        </section>
      }

      <section class="projects-card">
        <div class="projects-heading">
          <div><h2>Recent projects</h2><p>Projects are ordered by creation date, newest first.</p></div>
          <span class="project-count">{{ total() }} {{ total() === 1 ? 'project' : 'projects' }}</span>
        </div>
        @if (loading()) {
          <div class="state-message" role="status" aria-live="polite">Loading your projects…</div>
        } @else if (error()) {
          <div class="state-message error-state" role="alert">
            <p>{{ error() }}</p>
            <button class="retry-button" type="button" (click)="loadProjects()">Try again</button>
          </div>
        } @else if (projects().length === 0) {
          <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">▤</span>
            <h3>Your project space is ready</h3>
            <p>You do not have any projects yet. Your projects will appear here when available.</p>
          </div>
        } @else {
          <ul class="project-list" aria-label="Projects">
            @for (project of projects(); track project._id) {
              <li class="project-row">
                <div class="project-main">
                  <h3>{{ project.name }}</h3>
                  <p>{{ project.description }}</p>
                </div>
                <div class="project-meta">
                  <span class="status-badge" [class]="'status-badge ' + project.status">{{ project.status }}</span>
                  @if (project.dueDate) {
                    <span class="due-date">Due {{ project.dueDate | date: 'mediumDate' }}</span>
                  }
                  <button
                    class="edit-button"
                    type="button"
                    [attr.aria-label]="'Edit ' + project.name"
                    (click)="openEditForm(project)"
                  >
                    Edit
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </section>
    </section>
  `,
  styles: `
    .dashboard { display: grid; gap: 27px; }
    .heading-row, .projects-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .heading-actions { display: flex; align-items: center; gap: 10px; }
    .section-tag { color: var(--brand); font-size: 10px; font-weight: 750; letter-spacing: .14em; }
    h1 { margin: 8px 0 5px; font-size: clamp(30px, 4vw, 38px); letter-spacing: -.05em; }
    .subtitle, .projects-heading p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
    .phase-badge, .project-count, .status-badge { white-space: nowrap; }
    .phase-badge, .project-count { padding: 8px 11px; border: 1px solid var(--line); border-radius: 20px; background: var(--surface); color: #68728a; font-size: 11px; font-weight: 600; }
    button { cursor: pointer; }
    .logout-button, .cancel-button, .edit-button { border: 1px solid var(--line); background: var(--surface); }
    .logout-button, .cancel-button { color: #59647d; font-size: 11px; font-weight: 650; }
    .logout-button, .cancel-button, .new-project-button, .save-button, .retry-button { min-height: 36px; padding: 0 14px; border-radius: 8px; }
    .logout-button, .cancel-button, .edit-button { border-radius: 8px; }
    .new-project-button, .save-button, .retry-button { border: 0; background: var(--brand); color: #fff; font-weight: 700; }
    .new-project-button, .save-button, .cancel-button { font-size: 11px; }
    .retry-button { font-size: 12px; }
    .new-project-button:hover, .save-button:hover:not(:disabled), .retry-button:hover { filter: brightness(.96); }
    .new-project-button:focus-visible, .save-button:focus-visible, .cancel-button:focus-visible, .edit-button:focus-visible, .logout-button:focus-visible { outline: 3px solid rgb(68 95 229 / 25%); outline-offset: 2px; }
    .logout-button { min-height: 34px; padding: 0 12px; }
    .logout-button:hover { border-color: #ccd3e2; background: #f8f9fc; }
    .save-success { margin: 0; padding: 12px 15px; border: 1px solid #b9e7d5; border-radius: 10px; background: #effaf5; color: #217552; font-size: 13px; }
    .summary-grid, .summary-card, .state-message, .empty-state, .form-grid, .form-field { display: grid; }
    .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .summary-card { grid-template-columns: 40px 1fr; align-items: center; gap: 12px; padding: 18px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); }
    .summary-icon, .empty-icon { display: grid; place-items: center; }
    .summary-icon { width: 38px; height: 38px; border-radius: 11px; font-size: 16px; font-weight: 700; }
    .violet, .status-badge.completed { background: #eff0ff; color: #6668d9; }
    .mint, .status-badge.active { background: #e9f8f2; color: #269b72; }
    .amber, .status-badge.on-hold { background: #fff5e6; }
    .amber { color: #d29330; }
    .status-badge.on-hold { color: #b7791f; }
    .summary-label, .summary-value, .error-state p { margin: 0; }
    .summary-label { color: var(--muted); font-size: 11px; }
    .summary-value { margin-top: 4px; font-size: 23px; font-weight: 750; letter-spacing: -.04em; }
    .summary-note { grid-column: 2; color: #9aa2b2; font-size: 10px; }
    .projects-card, .project-form-panel { border: 1px solid var(--line); border-radius: 15px; background: var(--surface); }
    .projects-card { overflow: hidden; }
    .projects-heading { padding: 20px 22px; border-bottom: 1px solid var(--line); }
    h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: -.02em; }
    .projects-heading p { font-size: 11px; }
    .project-count { padding: 6px 9px; font-size: 10px; }
    .project-form-panel { padding: 20px 22px; }
    .form-heading { margin-bottom: 18px; }
    .form-heading h2 { font-size: 16px; }
    .form-heading p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
    .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }
    .form-field { align-content: start; gap: 6px; min-width: 0; }
    .form-field label { color: var(--ink); font-size: 12px; font-weight: 650; }
    .form-field input, .form-field select, .form-field textarea { box-sizing: border-box; width: 100%; min-height: 38px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: var(--ink); font: inherit; font-size: 12px; }
    .form-field textarea { min-height: 80px; resize: vertical; }
    .form-field input:focus-visible, .form-field select:focus-visible, .form-field textarea:focus-visible { outline: 3px solid rgb(68 95 229 / 20%); border-color: var(--brand); }
    .full-width { grid-column: 1 / -1; }
    .field-error, .save-error { color: #b83d4b; font-size: 11px; line-height: 1.45; }
    .save-error { margin: 14px 0 0; font-size: 12px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 18px; }
    .cancel-button:disabled, .save-button:disabled { cursor: not-allowed; opacity: .65; }
    .state-message, .empty-state { justify-items: center; text-align: center; }
    .state-message { gap: 12px; padding: 42px 22px; color: var(--muted); font-size: 13px; }
    .error-state { color: #b83d4b; }
    .project-list { margin: 0; padding: 0; list-style: none; }
    .project-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(145px, auto); align-items: center; gap: 24px; padding: 19px 22px; border-bottom: 1px solid var(--line); transition: background-color 150ms ease; }
    .project-row:last-child { border-bottom: 0; }
    .project-row:hover { background: #fafbff; }
    .project-main { min-width: 0; }
    .project-main h3 { margin: 0 0 6px; color: var(--ink); font-size: 15px; font-weight: 700; letter-spacing: -.02em; line-height: 1.35; overflow-wrap: anywhere; }
    .project-main p, .empty-state p { margin: 0; color: var(--muted); }
    .project-main p { font-size: 12px; line-height: 1.55; }
    .project-meta { display: flex; min-width: 145px; align-items: center; justify-content: flex-end; gap: 12px; }
    .status-badge { padding: 6px 9px; border-radius: 20px; background: #f1f2f7; color: #68728a; font-size: 10px; font-weight: 650; text-transform: capitalize; }
    .due-date { color: var(--muted); font-size: 11px; font-weight: 500; white-space: nowrap; }
    .edit-button { min-height: 30px; padding: 0 10px; border-radius: 7px; color: var(--brand); font-size: 11px; font-weight: 650; }
    .empty-state { padding: 54px 22px; }
    .empty-icon { width: 50px; height: 50px; border-radius: 15px; background: var(--brand-soft); color: var(--brand); font-size: 21px; }
    h3 { margin: 17px 0 6px; font-size: 15px; }
    .empty-state p { max-width: 350px; font-size: 12px; line-height: 1.65; }
    @media (max-width: 760px) {
      .summary-grid { grid-template-columns: 1fr; }
      .heading-row { align-items: flex-start; flex-direction: column; }
      .heading-actions { flex-wrap: wrap; }
      .summary-card { grid-template-columns: 40px 1fr auto; }
      .summary-note { grid-column: auto; }
      .project-row { grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 17px 18px; }
      .project-meta { min-width: 0; justify-content: flex-start; flex-wrap: wrap; }
      .form-grid { grid-template-columns: 1fr; }
      .full-width { grid-column: auto; }
      .project-form-panel { padding: 18px; }
    }
  `
})
export class DashboardPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsService = inject(ProjectsService);
  private readonly formBuilder = inject(FormBuilder);

  readonly projects = signal<Project[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly formOpen = signal(false);
  readonly editingProject = signal<Project | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly saveSuccess = signal('');
  readonly statuses: ProjectStatus[] = ['planning', 'active', 'on-hold', 'completed'];
  readonly projectForm = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(2000)],
      status: ['planning' as ProjectStatus, Validators.required],
      startDate: [''],
      dueDate: ['']
    },
    { validators: projectDateRangeValidator }
  );

  get nameControl() {
    return this.projectForm.controls.name;
  }

  get descriptionControl() {
    return this.projectForm.controls.description;
  }

  get startDateControl() {
    return this.projectForm.controls.startDate;
  }

  get dueDateControl() {
    return this.projectForm.controls.dueDate;
  }

  get activeProjectCount(): number {
    return this.projects().filter((project) => project.status === 'active').length;
  }

  get dueThisWeekCount(): number {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    return this.projects().filter((project) => {
      if (!project.dueDate) return false;
      const dueDate = new Date(project.dueDate);
      return dueDate >= now && dueDate <= endOfWeek;
    }).length;
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set('');
    this.projectsService
      .listProjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.projects.set(page.projects);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('We could not load your projects. Please try again.');
          this.loading.set(false);
        }
      });
  }

  openCreateForm(): void {
    this.editingProject.set(null);
    this.projectForm.reset({
      name: '',
      description: '',
      status: 'planning',
      startDate: '',
      dueDate: ''
    });
    this.saveError.set('');
    this.saveSuccess.set('');
    this.formOpen.set(true);
  }

  openEditForm(project: Project): void {
    this.editingProject.set(project);
    this.projectForm.reset({
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: this.dateInputValue(project.startDate),
      dueDate: this.dateInputValue(project.dueDate)
    });
    this.saveError.set('');
    this.saveSuccess.set('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.editingProject.set(null);
    this.saveError.set('');
  }

  saveProject(): void {
    if (this.saving()) return;
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const values = this.projectForm.getRawValue();
    const input: ProjectInput = {
      name: values.name.trim(),
      description: values.description,
      status: values.status,
      ...(values.startDate ? { startDate: this.toIsoDateTime(values.startDate) } : {}),
      ...(values.dueDate ? { dueDate: this.toIsoDateTime(values.dueDate) } : {})
    };
    const project = this.editingProject();
    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set('');

    const saveRequest = project
      ? this.projectsService.updateProject(project._id, input)
      : this.projectsService.createProject(input);

    saveRequest.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.editingProject.set(null);
        this.saveSuccess.set(project ? 'Project updated successfully.' : 'Project created successfully.');
        this.loadProjects();
      },
      error: () => {
        this.saveError.set('We could not save your project. Please review your details and try again.');
        this.saving.set(false);
      }
    });
  }

  private dateInputValue(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
  }

  private toIsoDateTime(value: string): string {
    return new Date(`${value}T00:00:00.000Z`).toISOString();
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
