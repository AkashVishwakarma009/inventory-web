// import { defineConfig } from "drizzle-kit";
// import * as fs from "fs";
// import * as dotenv from "dotenv";

// dotenv.config();

// const databaseUrl = process.env.DATABASE_URL;

// if (!databaseUrl) {
//   throw new Error("DATABASE_URL not set.");
// }

// // Load self-signed cert if needed
// const sslCert = fs.readFileSync("/etc/secrets/supabase-root-ca.pem").toString();

// export default defineConfig({
//   schema: "./shared/schema.ts",
//   out: "./migrations",
//   dialect: "postgresql",
//   dbCredentials: {
//     url: databaseUrl,
//     ssl: {
//       rejectUnauthorized: true,
//       ca: sslCert,
//     },
//   },
// });

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
