import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import { join } from "node:path";

for (const envPath of [
  join(process.cwd(), ".env"),
  join(process.cwd(), "..", "..", ".env"),
]) {
  config({ path: envPath, override: false });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
