import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { Project } from '../../core/projects.models';
import { ProjectsService } from '../../core/projects.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [DatePipe],
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
          <button class="logout-button" type="button" aria-label="Log out" (click)="logout()">Log out</button>
        </div>
      </div>

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
    .phase-badge, .project-count { padding: 8px 11px; border: 1px solid var(--line); border-radius: 20px; background: var(--surface); color: #68728a; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .logout-button { min-height: 34px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); color: #59647d; font-size: 11px; font-weight: 650; cursor: pointer; }
    .logout-button:hover { border-color: #ccd3e2; background: #f8f9fc; }
    .logout-button:focus-visible { outline: 3px solid rgb(68 95 229 / 25%); outline-offset: 2px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .summary-card { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 12px; padding: 18px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); }
    .summary-icon, .empty-icon { display: grid; place-items: center; }
    .summary-icon { width: 38px; height: 38px; border-radius: 11px; font-size: 16px; font-weight: 700; }
    .violet, .status-badge.completed { background: #eff0ff; color: #6668d9; }
    .mint, .status-badge.active { background: #e9f8f2; color: #269b72; }
    .amber { background: #fff5e6; color: #d29330; }
    .summary-label, .summary-value, .error-state p { margin: 0; }
    .summary-label { color: var(--muted); font-size: 11px; }
    .summary-value { margin-top: 4px; font-size: 23px; font-weight: 750; letter-spacing: -.04em; }
    .summary-note { grid-column: 2; color: #9aa2b2; font-size: 10px; }
    .projects-card { overflow: hidden; border: 1px solid var(--line); border-radius: 15px; background: var(--surface); }
    .projects-heading { padding: 20px 22px; border-bottom: 1px solid var(--line); }
    h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: -.02em; }
    .projects-heading p { font-size: 11px; }
    .project-count { padding: 6px 9px; font-size: 10px; }
    .state-message, .empty-state { display: grid; justify-items: center; text-align: center; }
    .state-message { gap: 12px; padding: 42px 22px; color: var(--muted); font-size: 13px; }
    .error-state { color: #b83d4b; }
    .retry-button { min-height: 36px; padding: 0 14px; border: 0; border-radius: 8px; background: var(--brand); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
    .project-list { margin: 0; padding: 0; list-style: none; }
    .project-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(145px, auto); align-items: center; gap: 24px; padding: 19px 22px; border-bottom: 1px solid var(--line); transition: background-color 150ms ease; }
    .project-row:last-child { border-bottom: 0; }
    .project-row:hover { background: #fafbff; }
    .project-main { min-width: 0; }
    .project-main h3 { margin: 0 0 6px; color: var(--ink); font-size: 15px; font-weight: 700; letter-spacing: -.02em; line-height: 1.35; overflow-wrap: anywhere; }
    .project-main p, .empty-state p { margin: 0; color: var(--muted); }
    .project-main p { font-size: 12px; line-height: 1.55; }
    .project-meta { display: flex; min-width: 145px; align-items: center; justify-content: flex-end; gap: 12px; }
    .status-badge { padding: 6px 9px; border-radius: 20px; background: #f1f2f7; color: #68728a; font-size: 10px; font-weight: 650; text-transform: capitalize; white-space: nowrap; }
    .status-badge.on-hold { background: #fff5e6; color: #b7791f; }
    .due-date { color: var(--muted); font-size: 11px; font-weight: 500; white-space: nowrap; }
    .empty-state { padding: 54px 22px; }
    .empty-icon { width: 50px; height: 50px; border-radius: 15px; background: var(--brand-soft); color: var(--brand); font-size: 21px; }
    h3 { margin: 17px 0 6px; font-size: 15px; }
    .empty-state p { max-width: 350px; font-size: 12px; line-height: 1.65; }
    @media (max-width: 760px) { .summary-grid { grid-template-columns: 1fr; } .heading-row { align-items: flex-start; flex-direction: column; } .summary-card { grid-template-columns: 40px 1fr auto; } .summary-note { grid-column: auto; } .project-row { grid-template-columns: minmax(0, 1fr); gap: 12px; padding: 17px 18px; } .project-meta { min-width: 0; justify-content: flex-start; flex-wrap: wrap; } }
  `
})
export class DashboardPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsService = inject(ProjectsService);

  readonly projects = signal<Project[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

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

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
