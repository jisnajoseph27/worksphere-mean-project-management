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
