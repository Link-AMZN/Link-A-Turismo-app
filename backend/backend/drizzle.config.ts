import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/linka2_database",
  },
  verbose: true,
  strict: true,
  breakpoints: true,
});