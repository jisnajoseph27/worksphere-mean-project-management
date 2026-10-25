import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, switchMap, tap } from 'rxjs';
import { Project } from '../../core/projects.models';
import { ProjectsService } from '../../core/projects.service';

@Component({
  selector: 'app-project-details-page',
  imports: [RouterLink],
  template: `
    <main class="project-details">
      <a class="back-link" routerLink="/dashboard">← Back to dashboard</a>

      @if (loading()) {
        <p class="state-message" role="status" aria-live="polite">Loading project details…</p>
      } @else if (error()) {
        <section class="state-message error-state" role="alert">
          <h1>Project unavailable</h1>
          <p>{{ error() }}</p>
        </section>
      } @else if (project(); as currentProject) {
        <article class="project-card" aria-labelledby="project-name">
          <span class="section-tag">PROJECT DETAILS</span>
          <h1 id="project-name">{{ currentProject.name }}</h1>

          <dl class="project-fields">
            <div class="field description-field">
              <dt>Description</dt>
              <dd>{{ description(currentProject.description) }}</dd>
            </div>
            <div class="field">
              <dt>Status</dt>
              <dd>
                <span class="status-badge" [class]="'status-badge ' + currentProject.status">
                  {{ currentProject.status }}
                </span>
              </dd>
            </div>
            <div class="field">
              <dt>Start date</dt>
              <dd>{{ formatDate(currentProject.startDate) }}</dd>
            </div>
            <div class="field">
              <dt>Due date</dt>
              <dd>{{ formatDate(currentProject.dueDate) }}</dd>
            </div>
            <div class="field">
              <dt>Created</dt>
              <dd>{{ formatDate(currentProject.createdAt) }}</dd>
            </div>
            <div class="field">
              <dt>Last updated</dt>
              <dd>{{ formatDate(currentProject.updatedAt) }}</dd>
            </div>
          </dl>
        </article>
      }
    </main>
  `,
  styles: `
    .project-details { display: grid; gap: 20px; max-width: 900px; margin: 0 auto; }
    .back-link { width: fit-content; color: var(--brand); font-size: 13px; font-weight: 650; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .back-link:focus-visible { outline: 3px solid rgb(68 95 229 / 25%); outline-offset: 3px; border-radius: 3px; }
    .project-card { padding: clamp(20px, 4vw, 34px); border: 1px solid var(--line); border-radius: 15px; background: var(--surface); }
    .section-tag { color: var(--brand); font-size: 10px; font-weight: 750; letter-spacing: .14em; }
    h1 { margin: 8px 0 24px; font-size: clamp(28px, 4vw, 38px); letter-spacing: -.05em; overflow-wrap: anywhere; }
    .project-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin: 0; }
    .field { min-width: 0; }
    dt { margin-bottom: 7px; color: var(--muted); font-size: 11px; font-weight: 650; }
    dd { margin: 0; color: var(--ink); font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
    .description-field { grid-column: 1 / -1; }
    .status-badge { display: inline-block; padding: 6px 10px; border-radius: 20px; background: #f1f2f7; color: #68728a; font-size: 11px; font-weight: 650; text-transform: capitalize; }
    .status-badge.active { background: #e9f8f2; color: #269b72; }
    .status-badge.completed { background: #eff0ff; color: #6668d9; }
    .status-badge.on-hold { background: #fff5e6; color: #b7791f; }
    .state-message { padding: 38px 20px; color: var(--muted); font-size: 14px; text-align: center; }
    .error-state { border: 1px solid #f0c9ce; border-radius: 12px; background: #fff7f8; color: #b83d4b; }
    .error-state h1 { margin: 0 0 8px; font-size: 20px; }
    .error-state p { margin: 0; line-height: 1.6; }
    @media (max-width: 600px) { .project-fields { grid-template-columns: 1fr; gap: 16px; } .description-field { grid-column: auto; } }
  `
})
export class ProjectDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsService = inject(ProjectsService);

  readonly project = signal<Project | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const projectId = params.get('projectId');
          this.project.set(null);
          this.error.set('');

          if (!projectId || !/^[\da-f]{24}$/i.test(projectId)) {
            this.loading.set(false);
            this.error.set('This project link is invalid. Return to the dashboard to choose a project.');
            return EMPTY;
          }

          this.loading.set(true);
          return this.projectsService.getProject(projectId).pipe(
            tap((project) => {
              this.project.set(project);
              this.loading.set(false);
            }),
            catchError(() => {
              this.loading.set(false);
              this.error.set('We could not load this project. It may not exist or you may not have access.');
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  description(value: string | null | undefined): string {
    return value?.trim() || 'Not provided';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Not provided';

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Not provided';

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }
}
