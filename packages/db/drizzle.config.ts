import { DEFAULT_DATABASE_PATH } from "@tpt-hearth/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? `file:${DEFAULT_DATABASE_PATH}`;

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl
  }
});
