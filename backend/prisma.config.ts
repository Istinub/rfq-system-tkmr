import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Path to your Prisma schema
  schema: path.join("prisma", "schema.prisma"),

  // Datasource config for Prisma 7
  datasource: {
    // This reads DATABASE_URL from .env and guarantees a string
    url: env("DATABASE_URL"),
  },
});
