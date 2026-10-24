import { MongoClient } from 'mongodb';

export async function connectToDatabase(connectionString: string): Promise<MongoClient> {
  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 5000
  });

  await client.connect();
  await client.db().admin().command({ ping: 1 });

  return client;
}

export async function checkDatabaseReadiness(client: MongoClient): Promise<void> {
  await client.db().admin().command({ ping: 1 });
}
