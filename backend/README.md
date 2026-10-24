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

The API also requires a private JWT signing secret. Create one locally (do not use the example placeholder):

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Put the generated value in `JWT_SECRET` in your local `.env` file. Keep it private and never commit or share it. Startup stops safely if the secret is missing or shorter than 32 bytes.

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

## Authentication and projects API

Register with `POST /api/auth/register` and log in with `POST /api/auth/login`. Both accept a JSON body with an `email` and `password`; emails are normalized to lowercase. Passwords must be at least 12 characters and no more than 72 UTF-8 bytes. Passwords are stored as bcrypt hashes and are never included in API responses. Registration returns `201`, login returns `200`, invalid input returns `400`, duplicate email returns `409`, and invalid login returns a generic `401`.

Successful registration and login return a JWT in the `token` property and a safe public user object. Send the token on project API requests using `Authorization: Bearer <token>`. Tokens use HS256 and expire after 15 minutes. There are no refresh tokens in this phase; users must log in again after a token expires.

All project endpoints require a valid token. Projects are owned by the registering user's authenticated ID; list, read, update, and delete operations are restricted to that owner. Requests cannot set `ownerId` or assign `memberIds`. Projects created before authentication have `ownerId: null`; they are not visible to authenticated users and need an intentional owner assignment if they should be retained.

Health and readiness endpoints remain public.

Projects are stored in MongoDB's `projects` collection with a generated `_id`, `name`, `description`, `status`, `ownerId`, `memberIds`, optional `startDate` and `dueDate`, `createdAt`, and `updatedAt`. `ownerId` is assigned from the authenticated user, not request input. `memberIds` remains empty until member assignment is implemented. Status values are `planning`, `active`, `on-hold`, and `completed`; provided dates must be ISO date-time values with a timezone, and the due date cannot precede the start date.

Available routes:

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/projects` | Create a project; responds `201`. |
| `GET` | `/api/projects` | List projects. Supports `limit` (default `20`, maximum `100`) and `skip` (default `0`). |
| `GET` | `/api/projects/:projectId` | Get a project by MongoDB ObjectId. |
| `PUT` | `/api/projects/:projectId` | Replace editable project fields; requires `name`, `description`, and `status`. |
| `DELETE` | `/api/projects/:projectId` | Delete a project; responds `204` when deleted. |

Invalid input returns `400`, missing or non-owned projects return `404`, and unexpected database errors return a generic `500` response.

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
