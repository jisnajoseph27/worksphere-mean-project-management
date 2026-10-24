# WorkSphere Backend

## Requirements

- Node.js 24 or later
- npm

## Setup

Open PowerShell in this folder and install the dependencies:

```powershell
cd C:\personal_github\worksphere-mean-project-management\backend
npm install
```

The server defaults to port `3000`. It requires a local MongoDB server. To configure the connection, copy the example environment file and edit its values if needed:

```powershell
Copy-Item .env.example .env
```

The example URI connects to `mongodb://127.0.0.1:27017/worksphere`. Ensure MongoDB Server is running locally before starting the API. Do not commit `.env`; it is ignored by Git.

## Run in development

```powershell
npm run dev
```

This starts the server with automatic restarts when source files change.

## Check the health endpoint

With the server running, open another PowerShell window and run:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

The endpoint returns a JSON response indicating that the API is running.

Check whether MongoDB is available and the API is ready to handle database-backed requests:

```powershell
Invoke-RestMethod http://localhost:3000/api/ready
```

This endpoint returns HTTP 200 when the database ping succeeds and HTTP 503 when MongoDB is unavailable.

## Projects API (local development only)

The unauthenticated Projects API is for local development only. **Do not expose it publicly or deploy it for public access before authentication and authorization are implemented.** Until then, any caller who can reach the API can list, create, update, or delete projects.

Projects are stored in MongoDB's `projects` collection with a generated `_id`, `name`, `description`, `status`, optional `startDate` and `dueDate`, `createdAt`, and `updatedAt`. `ownerId` is kept as `null` and `memberIds` as an empty array until authenticated ownership and membership are implemented. Requests cannot set either field. Status values are `planning`, `active`, `on-hold`, and `completed`; provided dates must be ISO date-time values with a timezone, and the due date cannot precede the start date.

Available routes:

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/projects` | Create a project; responds `201`. |
| `GET` | `/api/projects` | List projects. Supports `limit` (default `20`, maximum `100`) and `skip` (default `0`). |
| `GET` | `/api/projects/:projectId` | Get a project by MongoDB ObjectId. |
| `PUT` | `/api/projects/:projectId` | Replace editable project fields; requires `name`, `description`, and `status`. |
| `DELETE` | `/api/projects/:projectId` | Delete a project; responds `204` when deleted. |

Invalid input returns `400`, missing projects return `404`, and unexpected database errors return a generic `500` response.

## Backend request structure

API requests are mounted by the app and directed through route files to controllers. Controllers handle HTTP status codes and JSON responses; services contain application and database operations. Health checks and project operations are injected into the app so automated API tests can use mocks without a live MongoDB connection.

## Test and build

Run the automated tests:

```powershell
npm test
```

Compile the TypeScript source into `dist`:

```powershell
npm run build
```

Start the compiled server after building:

```powershell
npm start
```
