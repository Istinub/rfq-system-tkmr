import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const basePrisma = new PrismaClient({
	adapter: new PrismaPg(pool),
});

const prisma = basePrisma;

export default prisma;
