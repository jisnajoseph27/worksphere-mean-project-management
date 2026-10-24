import 'dotenv/config';
import { checkDatabaseReadiness, connectToDatabase } from './config/database';
import { createApp } from './app';
import { ProjectDocument } from './models/project';
import { createMongoProjectService } from './services/project.service';
import { UserDocument } from './models/user';
import { createMongoUserService } from './services/user.service';
import { createAuthService, validateJwtSecret } from './services/auth.service';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

async function startServer(): Promise<void> {
  validateJwtSecret(process.env.JWT_SECRET);
  const connectionString = process.env.MONGODB_URI;

  if (!connectionString) {
    throw new Error('MONGODB_URI is required. Copy .env.example to .env and set the local MongoDB URI.');
  }

  let client;

  try {
    client = await connectToDatabase(connectionString);
  } catch {
    throw new Error('MongoDB connection failed. Ensure MongoDB is running locally and MONGODB_URI is correct.');
  }

  const projectService = createMongoProjectService(
    client.db().collection<ProjectDocument>('projects')
  );
  const userService = createMongoUserService(client.db().collection<UserDocument>('users'));
  try {
    await userService.ensureIndexes();
  } catch (error) {
    await closeClientAfterIndexFailure(client);
    throw new Error('Unable to initialize the users collection email index.', { cause: error });
  }
  try {
    await projectService.ensureIndexes();
  } catch (error) {
    await closeClientAfterIndexFailure(client);
    throw new Error('Unable to initialize the projects collection owner/date index.', {
      cause: error
    });
  }
  const authService = createAuthService(userService, process.env.JWT_SECRET);
  const app = createApp(
    () => checkDatabaseReadiness(client),
    projectService,
    authService,
    process.env.JWT_SECRET
  );

  app.listen(port, () => {
    console.log(`WorkSphere API is listening on port ${port}`);
  });
}

async function closeClientAfterIndexFailure(client: Awaited<ReturnType<typeof connectToDatabase>>) {
  try {
    await client.close();
  } catch {
    console.error('Unable to close MongoDB after index initialization failed.');
  }
}

void startServer().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unable to start WorkSphere API.');
  process.exitCode = 1;
});
