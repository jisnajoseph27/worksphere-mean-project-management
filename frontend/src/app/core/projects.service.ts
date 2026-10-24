import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectPage } from './projects.models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  listProjects(): Observable<ProjectPage> {
    return this.http.get<ProjectPage>('/api/projects');
  }
}
