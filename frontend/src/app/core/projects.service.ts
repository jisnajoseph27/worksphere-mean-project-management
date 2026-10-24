import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Project, ProjectInput, ProjectPage } from './projects.models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  listProjects(): Observable<ProjectPage> {
    return this.http.get<ProjectPage>('/api/projects');
  }

  createProject(input: ProjectInput): Observable<Project> {
    return this.http.post<Project>('/api/projects', input);
  }

  updateProject(projectId: string, input: ProjectInput): Observable<Project> {
    return this.http.put<Project>(`/api/projects/${projectId}`, input);
  }
}
