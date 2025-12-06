import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

type PgMemModule = typeof import('pg-mem');
type PgMemDb = ReturnType<PgMemModule['newDb']>;

const buildTestPool = (): Pool => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require('pg-mem') as PgMemModule;
  const db = newDb({ autoCreateForeignKeyIndices: true });
  applyMigrations(db);
  const pgMem = db.adapters.createPg();
  const pool = new pgMem.Pool();

  const originalConnect = pool.connect.bind(pool);
  pool.connect = ((callback?: (...args: unknown[]) => void) => {
    if (typeof callback === 'function') {
      return originalConnect(callback);
    }

    return new Promise((resolve, reject) => {
      originalConnect((err: unknown, client: any, done: () => void) => {
        if (err) {
          reject(err);
          return;
        }

        client.release = done;
        resolve(client);
      });
    });
  }) as unknown as typeof pool.connect;

  return pool as unknown as Pool;
};

const applyMigrations = (db: PgMemDb): void => {
  const migrationsDir = path.resolve(__dirname, '..', '..', 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const migrationFolders = fs
    .readdirSync(migrationsDir)
    .map((folder) => path.join(migrationsDir, folder))
    .filter((folderPath) => fs.statSync(folderPath).isDirectory())
    .sort();

  migrationFolders.forEach((folderPath) => {
    const migrationFile = path.join(folderPath, 'migration.sql');
    if (!fs.existsSync(migrationFile)) {
      return;
    }

    const sql = fs.readFileSync(migrationFile, 'utf8');
    db.public.none(sql);
  });
};

const createPool = (): Pool => {
  if (process.env.NODE_ENV === 'test') {
    return buildTestPool();
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Please define it in your environment variables.');
  }

  return new Pool({ connectionString });
};

const adapter = new PrismaPg(createPool());
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
